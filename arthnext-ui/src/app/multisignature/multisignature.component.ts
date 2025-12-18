import { Component, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

import { ModalComponent } from '../shared/components/modal/modal.component';
import { ModalService } from '../shared/services/modal.service';
import { PdfViewerComponent } from '../shared/components/pdf-viewer/pdf-viewer.component';
import { User, SignatureArea, VisualSignatureArea } from '../shared/models/signature.models';
import { SignatureDrawingModalComponent, DrawnSignature } from '../shared/components/signature-drawing-modal/signature-drawing-modal.component';

@Component({
  selector: 'app-multisignature',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    ModalComponent,
    PdfViewerComponent,
    SignatureDrawingModalComponent
  ],
  templateUrl: './multisignature.component.html',
  styleUrls: ['./multisignature.component.scss']
})
export class MultisignatureComponent {
  @ViewChild(SignatureDrawingModalComponent) signatureModal?: SignatureDrawingModalComponent;

  // Document metadata
  documentType = '';
  priority = '';
  uploadedFile: File | null = null;

  // User management
  users: User[] = [];
  selectedUser: User | null = null;
  newUserName = '';
  newUserAadhar = '';
  showAddUserForm = false;

  // Signature storage
  userSignatures = new Map<string, DrawnSignature>(); // userId -> their drawn signature
  visualSignatures: VisualSignatureArea[] = []; // Visual signatures placed on PDF
  cryptoSignatureIds = new Set<string>(); // IDs of signatures marked as crypto

  // UI State
  submitting = false;

  // Colors
  private colors = [
    '#ff0000', '#00ff00', '#0000ff',
    '#ff00ff', '#ffff00', '#00ffff',
    '#ff8800', '#8800ff'
  ];
  private colorIndex = 0;

  // API
  initiateAPI = 'https://peakily-idioplasmatic-kimbra.ngrok-free.dev/api/v1/esign/initiate';

  constructor(
    private modalService: ModalService,
    private http: HttpClient,
    private router: Router
  ) {}

  // File handling - RESET EVERYTHING when file changes
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const newFile = input.files?.[0] || null;
    
