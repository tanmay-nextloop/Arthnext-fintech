// multisignature.component.ts - COORDINATE FIX
// Converts canvas coordinates to PDF coordinates properly

import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

import { ModalComponent } from '../shared/components/modal/modal.component';
import { ModalService } from '../shared/services/modal.service';
import { PdfViewerComponent } from '../shared/components/pdf-viewer/pdf-viewer.component';
import { User, SignatureArea } from '../shared/models/signature.models';
import { SignatureListComponent } from '../shared/components/signature-list/signature-list.component';

@Component({
  selector: 'app-multisignature',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    ModalComponent,
    PdfViewerComponent,
    SignatureListComponent
  ],
  templateUrl: './multisignature.component.html',
  styleUrls: ['./multisignature.component.scss']
})
export class MultisignatureComponent {
  documentType = '';
  priority = '';
  uploadedFile: File | null = null;

  users: User[] = [];
  selectedUser: User | null = null;
  newUserName = '';
  newUserAadhar = '';
  showAddUserForm = false;

  signatures: SignatureArea[] = [];

  signaturesDropdownOpen = true;
  submitting = false;

  private colors = [
    '#ff0000', '#00ff00', '#0000ff',
    '#ff00ff', '#ffff00', '#00ffff',
    '#ff8800', '#8800ff'
  ];
  private colorIndex = 0;

  initiateAPI = 'https://peakily-idioplasmatic-kimbra.ngrok-free.dev/api/v1/esign/initiate';

  constructor(
    private modalService: ModalService,
    private http: HttpClient,
    private router: Router
  ) { }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const newFile = input.files?.[0] || null;
    
