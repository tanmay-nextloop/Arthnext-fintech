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
  type: 'visual' | 'cryptographic';
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
          📝 Signature Areas ({{ signatureCount() }} total)
        </h3>
        <div class="signature-type-counts">
          <span class="type-badge visual">🎨 {{ visualCount() }} Visual</span>
          <span class="type-badge crypto">🔒 {{ cryptoCount() }} Crypto</span>
        </div>
        <div class="actions" (click)="$event.stopPropagation()">
          <button 
            (click)="handleClearAll()" 
            class="btn btn-clear"
            [disabled]="signatureCount() === 0"
          >
            🗑️ Clear All
          </button>
        </div>
      </div>
      
      <div 
        class="signatures-content" 
        [class.collapsed]="!isOpen()"
      >
        <div *ngFor="let page of pages()" class="page-group">
          <h4 class="page-group-header">
            📄 Page {{ page }} 
            <span class="page-count">
              ({{ getSignaturesByPage(page).length }} signature(s))
            </span>
          </h4>
          
          <div class="signatures-grid">
            <div 
              *ngFor="let sig of getSignaturesByPage(page)" 
              class="signature-card-compact" 
              [class.cryptographic]="sig.type === 'cryptographic'"
              [style.border-left-color]="sig.type === 'cryptographic' ? '#e67e22' : sig.color"
            >
              <div class="sig-content">
                <div class="sig-header">
                  <div class="sig-user" [style.color]="sig.type === 'cryptographic' ? '#e67e22' : sig.color">
                    <span class="user-icon">{{ sig.type === 'cryptographic' ? '🔒' : '🎨' }}</span>
                    <strong>{{ sig.userName }}</strong>
                  </div>
                  <span class="sig-type-badge" [class.crypto]="sig.type === 'cryptographic'">
                    {{ sig.type === 'cryptographic' ? 'CRYPTO' : 'VISUAL' }}
                  </span>
                </div>
                <div class="sig-coords">
                  Position: ({{ sig.area.x | number:'1.0-0' }}, {{ sig.area.y | number:'1.0-0' }})
                  • Size: {{ sig.area.width | number:'1.0-0' }} × {{ sig.area.height | number:'1.0-0' }}
                </div>
              </div>
              <button 
                (click)="handleRemoveSignature(sig.signatureId)" 
                class="btn-remove-compact"
                [class.crypto]="sig.type === 'cryptographic'"
                [title]="sig.type === 'cryptographic' ? 'Remove cryptographic signature' : 'Remove visual signature'"
              >
                {{ sig.type === 'cryptographic' ? '🔒' : '✕' }}
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
      flex-wrap: wrap;
      gap: 10px;
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
      flex: 1;
      min-width: 200px;
    }

    .signature-type-counts {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    .type-badge {
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      white-space: nowrap;
    }

    .type-badge.visual {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .type-badge.crypto {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
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
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 10px;
    }

    .signature-card-compact {
      background: #f8f9fa;
      border-left: 4px solid;
      border-radius: 4px;
      padding: 10px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s;
      position: relative;
      min-height: 60px;
    }

    .signature-card-compact.cryptographic {
      background: linear-gradient(90deg, #fff5e6 0%, #f8f9fa 100%);
      box-shadow: 0 2px 4px rgba(230, 126, 34, 0.1);
    }

    .signature-card-compact:hover {
      background: #e8f4f8;
      box-shadow: 0 2px 6px rgba(0,0,0,0.08);
      transform: translateX(2px);
    }

    .signature-card-compact.cryptographic:hover {
      background: linear-gradient(90deg, #ffe8cc 0%, #e8f4f8 100%);
    }

    .sig-content {
      flex: 1;
      min-width: 0;
    }

    .sig-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
      margin-bottom: 4px;
    }

    .sig-user {
      display: flex;
      align-items: center;
      gap: 6px;
      font-size: 13px;
      font-weight: 600;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      flex: 1;
    }

    .user-icon {
      font-size: 16px;
      flex-shrink: 0;
    }

    .sig-user strong {
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sig-type-badge {
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 9px;
      font-weight: 700;
      letter-spacing: 0.5px;
      background: #3498db;
      color: white;
      flex-shrink: 0;
    }

    .sig-type-badge.crypto {
      background: #e67e22;
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
      width: 26px;
      height: 26px;
      min-width: 26px;
      cursor: pointer;
      font-size: 12px;
      line-height: 1;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      margin-left: 10px;
      flex-shrink: 0;
    }

    .btn-remove-compact.crypto {
      background: #e67e22;
      font-size: 11px;
    }

    .btn-remove-compact:hover {
      background: #c0392b;
      transform: rotate(90deg) scale(1.15);
    }

    .btn-remove-compact.crypto:hover {
      background: #d35400;
      transform: scale(1.15);
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
  // Input signals
  signatures = input<SignatureArea[]>([]);
  startOpen = input<boolean>(true);

  // Output signals
  signatureRemoved = output<string>();
  clearAllRequested = output<void>();

  // Local state
  isOpen = signal<boolean>(true);

  // Computed signals
  signatureCount = computed(() => this.signatures().length);
  
  visualCount = computed(() => 
    this.signatures().filter(s => s.type === 'visual').length
  );
  
  cryptoCount = computed(() => 
    this.signatures().filter(s => s.type === 'cryptographic').length
  );
  
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
    return this.signatures()
      .filter(s => s.pageNumber === page)
      .sort((a, b) => {
        // Sort cryptographic signatures first
        if (a.type === 'cryptographic' && b.type === 'visual') return -1;
        if (a.type === 'visual' && b.type === 'cryptographic') return 1;
        return 0;
      });
  }

  handleRemoveSignature(signatureId: string) {
    this.signatureRemoved.emit(signatureId);
  }

  handleClearAll() {
    this.clearAllRequested.emit();
  }
}