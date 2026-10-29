import React from "react";

export interface ConfirmModalProps {
  isOpen: boolean;
  title?: string;
  message: string;
  subMessage?: string;
  confirmText?: string;
  cancelText?: string;
  type?: "danger" | "warning" | "info";
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  title = "操作确认",
  message,
  subMessage,
  confirmText = "确定",
  cancelText = "取消",
  type = "danger",
  onConfirm,
  onCancel,
}) => {
  if (!isOpen) return null;

  const icon = type === "danger" ? "🗑️" : type === "warning" ? "⚠️" : "ℹ️";
  const confirmBtnClass =
    type === "danger"
      ? "fluent-btn fluent-btn-danger"
      : "fluent-btn fluent-btn-primary";

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div
        className="modal-card"
        style={{
          maxWidth: "440px",
          width: "90vw",
          animation: "modalFadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontSize: "16px" }}>{icon}</span>
            <span style={{ fontWeight: 600 }}>{title}</span>
          </div>
          <button
            className="fluent-btn"
            style={{ border: "none", background: "transparent", fontSize: "16px" }}
            onClick={onCancel}
          >
            ✕
          </button>
        </div>

        <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "10px", padding: "16px 20px" }}>
          <div style={{ fontSize: "14px", color: "var(--text-main)", lineHeight: 1.5, wordBreak: "break-all" }}>
            {message}
          </div>
          {subMessage && (
            <div style={{ fontSize: "12px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", background: "rgba(0,0,0,0.12)", padding: "6px 10px", borderRadius: "var(--radius-sm)", wordBreak: "break-all" }}>
              {subMessage}
            </div>
          )}
        </div>

        <div className="modal-footer" style={{ padding: "12px 20px" }}>
          {cancelText && (
            <button className="fluent-btn" onClick={onCancel}>
              {cancelText}
            </button>
          )}
          <button
            className={confirmBtnClass}
            onClick={onConfirm}
            autoFocus
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};
