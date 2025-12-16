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

  // File handling
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.uploadedFile = input.files?.[0] || null;
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

        const { height } = page.getSize();
        console.log(`Page ${pageNumber} height:`, height);

        for (const sig of sigs) {
          try {
            console.log(`Embedding signature for ${sig.userName} at (${sig.area.x}, ${sig.area.y})`);
            
            // Get signature image data
            let imageData = sig.signatureImageData;
            
            console.log('Image data length:', imageData.length);
            console.log('Image data starts with:', imageData.substring(0, 50));
            
            // Ensure it's a valid data URL
            if (!imageData.startsWith('data:image/png;base64,')) {
              console.error('Invalid image format:', imageData.substring(0, 50));
              continue;
            }
            
            // Extract base64 data
            const base64Data = imageData.split('base64,')[1];
            console.log('Base64 data length:', base64Data.length);
            console.log('Base64 first 50 chars:', base64Data.substring(0, 50));
            
            // Convert base64 to Uint8Array for pdf-lib
            const binaryString = atob(base64Data);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
              bytes[i] = binaryString.charCodeAt(i);
            }
            
            console.log('Converted to bytes, length:', bytes.length);
            
            // Embed PNG
            const pngImage = await pdfDoc.embedPng(bytes);
            console.log('PNG embedded successfully, dimensions:', pngImage.width, 'x', pngImage.height);

            // Convert coordinates (PDF coordinates start from bottom-left)
            const pdfY = height - sig.area.y - sig.area.height;

            console.log('Drawing at:', {
              x: sig.area.x,
              y: pdfY,
              width: sig.area.width,
              height: sig.area.height
            });

            // Draw image on PDF
            page.drawImage(pngImage, {
              x: sig.area.x,
              y: pdfY,
              width: sig.area.width,
              height: sig.area.height,
            });
            
            console.log(`✅ Signature drawn successfully for ${sig.userName}`);
          } catch (error: any) {
            console.error('❌ Error embedding signature:', error);
            console.error('Error message:', error.message);
            console.error('Error stack:', error.stack);
            console.error('Signature data:', {
              userName: sig.userName,
              pageNumber: sig.pageNumber,
              area: sig.area,
              imageDataPrefix: sig.signatureImageData.substring(0, 100)
            });
          }
        }
      }

      console.log('All signatures processed, saving PDF...');
      
      // Save modified PDF
      const pdfBytes = await pdfDoc.save();
      console.log('PDF saved, size:', pdfBytes.length);
      
      // Convert to Blob
      const uint8Array = new Uint8Array(pdfBytes);
      const blob = new Blob([uint8Array], { type: 'application/pdf' });
      
      console.log('PDF Blob created, size:', blob.size);
      return blob;
      
    } catch (error: any) {
      console.error('Error generating signed PDF:', error);
      console.error('Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      return null;
    }
  }

  // Check status
  hasUserSignature(userId: string): boolean {
    return this.userSignatures.has(userId);
  }

  getUserSignatureImage(userId: string): string | null {
    return this.userSignatures.get(userId)?.imageData || null;
  }

  getVisualCount(userId: string): number {
    return this.visualSignatures.filter(s => s.userId === userId).length;
  }

  getCryptoCount(userId: string): number {
    return this.visualSignatures.filter(s => 
      s.userId === userId && this.cryptoSignatureIds.has(s.signatureId)
    ).length;
  }

  isUserComplete(userId: string): boolean {
    return this.hasUserSignature(userId) && 
           this.getVisualCount(userId) > 0 && 
           this.getCryptoCount(userId) === 1;
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

  // Promote to crypto
  promoteToCrypto(signatureId: string) {
    const sig = this.visualSignatures.find(s => s.signatureId === signatureId);
    if (!sig) return;

    // STRICT CHECK: Count how many crypto signatures this user already has on THIS PAGE
    const userCryptoOnThisPage = this.visualSignatures.filter(s => 
      s.userId === sig.userId && 
      s.pageNumber === sig.pageNumber &&
      this.cryptoSignatureIds.has(s.signatureId)
    );

    console.log('Crypto check for', sig.userName, 'on page', sig.pageNumber);
    console.log('Existing crypto on this page:', userCryptoOnThisPage.length);

    if (userCryptoOnThisPage.length >= 1) {
      this.modalService.showAlert(
        'Limit Reached',
        `${sig.userName} already has a cryptographic signature on page ${sig.pageNumber}. Each signer can only have ONE cryptographic signature per page.`,
        'warning'
      );
      return;
    }

    this.cryptoSignatureIds.add(signatureId);
    console.log('Promoted to crypto:', signatureId);
    console.log('Total crypto IDs now:', this.cryptoSignatureIds.size);
    
    this.modalService.showAlert('Success', 'Signature promoted to cryptographic!', 'info');
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

  // Submit
  async submitToAPI() {
    // Validation - Document type and priority are OPTIONAL now
    if (!this.uploadedFile) {
      this.modalService.showAlert('Validation Error', 'Upload a PDF file!', 'warning');
      return;
    }

    // Check all users complete
    for (const user of this.users) {
      if (!this.hasUserSignature(user.id)) {
        this.modalService.showAlert('Validation Error', `${user.name} must create signature!`, 'warning');
        return;
      }
      if (this.getVisualCount(user.id) === 0) {
        this.modalService.showAlert('Validation Error', `${user.name} must place at least 1 signature!`, 'warning');
        return;
      }
      
      // Strict validation: Check crypto per page
      const userVisualSigs = this.visualSignatures.filter(s => s.userId === user.id);
      const pages = new Set(userVisualSigs.map(s => s.pageNumber));
      
      // For each page where user has signatures, check if at least one is crypto
      for (const pageNum of pages) {
        const sigsOnPage = userVisualSigs.filter(s => s.pageNumber === pageNum);
        const cryptoOnPage = sigsOnPage.filter(s => this.cryptoSignatureIds.has(s.signatureId));
        
        if (cryptoOnPage.length === 0) {
          this.modalService.showAlert(
            'Validation Error', 
            `${user.name} must have at least 1 cryptographic signature on page ${pageNum}!`,
            'warning'
          );
          return;
        }
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
    const downloadLink = document.createElement('a');
    downloadLink.href = URL.createObjectURL(signedPdfBlob);
    downloadLink.download = 'signed_document.pdf';  // Set the name for the downloaded PDF file

    // Append the link to the DOM, trigger the click, and remove it
    document.body.appendChild(downloadLink);
    downloadLink.click();
    document.body.removeChild(downloadLink);
      console.log('PDF generated successfully, size:', signedPdfBlob.size);

      // Prepare crypto signatures for API
      const cryptoSigs = this.getCryptoSignatures();
      
      console.log('Crypto signatures count:', cryptoSigs.length);
      
      const signers = cryptoSigs.map(sig => {
        const user = this.users.find(u => u.id === sig.userId);
        return {
          aadhaar: user?.email || '',
          name: user?.name || '',
          coordinates: {
            [sig.pageNumber]: {
              x: Math.round(sig.area.x),
              y: Math.round(sig.area.y),
              width: Math.round(sig.area.width),
              height: Math.round(sig.area.height)
            }
          },
          pages: [sig.pageNumber]
        };
      });

      const payload = {
        clientId: 'ARTHNEXT_UAT_Profile',
        clientWebhookUrl: 'https://your-webhook.com/callback',
        metadata: {
          documentType: this.documentType,
          priority: this.priority
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
}