import { Component, ViewChild, ElementRef, AfterViewInit, PLATFORM_ID, Inject } from '@angular/core';
import { HttpClient, HttpClientModule } from '@angular/common/http';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { isPlatformBrowser } from '@angular/common';

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
  selector: 'app-esign',
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './esign.component.html',
  styleUrls: ['./esign.component.scss'],
})
export class EsignComponent implements AfterViewInit {
  @ViewChild('pdfContainer') pdfContainer!: ElementRef<HTMLDivElement>;
  @ViewChild('signCanvas') signCanvas!: ElementRef<HTMLCanvasElement>;
  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  private pdfDoc: any = null;
  selectedPageNumber: number | null = null;
    selectedPages: number[] = []; 
  private signCtx: CanvasRenderingContext2D | null = null;
  loading = false;
  formData: any = {
    clientId: '',
    clientWebhookUrl: '',
    metadata: { documentType: '', priority: '' },
    signers: [{ name: '', aadhaar: '', coordinates: { x: 0, y: 0, width: 0, height: 0 }, pages: [] }]
  };
  pdfFile: File | null = null;
  signerPages: string = '';
  signerCoordinates: string = '';
  selectedArea: Rectangle | null = null;
  isDrawing = false;
  startX = 0;
  startY = 0;
  response: any;

  constructor(@Inject(PLATFORM_ID) private platformId: Object, private http: HttpClient) { }

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadPdfJs();
    }
  }

  // PDF.js Initialization
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

  // File Upload Handling
  async onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.loading = true;
    this.pdfFile = file;
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

  // Render All PDF Pages as Thumbnails
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

  // Select a Page for Signature
  async selectPage(pageNumber: number) {
    if (!this.pdfDoc || !this.signCtx) return;
    this.selectedPageNumber = pageNumber;
    this.selectedArea = null;

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

  //   // Render All PDF Pages as Thumbnails
  // async renderAllPages() {
  //   if (!this.pdfDoc) return;
  //   const container = this.pdfContainer.nativeElement;
  //   container.innerHTML = '';

  //   for (let i = 1; i <= this.pdfDoc.numPages; i++) {
  //     try {
  //       const page = await this.pdfDoc.getPage(i);
  //       const viewport = page.getViewport({ scale: 0.3 });
  //       const canvas = document.createElement('canvas');
  //       const ctx = canvas.getContext('2d');
  //       if (!ctx) continue;

  //       canvas.height = viewport.height;
  //       canvas.width = viewport.width;
  //       await page.render({ canvasContext: ctx, viewport }).promise;

  //       canvas.dataset['pageNumber'] = i.toString();
  //       canvas.addEventListener('click', () => this.togglePageSelection(i));  // Toggle page selection
  //       canvas.title = `Page ${i}`;

  //       // Apply red border if page is selected
  //       if (this.selectedPages.includes(i)) {
  //         canvas.style.border = '3px solid red';  // Red border for selected page
  //       } else {
  //         canvas.style.border = '';
  //       }

  //       container.appendChild(canvas);
  //     } catch (error) {
  //       console.error(`Error rendering page ${i}:`, error);
  //     }
  //   }
  // }

  // // Toggle Page Selection
  // togglePageSelection(pageNumber: number) {
  //   const index = this.selectedPages.indexOf(pageNumber);
  //   if (index === -1) {
  //     // Add page to selection
  //     this.selectedPages.push(pageNumber);
  //   } else {
  //     // Remove page from selection
  //     this.selectedPages.splice(index, 1);
  //   }

  //   console.log('Selected Pages:', this.selectedPages);
  //   this.renderAllPages(); // Re-render to update borders
  // }

  // Start Drawing for Area Selection
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

  // Draw Rectangle while Mouse is Moving
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

  // End Drawing on Mouse Up
  onMouseUp(event: MouseEvent) {
    if (!this.isDrawing) return;
    this.isDrawing = false;

    const rect = this.signCanvas.nativeElement.getBoundingClientRect();
    const endX = event.clientX - rect.left;
    const endY = event.clientY - rect.top;
    this.selectedArea = {
      x: Math.round(Math.min(this.startX, endX)),  // Round x
      y: Math.round(Math.min(this.startY, endY)),  // Round y
      width: Math.round(Math.abs(endX - this.startX)),  // Round width
      height: Math.round(Math.abs(endY - this.startY))  // Round height
    };
    console.log(`Selected area on page ${this.selectedPageNumber}:`, this.selectedArea);
  }

  
  onMouseLeave() {
    if (this.isDrawing) this.isDrawing = false;
  }

  // Form Submission with Selected Area
  submitForm() {
    // if (this.signerPages) {
    //   this.formData.signers[0].pages = this.signerPages.split(',').map(Number);
    // }

    // if (this.selectedArea) {
    //   this.formData.signers[0].coordinates = {
    //     x: this.selectedArea.x,
    //     y: this.selectedArea.y,
    //     width: this.selectedArea.width,
    //     height: this.selectedArea.height
    //   };
    // }
    console.log(this.selectedPageNumber);
    console.log(this.selectedArea);

    if (this.selectedPageNumber) {
      this.formData.signers[0].pages = [this.selectedPageNumber];
    }

    if (this.selectedArea) {
      this.formData.signers[0].coordinates = {
        x: this.selectedArea.x,
        y: this.selectedArea.y,
        width: this.selectedArea.width,
        height: this.selectedArea.height
      };
    }

    const formData = new FormData();
    if (this.pdfFile) {
      formData.append('pdf', this.pdfFile, this.pdfFile.name);
    }
    formData.append('data', JSON.stringify(this.formData));

    // Open a new tab for the eSign process
    const tab1 = window.open('', '_blank');
    if (!tab1) {
      alert('Popup blocked! Please allow popups for this site.');
      return;
    }
    tab1.document.write('<p>Preparing eSign document, please wait...</p>');

    // Send data to the backend API
    this.http.post('https://peakily-idioplasmatic-kimbra.ngrok-free.dev/api/v1/esign/initiate', formData)
      .subscribe({
        next: (res) => {
          this.response = res;
          console.log('Success:', res);
          if (this.response?.esignUrl) {
            tab1.location.href = this.response?.esignUrl;
            tab1.document.body.innerHTML += `<p><a href="${this.response?.esignUrl}" target="_blank">Click here</a></p>`;
          }
        },
        error: (err) => {
          this.response = err;
          console.error('Error:', err);
        }
      });
  }
}
