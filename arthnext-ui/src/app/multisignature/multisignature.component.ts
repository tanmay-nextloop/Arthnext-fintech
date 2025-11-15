import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  PLATFORM_ID,
  Inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { Router } from '@angular/router';
// Import PDF.js types
import type * as pdfjsLibTypes from 'pdfjs-dist';
declare const pdfjsLib: typeof pdfjsLibTypes;

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface User {
  id: string;
  name: string;
  email: string;
  color: string;
}

interface UserSignature {
  signatureId: string; // NEW: Unique ID for each signature
  userId: string;
  userName: string;
  pageNumber: number;
  area: Rectangle;
  color: string;
}

interface ApiPayload {
  documentType: string;
  priority: string;
  pdfFile: File | null;
  signatures: UserSignature[];
}

@Component({
  selector: 'app-multisign',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './multisignature.component.html',
  styleUrls: ['./multisignature.component.scss']
})
export class MultisignatureComponent implements AfterViewInit {
  @ViewChild('pdfContainer') pdfContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('signCanvas') signCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput?: ElementRef<HTMLInputElement>;

  public pdfDoc: any = null;
  selectedPageNumber: number | null = null;
  private signCtx: CanvasRenderingContext2D | null = null;
  loading = false;
  submitting = false;
  response: any = null;

  // Drawing state
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  private currentRenderTask: any = null; // Track active render task
  private justFinishedDrawing = false; // Prevent immediate click after drawing

  // Document metadata
  documentType = '';
  priority = '';
  uploadedFile: File | null = null;

  // User management
  users: User[] = [];
  selectedUser: User | null = null;
  newUserName = '';
  newUserAadhar = '';

  // Signature areas - NOW SUPPORTS MULTIPLE SIGNATURES PER USER
  signatures: UserSignature[] = [];

  // Available colors for different users
  private colors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00', '#00ffff', '#ff8800', '#8800ff'];
  private colorIndex = 0;

  // UI State
  showAddUserForm = false;
  signaturesDropdownOpen = true; // Start expanded by default

  // Modal/Popup state
  showModal = false;
  modalConfig = {
    title: '',
    message: '',
    type: 'info' as 'info' | 'warning' | 'error' | 'confirm',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: () => { },
    onCancel: () => { }
  };

