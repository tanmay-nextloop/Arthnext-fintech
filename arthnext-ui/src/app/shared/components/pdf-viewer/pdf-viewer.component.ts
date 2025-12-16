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
            *ngIf="previewRect"
            [style.left.px]="previewRect.x"
            [style.top.px]="previewRect.y"
            [style.width.px]="previewRect.width"
            [style.height.px]="previewRect.height"
            [style.border-color]="selectedUser()?.color || '#000'"
          >
            <img 
              *ngIf="userSignatureImage()" 
              [src]="userSignatureImage()" 
              class="preview-signature-img"
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
              [style.left.px]="sig.area.x"
              [style.top.px]="sig.area.y"
              [style.width.px]="sig.area.width"
              [style.height.px]="sig.area.height"
              [style.border-color]="sig.color"
            >
              <img 
                *ngIf="getSignatureImage(sig.userId)" 
                [src]="getSignatureImage(sig.userId)" 
                class="signature-img"
              />
              <span class="signature-label" [style.color]="sig.color">
                {{ sig.userName }}
              </span>
              <button
                class="remove-btn"
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
      justify-content:center;
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
      z-index: 100;
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
      object-fit: fill;
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
      overflow: hidden;
    }

    .signature-box:hover {
      box-shadow: 0 4px 16px rgba(0,0,0,0.25);
      transform: scale(1.02);
      z-index: 20;
    }

    .signature-img {
      width: 100%;
      height: 100%;
      object-fit: fill;
      display: block;
    }

    .signature-label {
      position: absolute;
      bottom: 2px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 9px;
      font-weight: 700;
      background: rgba(255, 255, 255, 0.9);
      padding: 1px 5px;
      border-radius: 3px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.2);
    }

    .remove-btn {
      position: absolute;
      top: -12px;
      right: -12px;
      width: 24px;
      height: 24px;
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
      box-shadow: 0 2px 8px rgba(0,0,0,0.3);
      transition: all 0.2s;
      pointer-events: auto;
      z-index: 30;
    }

    .remove-btn:hover {
      background: #c0392b;
      transform: scale(1.15) rotate(90deg);
    }

    .loading {
      padding: 20px;
      text-align: center;
      font-size: 18px;
      color: #3498db;
      background: #ecf0f1;
      border-radius: 8px;
      margin: 20px 0;
    }
  `]
})
export class PdfViewerComponent implements AfterViewInit {
  @ViewChild('pdfContainer') pdfContainer?: ElementRef<HTMLDivElement>;
  @ViewChild('signCanvas') signCanvas?: ElementRef<HTMLCanvasElement>;
  @ViewChild('canvasStack') canvasStack?: ElementRef<HTMLDivElement>;

  // Input signals
  file = input<File | null>(null);
  selectedUser = input<User | null>(null);
  signatures = input<SignatureArea[]>([]);
  userSignatureImage = input<string | null>(null);
  userSignatureImages = input<Map<string, string>>(new Map());
  scale = input<number>(1.5);
  thumbnailScale = input<number>(0.3);

  // Output signals
  pageSelected = output<number>();
  signatureAdded = output<SignatureArea>();
  signatureRemoveRequested = output<string>();
  errorOccurred = output<string>();

  // Local state
  loading = signal<boolean>(false);
  selectedPageNumber = signal<number | null>(null);
  
  // Drawing state
  private pdfDoc: any = null;
  private signCtx: CanvasRenderingContext2D | null = null;
  private currentRenderTask: any = null;
  isDrawing = false;
  private startX = 0;
  private startY = 0;
  private currentX = 0;
  private currentY = 0;
  previewRect: { x: number; y: number; width: number; height: number } | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    effect(() => {
      const currentFile = this.file();
      if (currentFile) {
        untracked(() => this.loadPdfFile(currentFile));
      }
    });

    effect(() => {
      const sigs = this.signatures();
      const pageNum = this.selectedPageNumber();
      if (pageNum && sigs !== undefined) {
        // Signatures changed, but don't re-render canvas
        // Just update the overlay
      }
    });
  }

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
    } catch (error) {
      console.error('Error loading PDF.js:', error);
      this.errorOccurred.emit('Failed to initialize PDF viewer.');
    }
  }

  private async loadPdfFile(file: File) {
    this.loading.set(true);
    this.selectedPageNumber.set(null);

    try {
      const pdfjs = await import('pdfjs-dist');
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const loadingTask = (pdfjs as any).getDocument({ data: typedArray });
      this.pdfDoc = await loadingTask.promise;

      setTimeout(() => {
        this.renderAllPages();
      }, 100);
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      this.errorOccurred.emit(`Failed to load PDF: ${error.message || 'Unknown error'}`);
    } finally {
      this.loading.set(false);
    }
  }

  private async renderAllPages() {
    if (!this.pdfDoc || !this.pdfContainer) return;

    const container = this.pdfContainer.nativeElement;
    container.innerHTML = '';

    for (let i = 1; i <= this.pdfDoc.numPages; i++) {
      try {
        const page = await this.pdfDoc.getPage(i);
        const viewport = page.getViewport({ scale: this.thumbnailScale() });
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        if (!ctx) continue;

        canvas.height = viewport.height;
        canvas.width = viewport.width;
        canvas.style.border = '4px solid #ddd';
        canvas.style.borderRadius = '6px';
        canvas.style.cursor = 'pointer';
        canvas.style.transition = 'all 0.2s ease';
        canvas.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';

        await page.render({ canvasContext: ctx, viewport }).promise;

        canvas.dataset['pageNumber'] = i.toString();
        canvas.addEventListener('click', (e) => {
          e.stopPropagation();
          this.selectPage(i);
        });
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
      allCanvases.forEach(c => {
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

    const area: Rectangle = {
      x: Math.min(this.startX, this.currentX),
      y: Math.min(this.startY, this.currentY),
      width: Math.abs(this.currentX - this.startX),
      height: Math.abs(this.currentY - this.startY)
    };

    this.isDrawing = false;
    this.previewRect = null;

    if (area.width > 30 && area.height > 30) {
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
  }

  onMouseLeave() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.previewRect = null;
    }
  }

  private updatePreviewRect() {
    if (!this.isDrawing) return;

    this.previewRect = {
      x: Math.min(this.startX, this.currentX),
      y: Math.min(this.startY, this.currentY),
      width: Math.abs(this.currentX - this.startX),
      height: Math.abs(this.currentY - this.startY)
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
}