import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';

// Import from shared - CLEAN!
import { ModalComponent } from '../shared/components/modal/modal.component';
import { ModalService } from '../shared/services/modal.service';
import { PdfViewerComponent } from '../shared/components/pdf-viewer/pdf-viewer.component';
import { User, SignatureArea } from '../shared/models/signature.models';
import { SignatureListComponent } from '../shared/components/signature-list/'

@Component({
  selector: 'app-multisignature',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    HttpClientModule,
    ModalComponent,       // ← Shared component
    PdfViewerComponent,    // ← Shared component
    SignatureListComponent
  ],
  templateUrl: './multisignature.component.html',
  styleUrls: ['./multisignature.component.scss']
})
export class MultisignatureComponent {
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

  // Signatures
  signatures: SignatureArea[] = [];

  // UI State
  signaturesDropdownOpen = true;
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
    private modalService: ModalService,  // ← Injected service
    private http: HttpClient,
    private router: Router
  ) { }

  // File handling
  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    this.uploadedFile = input.files?.[0] || null;
  }

  // User management
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

  // PDF Viewer event handlers
  onPageSelected(pageNumber: number) {
    console.log('Page selected:', pageNumber);
  }
onSignatureAdded(sig: SignatureArea) {
  // Add the new signature to the array
  this.signatures = [...this.signatures, sig];
  // Important: create new array reference for change detection
}

handleListRemove(id: string) {
  this.modalService.showConfirm(
    'Remove Signature',
    'Remove this signature?',
    () => {
      // Remove and create new array reference
      this.signatures = this.signatures.filter(s => s.signatureId !== id);
    }
  );
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
    this.modalService.showConfirm(
      'Remove Signature',
      'Do you want to remove this signature?',
      () => {
        this.signatures = this.signatures.filter(
          s => s.signatureId !== signatureId
        );
      }
    );
  }
  // handleClearAll() {
  //   this.modalService.showConfirm(
  //     'Clear All',
  //     'Remove all signatures?',
  //     () => this.signatures = []
  //   );
  // }



  onPdfError(error: string) {
    this.modalService.showAlert('Error', error, 'error');
  }

  // Signature helpers
  getUserSignatureCount(userId: string): number {
    return this.signatures.filter(s => s.userId === userId).length;
  }

  removeSignature(signatureId: string) {
    this.signatures = this.signatures.filter(
      s => s.signatureId !== signatureId
    );
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
    const pages = [...new Set(this.signatures.map(s => s.pageNumber))];
    return pages.sort((a, b) => a - b);
  }

  getSignaturesByPage(): Map<number, SignatureArea[]> {
    const pageMap = new Map<number, SignatureArea[]>();
    this.signatures.forEach(sig => {
      if (!pageMap.has(sig.pageNumber)) {
        pageMap.set(sig.pageNumber, []);
      }
      pageMap.get(sig.pageNumber)!.push(sig);
    });
    return new Map([...pageMap.entries()].sort((a, b) => a[0] - b[0]));
  }

  toggleSignaturesDropdown() {
    this.signaturesDropdownOpen = !this.signaturesDropdownOpen;
  }

  // handleListRemove(signatureId: string) {
  //   this.removeSignature(signatureId);
  // }
  // API Submission
  async submitToAPI() {
    // Validation
    if (!this.documentType.trim()) {
      this.modalService.showAlert(
        'Validation Error',
        'Please enter Document Type!',
        'warning'
      );
      return;
    }

    if (!this.priority.trim()) {
      this.modalService.showAlert(
        'Validation Error',
        'Please select Priority!',
        'warning'
      );
      return;
    }

    if (!this.uploadedFile) {
      this.modalService.showAlert(
        'Validation Error',
        'Please upload a PDF file!',
        'warning'
      );
      return;
    }

    if (this.signatures.length === 0) {
      this.modalService.showAlert(
        'Validation Error',
        'Please add at least one signature area!',
        'warning'
      );
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

      // Build signers array
      const signers = Array.from(userSignatureMap.entries()).map(
        ([userId, sigs]) => {
          const user = this.users.find(u => u.id === userId);
          return {
            aadhaar: user?.email || '',
            name: sigs[0].userName,
            signatures: sigs.map(sig => ({
              coordinates: {
                x: Math.round(sig.area.x),
                y: Math.round(sig.area.y),
                width: Math.round(sig.area.width),
                height: Math.round(sig.area.height)
              },
              page: sig.pageNumber
            }))
          };
        }
      );

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

      // Open tab and submit
      const tab1 = window.open('', '_blank');
      if (!tab1) {
        this.modalService.showAlert(
          'Popup Blocked',
          'Please allow popups for this site.',
          'error'
        );
        return;
      }

      tab1.document.write('<p>Preparing eSign document...</p>');
      this.router.navigate(['/esignStatus'], {
        queryParams: { esignId: "fgdghd" }
      });
      this.http.post(this.initiateAPI, formData).subscribe({
        next: (res: any) => {
          this.submitting = false;
          if (res?.esignUrl) {
            tab1.location.href = res.esignUrl;
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
      this.modalService.showAlert(
        'Error',
        `Failed: ${error.message}`,
        'error'
      );
    } finally {
      this.submitting = false;
    }
  }



}