  // API endpoint
  initiateAPI = 'https://peakily-idioplasmatic-kimbra.ngrok-free.dev/api/v1/esign/initiate';

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private http: HttpClient,
    private router: Router
  ) { }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadPdfJs();
    }
  }

  private async loadPdfJs() {
    try {
      const pdfjs = await import('pdfjs-dist');

      if ((pdfjs as any).GlobalWorkerOptions) {
        (pdfjs as any).GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.js';
      }

      console.log('PDF.js loaded, version:', pdfjs.version);
    } catch (error) {
      console.error('Error loading PDF.js:', error);
      alert('Failed to initialize PDF viewer.');
    }
  }

  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadedFile = file;
    this.loading = true;
    this.selectedPageNumber = null;
    this.signatures = [];

    try {
      const pdfjs = await import('pdfjs-dist');
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const loadingTask = (pdfjs as any).getDocument({ data: typedArray });
      this.pdfDoc = await loadingTask.promise;

      console.log('PDF loaded successfully, pages:', this.pdfDoc.numPages);

      setTimeout(() => {
        this.renderAllPages();
      }, 100);
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      alert(`Failed to load PDF: ${error.message || 'Unknown error'}`);
    } finally {
      this.loading = false;
    }
  }

  async renderAllPages() {
    if (!this.pdfDoc || !this.pdfContainer) return;

    const container = this.pdfContainer.nativeElement;
    container.innerHTML = '';

    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      try {
        const page = await this.pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        await page.render({ canvasContext: ctx, viewport }).promise;

        canvas.dataset['pageNumber'] = i.toString();
        canvas.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectPage(i);
        });
        canvas.title = `Page ${i}`;

        // Add page number label on thumbnail
        const wrapper = document.createElement('div');
        wrapper.style.position = 'relative';
        wrapper.style.display = 'inline-block';

        const label = document.createElement('div');
        label.textContent = `Page ${i}`;
        label.style.cssText = `
          position: absolute;
          bottom: 5px;
          left: 50%;
          transform: translateX(-50%);
          background: rgba(0,0,0,0.7);
          color: white;
          padding: 3px 8px;
          border-radius: 4px;
          font-size: 11px;
          font-weight: 600;
          pointer-events: none;
        `;

        wrapper.appendChild(canvas);
        wrapper.appendChild(label);
        container.appendChild(wrapper);
      } catch (error) {
        console.error(`Error rendering page ${i}:`, error);
      }
    }
  }

  async selectPage(pageNumber: number) {
    if (!this.pdfDoc || !this.signCanvas) return;

    // Don't change page if currently drawing
    if (this.isDrawing) return;

    this.selectedPageNumber = pageNumber;

    if (!this.signCtx && this.signCanvas) {
      this.signCtx = this.signCanvas.nativeElement.getContext('2d');
    }

    // Highlight selected thumbnail
    if (this.pdfContainer) {
      const allCanvases = this.pdfContainer.nativeElement.querySelectorAll('canvas');
      allCanvases.forEach(c => c.classList.remove('selected'));
      const selectedCanvas = this.pdfContainer.nativeElement.querySelector(
        `[data-page-number="${pageNumber}"]`
      ) as HTMLCanvasElement;
      if (selectedCanvas) {
        selectedCanvas.classList.add('selected');
        // Smooth scroll to selected thumbnail
        selectedCanvas.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    await this.renderSelectedPageWithAreas();
  }

  async renderSelectedPageWithAreas() {
    if (!this.selectedPageNumber || !this.pdfDoc || !this.signCtx || !this.signCanvas) return;

    try {
      // Cancel any ongoing render task
      if (this.currentRenderTask) {
        await this.currentRenderTask.cancel();
        this.currentRenderTask = null;
      }

      const page = await this.pdfDoc.getPage(this.selectedPageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = this.signCanvas.nativeElement;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      // Start new render task and store it
      this.currentRenderTask = page.render({ canvasContext: this.signCtx, viewport });
      await this.currentRenderTask.promise;
      this.currentRenderTask = null;

      // Draw all existing signature areas for this page
      const pageSignatures = this.signatures.filter(s => s.pageNumber === this.selectedPageNumber);
      pageSignatures.forEach(sig => {
        this.drawRectangle(sig.area, sig.color, sig.userName);
      });
    } catch (error: any) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error rendering selected page:', error);
      }
    }
  }

  private drawRectangle(rect: Rectangle, color: string, label: string) {
    if (!this.signCtx) return;

    this.signCtx.strokeStyle = color;
    this.signCtx.lineWidth = 3;
    this.signCtx.setLineDash([5, 5]);
    this.signCtx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    this.signCtx.fillStyle = color.replace(')', ', 0.1)').replace('rgb', 'rgba');
    this.signCtx.fillRect(rect.x, rect.y, rect.width, rect.height);
    this.signCtx.setLineDash([]);

    // Draw label with background
    this.signCtx.fillStyle = color;
    this.signCtx.font = 'bold 14px Arial';
    const textMetrics = this.signCtx.measureText(label);
    const textWidth = textMetrics.width;
    const textHeight = 16;

    // Label background
    this.signCtx.fillRect(rect.x, rect.y - textHeight - 6, textWidth + 10, textHeight + 6);

    // Label text
    this.signCtx.fillStyle = 'white';
    this.signCtx.fillText(label, rect.x + 5, rect.y - 8);
  }

  // NEW: Add click handler to canvas for removing signatures
  onCanvasClick(event: MouseEvent) {
    // Don't process clicks during or immediately after drawing
    if (this.isDrawing || this.justFinishedDrawing) {
      console.log('Click blocked - drawing in progress or just finished');
      return;
    }

    if (!this.selectedPageNumber || !this.signCanvas) return;

    const canvas = this.signCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Calculate scale factor
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get scaled mouse coordinates
    const clickX = (event.clientX - rect.left) * scaleX;
    const clickY = (event.clientY - rect.top) * scaleY;

    // Check if click is inside any signature area
    const pageSignatures = this.signatures.filter(s => s.pageNumber === this.selectedPageNumber);

    for (const sig of pageSignatures) {
      if (this.isPointInRectangle(clickX, clickY, sig.area)) {
        // Show confirmation with user name
        this.showConfirm(
          'Remove Signature',
          `Do you want to remove the signature for ${sig.userName}?`,
          () => this.removeSignature(sig.signatureId)
        );
        return;
      }
    }
  }

  // NEW: Check if point is inside rectangle
  private isPointInRectangle(x: number, y: number, rect: Rectangle): boolean {
    return x >= rect.x &&
      x <= rect.x + rect.width &&
      y >= rect.y &&
      y <= rect.y + rect.height;
  }

  // FIX #1: Correct mouse coordinate calculation with scale adjustment
  onMouseDown(event: MouseEvent) {
    if (!this.selectedPageNumber) {
      this.showAlert('No Page Selected', 'Please select a page first!', 'warning');
      return;
    }
    if (!this.selectedUser) {
      this.showAlert('No User Selected', 'Please select a user first!', 'warning');
      return;
    }

    if (!this.signCanvas) return;

    const canvas = this.signCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Calculate scale factor between canvas internal size and displayed size
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get mouse position relative to canvas and scale to canvas coordinates
    this.startX = (event.clientX - rect.left) * scaleX;
    this.startY = (event.clientY - rect.top) * scaleY;
    this.isDrawing = true;

    console.log('Mouse down at canvas coordinates:', this.startX, this.startY);
    console.log('Scale factors:', { scaleX, scaleY });
  }

  async onMouseMove(event: MouseEvent) {
    if (!this.isDrawing || !this.selectedPageNumber || !this.signCtx || !this.selectedUser || !this.signCanvas) return;

    const canvas = this.signCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Calculate scale factor
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get scaled mouse coordinates
    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;
    const width = mouseX - this.startX;
    const height = mouseY - this.startY;

    try {
      // Cancel any ongoing render task
      if (this.currentRenderTask) {
        await this.currentRenderTask.cancel();
        this.currentRenderTask = null;
      }

      const page = await this.pdfDoc.getPage(this.selectedPageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      this.signCtx.clearRect(0, 0, canvas.width, canvas.height);

      this.currentRenderTask = page.render({ canvasContext: this.signCtx, viewport });
      await this.currentRenderTask.promise;
      this.currentRenderTask = null;

      // Redraw existing areas
      const pageSignatures = this.signatures.filter(s => s.pageNumber === this.selectedPageNumber);
      pageSignatures.forEach(sig => {
        this.drawRectangle(sig.area, sig.color, sig.userName);
      });

      // Draw current selection
      const currentColor = this.selectedUser.color;
      this.signCtx.strokeStyle = currentColor;
      this.signCtx.lineWidth = 3;
      this.signCtx.setLineDash([5, 5]);
      this.signCtx.strokeRect(this.startX, this.startY, width, height);
      this.signCtx.fillStyle = currentColor.replace(')', ', 0.1)').replace('rgb', 'rgba');
      this.signCtx.fillRect(this.startX, this.startY, width, height);
      this.signCtx.setLineDash([]);
    } catch (error: any) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error during rectangle drawing:', error);
      }
    }
  }

  onMouseUp(event: MouseEvent) {
    if (!this.isDrawing || !this.selectedPageNumber || !this.selectedUser || !this.signCanvas) return;

    const canvas = this.signCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Calculate scale factor
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    // Get scaled mouse coordinates
    const endX = (event.clientX - rect.left) * scaleX;
    const endY = (event.clientY - rect.top) * scaleY;

    const area: Rectangle = {
      x: Math.min(this.startX, endX),
      y: Math.min(this.startY, endY),
      width: Math.abs(endX - this.startX),
      height: Math.abs(endY - this.startY)
    };

    // Mark drawing as complete BEFORE any async operations
    this.isDrawing = false;
    this.justFinishedDrawing = true;

    // Reset the flag after a delay
    setTimeout(() => {
      this.justFinishedDrawing = false;
    }, 300);

    // Only add if area is significant (not just a click)
    if (area.width > 20 && area.height > 20) {
      // FIX #2: Check for overlaps before adding
      if (this.checkOverlap(area, this.selectedPageNumber)) {
        this.showAlert(
          'Overlap Detected',
          'Signature area overlaps with an existing signature! Please draw in a different area.',
          'error'
        );
        this.renderSelectedPageWithAreas();
        return;
      }

      // Generate unique signature ID to allow multiple signatures per user
      const userSignature: UserSignature = {
        signatureId: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: this.selectedUser.id,
        userName: this.selectedUser.name,
        pageNumber: this.selectedPageNumber,
        area: area,
        color: this.selectedUser.color
      };

      this.signatures.push(userSignature);

      console.log('New signature area added:', userSignature);
      // console.log(`Total signatures for ${this.selectedUser.name}:`, 
      //   this.signatures.filter(s => s.userId === this.selectedUser.id).length);

      this.renderSelectedPageWithAreas();
    } else {
      // If area is too small, just re-render (it was just a click, not a drag)
      this.renderSelectedPageWithAreas();
    }
  }

  // NEW: Check if new area overlaps with any existing signature on the same page
  private checkOverlap(newArea: Rectangle, pageNumber: number): boolean {
    const pageSignatures = this.signatures.filter(s => s.pageNumber === pageNumber);

    for (const sig of pageSignatures) {
      if (this.rectanglesOverlap(newArea, sig.area)) {
        return true;
      }
    }

    return false;
  }

  // NEW: Check if two rectangles overlap
  private rectanglesOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
    // Check if rectangles do NOT overlap, then negate
    const noOverlap =
      rect1.x + rect1.width < rect2.x ||  // rect1 is left of rect2
      rect2.x + rect2.width < rect1.x ||  // rect2 is left of rect1
      rect1.y + rect1.height < rect2.y || // rect1 is above rect2
      rect2.y + rect2.height < rect1.y;   // rect2 is above rect1

    return !noOverlap;
  }

  onMouseLeave() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.renderSelectedPageWithAreas();
    }
  }

  // User management methods
  addUser() {
    if (!this.newUserName.trim()) {
      this.showAlert('Validation Error', 'Please enter a user name!', 'warning');
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

    console.log('User added:', user);
  }

  selectUser(user: User) {
    this.selectedUser = user;
    console.log('Selected user:', user);
  }

  removeUser(userId: string) {
    this.showConfirm(
      'Remove User',
      'Are you sure? This will also remove all their signatures.',
      () => {
        this.users = this.users.filter(u => u.id !== userId);
        this.signatures = this.signatures.filter(s => s.userId !== userId);

        if (this.selectedUser?.id === userId) {
          this.selectedUser = null;
        }

        this.renderSelectedPageWithAreas();
      }
    );
  }

  // FIX #2: Remove individual signature by signatureId
  removeSignature(signatureId: string) {
    this.signatures = this.signatures.filter(s => s.signatureId !== signatureId);
    this.renderSelectedPageWithAreas();
  }

  // HTML template helper methods
  getSignaturesByUser(userId: string): UserSignature[] {
    return this.signatures.filter(s => s.userId === userId);
  }

  // Group signatures by page for better display
  getSignaturesByPage(): Map<number, UserSignature[]> {
    const pageMap = new Map<number, UserSignature[]>();

    this.signatures.forEach(sig => {
      if (!pageMap.has(sig.pageNumber)) {
        pageMap.set(sig.pageNumber, []);
      }
      pageMap.get(sig.pageNumber)!.push(sig);
    });

    // Sort by page number
    return new Map([...pageMap.entries()].sort((a, b) => a[0] - b[0]));
  }

  // Get all unique pages with signatures
  getPagesWithSignatures(): number[] {
    const pages = [...new Set(this.signatures.map(s => s.pageNumber))];
    return pages.sort((a, b) => a - b);
  }

  // Toggle signatures dropdown
  toggleSignaturesDropdown() {
    this.signaturesDropdownOpen = !this.signaturesDropdownOpen;
  }

  // Modal helper methods
  showAlert(title: string, message: string, type: 'info' | 'warning' | 'error' = 'info') {
    this.modalConfig = {
      title,
      message,
      type,
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm: () => this.closeModal(),
      onCancel: () => this.closeModal()
    };
    this.showModal = true;
  }

  showConfirm(title: string, message: string, onConfirm: () => void, onCancel?: () => void) {
    this.modalConfig = {
      title,
      message,
      type: 'confirm',
      confirmText: 'Yes',
      cancelText: 'No',
      onConfirm: () => {
        this.closeModal();
        onConfirm();
      },
      onCancel: () => {
        this.closeModal();
        if (onCancel) onCancel();
      }
    };
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
  }

  clearAllSignatures() {
    this.showConfirm(
      'Clear All Signatures',
      'Are you sure you want to clear all signature areas? This cannot be undone.',
      () => {
        this.signatures = [];
        this.renderSelectedPageWithAreas();
      }
    );
  }

  // Updated to return count instead of single signature
  getUserSignatureCount(userId: string): number {
    return this.signatures.filter(s => s.userId === userId).length;
  }

  // async submitToAPI() {
  //   // Validation
  //   if (!this.documentType.trim()) {
  //     this.showAlert('Validation Error', 'Please enter Document Type!', 'warning');
  //     return;
  //   }

  //   if (!this.priority.trim()) {
  //     this.showAlert('Validation Error', 'Please select Priority!', 'warning');
  //     return;
  //   }

  //   if (!this.uploadedFile) {
  //     this.showAlert('Validation Error', 'Please upload a PDF file!', 'warning');
  //     return;
  //   }

  //   if (this.signatures.length === 0) {
  //     this.showAlert('Validation Error', 'Please add at least one signature area!', 'warning');
  //     return;
  //   }

  //   this.submitting = true;

  //   try {
  //     const clientId = 'ARTHNEXT_UAT_Profile';
  //     const clientWebhookUrl = 'https://your-client-webhook.com/esign/callback';

  //     // Group signatures by user to get all their signature coordinates
  //     const userSignatureMap = new Map<string, UserSignature[]>();
  //     this.signatures.forEach(sig => {
  //       if (!userSignatureMap.has(sig.userId)) {
  //         userSignatureMap.set(sig.userId, []);
  //       }
  //       userSignatureMap.get(sig.userId)!.push(sig);
  //     });

  //     // Build signers array with multiple coordinates per user
  //     const signers = Array.from(userSignatureMap.entries()).map(([userId, sigs]) => {
  //       const user = this.users.find(u => u.id === userId);
  //       return {
  //         aadhaar: user?.email || '',
  //         name: sigs[0].userName,
  //         signatures: sigs.map(sig => ({
  //           coordinates: {
  //             x: Math.round(sig.area.x),
  //             y: Math.round(sig.area.y),
  //             width: Math.round(sig.area.width),
  //             height: Math.round(sig.area.height)
  //           },
  //           page: sig.pageNumber
  //         }))
  //       };
  //     });

  //     const payload = {
  //       clientId: clientId,
  //       clientWebhookUrl: clientWebhookUrl,
  //       metadata: {
  //         documentType: this.documentType,
  //         priority: this.priority
  //       },
  //       signers: signers
  //     };

  //     const formData = new FormData();
  //     formData.append('data', JSON.stringify(payload));

  //     if (this.uploadedFile) {
  //       formData.append('pdf', this.uploadedFile, this.uploadedFile.name);
  //     }

  //     console.log('=== FINAL API PAYLOAD ===');
  //     console.log(JSON.stringify(payload, null, 2));

  //     const tab1 = window.open('', '_blank');
  //     if (!tab1) {
  //       this.showAlert('Popup Blocked', 'Popup blocked! Please allow popups for this site.', 'error');
  //       return;
  //     }
  //     tab1.document.write('<p>Preparing eSign document, please wait...</p>');
  //     this.router.navigate(['/esignStatus'], {
  //       queryParams: { esignId: "fgdghd" }
  //     });
  //     this.http
  //       .post(this.initiateAPI, formData)
  //       .subscribe({
  //         next: (res: any) => {
  //           console.log('✅ Success:', res);
  //           this.submitting = false;
  //           this.response = res;

  //           if (res?.esignUrl) {

  //             tab1.location.href = res.esignUrl;
  //             tab1.document.body.innerHTML += `
  //               <p><a href="${res.esignUrl}" target="_blank">Click here if not redirected</a></p>
  //             `;
  //           } else {
  //             tab1.document.body.innerHTML = '<p>Failed to get eSign URL.</p>';
  //           }
  //         },
  //         error: (err) => {
  //           console.error('❌ Error:', err);
  //           this.submitting = false;
  //           this.response = err;
  //           tab1.document.body.innerHTML = '<p>Error initiating eSign process.</p>';
  //           this.showAlert('Submission Error', `Failed to submit: ${err.message || 'Unknown error'}`, 'error');
  //         }
  //       });

  //   } catch (error: any) {
  //     console.error('API Error:', error);
  //     this.showAlert('Submission Error', `Failed to submit: ${error.message || 'Unknown error'}`, 'error');
  //   } finally {
  //     this.submitting = false;
  //   }
  //   this.resetForm();
  // }

  async submitToAPI() {
    // Validation
    if (!this.documentType.trim()) {
      this.showAlert('Validation Error', 'Please enter Document Type!', 'warning');
      return;
    }

    if (!this.priority.trim()) {
      this.showAlert('Validation Error', 'Please select Priority!', 'warning');
      return;
    }

    if (!this.uploadedFile) {
      this.showAlert('Validation Error', 'Please upload a PDF file!', 'warning');
      return;
    }

    if (this.signatures.length === 0) {
      this.showAlert('Validation Error', 'Please add at least one signature area!', 'warning');
      return;
    }

    this.submitting = true;

    try {
      const clientId = 'ARTHNEXT_UAT_Profile';
      const clientWebhookUrl = 'https://your-client-webhook.com/esign/callback';

      // Group signatures by user to get all their signature coordinates
      const userSignatureMap = new Map<string, UserSignature[]>();
      this.signatures.forEach(sig => {
        if (!userSignatureMap.has(sig.userId)) {
          userSignatureMap.set(sig.userId, []);
        }
        userSignatureMap.get(sig.userId)!.push(sig);
      });

      // Extract unique page numbers from the signatures
      const pageNumbers = Array.from(new Set(this.signatures.map(sig => sig.pageNumber)));

      // Build signers array with multiple coordinates per user
      const signers = Array.from(userSignatureMap.entries()).map(([userId, sigs]) => {
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
      });

      // Build the final payload
      const payload = {
        clientId: clientId,
        clientWebhookUrl: clientWebhookUrl,
        metadata: {
          documentType: this.documentType,
          priority: this.priority
        },
        signers: signers,
        pages: pageNumbers // Add the pages array here
      };

      const formData = new FormData();
      formData.append('data', JSON.stringify(payload));

      if (this.uploadedFile) {
        formData.append('pdf', this.uploadedFile, this.uploadedFile.name);
      }

      console.log('=== FINAL API PAYLOAD ===');
      console.log(JSON.stringify(payload, null, 2));

      const tab1 = window.open('', '_blank');
      if (!tab1) {
        this.showAlert('Popup Blocked', 'Popup blocked! Please allow popups for this site.', 'error');
        return;
      }
      tab1.document.write('<p>Preparing eSign document, please wait...</p>');
      this.router.navigate(['/esignStatus'], {
        queryParams: { esignId: "fgdghd" }
      });
      this.http
        .post(this.initiateAPI, formData)
        .subscribe({
          next: (res: any) => {
            console.log('✅ Success:', res);
            this.submitting = false;
            this.response = res;

            if (res?.esignUrl) {
              tab1.location.href = res.esignUrl;
              tab1.document.body.innerHTML += `
              <p><a href="${res.esignUrl}" target="_blank">Click here if not redirected</a></p>
            `;
            } else {
              tab1.document.body.innerHTML = '<p>Failed to get eSign URL.</p>';
            }
          },
          error: (err) => {
            console.error('❌ Error:', err);
            this.submitting = false;
            this.response = err;
            tab1.document.body.innerHTML = '<p>Error initiating eSign process.</p>';
            this.showAlert('Submission Error', `Failed to submit: ${err.message || 'Unknown error'}`, 'error');
          }
        });

    } catch (error: any) {
      console.error('API Error:', error);
      this.showAlert('Submission Error', `Failed to submit: ${error.message || 'Unknown error'}`, 'error');
    } finally {
      this.submitting = false;
    }
    this.resetForm();
  }


  resetForm() {
    this.documentType = '';
    this.priority = '';
    this.uploadedFile = null;
    this.users = [];
    this.selectedUser = null;
    this.signatures = [];
    this.pdfDoc = null;
    this.selectedPageNumber = null;
    this.colorIndex = 0;

    if (this.fileInput) {
      this.fileInput.nativeElement.value = '';
    }
    if (this.pdfContainer) {
      this.pdfContainer.nativeElement.innerHTML = '';
    }
    if (this.signCanvas && this.signCtx) {
      const canvas = this.signCanvas.nativeElement;
      this.signCtx.clearRect(0, 0, canvas.width, canvas.height);
    }
  }

  exportCoordinates() {
    const payload = {
      documentType: this.documentType,
      priority: this.priority,
      fileName: this.uploadedFile?.name || '',
      signatures: this.signatures
    };

    const data = JSON.stringify(payload, null, 2);
    console.log('Exported Data:', data);

    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signature-data.json';
    a.click();
    window.URL.revokeObjectURL(url);
  }
}