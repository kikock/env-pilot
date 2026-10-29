export interface ConfirmDialogState {
  isOpen: boolean;
  title?: string;
  message: string;
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  onConfirm: () => void;
}