    // If there was a previous file and user is changing it, confirm reset
    if (this.uploadedFile && newFile) {
      this.modalService.showConfirm(
        'Change PDF File',
        'Changing the PDF will remove all signers and signatures. Continue?',
        () => {
          this.resetEverything();
          this.uploadedFile = newFile;
        },
        () => {
          // User cancelled, reset the file input to previous file
          input.value = '';
        }
      );
    } else {
      this.uploadedFile = newFile;
    }
  }

  // Reset all data
  private resetEverything() {
    this.users = [];
    this.selectedUser = null;
    this.userSignatures.clear();
    this.visualSignatures = [];
    this.cryptoSignatureIds.clear();
    this.colorIndex = 0;
    this.newUserName = '';
    this.newUserAadhar = '';
    this.showAddUserForm = false;
  }

  // User management
  addUser() {
    if (!this.newUserName.trim()) {
      this.modalService.showAlert('Validation Error', 'Please enter a user name!', 'warning');
      return;
    }

    const user: User = {
      id: `user_${Date.now()}`,
      name: this.newUserName.trim(),
      email: this.newUserAadhar.trim() || '',
      color: this.colors[this.colorIndex % this.colors.length]
    };

    this.users.push(user);
    this.colorIndex++;

    this.newUserName = '';
    this.newUserAadhar = '';
    this.showAddUserForm = false;

    // Open signature modal
    this.selectedUser = user;
    setTimeout(() => {
      this.signatureModal?.openModal();
    }, 100);
  }

  selectUser(user: User) {
    // Check if user has signature
    if (!this.userSignatures.has(user.id)) {
      this.modalService.showAlert(
        'Create Signature First',
        'Please create your signature before placing it on the PDF.',
        'warning'
      );
      this.selectedUser = user;
      setTimeout(() => {
        this.signatureModal?.openModal();
      }, 100);
      return;
    }
    this.selectedUser = user;
  }

  removeUser(userId: string) {
    this.modalService.showConfirm(
      'Remove User',
      'This will remove all their signatures too.',
      () => {
        this.users = this.users.filter(u => u.id !== userId);
        this.visualSignatures = this.visualSignatures.filter(s => s.userId !== userId);
        this.userSignatures.delete(userId);
        
        // Remove from crypto set
        this.visualSignatures.forEach(sig => {
          if (sig.userId === userId) {
            this.cryptoSignatureIds.delete(sig.signatureId);
          }
        });
        
        if (this.selectedUser?.id === userId) {
          this.selectedUser = null;
        }
      }
    );
  }

  openSignatureCreator(user: User) {
    this.selectedUser = user;
    
    // If editing existing signature, clear the old one first
    if (this.userSignatures.has(user.id)) {
      console.log('Editing signature for:', user.name);
      console.log('Removing old signature and all visual signatures for this user');
      
      // Remove all visual signatures for this user when editing
      this.visualSignatures = this.visualSignatures.filter(s => s.userId !== user.id);
      
      // Remove from crypto set
      this.visualSignatures.forEach(sig => {
        if (sig.userId === user.id) {
          this.cryptoSignatureIds.delete(sig.signatureId);
        }
      });
    }
    
    setTimeout(() => {
      this.signatureModal?.openModal();
    }, 100);
  }

  onSignatureSaved(signature: DrawnSignature) {
    if (!this.selectedUser) return;

    console.log('New signature saved for:', this.selectedUser.name);
    console.log('Signature type:', signature.type);
    console.log('Image data length:', signature.imageData.length);

    // Store the new signature (replaces old one if exists)
    this.userSignatures.set(this.selectedUser.id, signature);
    
    this.modalService.showAlert(
      'Success',
      'Signature saved! Now place it on the PDF by drawing boxes.',
      'info'
    );
  }

  // Get all user signatures as Map for PDF viewer
  getUserSignaturesMap(): Map<string, string> {
    const map = new Map<string, string>();
    this.userSignatures.forEach((sig, userId) => {
      map.set(userId, sig.imageData);
    });
    return map;
  }

  // Generate signed PDF with visual signatures
  async generateSignedPDF(): Promise<Blob | null> {
    if (!this.uploadedFile) {
      console.error('No uploaded file');
      return null;
    }

    console.log('Generating signed PDF...');
    console.log('Visual signatures to embed:', this.visualSignatures.length);

    try {
      // Import pdf-lib
      const { PDFDocument } = await import('pdf-lib');
      console.log('pdf-lib imported successfully');
      
      // Load the original PDF
      const arrayBuffer = await this.uploadedFile.arrayBuffer();
      console.log('PDF loaded, size:', arrayBuffer.byteLength);
      
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      console.log('PDFDocument created');
      
      // Get all pages
      const pages = pdfDoc.getPages();
      console.log('Total pages:', pages.length);

      // Group signatures by page
      const signaturesByPage = new Map<number, VisualSignatureArea[]>();
      this.visualSignatures.forEach(sig => {
        if (!signaturesByPage.has(sig.pageNumber)) {
          signaturesByPage.set(sig.pageNumber, []);
        }
        signaturesByPage.get(sig.pageNumber)!.push(sig);
      });

      console.log('Signatures grouped by page:', signaturesByPage.size, 'pages');

      // Draw signatures on each page
      for (const [pageNumber, sigs] of signaturesByPage.entries()) {
        console.log(`Processing page ${pageNumber} with ${sigs.length} signatures`);
        
        const page = pages[pageNumber - 1]; // Pages are 0-indexed
        if (!page) {
          console.warn(`Page ${pageNumber} not found`);
          continue;
        }

        const { width: pageWidth, height: pageHeight } = page.getSize();
        console.log(`Page ${pageNumber} size:`, pageWidth, 'x', pageHeight);

        // IMPORTANT: Canvas scale is 1.5, but PDF is scale 1.0
        // We need to convert canvas coordinates back to PDF coordinates
        const CANVAS_SCALE = 1.5;

        for (const sig of sigs) {
          try {
            console.log(`Embedding signature for ${sig.userName} at canvas coords (${sig.area.x}, ${sig.area.y})`);
            
            // Convert base64 to PNG image and embed
            const imageData = sig.signatureImageData;
            const pngImage = await pdfDoc.embedPng(imageData);
            console.log('PNG image embedded successfully');
            
            // Get actual image dimensions to maintain aspect ratio
            const imgDims = pngImage.scale(1);
            const imageAspectRatio = imgDims.width / imgDims.height;

            // Convert canvas coordinates to PDF coordinates
            const pdfX = sig.area.x / CANVAS_SCALE;
            let pdfWidth = sig.area.width / CANVAS_SCALE;
            let pdfHeight = sig.area.height / CANVAS_SCALE;
            
            // Maintain aspect ratio - fit image within the box (like object-fit: contain)
            const boxAspectRatio = pdfWidth / pdfHeight;
            
            if (imageAspectRatio > boxAspectRatio) {
              // Image is wider - fit to width
              pdfHeight = pdfWidth / imageAspectRatio;
            } else {
              // Image is taller - fit to height
              pdfWidth = pdfHeight * imageAspectRatio;
            }
            
            // Calculate Y position (PDF coordinates start from bottom-left)
            const canvasY = sig.area.y / CANVAS_SCALE;
            const pdfY = pageHeight - canvasY - pdfHeight;

            console.log(`Converted to PDF coordinates: x=${pdfX}, y=${pdfY}, w=${pdfWidth}, h=${pdfHeight} (aspect ratio preserved)`);

            // Validate coordinates are within page bounds
            if (pdfX < 0 || pdfY < 0 || pdfX + pdfWidth > pageWidth || pdfY + pdfHeight > pageHeight) {
              console.warn(`Signature for ${sig.userName} is partially outside page bounds. Adjusting...`);
              // Don't skip, but log warning
            }

            // Draw the signature image
            page.drawImage(pngImage, {
              x: Math.max(0, pdfX),
              y: Math.max(0, pdfY),
              width: Math.min(pdfWidth, pageWidth - pdfX),
              height: Math.min(pdfHeight, pageHeight - pdfY),
              opacity: 1.0
            });

            console.log(`Successfully drew signature for ${sig.userName}`);
          } catch (error: any) {
            console.error(`Error embedding signature for ${sig.userName}:`, error);
            console.error('Signature data:', sig);
            // Continue with other signatures even if one fails
          }
        }
      }

      console.log('All signatures embedded successfully');

      // Save the modified PDF
      const pdfBytes = await pdfDoc.save();
      console.log('PDF saved, final size:', pdfBytes.length);
      
      // Convert to Blob
      const uint8Array = new Uint8Array(pdfBytes);
      const blob = new Blob([uint8Array], { type: 'application/pdf' });
      
      return blob;
    } catch (error: any) {
      console.error('Error generating signed PDF:', error);
      console.error('Error stack:', error.stack);
      return null;
    }
  }

  // Helper methods for UI
  hasUserSignature(userId: string): boolean {
    return this.userSignatures.has(userId);
  }

  getUserSignatureImage(userId: string): string | null {
    const sig = this.userSignatures.get(userId);
    return sig ? sig.imageData : null;
  }

  getVisualCount(userId: string): number {
    return this.visualSignatures.filter(s => 
      s.userId === userId && !this.cryptoSignatureIds.has(s.signatureId)
    ).length;
  }

  getCryptoCount(userId: string): number {
    return this.visualSignatures.filter(s => 
      s.userId === userId && this.cryptoSignatureIds.has(s.signatureId)
    ).length;
  }

  // Get pages where user has signed
  getUserSignedPages(userId: string): number[] {
    const pages = new Set(
      this.visualSignatures
        .filter(s => s.userId === userId)
        .map(s => s.pageNumber)
    );
    return Array.from(pages).sort((a, b) => a - b);
  }

  // Get pages where user has crypto signatures
  getUserCryptoPages(userId: string): number[] {
    const pages = new Set(
      this.visualSignatures
        .filter(s => s.userId === userId && this.cryptoSignatureIds.has(s.signatureId))
        .map(s => s.pageNumber)
    );
    return Array.from(pages).sort((a, b) => a - b);
  }

  // Check if user has crypto on specific page
  hasUserCryptoOnPage(userId: string, pageNumber: number): boolean {
    return this.visualSignatures.some(s => 
      s.userId === userId && 
      s.pageNumber === pageNumber && 
      this.cryptoSignatureIds.has(s.signatureId)
    );
  }

  // Check if user has crypto on ALL pages they signed
  hasUserCryptoOnAllPages(userId: string): boolean {
    const signedPages = this.getUserSignedPages(userId);
    const cryptoPages = this.getUserCryptoPages(userId);
    
    // Every signed page must have at least one crypto signature
    return signedPages.every(page => cryptoPages.includes(page));
  }

  // Get pages missing crypto for a user
  getUserMissingCryptoPages(userId: string): number[] {
    const signedPages = this.getUserSignedPages(userId);
    const cryptoPages = this.getUserCryptoPages(userId);
    
    return signedPages.filter(page => !cryptoPages.includes(page));
  }

  // Check if user is complete (has crypto on all pages they signed)
  isUserComplete(userId: string): boolean {
    return this.hasUserSignature(userId) && 
           this.visualSignatures.filter(s => s.userId === userId).length > 0 &&
           this.hasUserCryptoOnAllPages(userId);
  }

  // PDF events
  onPageSelected(pageNumber: number) {
    console.log('Page selected:', pageNumber);
  }

  onSignatureAdded(sig: SignatureArea) {
    if (!this.selectedUser) return;

    if (!this.hasUserSignature(this.selectedUser.id)) {
      this.modalService.showAlert(
        'Create Signature First',
        'Please create your signature before placing it.',
        'warning'
      );
      return;
    }

    const signatureImage = this.getUserSignatureImage(this.selectedUser.id);
    if (!signatureImage) return;

    const visualSig: VisualSignatureArea = {
      ...sig,
      signatureImageData: signatureImage
    };

    this.visualSignatures = [...this.visualSignatures, visualSig];
  }

  onSignatureRemoveRequested(signatureId: string) {
    this.modalService.showConfirm(
      'Remove Signature',
      'Remove this signature?',
      () => {
        this.visualSignatures = this.visualSignatures.filter(s => s.signatureId !== signatureId);
        this.cryptoSignatureIds.delete(signatureId);
      }
    );
  }

  onPdfError(error: string) {
    this.modalService.showAlert('Error', error, 'error');
  }

  // Promote to crypto - NO RESTRICTION on single signature per page
  promoteToCrypto(signatureId: string) {
    const sig = this.visualSignatures.find(s => s.signatureId === signatureId);
    if (!sig) return;

    this.cryptoSignatureIds.add(signatureId);
    console.log('Promoted to crypto:', signatureId);
    console.log('Total crypto IDs now:', this.cryptoSignatureIds.size);
    
    // Check if user now has crypto on this page
    const missingPages = this.getUserMissingCryptoPages(sig.userId);
    if (missingPages.length === 0) {
      this.modalService.showAlert(
        '✓ All Pages Covered', 
        `${sig.userName} now has cryptographic signatures on all pages they signed!`,
        'info'
      );
    } else {
      this.modalService.showAlert(
        'Success', 
        `Signature on page ${sig.pageNumber} promoted to cryptographic! ${sig.userName} still needs crypto on: ${missingPages.join(', ')}`,
        'info'
      );
    }
  }

  demoteFromCrypto(signatureId: string) {
    this.cryptoSignatureIds.delete(signatureId);
  }

  isCrypto(signatureId: string): boolean {
    return this.cryptoSignatureIds.has(signatureId);
  }

  // Get signatures by type
  getVisualOnly(): VisualSignatureArea[] {
    return this.visualSignatures.filter(s => !this.cryptoSignatureIds.has(s.signatureId));
  }

  getCryptoSignatures(): VisualSignatureArea[] {
    return this.visualSignatures.filter(s => this.cryptoSignatureIds.has(s.signatureId));
  }

  clearAllSignatures() {
    this.modalService.showConfirm(
      'Clear All',
      'Remove all signatures from PDF?',
      () => {
        this.visualSignatures = [];
        this.cryptoSignatureIds.clear();
      }
    );
  }

  // Helper to check if all users have crypto on all their pages
  allUsersHaveCryptoOnAllPages(): boolean {
    return this.users.every(user => this.hasUserCryptoOnAllPages(user.id));
  }

  // Get crypto status message for UI
  getCryptoStatusMessage(): string {
    const usersWithMissingPages: Array<{user: User, pages: number[]}> = [];
    
    this.users.forEach(user => {
      const missingPages = this.getUserMissingCryptoPages(user.id);
      if (missingPages.length > 0) {
        usersWithMissingPages.push({ user, pages: missingPages });
      }
    });
    
    if (usersWithMissingPages.length === 0) {
      return '✓ All signers have cryptographic signatures on every page';
    } else if (usersWithMissingPages.length === 1) {
      const { user, pages } = usersWithMissingPages[0];
      return `⚠ ${user.name} needs crypto on page(s): ${pages.join(', ')}`;
    } else {
      return `⚠ ${usersWithMissingPages.length} signers need cryptographic signatures on some pages`;
    }
  }

  // Submit with correct validation
  async submitToAPI() {
    // Validation - Document type and priority are now OPTIONAL
    if (!this.uploadedFile) {
      this.modalService.showAlert('Validation Error', 'Upload a PDF file!', 'warning');
      return;
    }

    // Check all users have created signatures
    for (const user of this.users) {
      if (!this.hasUserSignature(user.id)) {
        this.modalService.showAlert('Validation Error', `${user.name} must create signature!`, 'warning');
        return;
      }
      if (this.visualSignatures.filter(s => s.userId === user.id).length === 0) {
        this.modalService.showAlert('Validation Error', `${user.name} must place at least 1 signature!`, 'warning');
        return;
      }
    }

    // CORRECT VALIDATION: Each user must have crypto on EVERY page they signed
    for (const user of this.users) {
      const missingPages = this.getUserMissingCryptoPages(user.id);
      if (missingPages.length > 0) {
        this.modalService.showAlert(
          'Cryptographic Signatures Required',
          `${user.name} needs at least 1 cryptographic signature on page(s): ${missingPages.join(', ')}`,
          'warning'
        );
        return;
      }
    }

    this.submitting = true;

    try {
      console.log('Starting PDF generation...');
      console.log('Visual signatures count:', this.visualSignatures.length);
      
      // Generate signed PDF with visual signatures
      const signedPdfBlob = await this.generateSignedPDF();
      
      if (!signedPdfBlob) {
        this.submitting = false;
        this.modalService.showAlert(
          'PDF Generation Error',
          'Failed to generate signed PDF. Please check console for details.',
          'error'
        );
        return;
      }

      console.log('PDF generated successfully, size:', signedPdfBlob.size);
      // ✅ Download PDF locally before sending
      // this.downloadBlob(signedPdfBlob, 'signed_document.pdf');

      // console.log('PDF generated successfully, size:', signedPdfBlob.size);

      // Prepare crypto signatures for API - GROUP BY USER
      const cryptoSigs = this.getCryptoSignatures();
      
      console.log('Crypto signatures count:', cryptoSigs.length);
      
      // Group crypto signatures by user
      const signerMap = new Map<string, {
        aadhaar: string;
        name: string;
        coordinates: { [page: number]: { x: number; y: number; width: number; height: number } };
        pages: number[];
      }>();

      cryptoSigs.forEach(sig => {
        const user = this.users.find(u => u.id === sig.userId);
        if (!user) return;

        if (!signerMap.has(sig.userId)) {
          signerMap.set(sig.userId, {
            aadhaar: user.email || '',
            name: user.name || '',
            coordinates: {},
            pages: []
          });
        }

        const signerData = signerMap.get(sig.userId)!;
        
        // Convert canvas coordinates (scale 1.5) to PDF coordinates (scale 1.0)
        const CANVAS_SCALE = 1.5;
        
        // Use the actual visual signature coordinates for digital signature placement
        // This will make the digital signature widget overlap exactly with the visual signature
        signerData.coordinates[sig.pageNumber] = {
          x: Math.round(sig.area.x / CANVAS_SCALE),
          y: Math.round(sig.area.y / CANVAS_SCALE),
          width: Math.round(sig.area.width / CANVAS_SCALE),
          height: Math.round(sig.area.height / CANVAS_SCALE)
        };
        
        // Add page to pages array if not already there
        if (!signerData.pages.includes(sig.pageNumber)) {
          signerData.pages.push(sig.pageNumber);
        }
      });

      // Convert map to array and sort pages
      const signers = Array.from(signerMap.values()).map(signer => ({
        ...signer,
        pages: signer.pages.sort((a, b) => a - b)
      }));

      const payload = {
        clientId: 'ARTHNEXT_UAT_Profile',
        clientWebhookUrl: 'https://your-webhook.com/callback',
        metadata: {
          documentType: this.documentType || 'General Document',
          priority: this.priority || 'medium'
        },
        signers: signers
      };

      const formData = new FormData();
      formData.append('data', JSON.stringify(payload));
      // Send the signed PDF with visual signatures embedded
      formData.append('pdf', signedPdfBlob, 'signed_document.pdf');

      console.log('=== API PAYLOAD ===');
      console.log(JSON.stringify(payload, null, 2));
      console.log(`Visual signatures: ${this.visualSignatures.length}`);
      console.log(`Crypto signatures: ${cryptoSigs.length}`);
      console.log('Sending PDF with visual signatures embedded');

      const tab1 = window.open('', '_blank');
      if (!tab1) {
        this.modalService.showAlert('Popup Blocked', 'Please allow popups.', 'error');
        this.submitting = false;
        return;
      }

      tab1.document.write('<p>Preparing eSign document...</p>');

      this.http.post(this.initiateAPI, formData).subscribe({
        next: (res: any) => {
          this.submitting = false;
          if (res?.esignUrl) {
            tab1.location.href = res.esignUrl;
            this.router.navigate(['/esignStatus'], {
              queryParams: { esignId: res?.esignId }
            });
          } else {
            tab1.document.body.innerHTML = '<p>Failed to get eSign URL.</p>';
          }
        },
        error: (err) => {
          this.submitting = false;
          tab1.document.body.innerHTML = '<p>Error occurred.</p>';
          this.modalService.showAlert('Submission Error', `Failed: ${err.message}`, 'error');
        }
      });
    } catch (error: any) {
      this.submitting = false;
      this.modalService.showAlert('Error', `Failed: ${error.message}`, 'error');
    }
  }

    private downloadBlob(blob: Blob, filename: string) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }
}