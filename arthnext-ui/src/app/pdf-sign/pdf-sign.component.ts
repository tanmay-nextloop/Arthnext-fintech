import {
  Component,
  ElementRef,
  ViewChild,
  AfterViewInit,
  PLATFORM_ID,
  Inject
} from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';

// Import PDF.js types
import type * as pdfjsLibTypes from 'pdfjs-dist';
declare const pdfjsLib: typeof pdfjsLibTypes;

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

@Component({
  selector: 'app-pdf-area-selector',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './pdf-sign.component.html',
  styleUrls: ['./pdf-sign.component.scss']
})
export class PdfSelectorComponent implements AfterViewInit {
  @ViewChild('pdfContainer') pdfContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('signCanvas') signCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private pdfDoc: any = null;
  selectedPageNumber: number | null = null;
  private signCtx: CanvasRenderingContext2D | null = null;
  loading = false;

  // Drawing state
  private isDrawing = false;
  private startX = 0;
  private startY = 0;
  selectedArea: Rectangle | null = null;

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadPdfJs();
    }
  }

  private async loadPdfJs() {
    try {
      const pdfjs = await import('pdfjs-dist');

      if ((pdfjs as any).GlobalWorkerOptions) {
        // ✅ Local worker path
        (pdfjs as any).GlobalWorkerOptions.workerSrc = '/assets/pdfjs/pdf.worker.min.js';
      }

      const canvas = this.signCanvas.nativeElement;
      this.signCtx = canvas.getContext('2d');

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

    this.loading = true;
    this.selectedPageNumber = null;
    this.selectedArea = null;

    try {
      const pdfjs = await import('pdfjs-dist');
      const arrayBuffer = await file.arrayBuffer();
      const typedArray = new Uint8Array(arrayBuffer);
      const loadingTask = (pdfjs as any).getDocument({ data: typedArray });
      this.pdfDoc = await loadingTask.promise;

      console.log('PDF loaded successfully, pages:', this.pdfDoc.numPages);
      await this.renderAllPages();
    } catch (error: any) {
      console.error('Error loading PDF:', error);
      alert(`Failed to load PDF: ${error.message || 'Unknown error'}`);
    } finally {
      this.loading = false;
    }
  }

  async renderAllPages() {
    if (!this.pdfDoc) return;
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
        canvas.addEventListener('click', () => this.selectPage(i));
        canvas.title = `Page ${i}`;
        container.appendChild(canvas);
      } catch (error) {
        console.error(`Error rendering page ${i}:`, error);
      }
    }
  }

  async selectPage(pageNumber: number) {
    if (!this.pdfDoc || !this.signCtx) return;
    this.selectedPageNumber = pageNumber;
    this.selectedArea = null;

    // Highlight selected thumbnail
    const allCanvases = this.pdfContainer.nativeElement.querySelectorAll('canvas');
    allCanvases.forEach(c => c.classList.remove('selected'));
    const selectedCanvas = this.pdfContainer.nativeElement.querySelector(
      `[data-page-number="${pageNumber}"]`
    ) as HTMLCanvasElement;
    selectedCanvas?.classList.add('selected');

    try {
      const page = await this.pdfDoc.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = this.signCanvas.nativeElement;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      await page.render({ canvasContext: this.signCtx, viewport }).promise;
    } catch (error) {
      console.error('Error rendering selected page:', error);
    }
  }

  onMouseDown(event: MouseEvent) {
    if (!this.selectedPageNumber) {
      alert('Please select a page first!');
      return;
    }
    const rect = this.signCanvas.nativeElement.getBoundingClientRect();
    this.startX = event.clientX - rect.left;
    this.startY = event.clientY - rect.top;
    this.isDrawing = true;
  }

  async onMouseMove(event: MouseEvent) {
    if (!this.isDrawing || !this.selectedPageNumber || !this.signCtx) return;

    const canvas = this.signCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;
    const width = mouseX - this.startX;
    const height = mouseY - this.startY;

    try {
      const page = await this.pdfDoc.getPage(this.selectedPageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      this.signCtx.clearRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvasContext: this.signCtx, viewport }).promise;

      this.signCtx.strokeStyle = '#ff0000';
      this.signCtx.lineWidth = 3;
      this.signCtx.setLineDash([5, 5]);
      this.signCtx.strokeRect(this.startX, this.startY, width, height);
      this.signCtx.fillStyle = 'rgba(255, 0, 0, 0.1)';
      this.signCtx.fillRect(this.startX, this.startY, width, height);
      this.signCtx.setLineDash([]);
    } catch (error) {
      console.error('Error during rectangle drawing:', error);
    }
  }

  onMouseUp(event: MouseEvent) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const rect = this.signCanvas.nativeElement.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;
    this.selectedArea = {
      x: Math.min(this.startX, endX),
      y: Math.min(this.startY, endY),
      width: Math.abs(endX - this.startX),
      height: Math.abs(endY - this.startY)
    };
    console.log(`Selected area on page ${this.selectedPageNumber}:`, this.selectedArea);
  }

  onMouseLeave() {
    if (this.isDrawing) this.isDrawing = false;
  }
}
