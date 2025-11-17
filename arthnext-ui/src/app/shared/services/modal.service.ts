// modal.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

export interface ModalConfig {
  title: string;
  message: string;
  type: 'info' | 'warning' | 'error' | 'confirm';
  confirmText: string;
  cancelText: string;
  onConfirm: () => void;
  onCancel: () => void;
}

@Injectable({
  providedIn: 'root'
})
export class ModalService {
  private showModalSubject = new BehaviorSubject<boolean>(false);
  private modalConfigSubject = new BehaviorSubject<ModalConfig>({
    title: '',
    message: '',
    type: 'info',
    confirmText: 'OK',
    cancelText: 'Cancel',
    onConfirm: () => {},
    onCancel: () => {}
  });

  showModal$: Observable<boolean> = this.showModalSubject.asObservable();
  modalConfig$: Observable<ModalConfig> = this.modalConfigSubject.asObservable();

  /**
   * Show an alert modal (info, warning, or error)
   * @param title - Modal title
   * @param message - Modal message
   * @param type - Modal type (info, warning, error)
   */
  showAlert(title: string, message: string, type: 'info' | 'warning' | 'error' = 'info'): void {
    this.modalConfigSubject.next({
      title,
      message,
      type,
      confirmText: 'OK',
      cancelText: 'Cancel',
      onConfirm: () => this.close(),
      onCancel: () => this.close()
    });
    this.showModalSubject.next(true);
  }

  /**
   * Show a confirmation modal (with Yes/No buttons)
   * @param title - Modal title
   * @param message - Modal message
   * @param onConfirm - Callback function when user clicks Yes
   * @param onCancel - Optional callback function when user clicks No
   */
  showConfirm(
    title: string, 
    message: string, 
    onConfirm: () => void, 
    onCancel?: () => void
  ): void {
    this.modalConfigSubject.next({
      title,
      message,
      type: 'confirm',
      confirmText: 'Yes',
      cancelText: 'No',
      onConfirm: () => {
        this.close();
        onConfirm();
      },
      onCancel: () => {
        this.close();
        if (onCancel) onCancel();
      }
    });
    this.showModalSubject.next(true);
  }

  /**
   * Close the modal
   */
  close(): void {
    this.showModalSubject.next(false);
  }
}