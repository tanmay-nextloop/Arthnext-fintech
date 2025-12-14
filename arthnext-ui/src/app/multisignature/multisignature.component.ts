// multisignature.component.ts
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
    this.uploadedFile = input.files?.[0] || null;
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
    // Validation: Check if user already has signature on this page
    if (sig.isAllPages) {
      // Remove any existing signatures for this user
      this.signatures = this.signatures.filter(s => s.userId !== sig.userId);
    } else {
      // Remove any existing signature on this specific page for this user
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
    
    // Count all-pages signatures as 1
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

  async submitToAPI() {
    // Validation
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

    this.submitting = true;

    try {
      // Group signatures by user
      const userSignatureMap = new Map<string, SignatureArea[]>();
      this.signatures.forEach(sig => {
        if (!userSignatureMap.has(sig.userId)) {
          userSignatureMap.set(sig.userId, []);
        }
        userSignatureMap.get(sig.userId)!.push(sig);
      });

      // Build signers array according to API format
      const signers = Array.from(userSignatureMap.entries()).map(([userId, sigs]) => {
        const user = this.users.find(u => u.id === userId);

        // Check if user has an "all pages" signature
        const allPagesSig = sigs.find(s => s.isAllPages);
        
        if (allPagesSig) {
          // Format for "all pages" signature
          return {
            aadhaar: user?.email || '',
            name: user?.name || '',
            coordinates: {
              '1': {
                x: Math.round(allPagesSig.area.x),
                y: Math.round(allPagesSig.area.y),
                width: Math.round(allPagesSig.area.width),
                height: Math.round(allPagesSig.area.height)
              }
            },
            pages: ['all']
          };
        } else {
          // Format for specific pages
          const coordinates: Record<number, any> = {};
          const pages: number[] = [];

          sigs.forEach(sig => {
            if (typeof sig.pageNumber === 'number') {
              coordinates[sig.pageNumber] = {
                x: Math.round(sig.area.x),
                y: Math.round(sig.area.y),
                width: Math.round(sig.area.width),
                height: Math.round(sig.area.height)
              };
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

      console.log('=== API PAYLOAD ===');
      console.log(JSON.stringify(payload, null, 2));

      const tab1 = window.open('', '_blank');
      if (!tab1) {
        this.modalService.showAlert('Popup Blocked', 'Please allow popups for this site.', 'error');
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
          this.modalService.showAlert(
            'Submission Error',
            `Failed: ${err.message || 'Unknown error'}`,
            'error'
          );
        }
      });
    } catch (error: any) {
      this.modalService.showAlert('Error', `Failed: ${error.message}`, 'error');
    } finally {
      this.submitting = false;
    }
  }
}