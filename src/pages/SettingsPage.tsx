import React, { useState, useEffect } from "react";
import { api, SnapshotMeta } from "../services/api";
import { ConfirmModal } from "../components/ConfirmModal";
import {
  ACCENT_PRESETS,
  DARK_PRESETS,
  getThemeConfig,
  LIGHT_PRESETS,
  saveThemeConfig,
  ThemeConfig,
  ThemeMode,
} from "../services/theme";
import { SnapshotHistoryCard } from "./settings/SnapshotHistoryCard";

export const SettingsPage: React.FC = () => {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [activeModule, setActiveModule] = useState<"env" | "hosts" | "net">("env");
  const [loading, setLoading] = useState(false);
  const [themeCfg, setThemeCfg] = useState<ThemeConfig>(getThemeConfig());
  const [closeAction, setCloseAction] = useState<"ask" | "tray" | "quit">(api.getCloseAction());
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    subMessage?: string;
    type?: "danger" | "warning" | "info";
    confirmText?: string;
    cancelText?: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    if (msg) {
      const timer = window.setTimeout(() => setMsg(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [msg]);

  const handleModeChange = (mode: ThemeMode) => {
    const next = { ...themeCfg, mode };
    setThemeCfg(next);
    saveThemeConfig(next);
  };

  const handleSelectPreset = (presetId: string, mode: "light" | "dark") => {
    const next =
      mode === "light"
        ? { ...themeCfg, selectedLightPreset: presetId }
        : { ...themeCfg, selectedDarkPreset: presetId };
    setThemeCfg(next);
    saveThemeConfig(next);
  };

  const handleToggleCustomAccent = (checked: boolean) => {
    const next = { ...themeCfg, useCustomAccent: checked };
    setThemeCfg(next);
    saveThemeConfig(next);
  };

  const handleSelectAccent = (color: string) => {
    const next = { ...themeCfg, customAccent: color };
    setThemeCfg(next);
    saveThemeConfig(next);
  };

  const loadSnapshots = async () => {
    try {
      setLoading(true);
      const list = await api.listSnapshots(activeModule);
      setSnapshots(list);
    } finally {
      setLoading(false);
    }
  };

  const handleRollback = (snap: SnapshotMeta) => {
    setConfirmDialog({
      isOpen: true,
      type: "danger",
      title: "确认恢复历史快照",
      message: `确定要将系统配置恢复到此快照吗？`,
      subMessage: `模块: ${activeModule.toUpperCase()} | 快照时间: ${snap.created_at}\n快照摘要: ${snap.summary}`,
      confirmText: "确认恢复快照",
      cancelText: "取消",
      onConfirm: async () => {
        setConfirmDialog(null);
        try {
          const res = await api.rollbackSnapshot(snap.id, activeModule);
          setMsg({ text: res, ok: true });
          loadSnapshots();
        } catch (e: any) {
          setMsg({ text: `快照恢复失败: ${e?.message || e}`, ok: false });
        }
      },
    });
  };

  useEffect(() => {
    loadSnapshots();
  }, [activeModule]);

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px", overflowY: "auto", height: "100%" }}>
      {msg && (
        <div
          style={{
            padding: "10px 16px",
            background: msg.ok ? "var(--color-success-bg)" : "var(--color-danger-bg)",
            color: msg.ok ? "var(--color-success)" : "var(--color-danger)",
            borderRadius: "var(--radius-sm)",
            fontSize: "13px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span>{msg.text}</span>
          <span style={{ cursor: "pointer" }} onClick={() => setMsg(null)}>✕</span>
        </div>
      )}

      {/* 视觉主题设置 */}
      <div className="env-var-card" style={{ padding: "16px" }}>
        <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>
          🎨 Fluent Design 视觉主题定制
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* 明暗模式 */}
          <div>
            <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
              外观基调 (Appearance Mode)
            </label>
            <div style={{ display: "flex", gap: "10px" }}>
              {(["system", "dark", "light"] as ThemeMode[]).map((m) => (
                <button
                  key={m}
                  className={`fluent-btn ${themeCfg.mode === m ? "fluent-btn-primary" : ""}`}
                  style={{ minWidth: "90px" }}
                  onClick={() => handleModeChange(m)}
                >
                  {m === "system" ? "💻 跟随系统" : m === "dark" ? "🌙 暗色深邃" : "☀️ 亮色清新"}
                </button>
              ))}
            </div>
          </div>

          {/* 根据当前生效的主题模式，仅展示当前主题的微调预设 */}
          {(() => {
            const isDarkEffective =
              themeCfg.mode === "dark" ||
              (themeCfg.mode === "system" &&
                typeof window !== "undefined" &&
                window.matchMedia("(prefers-color-scheme: dark)").matches);

            return isDarkEffective ? (
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                  当前暗色主题微调预设 (Dark Presets)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px" }}>
                  {DARK_PRESETS.map((p) => {
                    const isSel = themeCfg.selectedDarkPreset === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPreset(p.id, "dark")}
                        style={{
                          padding: "8px",
                          borderRadius: "var(--radius-sm)",
                          border: isSel ? "2px solid var(--color-primary)" : "1px solid var(--border-subtle)",
                          background: p.bgApp,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.accent }} />
                          <span style={{ fontSize: "11px", fontWeight: isSel ? 600 : "normal", color: p.textMain }}>
                            {p.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "8px", display: "block" }}>
                  当前亮色主题微调预设 (Light Presets)
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(130px, 1fr))", gap: "8px" }}>
                  {LIGHT_PRESETS.map((p) => {
                    const isSel = themeCfg.selectedLightPreset === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => handleSelectPreset(p.id, "light")}
                        style={{
                          padding: "8px",
                          borderRadius: "var(--radius-sm)",
                          border: isSel ? "2px solid var(--color-primary)" : "1px solid var(--border-subtle)",
                          background: p.bgApp,
                          cursor: "pointer",
                          display: "flex",
                          flexDirection: "column",
                          gap: "4px",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                          <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: p.accent }} />
                          <span style={{ fontSize: "11px", fontWeight: isSel ? 600 : "normal", color: p.textMain }}>
                            {p.name}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* 自定义主色调 */}
          <div>
            <label style={{ fontSize: "12px", display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
              <input
                type="checkbox"
                checked={themeCfg.useCustomAccent}
                onChange={(e) => handleToggleCustomAccent(e.target.checked)}
              />
              <span style={{ fontWeight: 500 }}>启用自定义主强调色 (Accent Color)</span>
            </label>
          </div>

          {themeCfg.useCustomAccent && (
            <div style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap" }}>
                {ACCENT_PRESETS.map((acc) => (
                  <button
                    key={acc.color}
                    onClick={() => handleSelectAccent(acc.color)}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: acc.color,
                      border: themeCfg.customAccent.toLowerCase() === acc.color.toLowerCase() ? "2.5px solid var(--text-main)" : "1px solid rgba(0,0,0,0.1)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: themeCfg.customAccent.toLowerCase() === acc.color.toLowerCase() ? "scale(1.15)" : "none",
                      transition: "all 0.15s ease",
                    }}
                    title={acc.name}
                  >
                    {themeCfg.customAccent.toLowerCase() === acc.color.toLowerCase() && (
                      <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: "bold" }}>✓</span>
                    )}
                  </button>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "6px" }}>
                  <input
                    type="color"
                    value={themeCfg.customAccent}
                    onChange={(e) => handleSelectAccent(e.target.value)}
                    style={{
                      width: "32px",
                      height: "32px",
                      border: "none",
                      borderRadius: "50%",
                      cursor: "pointer",
                      background: "transparent",
                    }}
                  />
                  <span style={{ fontSize: "11px", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                    {themeCfg.customAccent.toUpperCase()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 窗口与系统托盘行为 */}
      <div className="env-var-card" style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "12px" }}>
        <div style={{ fontWeight: 600, fontSize: "14px" }}>
          🗔 窗口控制与系统托盘行为
        </div>
        <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
          点击右上角关闭按钮时的默认操作模式：
        </div>
        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "13px" }}>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="radio"
              name="closeAction"
              value="ask"
              checked={closeAction === "ask"}
              onChange={() => {
                setCloseAction("ask");
                api.setCloseAction("ask");
              }}
            />
            <span>每次询问（弹窗提示）</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="radio"
              name="closeAction"
              value="tray"
              checked={closeAction === "tray"}
              onChange={() => {
                setCloseAction("tray");
                api.setCloseAction("tray");
              }}
            />
            <span>最小化到托盘（不在任务栏显示）</span>
          </label>
          <label style={{ display: "flex", alignItems: "center", gap: "6px", cursor: "pointer" }}>
            <input
              type="radio"
              name="closeAction"
              value="quit"
              checked={closeAction === "quit"}
              onChange={() => {
                setCloseAction("quit");
                api.setCloseAction("quit");
              }}
            />
            <span>直接退出程序</span>
          </label>
        </div>
        <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>
          * 点击窗口最小化按钮（_）时，窗口将直接缩小至系统托盘，不再占用任务栏空间。
        </div>
      </div>

      {/* 历史快照组件 */}
      <SnapshotHistoryCard
        activeModule={activeModule}
        setActiveModule={setActiveModule}
        snapshots={snapshots}
        loading={loading}
        onRollback={handleRollback}
      />

      {/* 软件与系统运行架构说明 */}
      <div className="env-var-card" style={{ padding: "16px" }}>
        <div style={{ fontWeight: 600, fontSize: "14px", marginBottom: "8px" }}>
          ℹ 系统运行架构与权限设计
        </div>
        <div style={{ color: "var(--text-secondary)", fontSize: "12px", lineHeight: "1.8" }}>
          <div>• 核心引擎：Tauri 2.x + 原生 Rust 内核 + Fluent Design 系统界面</div>
          <div>• 注册表位置：系统变量位于 <code>HKLM\SYSTEM\CurrentControlSet\Control\Session Manager\Environment</code>，写入自动触发 <code>WM_SETTINGCHANGE</code> 广播</div>
          <div>• Hosts 存储：系统路径位于 <code>%SystemRoot%\System32\drivers\etc\hosts</code>，采用临时文件 + <code>ReplaceFileW</code> 保证原子性写入，杜绝断电半截文件</div>
          <div>• 网络适配器：通过 Win32 <code>GetAdaptersAddresses</code> 探查实时状态，并通过系统 <code>netsh</code> 工具按接口下发配置</div>
        </div>
      </div>

      {confirmDialog && (
        <ConfirmModal
          {...confirmDialog}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};
