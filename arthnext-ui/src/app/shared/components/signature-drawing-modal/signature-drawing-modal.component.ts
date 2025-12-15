// signature-drawing-modal.component.ts
import { Component, output, signal, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

export interface DrawnSignature {
  imageData: string;
  color: string;
  type: 'drawn' | 'typed';
  name?: string;
}

@Component({
  selector: 'app-signature-drawing-modal',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div *ngIf="isOpen()" class="modal-overlay" (click)="onOverlayClick()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header">
          <h3>✍️ Create Your Signature</h3>
          <button class="btn-close" type="button" (click)="onClose()">✕</button>
        </div>

        <div class="modal-tabs">
          <button 
            type="button"
            class="tab-btn" 
            [class.active]="activeTab() === 'draw'"
            (click)="switchTab('draw')"
          >
            🖊️ Draw
          </button>
          <button 
            type="button"
            class="tab-btn" 
            [class.active]="activeTab() === 'type'"
            (click)="switchTab('type')"
          >
            ⌨️ Type
          </button>
        </div>

        <!-- DRAW TAB -->
        <div *ngIf="activeTab() === 'draw'" class="tab-content">
          <div class="instruction-text">
            Draw your signature using mouse or touch
          </div>
          <div class="canvas-container">
            <canvas 
              #drawCanvas
              width="600"
              height="200"
              class="signature-canvas"
            ></canvas>
          </div>
          
          <div class="canvas-controls">
            <button type="button" class="btn btn-clear" (click)="onClearCanvas()">
              🗑️ Clear
            </button>
            <div class="color-picker">
              <span class="color-label">Color:</span>
              <button
                type="button"
                *ngFor="let color of availableColors" 
                class="color-circle"
                [class.active]="currentColor() === color"
                [style.background-color]="color"
                (click)="changeColor(color)"
              ></button>
            </div>
          </div>
        </div>

        <!-- TYPE TAB -->
        <div *ngIf="activeTab() === 'type'" class="tab-content">
          <div class="instruction-text">
            Type your name and select a style
          </div>
          <input 
            type="text" 
            [(ngModel)]="typedText"
            placeholder="Type your name"
            class="name-input"
            maxlength="50"
          />

          <div class="font-previews">
            <div 
              *ngFor="let fontStyle of fontStyles"
              class="font-preview"
              [class.active]="selectedFontStyle() === fontStyle"
              (click)="selectFontStyle(fontStyle)"
            >
              <span 
                class="preview-text" 
                [style.font-family]="fontStyle.value"
                [style.color]="currentColor()"
              >
                {{ typedText || 'Your Name' }}
              </span>
            </div>
          </div>

          <div class="color-picker">
            <span class="color-label">Color:</span>
            <button
              type="button"
              *ngFor="let color of availableColors" 
              class="color-circle"
              [class.active]="currentColor() === color"
              [style.background-color]="color"
              (click)="changeColor(color)"
            ></button>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn btn-cancel" (click)="onClose()">
            Cancel
          </button>
          <button 
            type="button"
            class="btn btn-save" 
            (click)="onSave()"
            [disabled]="!isValid()"
          >
            ✓ Save Signature
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
    }

    .modal-container {
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 700px;
      max-height: 90vh;
      overflow: hidden;
      display: flex;
      flex-direction: column;
    }

    .modal-header {
      padding: 20px 24px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 22px;
    }

    .btn-close {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      font-size: 20px;
    }

    .modal-tabs {
      display: flex;
      background: #f8f9fa;
      border-bottom: 2px solid #e0e0e0;
    }

    .tab-btn {
      flex: 1;
      padding: 15px;
      background: transparent;
      border: none;
      font-size: 16px;
      font-weight: 600;
      cursor: pointer;
      position: relative;
    }

    .tab-btn.active {
      background: white;
      color: #667eea;
    }

    .tab-content {
      padding: 24px;
      flex: 1;
      overflow-y: auto;
    }

    .instruction-text {
      text-align: center;
      color: #666;
      margin-bottom: 15px;
      font-size: 14px;
    }

    .canvas-container {
      border: 3px solid #e0e0e0;
      border-radius: 8px;
      background: white;
      margin-bottom: 15px;
    }

    .signature-canvas {
      display: block;
      width: 100%;
      cursor: crosshair;
      touch-action: none;
    }

    .canvas-controls {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 15px;
    }

    .color-picker {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .color-label {
      font-size: 14px;
      font-weight: 600;
      color: #666;
    }

    .color-circle {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      cursor: pointer;
      border: 3px solid transparent;
      padding: 0;
    }

    .color-circle.active {
      border-color: #667eea;
    }

    .name-input {
      width: 100%;
      padding: 15px;
      font-size: 18px;
      border: 2px solid #e0e0e0;
      border-radius: 8px;
      margin-bottom: 20px;
    }

    .font-previews {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
      margin-bottom: 20px;
      max-height: 350px;
      overflow-y: auto;
    }

    .font-preview {
      padding: 20px;
      border: 3px solid #e0e0e0;
      border-radius: 8px;
      cursor: pointer;
      background: white;
      text-align: center;
      min-height: 80px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .font-preview.active {
      border-color: #667eea;
      background: #f5f7ff;
    }

    .preview-text {
      font-size: 36px;
      line-height: 1.2;
    }

    .modal-footer {
      padding: 16px 24px;
      background: #f8f9fa;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid #e0e0e0;
    }

    .btn {
      padding: 12px 24px;
      border: none;
      border-radius: 8px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    .btn-clear {
      background: #e74c3c;
      color: white;
    }

    .btn-cancel {
      background: #95a5a6;
      color: white;
    }

    .btn-save {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
  `]
})
export class SignatureDrawingModalComponent implements AfterViewInit {
  @ViewChild('drawCanvas') canvasEl?: ElementRef<HTMLCanvasElement>;

  // Outputs
  signatureSaved = output<DrawnSignature>();
  closed = output<void>();

  // Signals
  isOpen = signal(false);
  activeTab = signal<'draw' | 'type'>('draw');
  currentColor = signal('#000000');
  selectedFontStyle = signal({ name: 'Cedarville Cursive', value: "'Cedarville Cursive', cursive" });

  // Data
  typedText = '';
  availableColors = ['#000000', '#1968B7', '#2D993F', '#e74c3c', '#9b59b6'];
  fontStyles = [
    { name: 'Cedarville Cursive', value: "'Cedarville Cursive', cursive" },
    { name: 'Montez', value: "'Montez', cursive" },
    { name: 'Kristi', value: "'Kristi', cursive" },
    { name: 'Reenie Beanie', value: "'Reenie Beanie', cursive" },
    { name: 'Sacramento', value: "'Sacramento', cursive" },
    { name: 'Mr Dafoe', value: "'Mr Dafoe', cursive" }
  ];

  // Canvas state
  private canvas?: HTMLCanvasElement;
  private ctx?: CanvasRenderingContext2D | null;
  private drawing = false;
  private hasContent = false;

  ngAfterViewInit() {
    this.setupCanvas();
  }

  private setupCanvas() {
    if (!this.canvasEl) return;
    
    this.canvas = this.canvasEl.nativeElement;
    this.ctx = this.canvas.getContext('2d');

    if (!this.ctx) return;

    // Setup canvas
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.strokeStyle = this.currentColor();
    this.ctx.lineWidth = 3;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';

    // Mouse events
    this.canvas.addEventListener('mousedown', (e) => this.startDraw(e));
    this.canvas.addEventListener('mousemove', (e) => this.drawLine(e));
    this.canvas.addEventListener('mouseup', () => this.stopDraw());
    this.canvas.addEventListener('mouseleave', () => this.stopDraw());

    // Touch events
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      this.startDraw(e);
    });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      this.drawLine(e);
    });
    this.canvas.addEventListener('touchend', () => this.stopDraw());
  }

  private getPosition(e: MouseEvent | TouchEvent): { x: number; y: number } | null {
    if (!this.canvas) return null;

    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;

    let clientX: number;
    let clientY: number;

    if (e instanceof MouseEvent) {
      clientX = e.clientX;
      clientY = e.clientY;
    } else {
      if (e.touches.length === 0) return null;
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    }

    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }

  private startDraw(e: MouseEvent | TouchEvent) {
    if (!this.ctx) return;

    const pos = this.getPosition(e);
    if (!pos) return;

    this.drawing = true;
    this.hasContent = true;
    this.ctx.beginPath();
    this.ctx.moveTo(pos.x, pos.y);
  }

  private drawLine(e: MouseEvent | TouchEvent) {
    if (!this.drawing || !this.ctx) return;

    const pos = this.getPosition(e);
    if (!pos) return;

    this.ctx.lineTo(pos.x, pos.y);
    this.ctx.stroke();
  }

  private stopDraw() {
    this.drawing = false;
  }

  openModal() {
    this.isOpen.set(true);
    this.activeTab.set('draw');
    this.hasContent = false;
    this.typedText = '';
    
    setTimeout(() => {
      this.setupCanvas();
    }, 100);
  }

  onOverlayClick() {
    this.onClose();
  }

  onClose() {
    this.isOpen.set(false);
    this.closed.emit();
  }

  switchTab(tab: 'draw' | 'type') {
    this.activeTab.set(tab);
    if (tab === 'draw') {
      setTimeout(() => this.setupCanvas(), 50);
    }
  }

  changeColor(color: string) {
    this.currentColor.set(color);
    if (this.ctx) {
      this.ctx.strokeStyle = color;
    }
  }

  selectFontStyle(style: any) {
    this.selectedFontStyle.set(style);
  }

  onClearCanvas() {
    if (!this.ctx || !this.canvas) return;
    
    this.ctx.fillStyle = '#ffffff';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.strokeStyle = this.currentColor();
    this.hasContent = false;
  }

  isValid(): boolean {
    if (this.activeTab() === 'draw') {
      return this.hasContent;
    } else {
      return this.typedText.trim().length > 0;
    }
  }

  onSave() {
    if (!this.isValid()) return;

    if (this.activeTab() === 'draw') {
      this.saveDrawnSignature();
    } else {
      this.saveTypedSignature();
    }
  }

  private saveDrawnSignature() {
    if (!this.canvas) return;

    // Trim the signature to remove white space
    const trimmedCanvas = this.trimCanvas(this.canvas);
    const imageData = trimmedCanvas.toDataURL('image/png');
    
    this.signatureSaved.emit({
      imageData: imageData,
      color: this.currentColor(),
      type: 'drawn'
    });

    this.onClose();
  }

  private saveTypedSignature() {
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = 600;
    tempCanvas.height = 200;
    
    const tempCtx = tempCanvas.getContext('2d');
    if (!tempCtx) return;

    // Transparent background instead of white
    tempCtx.clearRect(0, 0, 600, 200);

    // Draw text
    tempCtx.font = `72px ${this.selectedFontStyle().value}`;
    tempCtx.fillStyle = this.currentColor();
    tempCtx.textAlign = 'center';
    tempCtx.textBaseline = 'middle';
    tempCtx.fillText(this.typedText, 300, 100);

    // Trim to remove extra space
    const trimmedCanvas = this.trimCanvas(tempCanvas);
    const imageData = trimmedCanvas.toDataURL('image/png');

    this.signatureSaved.emit({
      imageData: imageData,
      color: this.currentColor(),
      type: 'typed',
      name: this.typedText
    });

    this.onClose();
  }

  private trimCanvas(sourceCanvas: HTMLCanvasElement): HTMLCanvasElement {
    const ctx = sourceCanvas.getContext('2d');
    if (!ctx) return sourceCanvas;

    const pixels = ctx.getImageData(0, 0, sourceCanvas.width, sourceCanvas.height);
    const data = pixels.data;
    let minX = sourceCanvas.width;
    let minY = sourceCanvas.height;
    let maxX = 0;
    let maxY = 0;

    // Find the bounding box of non-transparent pixels
    for (let y = 0; y < sourceCanvas.height; y++) {
      for (let x = 0; x < sourceCanvas.width; x++) {
        const index = (y * sourceCanvas.width + x) * 4;
        const alpha = data[index + 3];
        
        if (alpha > 0) {
          if (x < minX) minX = x;
          if (x > maxX) maxX = x;
          if (y < minY) minY = y;
          if (y > maxY) maxY = y;
        }
      }
    }

    // Add small padding (5px)
    const padding = 5;
    minX = Math.max(0, minX - padding);
    minY = Math.max(0, minY - padding);
    maxX = Math.min(sourceCanvas.width - 1, maxX + padding);
    maxY = Math.min(sourceCanvas.height - 1, maxY + padding);

    const width = maxX - minX + 1;
    const height = maxY - minY + 1;

    // Create trimmed canvas
    const trimmedCanvas = document.createElement('canvas');
    trimmedCanvas.width = width;
    trimmedCanvas.height = height;
    
    const trimmedCtx = trimmedCanvas.getContext('2d');
    if (!trimmedCtx) return sourceCanvas;

    // Copy trimmed content
    trimmedCtx.drawImage(
      sourceCanvas,
      minX, minY, width, height,
      0, 0, width, height
    );

    return trimmedCanvas;
  }
}