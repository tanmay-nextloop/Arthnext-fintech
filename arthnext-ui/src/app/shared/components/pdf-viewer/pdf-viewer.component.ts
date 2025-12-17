// pdf-viewer.component.ts
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

import type * as pdfjsLibTypes from 'pdfjs-dist';
declare const pdfjsLib: typeof pdfjsLibTypes;

// Import from shared models instead of redefining
import { Rectangle, SignatureArea, User } from '../../models/signature.models';

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pdf-viewer-container">
      <!-- PDF Thumbnails -->
      <div class="pdf-thumbnails" #pdfContainer></div>

      <!-- Main Canvas Container -->
      <div class="canvas-wrapper" [class.hidden]="!selectedPageNumber()">
        <div class="canvas-stack" #canvasStack>
          <!-- Base PDF Canvas -->
          <canvas #signCanvas class="sign-canvas"></canvas>
          
          <!-- Drawing Preview Overlay -->
          <div 
            class="drawing-overlay"
            [class.drawing]="isDrawing"
            *ngIf="previewRect && previewRect.width > 5 && previewRect.height > 5"
            [style.left.px]="previewRect.x"
            [style.top.px]="previewRect.y"
            [style.width.px]="Math.min(previewRect.width, maxSignatureWidth)"
            [style.height.px]="Math.min(previewRect.height, maxSignatureHeight)"
            [style.border-color]="selectedUser()?.color || '#000'"
          >
            <img 
              *ngIf="userSignatureImage()" 
              [src]="userSignatureImage()" 
              class="preview-signature-img"
              alt="Signature preview"
            />
            <span class="preview-label" [style.color]="selectedUser()?.color || '#000'">
              {{ selectedUser()?.name || '' }}
            </span>
          </div>

          <!-- Signature Boxes Overlay -->
          <div class="signatures-overlay">
            <div
              *ngFor="let sig of getPageSignatures()"
              class="signature-box"
              [class.crypto]="isCryptoSignature(sig.signatureId)"
              [style.left.px]="sig.area.x"
              [style.top.px]="sig.area.y"
              [style.width.px]="sig.area.width"
              [style.height.px]="sig.area.height"
              [style.border-color]="isCryptoSignature(sig.signatureId) ? '#e67e22' : sig.color"
            >
              <img 
                *ngIf="getSignatureImage(sig.userId)" 
                [src]="getSignatureImage(sig.userId)" 
                class="signature-img"
                alt="Signature"
              />
              <span class="signature-label" [style.color]="isCryptoSignature(sig.signatureId) ? '#e67e22' : sig.color">
                {{ sig.userName }}
                <span *ngIf="isCryptoSignature(sig.signatureId)" class="crypto-badge">🔒</span>
              </span>
              <button
                class="remove-btn"
                [class.crypto]="isCryptoSignature(sig.signatureId)"
                (click)="onRemoveClick(sig.signatureId)"
                title="Remove signature"
              >
                ✕
              </button>
            </div>
          </div>

          <!-- Invisible interaction layer -->
          <div 
            class="interaction-layer"
            (mousedown)="onMouseDown($event)"
            (mousemove)="onMouseMove($event)"
            (mouseup)="onMouseUp()"
            (mouseleave)="onMouseLeave()"
          ></div>
        </div>
      </div>

      <div *ngIf="loading()" class="loading">Loading PDF...</div>
    </div>
  `,
  styles: [`
    .pdf-viewer-container {
      width: 100%;
    }

    .pdf-thumbnails {
      display: flex;
      flex-wrap: wrap;
      gap: 15px;
      padding: 15px;
      background: #f8f9fa;
      border-radius: 8px;
      max-height: 300px;
      overflow-y: auto;
      margin-bottom: 20px;
    }

    .canvas-wrapper {
      position: relative;
      display: inline-block;
      margin-bottom: 20px;
      display:flex;
      justify-content: center;
    }

    .canvas-wrapper.hidden {
      display: none;
    }

    .canvas-stack {
      position: relative;
      display: inline-block;
    }

    .sign-canvas {
      display: block;
      border: 3px solid #2c3e50;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-radius: 4px;
      background: white;
    }

    .interaction-layer {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      cursor: crosshair;
      z-index: 5;
    }

    .drawing-overlay {
      position: absolute;
      border: 3px dashed;
      background: transparent;
      pointer-events: none;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0;
      box-sizing: border-box;
      z-index: 50;
      overflow: hidden;
    }

    .drawing-overlay.drawing {
      animation: pulse 0.5s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 0.8; }
      50% { opacity: 1; }
    }

    .preview-signature-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
    }

    .preview-label {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 10px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.9);
      padding: 1px 6px;
      border-radius: 3px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .signatures-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      z-index: 10;
    }

    .signature-box {
      position: absolute;
      border: 3px solid;
      background: transparent;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 0;
      box-sizing: border-box;
      pointer-events: auto;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0,0,0,0.15);
      overflow: visible;
    }

    .signature-box.crypto {
      border-width: 4px;
      border-color: #e67e22 !important;
      box-shadow: 0 0 12px rgba(230, 126, 34, 0.4);
    }

    .signature-box:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      transform: scale(1.02);
      z-index: 20;
    }

    .signature-box.crypto:hover {
      box-shadow: 0 0 20px rgba(230, 126, 34, 0.6);
    }

    .signature-img {
      width: 100%;
      height: 100%;
      object-fit: contain;
      display: block;
    }

    .signature-label {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 9px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.95);
      padding: 2px 6px;
      border-radius: 3px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
      display: flex;
      align-items: center;
      gap: 3px;
      white-space: nowrap;
      pointer-events: none;
    }

    .crypto-badge {
      font-size: 10px;
    }

    .remove-btn {
      position: absolute;
      top: -12px;
      right: -12px;
      width: 26px;
      height: 26px;
      border-radius: 50%;
      background: #e74c3c;
      color: white;
      border: 2px solid white;
      font-size: 14px;
      font-weight: bold;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      z-index: 100;
      pointer-events: auto;
      box-shadow: 0 2px 6px rgba(0,0,0,0.3);
    }

    .remove-btn.crypto {
      background: #e67e22;
      border-color: #fff;
    }

    .remove-btn:hover {
      transform: scale(1.2) rotate(90deg);
      background: #c0392b;
      box-shadow: 0 3px 10px rgba(0,0,0,0.4);
    }

    .remove-btn.crypto:hover {
      background: #d35400;
    }

    .loading {
      text-align: center;
      padding: 40px;
      font-size: 18px;
      color: #666;
    }

    @media (max-width: 768px) {
      .canvas-stack {
        max-width: 100%;
      }

      .sign-canvas {
        max-width: 100%;
        height: auto;
      }
    }
  `]
})
export class PdfViewerComponent implements AfterViewInit {
  @ViewChild('pdfContainer') pdfContainer?: ElementRef;
  @ViewChild('signCanvas') signCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasStack') canvasStack?: ElementRef<HTMLDivElement>;

  // Inputs
  file = input.required<File | null>();
  selectedUser = input<User | null>(null);
  signatures = input<SignatureArea[]>([]);
  userSignatureImage = input<string | null>(null);
  userSignatureImages = input<Map<string, string>>(new Map());
  cryptoSignatureIds = input<Set<string>>(new Set());

  // Outputs
  pageSelected = output<number>();
  signatureAdded = output<SignatureArea>();
  signatureRemoveRequested = output<string>();
  errorOccurred = output<string>();

  // Signals
  selectedPageNumber = signal<number | null>(null);
  scale = signal<number>(1.5);
  loading = signal<boolean>(false);

  // PDF state
  private pdfDoc: pdfjsLibTypes.PDFDocumentProxy | null = null;
  private signCtx: CanvasRenderingContext2D | null = null;
  private currentRenderTask: any = null;

  // Drawing state
   isDrawing = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  previewRect: Rectangle | null = null;

  // Size constraints
  readonly minSignatureWidth = 100;
  readonly minSignatureHeight = 50;
  readonly maxSignatureWidth = 300;
  readonly maxSignatureHeight = 150;

  // Math for template
  Math = Math;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    // Watch file changes
    effect(() => {
      const f = this.file();
      untracked(() => {
        if (f) {
          this.loadPdf(f);
        }
      });
    });
  }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initializePdfJs();
    }
  }

  private initializePdfJs() {
    if (typeof pdfjsLib === 'undefined') {
      console.error('PDF.js not loaded');
      this.errorOccurred.emit('PDF.js library not loaded');
      return;
    }

    pdfjsLib.GlobalWorkerOptions.workerSrc = 
      'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
  }

  private async loadPdf(file: File) {
    if (!isPlatformBrowser(this.platformId)) return;

    this.loading.set(true);
    
    try {
      const arrayBuffer = await file.arrayBuffer();
      const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
      this.pdfDoc = await loadingTask.promise;
      
      await this.renderThumbnails();
      this.loading.set(false);
    } catch (error) {
      console.error('Error loading PDF:', error);
      this.loading.set(false);
      this.errorOccurred.emit('Failed to load PDF');
    }
  }

  private async renderThumbnails() {
    if (!this.pdfDoc || !this.pdfContainer) return;

    const container = this.pdfContainer.nativeElement;
    container.innerHTML = '';

    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      try {
        const page = await this.pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: 0.3 });

        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.cursor = 'pointer';
        canvas.style.border = '4px solid #ddd';
        canvas.style.borderRadius = '6px';
        canvas.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
        canvas.style.transition = 'all 0.2s';

        canvas.addEventListener('click', () => this.selectPage(i));
        canvas.addEventListener('mouseenter', () => {
          canvas.style.borderColor = '#3498db';
          canvas.style.transform = 'scale(1.05)';
        });
        canvas.addEventListener('mouseleave', () => {
          if (this.selectedPageNumber() !== i) {
            canvas.style.borderColor = '#ddd';
            canvas.style.transform = 'scale(1)';
          }
        });

        await page.render({ canvasContext: context, viewport }).promise;

        canvas.dataset['pageNumber'] = String(i);
        canvas.title = `Page ${i}`;

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

  private async selectPage(pageNumber: number) {
    if (!this.pdfDoc || !this.signCanvas || this.isDrawing) return;

    // Cancel any ongoing render
    if (this.currentRenderTask) {
      try {
        await this.currentRenderTask.cancel();
      } catch (e) {
        // Ignore cancellation errors
      }
      this.currentRenderTask = null;
    }

    this.selectedPageNumber.set(pageNumber);
    this.pageSelected.emit(pageNumber);

    if (!this.signCtx && this.signCanvas) {
      this.signCtx = this.signCanvas.nativeElement.getContext('2d');
    }

    if (this.pdfContainer) {
      const allCanvases = this.pdfContainer.nativeElement.querySelectorAll('canvas');
      allCanvases.forEach((c: HTMLCanvasElement) => {
        c.style.borderColor = '#ddd';
        c.style.borderWidth = '4px';
        c.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
      });
      
      const selectedCanvas = this.pdfContainer.nativeElement.querySelector(
        `[data-page-number="${pageNumber}"]`
      ) as HTMLCanvasElement;
      
      if (selectedCanvas) {
        selectedCanvas.style.borderColor = '#e74c3c';
        selectedCanvas.style.borderWidth = '5px';
        selectedCanvas.style.boxShadow = '0 0 20px rgba(231, 76, 60, 0.6)';
        selectedCanvas.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }

    await this.renderSelectedPage();
  }

  private async renderSelectedPage() {
    const pageNum = this.selectedPageNumber();
    if (!pageNum || !this.pdfDoc || !this.signCtx || !this.signCanvas) return;

    try {
      // Cancel any ongoing render
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
      const canvas = this.signCanvas.nativeElement;
      
      // Set canvas size
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Clear before rendering
      this.signCtx.clearRect(0, 0, canvas.width, canvas.height);

      // Render the page
      this.currentRenderTask = page.render({ 
        canvasContext: this.signCtx, 
        viewport 
      });
      
      await this.currentRenderTask.promise;
      this.currentRenderTask = null;

    } catch (error: any) {
      if (error.name !== 'RenderingCancelledException') {
        console.error('Error rendering page:', error);
      }
    }
  }

  private getCanvasCoordinates(e: MouseEvent): { x: number; y: number } {
    if (!this.canvasStack) return { x: 0, y: 0 };
    
    const stackElement = this.canvasStack.nativeElement;
    const rect = stackElement.getBoundingClientRect();
    
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  onMouseDown(e: MouseEvent) {
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

    const pos = this.getCanvasCoordinates(e);
    this.startX = pos.x;
    this.startY = pos.y;
    this.currentX = pos.x;
    this.currentY = pos.y;
    this.isDrawing = true;
    
    this.updatePreviewRect();
  }

  onMouseMove(e: MouseEvent) {
    if (!this.isDrawing) return;

    const pos = this.getCanvasCoordinates(e);
    this.currentX = pos.x;
    this.currentY = pos.y;
    
    this.updatePreviewRect();
  }

  onMouseUp() {
    if (!this.isDrawing) return;

    const pageNum = this.selectedPageNumber();
    const user = this.selectedUser();
    
    if (!pageNum || !user) {
      this.isDrawing = false;
      this.previewRect = null;
      return;
    }

    // Apply size limits
    let width = Math.abs(this.currentX - this.startX);
    let height = Math.abs(this.currentY - this.startY);
    
    // Enforce maximum size
    width = Math.min(width, this.maxSignatureWidth);
    height = Math.min(height, this.maxSignatureHeight);

    const area: Rectangle = {
      x: Math.min(this.startX, this.currentX),
      y: Math.min(this.startY, this.currentY),
      width: width,
      height: height
    };

    this.isDrawing = false;
    this.previewRect = null;

    // Check minimum size
    if (area.width < this.minSignatureWidth || area.height < this.minSignatureHeight) {
      this.errorOccurred.emit(`Signature too small! Minimum size: ${this.minSignatureWidth}x${this.minSignatureHeight}`);
      return;
    }

    // Check for overlap with existing signatures
    if (this.checkOverlap(area, pageNum)) {
      this.errorOccurred.emit('Signature overlaps with an existing signature! Please choose a different location.');
      return;
    }

    const userSignature: SignatureArea = {
      signatureId: `sig_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      userId: user.id,
      userName: user.name,
      pageNumber: pageNum,
      area: area,
      color: user.color
    };

    this.signatureAdded.emit(userSignature);
  }

  private checkOverlap(newArea: Rectangle, pageNumber: number): boolean {
    const pageSignatures = this.signatures().filter(s => s.pageNumber === pageNumber);

    for (const sig of pageSignatures) {
      if (this.rectanglesOverlap(newArea, sig.area)) {
        return true;
      }
    }

    return false;
  }

  private rectanglesOverlap(rect1: Rectangle, rect2: Rectangle): boolean {
    // Add 5px buffer to prevent touching edges
    const buffer = 5;
    
    const noOverlap =
      rect1.x + rect1.width + buffer < rect2.x ||
      rect2.x + rect2.width + buffer < rect1.x ||
      rect1.y + rect1.height + buffer < rect2.y ||
      rect2.y + rect2.height + buffer < rect1.y;

    return !noOverlap;
  }

  onMouseLeave() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.previewRect = null;
    }
  }

  private updatePreviewRect() {
    if (!this.isDrawing) return;

    // Calculate width and height with limits
    let width = Math.abs(this.currentX - this.startX);
    let height = Math.abs(this.currentY - this.startY);
    
    // Enforce maximum size during drag
    width = Math.min(width, this.maxSignatureWidth);
    height = Math.min(height, this.maxSignatureHeight);

    this.previewRect = {
      x: Math.min(this.startX, this.currentX),
      y: Math.min(this.startY, this.currentY),
      width: width,
      height: height
    };
  }

  onRemoveClick(signatureId: string) {
    this.signatureRemoveRequested.emit(signatureId);
  }

  getPageSignatures(): SignatureArea[] {
    const pageNum = this.selectedPageNumber();
    if (!pageNum) return [];
    return this.signatures().filter(s => s.pageNumber === pageNum);
  }

  getSignatureImage(userId: string): string | null {
    const images = this.userSignatureImages();
    return images.get(userId) || null;
  }

  isCryptoSignature(signatureId: string): boolean {
    const cryptoIds = this.cryptoSignatureIds();
    return cryptoIds.has(signatureId);
  }
}