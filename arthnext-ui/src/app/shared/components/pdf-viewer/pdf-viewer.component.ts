// pdf-viewer.component.ts
import {
  Component,
  ElementRef,
  ViewChild,
  input,
  output,
  signal,
  computed,
  effect,
  untracked,
  AfterViewInit,
  PLATFORM_ID,
  Inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

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
  pageNumber: number;
  area: Rectangle;
  color: string;
}

export interface User {
  id: string;
  name: string;
  color: string;
}

@Component({
  selector: 'app-pdf-viewer',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="pdf-viewer-container">
      <!-- PDF Thumbnails -->
      <div class="pdf-thumbnails" #pdfContainer></div>

      <!-- Main Canvas Container with Overlay -->
      <div class="canvas-wrapper" [class.hidden]="!selectedPageNumber()">
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
            title="Remove signature"
          >
            ✕
          </button>
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
      scroll-behavior: smooth;
      margin-bottom: 20px;
    }

    .canvas-wrapper {
      position: relative;
      display: inline-block;
      margin-bottom: 20px;
    }

    .canvas-wrapper.hidden {
      display: none;
    }

    .sign-canvas {
      display: block;
      border: 3px solid #2c3e50;
      cursor: crosshair;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      border-radius: 4px;
      max-width: 100%;
      background: white;
    }

    .buttons-overlay {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
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

  // Input signals
  file = input<File | null>(null);
  selectedUser = input<User | null>(null);
  signatures = input<SignatureArea[]>([]);
  scale = input<number>(1.5);
  thumbnailScale = input<number>(0.3);

  // Output signals
  pageSelected = output<number>();
  signatureAdded = output<SignatureArea>();
  signatureRemoveRequested = output<string>();
  errorOccurred = output<string>();

  // Local state signals
  loading = signal<boolean>(false);
  selectedPageNumber = signal<number | null>(null);
  
  // Private state
  private pdfDoc: any = null;
  private signCtx: CanvasRenderingContext2D | null = null;
  private currentRenderTask: any = null;
  private isDrawing = false;
  private justFinishedDrawing = false;
  private startX = 0;
  private startY = 0;
  private mouseMoveThrottle: any = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {
    // Effect to load PDF when file changes
    effect(() => {
      const currentFile = this.file();
      if (currentFile) {
        untracked(() => this.loadPdfFile(currentFile));
      }
    });

    // Effect to re-render when signatures change
    effect(() => {
      const sigs = this.signatures();
      const pageNum = this.selectedPageNumber();
      if (pageNum && sigs) {
        untracked(() => this.renderSelectedPageWithAreas());
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

    await this.renderSelectedPageWithAreas();
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

      const pageSignatures = this.signatures().filter(s => s.pageNumber === pageNum);
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

    this.signCtx.fillStyle = color;
    this.signCtx.font = 'bold 14px Arial';
    const textMetrics = this.signCtx.measureText(label);
    const textWidth = textMetrics.width;
    const textHeight = 16;

    this.signCtx.fillRect(rect.x, rect.y - textHeight - 6, textWidth + 10, textHeight + 6);
    this.signCtx.fillStyle = 'white';
    this.signCtx.fillText(label, rect.x + 5, rect.y - 8);
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

    // Throttle mouse move events to reduce flickering
    if (this.mouseMoveThrottle) {
      return;
    }

    this.mouseMoveThrottle = setTimeout(() => {
      this.mouseMoveThrottle = null;
    }, 16); // ~60fps

    const canvas = this.signCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();

    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    const mouseX = (event.clientX - rect.left) * scaleX;
    const mouseY = (event.clientY - rect.top) * scaleY;
    const width = mouseX - this.startX;
    const height = mouseY - this.startY;

    try {
      if (this.currentRenderTask) {
        try {
          await this.currentRenderTask.cancel();
        } catch (e) {
          // Ignore cancellation errors
        }
        this.currentRenderTask = null;
      }

      const page = await this.pdfDoc.getPage(pageNum);
      const viewport = page.getViewport({ scale: this.scale() });
      
      this.signCtx.clearRect(0, 0, canvas.width, canvas.height);

      const renderTask = page.render({ canvasContext: this.signCtx, viewport });
      await renderTask.promise;

      const pageSignatures = this.signatures().filter(s => s.pageNumber === pageNum);
      pageSignatures.forEach(sig => {
        this.drawRectangle(sig.area, sig.color, sig.userName);
      });

      const currentColor = user.color;
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
    this.justFinishedDrawing = true;

    setTimeout(() => {
      this.justFinishedDrawing = false;
    }, 300);

    if (area.width > 20 && area.height > 20) {
      if (this.checkOverlap(area, pageNum)) {
        this.errorOccurred.emit('Signature area overlaps with an existing signature!');
        this.renderSelectedPageWithAreas();
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
    return this.signatures().filter(s => s.pageNumber === pageNum);
  }

  getRemoveButtonPosition(sig: SignatureArea): { x: number; y: number } {
    if (!this.signCanvas) return { x: 0, y: 0 };
    
    const canvas = this.signCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    
    // Scale from canvas coordinates to display coordinates
    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;
    
    // Position button at top-right corner of signature
    const x = (sig.area.x + sig.area.width) * scaleX;
    const y = sig.area.y * scaleY;
    
    return { x, y };
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
    const noOverlap =
      rect1.x + rect1.width < rect2.x ||
      rect2.x + rect2.width < rect1.x ||
      rect1.y + rect1.height < rect2.y ||
      rect2.y + rect2.height < rect1.y;

    return !noOverlap;
  }
}