    if (newFile && this.uploadedFile && (this.signatures.length > 0 || this.users.length > 0)) {
      this.modalService.showConfirm(
        'Change PDF',
        'Changing the PDF will clear all signatures and signers. Continue?',
        () => {
          this.uploadedFile = newFile;
          this.signatures = [];
          this.users = [];
          this.selectedUser = null;
          this.colorIndex = 0;
        },
        () => {
          input.value = '';
        }
      );
    } else {
      this.uploadedFile = newFile;
    }
  }

  onAadharInput(event: Event) {
    const input = event.target as HTMLInputElement;
    let value = input.value.replace(/\D/g, '');
    if (value.length > 12) {
      value = value.substring(0, 12);
    }
    this.newUserAadhar = value;
    input.value = value;
  }

  addUser() {
    if (!this.newUserName.trim()) {
      this.modalService.showAlert(
        'Validation Error',
        'Please enter a user name!',
        'warning'
      );
      return;
    }

    if (!this.newUserAadhar.trim()) {
      this.modalService.showAlert(
        'Validation Error',
        'Please enter Aadhar number!',
        'warning'
      );
      return;
    }

    if (this.newUserAadhar.trim().length !== 12) {
      this.modalService.showAlert(
        'Validation Error',
        'Aadhar number must be exactly 12 digits!',
        'warning'
      );
      return;
    }

    const user: User = {
      id: `user_${Date.now()}`,
      name: this.newUserName.trim(),
      email: this.newUserAadhar.trim(),
      color: this.colors[this.colorIndex % this.colors.length]
    };

    this.users.push(user);
    this.colorIndex++;

    this.newUserName = '';
    this.newUserAadhar = '';
    this.showAddUserForm = false;
  }

  selectUser(user: User) {
    this.selectedUser = user;
  }

  removeUser(userId: string) {
    this.modalService.showConfirm(
      'Remove User',
      'Are you sure? This will also remove all their signatures.',
      () => {
        this.users = this.users.filter(u => u.id !== userId);
        this.signatures = this.signatures.filter(s => s.userId !== userId);
        if (this.selectedUser?.id === userId) {
          this.selectedUser = null;
        }
      }
    );
  }

  onPageSelected(pageNumber: number) {
    console.log('Page selected:', pageNumber);
  }

  onSignatureAdded(sig: SignatureArea) {
    if (sig.isAllPages) {
      this.signatures = this.signatures.filter(s => s.userId !== sig.userId);
    } else {
      this.signatures = this.signatures.filter(s => 
        !(s.userId === sig.userId && (s.pageNumber === sig.pageNumber || s.isAllPages))
      );
    }

    this.signatures = [...this.signatures, sig];
  }

  handleListRemove(id: string) {
    const sigToRemove = this.signatures.find(s => s.signatureId === id);
    
    if (sigToRemove?.isAllPages) {
      this.modalService.showConfirm(
        'Remove Signature',
        'This signature is applied to ALL pages. Remove it from all pages?',
        () => {
          this.signatures = this.signatures.filter(s => s.signatureId !== id);
        }
      );
    } else {
      this.modalService.showConfirm(
        'Remove Signature',
        'Remove this signature?',
        () => {
          this.signatures = this.signatures.filter(s => s.signatureId !== id);
        }
      );
    }
  }

  handleClearAll() {
    this.modalService.showConfirm(
      'Clear All',
      'Remove all signatures?',
      () => {
        this.signatures = [];
      }
    );
  }

  onSignatureRemoveRequested(signatureId: string) {
    const sigToRemove = this.signatures.find(s => s.signatureId === signatureId);
    
    if (sigToRemove?.isAllPages) {
      this.modalService.showConfirm(
        'Remove Signature',
        'This signature is applied to ALL pages. Remove it from all pages?',
        () => {
          this.signatures = this.signatures.filter(s => s.signatureId !== signatureId);
        }
      );
    } else {
      this.modalService.showConfirm(
        'Remove Signature',
        'Do you want to remove this signature?',
        () => {
          this.signatures = this.signatures.filter(s => s.signatureId !== signatureId);
        }
      );
    }
  }

  onPdfError(error: string) {
    this.modalService.showAlert('Error', error, 'error');
  }

  getUserSignatureCount(userId: string): number {
    const userSigs = this.signatures.filter(s => s.userId === userId);
    const allPagesSig = userSigs.find(s => s.isAllPages);
    if (allPagesSig) return 1;
    return userSigs.length;
  }

  removeSignature(signatureId: string) {
    this.signatures = this.signatures.filter(s => s.signatureId !== signatureId);
  }

  clearAllSignatures() {
    this.modalService.showConfirm(
      'Clear All Signatures',
      'Are you sure you want to clear all signature areas?',
      () => {
        this.signatures = [];
      }
    );
  }

  getPagesWithSignatures(): number[] {
    const pages = new Set<number>();
    this.signatures.forEach(sig => {
      if (typeof sig.pageNumber === 'number') {
        pages.add(sig.pageNumber);
      }
    });
    return Array.from(pages).sort((a, b) => a - b);
  }

  getSignaturesByPage(): Map<number, SignatureArea[]> {
    const pageMap = new Map<number, SignatureArea[]>();
    this.signatures.forEach(sig => {
      if (typeof sig.pageNumber === 'number') {
        if (!pageMap.has(sig.pageNumber)) {
          pageMap.set(sig.pageNumber, []);
        }
        pageMap.get(sig.pageNumber)!.push(sig);
      }
    });
    return new Map([...pageMap.entries()].sort((a, b) => a[0] - b[0]));
  }

  toggleSignaturesDropdown() {
    this.signaturesDropdownOpen = !this.signaturesDropdownOpen;
  }

  canSubmit(): boolean {
    if (this.submitting) return false;
    if (!this.documentType?.trim()) return false;
    if (!this.priority?.trim()) return false;
    if (!this.uploadedFile) return false;
    if (this.signatures.length === 0) return false;
    if (this.users.length === 0) return false;

    const userIdsWithSignatures = new Set(this.signatures.map(s => s.userId));
    const allUsersHaveSignatures = this.users.every(u => 
      userIdsWithSignatures.has(u.id)
    );

    return allUsersHaveSignatures;
  }

  private validateCoordinates(signatures: SignatureArea[]): boolean {
    return signatures.every(sig => {
      const { x, y, width, height } = sig.area;
      return (
        x >= 0 && 
        y >= 0 && 
        width > 0 && 
        height > 0 &&
        x + width <= 10000 &&
        y + height <= 10000
      );
    });
  }

  /**
   * CRITICAL FIX: Convert canvas coordinates to PDF coordinates
   * Canvas uses scaled coordinates, PDF uses actual page dimensions
   */
  private convertCanvasToPdfCoordinates(canvasCoords: any, scale: number = 1.5): any {
    // PDF.js uses scale 1.5 by default
    // We need to convert back to actual PDF coordinates (scale 1.0)
    return {
      x: Math.round(canvasCoords.x / scale),
      y: Math.round(canvasCoords.y / scale),
      width: Math.round(canvasCoords.width / scale),
      height: Math.round(canvasCoords.height / scale)
    };
  }

  async submitToAPI() {
    if (!this.documentType.trim()) {
      this.modalService.showAlert('Validation Error', 'Please enter Document Type!', 'warning');
      return;
    }

    if (!this.priority.trim()) {
      this.modalService.showAlert('Validation Error', 'Please select Priority!', 'warning');
      return;
    }

    if (!this.uploadedFile) {
      this.modalService.showAlert('Validation Error', 'Please upload a PDF file!', 'warning');
      return;
    }

    if (this.signatures.length === 0) {
      this.modalService.showAlert('Validation Error', 'Please add at least one signature area!', 'warning');
      return;
    }

    const userIdsWithSignatures = new Set(this.signatures.map(s => s.userId));
    const usersWithoutSignatures = this.users.filter(u => !userIdsWithSignatures.has(u.id));
    
    if (usersWithoutSignatures.length > 0) {
      const userNames = usersWithoutSignatures.map(u => u.name).join(', ');
      this.modalService.showAlert(
        'Validation Error', 
        `The following users do not have signatures: ${userNames}. Please add signatures for all users.`,
        'warning'
      );
      return;
    }

    if (!this.validateCoordinates(this.signatures)) {
      this.modalService.showAlert('Validation Error', 'Invalid signature coordinates detected!', 'error');
      return;
    }

    this.submitting = true;

    try {
      const userSignatureMap = new Map<string, SignatureArea[]>();
      this.signatures.forEach(sig => {
        if (!userSignatureMap.has(sig.userId)) {
          userSignatureMap.set(sig.userId, []);
        }
        userSignatureMap.get(sig.userId)!.push(sig);
      });

      // FIXED: Convert coordinates properly
      const signers = Array.from(userSignatureMap.entries()).map(([userId, sigs]) => {
        const user = this.users.find(u => u.id === userId);
        const allPagesSig = sigs.find(s => s.isAllPages);
        
        if (allPagesSig) {
          // Convert canvas coordinates to PDF coordinates
          const pdfCoords = this.convertCanvasToPdfCoordinates(allPagesSig.area);
          
          return {
            aadhaar: user?.email || '',
            name: user?.name || '',
            coordinates: {
              'all': pdfCoords  // Converted coordinates
            },
            pages: ['all']
          };
        } else {
          const coordinates: Record<string, any> = {};
          const pages: number[] = [];

          sigs.forEach(sig => {
            if (typeof sig.pageNumber === 'number') {
              // Convert canvas coordinates to PDF coordinates
              const pdfCoords = this.convertCanvasToPdfCoordinates(sig.area);
              
              coordinates[sig.pageNumber.toString()] = pdfCoords;
              pages.push(sig.pageNumber);
            }
          });

          return {
            aadhaar: user?.email || '',
            name: user?.name || '',
            coordinates: coordinates,
            pages: pages.sort((a, b) => a - b)
          };
        }
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
      if (this.uploadedFile) {
        formData.append('pdf', this.uploadedFile);
      }

      console.log('=== COORDINATE FIXED API PAYLOAD ===');
      console.log(JSON.stringify(payload, null, 2));
      console.log('=== COORDINATE CONVERSION ===');
      console.log('Canvas coordinates are divided by scale (1.5) to get PDF coordinates');
      console.log('Example: Canvas (300, 150) → PDF (200, 100)');

      const tab1 = window.open('', '_blank');
      if (!tab1) {
        this.modalService.showAlert('Popup Blocked', 'Please allow popups for this site.', 'error');
        this.submitting = false;
        return;
      }

      tab1.document.write(`
        <html>
          <head>
            <title>eSign Processing</title>
            <style>
              body {
                font-family: Arial, sans-serif;
                display: flex;
                justify-content: center;
                align-items: center;
                height: 100vh;
                margin: 0;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              }
              .container {
                text-align: center;
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 10px 40px rgba(0,0,0,0.3);
              }
              .spinner {
                border: 4px solid #f3f3f3;
                border-top: 4px solid #667eea;
                border-radius: 50%;
                width: 50px;
                height: 50px;
                animation: spin 1s linear infinite;
                margin: 20px auto;
              }
              @keyframes spin {
                0% { transform: rotate(0deg); }
                100% { transform: rotate(360deg); }
              }
              h2 { color: #333; margin: 0 0 10px 0; }
              p { color: #666; margin: 5px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="spinner"></div>
              <h2>Preparing eSign Document</h2>
              <p>Please wait while we process your request...</p>
            </div>
          </body>
        </html>
      `);

      this.http.post(this.initiateAPI, formData).subscribe({
        next: (res: any) => {
          this.submitting = false;
          console.log('API Response:', res);
          
          if (res?.esignUrl) {
            tab1.location.href = res.esignUrl;
            this.router.navigate(['/esignStatus'], {
              queryParams: { esignId: res?.esignId }
            });
          } else {
            tab1.document.body.innerHTML = `
              <div style="font-family: Arial; padding: 40px; text-align: center;">
                <h2 style="color: #e74c3c;">❌ Error</h2>
                <p>Failed to get eSign URL from the server.</p>
                <p style="color: #7f8c8d; font-size: 14px;">Please close this window and try again.</p>
              </div>
            `;
            this.modalService.showAlert('Submission Error', 'Failed to get eSign URL from API.', 'error');
          }
        },
        error: (err) => {
          this.submitting = false;
          console.error('API Error:', err);
          
          tab1.document.body.innerHTML = `
            <div style="font-family: Arial; padding: 40px; text-align: center;">
              <h2 style="color: #e74c3c;">❌ Error Occurred</h2>
              <p>${err.message || 'Unknown error occurred'}</p>
              <p style="color: #7f8c8d; font-size: 14px;">Please close this window and try again.</p>
            </div>
          `;
          
          this.modalService.showAlert(
            'Submission Error',
            `Failed: ${err.message || 'Unknown error'}`,
            'error'
          );
        }
      });
    } catch (error: any) {
      this.submitting = false;
      this.modalService.showAlert('Error', `Failed: ${error.message}`, 'error');
    }
  }
}