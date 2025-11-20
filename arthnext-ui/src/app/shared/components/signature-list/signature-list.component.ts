// signature-list.component.ts
import { Component, input, output, computed, signal } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface SignatureArea {
  signatureId: string;
  userId: string;
  userName: string;
  pageNumber: number;
  area: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  color: string;
}

@Component({
  selector: 'app-signature-list',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="signatureCount() > 0" class="signatures-section">
      <div 
        class="section-header" 
        (click)="toggleDropdown()" 
        style="cursor: pointer;"
      >
        <h3>
          <span 
            class="dropdown-arrow" 
            [class.open]="isOpen()"
          >
            ▶
          </span>
          Signature Areas ({{ signatureCount() }} total)
        </h3>
        <div class="actions" (click)="$event.stopPropagation()">
          <button 
            (click)="handleClearAll()" 
            class="btn btn-clear"
            [disabled]="signatureCount() === 0"
          >
            Clear All
          </button>
        </div>
      </div>
      
      <div 
        class="signatures-content" 
        [class.collapsed]="!isOpen()"
      >
        <div *ngFor="let page of pages()" class="page-group">
          <h4 class="page-group-header">
             Page {{ page }} 
            <span class="page-count">
              ({{ getSignaturesByPage(page).length }} signature(s))
            </span>
          </h4>
          
          <div class="signatures-grid">
            <div 
              *ngFor="let sig of getSignaturesByPage(page)" 
              class="signature-card-compact" 
              [style.border-left-color]="sig.color"
            >
              <div class="sig-content">
                <div class="sig-user" [style.color]="sig.color">
                  <span class="user-icon">👤</span>
                  <strong>{{ sig.userName }}</strong>
                </div>
                <div class="sig-coords">
                  Position: ({{ sig.area.x | number:'1.0-0' }}, {{ sig.area.y | number:'1.0-0' }})
                  • Size: {{ sig.area.width | number:'1.0-0' }} × {{ sig.area.height | number:'1.0-0' }}
                </div>
              </div>
              <button 
                (click)="handleRemoveSignature(sig.signatureId)" 
                class="btn-remove-compact"
                title="Remove this signature"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .signatures-section {
      background: white;
      padding: 20px;
      border-radius: 10px;
      margin-top: 30px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      border-left: 5px solid #27ae60;
    }

    .section-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 15px;
      padding-bottom: 12px;
      border-bottom: 2px solid #ecf0f1;
      user-select: none;
      transition: all 0.3s;
    }

    .section-header:hover {
      background: #f8f9fa;
      margin: -10px -15px 15px -15px;
      padding: 10px 15px 12px 15px;
      border-radius: 6px;
    }

    .section-header h3 {
      margin: 0;
      display: flex;
      align-items: center;
      gap: 10px;
      font-size: 18px;
    }

    .actions {
      display: flex;
      gap: 10px;
    }

    .dropdown-arrow {
      display: inline-block;
      font-size: 12px;
      transition: transform 0.3s;
      color: #7f8c8d;
    }

    .dropdown-arrow.open {
      transform: rotate(90deg);
    }

    .signatures-content {
      max-height: 1000px;
      overflow: hidden;
      transition: max-height 0.3s ease-out, opacity 0.3s ease-out;
      opacity: 1;
    }

    .signatures-content.collapsed {
      max-height: 0;
      opacity: 0;
      transition: max-height 0.3s ease-in, opacity 0.2s ease-in;
    }

    .page-group {
      margin-bottom: 15px;
    }

    .page-group:last-child {
      margin-bottom: 0;
    }

    .page-group-header {
      color: #34495e;
      font-size: 14px;
      font-weight: 600;
      margin-bottom: 8px;
      padding: 6px 12px;
      background: #ecf0f1;
      border-radius: 4px;
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .page-count {
      font-size: 12px;
      color: #7f8c8d;
      font-weight: normal;
    }

    .signatures-grid {
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 8px;
    }

    .signature-card-compact {
      background: #f8f9fa;
      border-left: 3px solid;
      border-radius: 4px;
      padding: 8px 10px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s;
      position: relative;
      min-height: 50px;
    }

    .signature-card-compact:hover {
      background: #e8f4f8;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      transform: translateX(2px);
    }

    .sig-content {
      flex: 1;
      min-width: 0;
    }

    .sig-user {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      margin-bottom: 3px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .user-icon {
      font-size: 14px;
      flex-shrink: 0;
    }

    .sig-user strong {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sig-coords {
      font-size: 10px;
      color: #7f8c8d;
      font-family: 'Courier New', monospace;
      line-height: 1.3;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }

    .btn-remove-compact {
      background: #e74c3c;
      color: white;
      border: none;
      border-radius: 50%;
      width: 22px;
      height: 22px;
      min-width: 22px;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 8px;
      flex-shrink: 0;
    }

    .btn-remove-compact:hover {
      background: #c0392b;
      transform: rotate(90deg) scale(1.15);
    }

    .btn-clear {
      background: #e74c3c;
      color: white;
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      font-size: 14px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-clear:hover:not(:disabled) {
      background: #c0392b;
      transform: translateY(-2px);
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
    }

    .btn-clear:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
  `]
})
export class SignatureListComponent {
  // Input signals (read-only from parent)
  signatures = input<SignatureArea[]>([]);
  startOpen = input<boolean>(true);

  // Output signals (emit events to parent)
  signatureRemoved = output<string>();
  clearAllRequested = output<void>();

  // Local state signal
  isOpen = signal<boolean>(true);

  // Computed signals (auto-update when dependencies change)
  signatureCount = computed(() => this.signatures().length);
  
  pages = computed(() => {
    const pageSet = new Set(this.signatures().map(s => s.pageNumber));
    return Array.from(pageSet).sort((a, b) => a - b);
  });

  ngOnInit() {
    this.isOpen.set(this.startOpen());
  }

  toggleDropdown() {
    this.isOpen.update(value => !value);
  }

  getSignaturesByPage(page: number): SignatureArea[] {
    return this.signatures().filter(s => s.pageNumber === page);
  }

  handleRemoveSignature(signatureId: string) {
    this.signatureRemoved.emit(signatureId);
  }

  handleClearAll() {
    this.clearAllRequested.emit();
  }
}