// pdf-viewer.component.ts - FINAL VERSION WITH ALL CORRECTIONS
// Changes: Removed jump-to-page, dotted border only (no fill), no name while dragging

import {
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
  signal,
  effect,
  untracked,
  AfterViewInit,
  PLATFORM_ID,
  Inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

import type * as pdfjsLibTypes from 'pdfjs-dist';
declare const pdfjsLib: typeof pdfjsLibTypes;

export interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface SignatureArea {
  signatureId: string;
  userId: string;
  userName: string;
  pageNumber: number | 'all';
  area: Rectangle;
  color: string;
  isAllPages?: boolean;
}

export interface User {
  id: string;
  name: string;
  color: string;
}

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="pdf-viewer-container">
      <!-- Page Counter -->
      <div *ngIf="pdfDoc" class="pdf-info">
        <span class="pdf-icon">📄</span>
        <strong>PDF Pages:</strong> {{ pdfDoc.numPages }}
        <span *ngIf="selectedPageNumber()" class="current-page">
          | Currently viewing: Page {{ selectedPageNumber() }}
        </span>
      </div>

      <!-- All Pages Toggle -->
      <div *ngIf="selectedUser() && selectedPageNumber()" class="all-pages-toggle">
        <label class="toggle-label">
          <div class="toggle-wrapper">
            <input 
              type="checkbox" 
              [(ngModel)]="applyToAllPages"
              (ngModelChange)="onAllPagesToggleChange($event)"
              class="toggle-checkbox"
              [disabled]="isDrawing"
            />
            <span class="toggle-text">
              <span class="toggle-icon">🌐</span>
              Apply signature to ALL {{ pdfDoc?.numPages || 0 }} pages
            </span>
          </div>
          <span class="toggle-hint">
            ⓘ One signature will be placed at the same position on every page. 
            Only one signature per user allowed when this is enabled.
          </span>
        </label>
      </div>

      <!-- PDF Thumbnails (NO HEADER - REMOVED) -->
      <div class="pdf-thumbnails" #pdfContainer></div>

      <!-- Main Canvas Container with Overlay -->
      <div class="canvas-wrapper" [class.hidden]="!selectedPageNumber()">
        <div class="canvas-header">
          <span class="page-indicator">
            📄 Page {{ selectedPageNumber() }} of {{ pdfDoc?.numPages || 0 }}
          </span>
          <span class="draw-instruction">
            ✏️ Click and drag to draw signature area
          </span>
        </div>
        
        <canvas
          #signCanvas
          class="sign-canvas"
          (mousedown)="onMouseDown($event)"
          (mousemove)="onMouseMove($event)"
          (mouseup)="onMouseUp($event)"
          (mouseleave)="onMouseLeave()"
        ></canvas>
        
        <!-- Remove Buttons Overlay -->
        <div class="buttons-overlay">
          <button
            *ngFor="let sig of getPageSignatures()"
            class="remove-btn"
            [style.left.px]="getRemoveButtonPosition(sig).x"
            [style.top.px]="getRemoveButtonPosition(sig).y"
            (click)="onRemoveClick(sig.signatureId)"
            [title]="sig.isAllPages ? 'Remove from all pages' : 'Remove signature'"
          >
            ✕
          </button>
        </div>
      </div>

      <div *ngIf="loading()" class="loading">
        <div class="spinner"></div>
        <p>Loading PDF...</p>
      </div>
    </div>
  `,
  styles: [`
    .pdf-viewer-container {
      width: 100%;
    }

    .pdf-info {
      background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
      padding: 12px 20px;
      border-radius: 8px;
      margin-bottom: 15px;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 14px;
      color: #2c3e50;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }

    .pdf-icon {
      font-size: 20px;
    }

    .current-page {
      color: #27ae60;
      font-weight: 600;
    }

    .all-pages-toggle {
      background: linear-gradient(135deg, #e8f4f8 0%, #f0f8ff 100%);
      padding: 15px 20px;
      border-radius: 8px;
      margin-bottom: 20px;
      border-left: 4px solid #3498db;
      box-shadow: 0 2px 6px rgba(52, 152, 219, 0.1);
    }

    .toggle-label {
      display: flex;
      flex-direction: column;
      gap: 8px;
      cursor: pointer;
      user-select: none;
    }

    .toggle-wrapper {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .toggle-checkbox {
      width: 20px;
      height: 20px;
      cursor: pointer;
      accent-color: #3498db;
    }

    .toggle-checkbox:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .toggle-text {
      font-size: 16px;
      font-weight: 600;
      color: #2c3e50;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .toggle-icon {
      font-size: 18px;
    }

    .toggle-hint {
      font-size: 13px;
      color: #7f8c8d;
      margin-left: 30px;
      font-style: italic;
      line-height: 1.4;
    }

    .pdf-thumbnails {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
      gap: 15px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      max-height: 500px;
      overflow-y: auto;
      overflow-x: hidden;
      scroll-behavior: smooth;
      margin-bottom: 20px;
    }

    .pdf-thumbnails::-webkit-scrollbar {
      width: 10px;
    }

    .pdf-thumbnails::-webkit-scrollbar-track {
      background: #ecf0f1;
      border-radius: 4px;
    }

    .pdf-thumbnails::-webkit-scrollbar-thumb {
      background: #95a5a6;
      border-radius: 4px;
    }

    .pdf-thumbnails::-webkit-scrollbar-thumb:hover {
      background: #7f8c8d;
    }

    .canvas-wrapper {
      position: relative;
      display: inline-block;
      margin-bottom: 20px;
      max-width: 100%;
      overflow: hidden;
      border: 2px solid #34495e;
      border-radius: 8px;
      background: white;
    }

    .canvas-wrapper.hidden {
      display: none;
    }

    .canvas-header {
      background: #34495e;
      color: white;
      padding: 10px 15px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 14px;
    }

    .page-indicator {
      font-weight: 600;
    }

    .draw-instruction {
      font-size: 12px;
      color: #ecf0f1;
      font-style: italic;
    }

    .sign-canvas {
      display: block;
      cursor: crosshair;
      max-width: 100%;
      height: auto;
      background: white;
    }

    .buttons-overlay {
      position: absolute;
      top: 44px; /* Account for canvas header */
      left: 0;
      width: 100%;
      height: calc(100% - 44px);
      pointer-events: none;
    }

    .remove-btn {
      position: absolute;
      width: 28px;
      height: 28px;
      border-radius: 50%;
      background: #e74c3c;
      color: white;
      border: 2px solid white;
      font-size: 16px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.2s;
      pointer-events: auto;
      z-index: 10;
      line-height: 1;
      padding: 0;
      transform: translate(-50%, -50%);
    }

    .remove-btn:hover {
      background: #c0392b;
      transform: translate(-50%, -50%) scale(1.15) rotate(90deg);
      box-shadow: 0 4px 12px rgba(0,0,0,0.4);
    }

    .remove-btn:active {
      transform: translate(-50%, -50%) scale(1.05);
    }

    .loading {
      padding: 40px 20px;
      text-align: center;
      font-size: 18px;
      color: #3498db;
      background: #ecf0f1;
      border-radius: 8px;
      margin: 20px 0;
    }

    .spinner {
      border: 4px solid #f3f3f3;
      border-top: 4px solid #3498db;
      border-radius: 50%;
      width: 50px;
      height: 50px;
      animation: spin 1s linear infinite;
      margin: 0 auto 20px auto;
    }

    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
  `]
})
export class PdfViewerComponent implements AfterViewInit {
  @ViewChild('pdfContainer') pdfContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('signCanvas') signCanvas?: ElementRef<HTMLCanvasElement>;

  // Input signals
  file = input<File | null>(null);
  selectedUser = input<User | null>(null);
  signatures = input<SignatureArea[]>([]);

  // Output signals
  pageSelected = output<number>();
  signatureAdded = output<SignatureArea>();
  signatureRemoveRequested = output<string>();
  errorOccurred = output<string>();

  // Component state
  loading = signal<boolean>(false);
  selectedPageNumber = signal<number | null>(null);
  scale = signal<number>(1.5);
  applyToAllPages = false;

  // PDF.js state
  pdfDoc: any = null;
  private signCtx: CanvasRenderingContext2D | null = null;
  private currentRenderTask: any = null;

  // Drawing state
  isDrawing = false;
  private startX = 0;
  private startY = 0;
  private mouseMoveThrottle: any = null;

  private readonly MAX_SIGNATURE_WIDTH = 300;
  private readonly MAX_SIGNATURE_HEIGHT = 150;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Effect for file changes
    effect(() => {
      const currentFile = this.file();
      if (currentFile && isPlatformBrowser(this.platformId)) {
        untracked(() => this.loadPDF(currentFile));
      }
    });

    // Effect for signature changes
    effect(() => {
      const sigs = this.signatures();
      const pageNum = untracked(() => this.selectedPageNumber());
      if (pageNum && sigs) {
        untracked(() => this.renderSelectedPageWithAreas());
      }
    });
  }

  ngAfterViewInit(): void {
    if (this.signCanvas) {
      this.signCtx = this.signCanvas.nativeElement.getContext('2d');
    }
  }

  private async loadPDF(file: File) {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loading.set(true);
    this.pdfDoc = null;
    this.selectedPageNumber.set(null);

    try {
      if (typeof pdfjsLib === 'undefined') {
        throw new Error('PDF.js library not loaded');
      }

      pdfjsLib.GlobalWorkerOptions.workerSrc =
        'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';

      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      this.pdfDoc = await loadingTask.promise;

      await this.renderThumbnails();
      this.loading.set(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.errorOccurred.emit('Failed to load PDF file');
      this.loading.set(false);
    }
  }

  private selectPage(pageNum: number) {
    this.selectedPageNumber.set(pageNum);
    this.pageSelected.emit(pageNum);

    // Update thumbnail borders
    const container = this.pdfContainer?.nativeElement;
    if (container) {
      Array.from(container.children).forEach((child, idx) => {
        const element = child as HTMLElement;
        if (idx + 1 === pageNum) {
          element.style.borderColor = '#27ae60';
          element.style.borderWidth = '3px';
          element.style.boxShadow = '0 4px 12px rgba(39, 174, 96, 0.4)';
          element.style.transform = 'scale(1.05)';
        } else {
          element.style.borderColor = '#ddd';
          element.style.borderWidth = '2px';
          element.style.boxShadow = 'none';
          element.style.transform = 'scale(1)';
        }
      });
    }

    this.renderSelectedPageWithAreas();
  }

  private async renderThumbnails() {
    if (!this.pdfDoc || !this.pdfContainer) return;

    const container = this.pdfContainer.nativeElement;
    container.innerHTML = '';

    const numPages = this.pdfDoc.numPages;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: 0.25 });

      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
      }

      const wrapper = document.createElement('div');
      wrapper.style.cssText = `
        position: relative;
        cursor: pointer;
        border: 2px solid #ddd;
        border-radius: 6px;
        padding: 8px;
        background: white;
        transition: all 0.3s;
        box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      `;

      wrapper.addEventListener('mouseenter', () => {
        if (this.selectedPageNumber() !== pageNum) {
          wrapper.style.borderColor = '#3498db';
          wrapper.style.transform = 'translateY(-3px) scale(1.02)';
          wrapper.style.boxShadow = '0 4px 8px rgba(52, 152, 219, 0.3)';
        }
      });

      wrapper.addEventListener('mouseleave', () => {
        if (this.selectedPageNumber() !== pageNum) {
          wrapper.style.borderColor = '#ddd';
          wrapper.style.transform = 'scale(1)';
          wrapper.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        }
      });

      wrapper.addEventListener('click', () => {
        this.selectPage(pageNum);
      });

      const label = document.createElement('div');
      label.textContent = `Page ${pageNum}`;
      label.style.cssText = `
        text-align: center;
        margin-top: 8px;
        font-size: 13px;
        color: #555;
        font-weight: 600;
      `;

      wrapper.appendChild(canvas);
      wrapper.appendChild(label);
      container.appendChild(wrapper);
    }
  }

  onAllPagesToggleChange(checked: boolean) {
    const user = this.selectedUser();
    if (!user) return;

    if (checked) {
      const hasSpecificPageSignatures = this.signatures().some(s =>
        s.userId === user.id && !s.isAllPages
      );

      if (hasSpecificPageSignatures) {
        if (confirm(`Remove existing page-specific signatures for ${user.name}?`)) {
          const sigsToRemove = this.signatures().filter(s =>
            s.userId === user.id && !s.isAllPages
          );
          sigsToRemove.forEach(sig => {
            this.signatureRemoveRequested.emit(sig.signatureId);
          });
        } else {
          this.applyToAllPages = false;
        }
      }
    } else {
      const hasAllPagesSignature = this.signatures().some(s =>
        s.userId === user.id && s.isAllPages
      );

      if (hasAllPagesSignature) {
        if (confirm(`Remove ALL PAGES signature for ${user.name}?`)) {
          const sigToRemove = this.signatures().find(s =>
            s.userId === user.id && s.isAllPages
          );
          if (sigToRemove) {
            this.signatureRemoveRequested.emit(sigToRemove.signatureId);
          }
        } else {
          this.applyToAllPages = true;
        }
      }
    }
  }

  private async renderSelectedPageWithAreas() {
    const pageNum = this.selectedPageNumber();
    if (!pageNum || !this.pdfDoc || !this.signCtx || !this.signCanvas) return;

    try {
      if (this.currentRenderTask) {
        await this.currentRenderTask.cancel();
        this.currentRenderTask = null;
      }

      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: this.scale() });
      const canvas = this.signCanvas.nativeElement;
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      this.currentRenderTask = page.render({ canvasContext: this.signCtx, viewport });
      await this.currentRenderTask.promise;
      this.currentRenderTask = null;

      const pageSignatures = this.getPageSignatures();
      pageSignatures.forEach(sig => {
        this.drawRectangle(sig.area, sig.color, sig.userName, sig.isAllPages);
      });
    } catch (error: any) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error rendering selected page:', error);
      }
    }
  }

  private drawRectangle(rect: Rectangle, color: string, label: string, isAllPages?: boolean) {
    if (!this.signCtx) return;

    // CORRECTED: Dotted border ONLY - NO FILL AT ALL
    this.signCtx.strokeStyle = color;
    this.signCtx.lineWidth = 3;
    this.signCtx.setLineDash([8, 4]);
    this.signCtx.strokeRect(rect.x, rect.y, rect.width, rect.height);
    this.signCtx.setLineDash([]);

    // Label with user name
    const displayLabel = isAllPages ? `${label} (ALL PAGES)` : label;

    this.signCtx.fillStyle = color;
    this.signCtx.font = 'bold 14px Arial';
    const textMetrics = this.signCtx.measureText(displayLabel);
    const textWidth = textMetrics.width;
    const textHeight = 16;

    this.signCtx.fillRect(rect.x, rect.y - textHeight - 6, textWidth + 10, textHeight + 6);
    this.signCtx.fillStyle = 'white';
    this.signCtx.fillText(displayLabel, rect.x + 5, rect.y - 8);
  }

  onMouseDown(event: MouseEvent) {
    const pageNum = this.selectedPageNumber();
    if (!pageNum) {
      this.errorOccurred.emit('Please select a page first!');
      return;
    }

    const user = this.selectedUser();
    if (!user) {
      this.errorOccurred.emit('Please select a user first!');
      return;
    }

    if (!this.signCanvas) return;

    const canvas = this.signCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    this.startX = (event.clientX - rect.left) * scaleX;
    this.startY = (event.clientY - rect.top) * scaleY;
    this.isDrawing = true;
  }

  async onMouseMove(event: MouseEvent) {
    const pageNum = this.selectedPageNumber();
    const user = this.selectedUser();

    if (!this.isDrawing || !pageNum || !this.signCtx || !user || !this.signCanvas) return;

    if (this.mouseMoveThrottle) {
      return;
    }

    this.mouseMoveThrottle = setTimeout(() => {
      this.mouseMoveThrottle = null;
    }, 16);

    const canvas = this.signCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;
    // const width = mouseX - this.startX;
    // const height = mouseY - this.startY;

    // 🔒 Enforce max size while dragging
    const width = Math.sign(mouseX - this.startX) * Math.min(Math.abs(mouseX - this.startX), this.MAX_SIGNATURE_WIDTH);
    const height = Math.sign(mouseY - this.startY) * Math.min(Math.abs(mouseY - this.startY), this.MAX_SIGNATURE_HEIGHT);

    try {
      if (this.currentRenderTask) {
        try {
          await this.currentRenderTask.cancel();
        } catch (e) {
          // Ignore
        }
        this.currentRenderTask = null;
      }

      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: this.scale() });

      this.signCtx.clearRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({ canvasContext: this.signCtx, viewport });
      await renderTask.promise;

      const pageSignatures = this.getPageSignatures();
      pageSignatures.forEach(sig => {
        this.drawRectangle(sig.area, sig.color, sig.userName, sig.isAllPages);
      });

      // CORRECTED: During drawing - ONLY dotted border, NO FILL, NO NAME
      const currentColor = user.color;
      this.signCtx.strokeStyle = currentColor;
      this.signCtx.lineWidth = 3;
      this.signCtx.setLineDash([8, 4]);
      this.signCtx.strokeRect(this.startX, this.startY, width, height);
      this.signCtx.setLineDash([]);

      // NO FILL, NO NAME - Just the dotted border
    } catch (error: any) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error during rectangle drawing:', error);
      }
    }
  }

  onMouseUp(event: MouseEvent) {
    const pageNum = this.selectedPageNumber();
    const user = this.selectedUser();

    if (!this.isDrawing || !pageNum || !user || !this.signCanvas) return;

    const canvas = this.signCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const endX = (event.clientX - rect.left) * scaleX;
    const endY = (event.clientY - rect.top) * scaleY;

    const area: Rectangle = {
      x: Math.min(this.startX, endX),
      y: Math.min(this.startY, endY),
      width: Math.abs(endX - this.startX),
      height: Math.abs(endY - this.startY)
    };

    this.isDrawing = false;
    if (
      area.width > this.MAX_SIGNATURE_WIDTH ||
      area.height > this.MAX_SIGNATURE_HEIGHT
    ) {
      this.errorOccurred.emit(
        `Signature area exceeds maximum size (${this.MAX_SIGNATURE_WIDTH} × ${this.MAX_SIGNATURE_HEIGHT})`
      );
      this.renderSelectedPageWithAreas();
      return;
    }

    if (area.width > 20 && area.height > 20) {
      if (this.checkOverlapWithOthers(area, pageNum, user.id)) {
        this.errorOccurred.emit('Signature area overlaps with another user\'s signature!');
        this.renderSelectedPageWithAreas();
        return;
      }

      const userSignature: SignatureArea = {
        signatureId: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        userId: user.id,
        userName: user.name,
        pageNumber: this.applyToAllPages ? 'all' : pageNum,
        area: area,
        color: user.color,
        isAllPages: this.applyToAllPages
      };

      this.signatureAdded.emit(userSignature);
    } else {
      this.renderSelectedPageWithAreas();
    }
  }

  onMouseLeave() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.renderSelectedPageWithAreas();
    }
  }

  onRemoveClick(signatureId: string) {
    this.signatureRemoveRequested.emit(signatureId);
  }

  getPageSignatures(): SignatureArea[] {
    const pageNum = this.selectedPageNumber();
    if (!pageNum) return [];

    return this.signatures().filter(s => {
      if (s.isAllPages) return true;
      return s.pageNumber === pageNum;
    });
  }

  getRemoveButtonPosition(sig: SignatureArea): { x: number; y: number } {
    if (!this.signCanvas) return { x: 0, y: 0 };

    const canvas = this.signCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const x = (sig.area.x + sig.area.width) * scaleX;
    const y = sig.area.y * scaleY;

    return { x, y };
  }

  private checkOverlapWithOthers(newArea: Rectangle, pageNumber: number, currentUserId: string): boolean {
    const pageSignatures = this.signatures().filter(s => {
      if (s.userId === currentUserId) return false;
      if (s.isAllPages) return true;
      return s.pageNumber === pageNumber;
    });

    for (const sig of pageSignatures) {
      if (this.rectanglesOverlap(newArea, sig.area)) {
        return true;
      }
    }

    return false;
  }

  private rectanglesOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
    const noOverlap =
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y;

    return !noOverlap;
  }
}