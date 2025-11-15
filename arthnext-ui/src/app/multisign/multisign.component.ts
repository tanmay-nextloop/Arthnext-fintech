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

// Import PDF.js types
import type * as pdfjsLibTypes from 'pdfjs-dist';
declare const pdfjsLib: typeof pdfjsLibTypes;

interface Rectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface UserSignature {
  userId: string;
  userName: string;
  pageNumber: number;
  area: Rectangle;
  color: string;
}

@Component({
  selector: 'app-multisign',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './multisign.component.html',
  styleUrls: ['./multisign.component.scss']
})
export class MultisignComponent implements AfterViewInit {
  @ViewChild('pdfContainer') pdfContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('signCanvas') signCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  public  pdfDoc: any = null;
  selectedPageNumber: number | null = null;
  private signCtx: CanvasRenderingContext2D | null = null;
  loading = false;

  // Drawing state
  private isDrawing = false;
  private startX = 0;
  private startY = 0;

  // Multi-user signature areas
  users: UserSignature[] = [];
  currentUserName = '';
  
  // Available colors for different users
  private colors = ['#ff0000', '#00ff00', '#0000ff', '#ff00ff', '#ffff00', '#00ffff', '#ff8800', '#8800ff'];
  private colorIndex = 0;

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
    this.users = [];

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

    // Highlight selected thumbnail
    const allCanvases = this.pdfContainer.nativeElement.querySelectorAll('canvas');
    allCanvases.forEach(c => c.classList.remove('selected'));
    const selectedCanvas = this.pdfContainer.nativeElement.querySelector(
      `[data-page-number="${pageNumber}"]`
    ) as HTMLCanvasElement;
    selectedCanvas?.classList.add('selected');

    await this.renderSelectedPageWithAreas();
  }

  async renderSelectedPageWithAreas() {
    if (!this.selectedPageNumber || !this.pdfDoc || !this.signCtx) return;

    try {
      const page = await this.pdfDoc.getPage(this.selectedPageNumber);
      const viewport = page.getViewport({ scale: 1.5 });
      const canvas = this.signCanvas.nativeElement;
      canvas.height = viewport.height;
      canvas.width = viewport.width;
      
      // Render PDF page
      await page.render({ canvasContext: this.signCtx, viewport }).promise;

      // Draw all existing signature areas for this page
      const pageUsers = this.users.filter(u => u.pageNumber === this.selectedPageNumber);
      pageUsers.forEach(user => {
        this.drawRectangle(user.area, user.color, user.userName);
      });
    } catch (error) {
      console.error('Error rendering selected page:', error);
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

    // Draw label
    this.signCtx.fillStyle = color;
    this.signCtx.font = 'bold 14px Arial';
    this.signCtx.fillText(label, rect.x + 5, rect.y - 5);
  }

  onMouseDown(event: MouseEvent) {
    if (!this.selectedPageNumber) {
      alert('Please select a page first!');
      return;
    }
    if (!this.currentUserName.trim()) {
      alert('Please enter a user name first!');
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

      // Redraw existing areas
      const pageUsers = this.users.filter(u => u.pageNumber === this.selectedPageNumber);
      pageUsers.forEach(user => {
        this.drawRectangle(user.area, user.color, user.userName);
      });

      // Draw current selection
      const currentColor = this.colors[this.colorIndex % this.colors.length];
      this.signCtx.strokeStyle = currentColor;
      this.signCtx.lineWidth = 3;
      this.signCtx.setLineDash([5, 5]);
      this.signCtx.strokeRect(this.startX, this.startY, width, height);
      this.signCtx.fillStyle = currentColor.replace(')', ', 0.1)').replace('rgb', 'rgba');
      this.signCtx.fillRect(this.startX, this.startY, width, height);
      this.signCtx.setLineDash([]);
    } catch (error) {
      console.error('Error during rectangle drawing:', error);
    }
  }

  onMouseUp(event: MouseEvent) {
    if (!this.isDrawing || !this.selectedPageNumber) return;
    this.isDrawing = false;

    const rect = this.signCanvas.nativeElement.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;
    
    const area: Rectangle = {
      x: Math.min(this.startX, endX),
      y: Math.min(this.startY, endY),
      width: Math.abs(endX - this.startX),
      height: Math.abs(endY - this.startY)
    };

    // Only add if area is significant (not just a click)
    if (area.width > 10 && area.height > 10) {
      const userSignature: UserSignature = {
        userId: `user_${Date.now()}`,
        userName: this.currentUserName,
        pageNumber: this.selectedPageNumber,
        area: area,
        color: this.colors[this.colorIndex % this.colors.length]
      };

      this.users.push(userSignature);
      this.colorIndex++;
      
      console.log('New signature area added:', userSignature);
      console.log('All signatures:', this.users);

      // Re-render to show the final rectangle
      this.renderSelectedPageWithAreas();
    }
  }

  onMouseLeave() {
    if (this.isDrawing) {
      this.isDrawing = false;
      this.renderSelectedPageWithAreas();
    }
  }

  removeSignature(userId: string) {
    this.users = this.users.filter(u => u.userId !== userId);
    this.renderSelectedPageWithAreas();
  }

  clearAllSignatures() {
    if (confirm('Are you sure you want to clear all signature areas?')) {
      this.users = [];
      this.colorIndex = 0;
      this.renderSelectedPageWithAreas();
    }
  }

  exportCoordinates() {
    const data = JSON.stringify(this.users, null, 2);
    console.log('Exported Coordinates:', data);
    
    // Create downloadable file
    const blob = new Blob([data], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signature-coordinates.json';
    a.click();
    window.URL.revokeObjectURL(url);
  }
}