// modal.component.ts
import { Component, OnInit, OnDestroy, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { ModalService, ModalConfig } from '../../services/modal.service';

@Component({
  selector: 'app-modal',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div *ngIf="showModal()" class="modal-overlay" (click)="onOverlayClick()">
      <div class="modal-container" (click)="$event.stopPropagation()">
        <div class="modal-header" [ngClass]="headerClass()">
          <div class="modal-icon">
            <span *ngIf="modalConfig().type === 'info'">ℹ️</span>
            <span *ngIf="modalConfig().type === 'warning'">⚠️</span>
            <span *ngIf="modalConfig().type === 'error'">❌</span>
            <span *ngIf="modalConfig().type === 'confirm'">❓</span>
          </div>
          <h3>{{ modalConfig().title }}</h3>
        </div>
        <div class="modal-body">
          <p>{{ modalConfig().message }}</p>
        </div>
        <div class="modal-footer">
          <button 
            *ngIf="showCancelButton()" 
            (click)="modalConfig().onCancel()" 
            class="btn-modal btn-cancel-modal"
          >
            {{ modalConfig().cancelText }}
          </button>
          <button 
            (click)="modalConfig().onConfirm()" 
            class="btn-modal btn-confirm-modal"
            [ngClass]="confirmButtonClass()"
          >
            {{ modalConfig().confirmText }}
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
      background: rgba(0, 0, 0, 0.6);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      animation: fadeIn 0.2s ease-out;
    }

    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }

    .modal-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.3);
      width: 90%;
      max-width: 450px;
      overflow: hidden;
      animation: slideUp 0.3s ease-out;
    }

    @keyframes slideUp {
      from {
        transform: translateY(50px);
        opacity: 0;
      }
      to {
        transform: translateY(0);
        opacity: 1;
      }
    }

    .modal-header {
      padding: 20px 24px;
      display: flex;
      align-items: center;
      gap: 12px;
      border-bottom: 1px solid #e0e0e0;
    }

    .modal-header.modal-info {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }

    .modal-header.modal-warning {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
      color: white;
    }

    .modal-header.modal-error {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
      color: white;
    }

    .modal-header.modal-confirm {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
      color: white;
    }

    .modal-icon {
      font-size: 28px;
      line-height: 1;
    }

    .modal-header h3 {
      margin: 0;
      font-size: 20px;
      font-weight: 600;
    }

    .modal-body {
      padding: 24px;
    }

    .modal-body p {
      margin: 0;
      font-size: 15px;
      line-height: 1.6;
      color: #2c3e50;
    }

    .modal-footer {
      padding: 16px 24px;
      background: #f8f9fa;
      display: flex;
      justify-content: flex-end;
      gap: 12px;
      border-top: 1px solid #e0e0e0;
    }

    .btn-modal {
      padding: 10px 24px;
      border: none;
      border-radius: 6px;
      font-size: 15px;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s;
    }

    .btn-modal:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    .btn-modal:active {
      transform: translateY(0);
    }

    .btn-cancel-modal {
      background: #95a5a6;
      color: white;
    }

    .btn-cancel-modal:hover {
      background: #7f8c8d;
    }

    .btn-confirm-modal {
      color: white;
    }

    .btn-confirm-modal.btn-info {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    }

    .btn-confirm-modal.btn-warning {
      background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
    }

    .btn-confirm-modal.btn-error {
      background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
    }

    .btn-confirm-modal.btn-confirm {
      background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
    }

    .btn-confirm-modal:hover {
      filter: brightness(1.1);
    }
  `]
})
export class ModalComponent implements OnInit, OnDestroy {
  // Signals for local state
  showModal = signal<boolean>(false);
  modalConfig = signal<ModalConfig>({
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: () => {},
    onCancel: () => {}
  });

  // Computed signals
  showCancelButton = computed(() => this.modalConfig().type === 'confirm');
  
  headerClass = computed(() => {
    const type = this.modalConfig().type;
    return `modal-${type}`;
  });

  confirmButtonClass = computed(() => {
    const type = this.modalConfig().type;
    return `btn-${type}`;
  });

  private subscriptions: Subscription[] = [];

  constructor(private modalService: ModalService) {}

  ngOnInit(): void {
    this.subscriptions.push(
      this.modalService.showModal$.subscribe((show: boolean) => {
        this.showModal.set(show);
      })
    );

    this.subscriptions.push(
      this.modalService.modalConfig$.subscribe((config: ModalConfig) => {
        this.modalConfig.set(config);
      })
    );
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  onOverlayClick(): void {
    this.modalService.close();
  }
}