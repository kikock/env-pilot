import React, { useState } from "react";
import { SubItemModalState } from "../types";

interface SubItemModalProps {
  modalState: SubItemModalState;
  onClose: () => void;
  onSave: (savedValues: string[]) => void;
}

export const SubItemModal: React.FC<SubItemModalProps> = ({
  modalState,
  onClose,
  onSave,
}) => {
  const [singleValue, setSingleValue] = useState(modalState.value || "");
  const [multiValues, setMultiValues] = useState<string[]>(
    modalState.values && modalState.values.length > 0
      ? modalState.values
      : [""]
  );

  const [error, setError] = useState<string | null>(null);

  const handleAddInput = () => {
    setError(null);
    setMultiValues((prev) => [...prev, ""]);
  };

  const handleRemoveInput = (idx: number) => {
    setError(null);
    setMultiValues((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleMultiChange = (idx: number, text: string) => {
    setError(null);
    setMultiValues((prev) => {
      const copy = [...prev];
      copy[idx] = text;
      return copy;
    });
  };

  const handleSubmit = () => {
    if (modalState.isNew) {
      const valid = multiValues.map((v) => v.trim()).filter((v) => v.length > 0);
      if (valid.length === 0) {
        setError("请至少填写一项有效的变量值或路径");
        return;
      }
      setError(null);
      onSave(valid);
    } else {
      const trimmed = singleValue.trim();
      if (!trimmed) {
        setError("变量值不能为空，请输入有效内容");
        return;
      }
      setError(null);
      onSave([trimmed]);
    }
  };

  const validCount = multiValues.map((v) => v.trim()).filter((v) => v.length > 0).length;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-card"
        style={{ maxWidth: "580px", maxHeight: "85vh", display: "flex", flexDirection: "column" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <span>
            {modalState.isNew
              ? `向 ${modalState.varName} 添加变量值`
              : `修改 ${modalState.varName} 变量值 (第 ${modalState.index + 1} 项)`}
          </span>
          <button
            className="fluent-btn"
            style={{ border: "none", background: "transparent" }}
            onClick={onClose}
          >
            ✕
          </button>
        </div>

        <div
          className="modal-body"
          style={{ display: "flex", flexDirection: "column", gap: "12px", overflowY: "auto", flex: 1 }}
        >
          {modalState.isNew ? (
            <>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                请输入要添加的变量值或目录路径，可点击下方【+ 添加变量值】同时录入多个值：
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {multiValues.map((val, idx) => (
                  <div key={idx} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span
                      style={{
                        fontSize: "12px",
                        color: "var(--text-muted)",
                        width: "22px",
                        textAlign: "right",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      {idx + 1}.
                    </span>
                    <input
                      className="fluent-input"
                      style={{ fontFamily: "var(--font-mono)", flex: 1 }}
                      value={val}
                      onChange={(e) => handleMultiChange(idx, e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" && !e.shiftKey) {
                          e.preventDefault();
                          if (idx === multiValues.length - 1) {
                            handleAddInput();
                          }
                        }
                      }}
                      placeholder="如 C:\Program Files\nodejs 或 %JAVA_HOME%\bin"
                      autoFocus={idx === 0}
                    />
                    {multiValues.length > 1 && (
                      <button
                        className="fluent-btn"
                        style={{
                          padding: "4px 8px",
                          color: "var(--color-danger)",
                          fontSize: "12px",
                        }}
                        onClick={() => handleRemoveInput(idx)}
                        title="删除该输入框"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                ))}
              </div>

              <div>
                <button
                  className="fluent-btn"
                  style={{ fontSize: "12px", padding: "4px 12px" }}
                  onClick={handleAddInput}
                >
                  <span>+</span> 添加变量值
                </button>
              </div>
            </>
          ) : (
            <div>
              <label
                style={{
                  fontSize: "12px",
                  color: "var(--text-secondary)",
                  marginBottom: "4px",
                  display: "block",
                }}
              >
                路径或变量值
              </label>
              <input
                className="fluent-input"
                style={{ fontFamily: "var(--font-mono)" }}
                value={singleValue}
                onChange={(e) => setSingleValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSubmit();
                }}
                placeholder="如 C:\Program Files\nodejs 或 %JAVA_HOME%\bin"
                autoFocus
              />
            </div>
          )}

          {error && (
            <div
              style={{
                padding: "8px 12px",
                borderRadius: "4px",
                background: "var(--color-danger-bg)",
                color: "var(--color-danger)",
                fontSize: "12px",
                display: "flex",
                alignItems: "center",
                gap: "6px",
              }}
            >
              <span>⚠️</span>
              <span>{error}</span>
            </div>
          )}
        </div>

        <div className="modal-footer">
          <button className="fluent-btn" onClick={onClose}>
            取消
          </button>
          <button
            className="fluent-btn fluent-btn-primary"
            onClick={handleSubmit}
          >
            {modalState.isNew
              ? `添加并暂存${validCount > 0 ? ` (${validCount}项)` : ""}`
              : "保存修改并暂存"}
          </button>
        </div>
      </div>
    </div>
  );
};
