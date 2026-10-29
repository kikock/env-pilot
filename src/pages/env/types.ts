import { EnvScope, ValueKind } from "../../services/api";

export interface EditingVarState {
  isNew: boolean;
  scope: EnvScope;
  name: string;
  origName?: string;
  value: string;
  kind: ValueKind;
}

export interface SubItemModalState {
  varName: string;
  scope: EnvScope;
  isNew: boolean;
  index: number;
  value: string;
  values?: string[];
}

export interface ConfirmDialogState {
  isOpen: boolean;
  title?: string;
  message: string;
  subMessage?: string;
  type?: "danger" | "warning" | "info";
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
}
