import React, { useState, useEffect } from "react";

interface CloseActionModalProps {
  isOpen: boolean;
  onHideToTray: (remember: boolean) => void;
  onExitApp: (remember: boolean) => void;
  onCancel: () => void;
}

export const CloseActionModal: React.FC<CloseActionModalProps> = ({
  isOpen,
  onHideToTray,
  onExitApp,
  onCancel,
}) => {
  const [remember, setRemember] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onCancel();
      } else if (e.key === "Enter") {
        e.preventDefault();
        onHideToTray(remember);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, remember, onCancel, onHideToTray]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.55)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
      }}
      onClick={onCancel}
    >
      <div
        className="fluent-card"
        style={{
          width: 440,
          backgroundColor: "var(--bg-card)",
          boxShadow: "0 20px 48px rgba(0, 0, 0, 0.4), 0 0 0 1px var(--border-subtle)",
          borderRadius: 14,
          padding: 24,
          animation: "fluentModalPopIn 0.2s cubic-bezier(0.1, 0.9, 0.2, 1.0)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
          <div
            style={{
              width: 38,
              height: 38,
              borderRadius: 10,
              background: "linear-gradient(135deg, rgba(0, 120, 212, 0.25), rgba(0, 153, 255, 0.1))",
              border: "1px solid var(--border-accent)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--accent-primary)",
              flexShrink: 0,
            }}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="3" width="20" height="13" rx="2.5" />
              <path d="M12 8v5" />
              <path d="m9 11 3 3 3-3" />
              <line x1="7" y1="20" x2="17" y2="20" />
              <line x1="12" y1="16" x2="12" y2="20" />
            </svg>
          </div>
          <div>
            <h3 style={{ fontSize: 16, fontWeight: 600, color: "var(--text-main)", margin: 0 }}>
              关闭窗口提示
            </h3>
            <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
              请选择程序退出或托盘常驻策略
            </span>
          </div>
        </div>

        <p style={{ color: "var(--text-secondary)", fontSize: 13, marginBottom: 18, lineHeight: 1.6 }}>
          您希望将程序缩小至系统托盘继续在后台运行，还是直接彻底退出应用程序？
        </p>

        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            cursor: "pointer",
            fontSize: 12.5,
            color: "var(--text-muted)",
            marginBottom: 24,
            userSelect: "none",
          }}
        >
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            style={{ accentColor: "var(--accent-primary)", cursor: "pointer", width: 14, height: 14 }}
          />
          <span>记住我的选择，下次不再提示（可在「设置」中修改）</span>
        </label>

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button
            className="fluent-btn"
            onClick={onCancel}
            style={{
              padding: "7px 15px",
              fontSize: 12.5,
              borderRadius: 6,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
              border: "1px solid var(--border-subtle)",
              background: "var(--bg-card)",
              color: "var(--text-main)",
            }}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
            <span>取消</span>
          </button>
          <button
            className="fluent-btn fluent-btn-exit"
            onClick={() => onExitApp(remember)}
            style={{
              padding: "7px 15px",
              fontSize: 12.5,
              borderRadius: 6,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              color: "var(--color-danger)",
              border: "1px solid rgba(216, 59, 1, 0.35)",
              background: "var(--color-danger-bg)",
              outline: "none",
              transition: "all 0.15s ease",
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
              <line x1="12" y1="2" x2="12" y2="12" />
            </svg>
            <span>彻底退出</span>
          </button>
          <button
            className="fluent-btn fluent-btn-primary"
            onClick={() => onHideToTray(remember)}
            style={{
              padding: "7px 16px",
              fontSize: 12.5,
              borderRadius: 6,
              cursor: "pointer",
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              boxShadow: "0 4px 12px var(--accent-glow)",
              transition: "all 0.15s ease",
            }}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="3" y="3" width="18" height="13" rx="2.5" />
              <path d="M12 7v5" />
              <path d="m9.5 10 2.5 2.5 2.5-2.5" />
              <line x1="7" y1="19" x2="17" y2="19" />
            </svg>
            <span>缩小到托盘</span>
          </button>
        </div>
      </div>
    </div>
  );
};

