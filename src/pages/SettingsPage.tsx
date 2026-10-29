import React, { useState, useEffect } from "react";
import { api, SnapshotMeta } from "../services/api";
import {
  ACCENT_PRESETS,
  DARK_PRESETS,
  getThemeConfig,
  LIGHT_PRESETS,
  saveThemeConfig,
  ThemeConfig,
  ThemeMode,
} from "../services/theme";

export const SettingsPage: React.FC = () => {
  const [snapshots, setSnapshots] = useState<SnapshotMeta[]>([]);
  const [activeModule, setActiveModule] = useState<"env" | "hosts" | "net">("env");
  const [loading, setLoading] = useState(false);

  // 主题状态
  const [themeCfg, setThemeCfg] = useState<ThemeConfig>(getThemeConfig());

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

  useEffect(() => {
    loadSnapshots();
  }, [activeModule]);

  const activePresets =
    themeCfg.mode === "light" ||
    (themeCfg.mode === "system" && !window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? LIGHT_PRESETS
      : DARK_PRESETS;

  const currentPresetId =
    themeCfg.mode === "light" ||
    (themeCfg.mode === "system" && !window.matchMedia("(prefers-color-scheme: dark)").matches)
      ? themeCfg.selectedLightPreset
      : themeCfg.selectedDarkPreset;

  return (
    <div style={{ flex: 1, padding: "20px 24px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h2 style={{ fontSize: "18px", fontWeight: 600, marginBottom: "4px" }}>
          ⚙ 个性化主题与系统设置
        </h2>
        <p style={{ color: "var(--text-secondary)", fontSize: "12px" }}>
          自定应用视觉模式、色相主题色盘与强调色，并查看系统安全快照库历史。
        </p>
      </div>

      {/* 现代主题配置卡片 (对标现代高保真设计) */}
      <div className="theme-card">
        {/* 顶部标题与模式切换按钮组 */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "15px", fontWeight: 600 }}>主题模式</span>
          <div className="theme-segmented">
            <button
              className={`theme-seg-btn ${themeCfg.mode === "light" ? "active" : ""}`}
              onClick={() => handleModeChange("light")}
            >
              <span>☼</span> 浅色
            </button>
            <button
              className={`theme-seg-btn ${themeCfg.mode === "system" ? "active" : ""}`}
              onClick={() => handleModeChange("system")}
            >
              <span>💻</span> 系统
            </button>
            <button
              className={`theme-seg-btn ${themeCfg.mode === "dark" ? "active" : ""}`}
              onClick={() => handleModeChange("dark")}
            >
              <span>☾</span> 深色
            </button>
          </div>
        </div>

        <div style={{ height: "1px", background: "var(--border-subtle)", margin: "0 -4px" }} />

        {/* 主题色盘 (圆形色块列表) */}
        <div>
          <div style={{ fontSize: "13px", fontWeight: 600, marginBottom: "12px", color: "var(--text-main)" }}>
            {themeCfg.mode === "dark" ? "深色主题色盘" : "浅色主题色盘"}
          </div>
          <div className="palette-grid">
            {activePresets.map((preset) => {
              const isSelected = preset.id === currentPresetId;
              return (
                <div
                  key={preset.id}
                  className={`color-swatch-circle ${isSelected ? "selected" : ""}`}
                  style={{
                    backgroundColor: preset.bgApp,
                    border: `1.5px solid ${preset.borderSubtle}`,
                  }}
                  onClick={() => handleSelectPreset(preset.id, preset.mode)}
                  title={`${preset.name} (${preset.bgApp})`}
                >
                  {isSelected && (
                    <span
                      className="check-mark"
                      style={{
                        color: preset.mode === "light" ? "#1a1a1a" : "#ffffff",
                      }}
                    >
                      ✓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ height: "1px", background: "var(--border-subtle)", margin: "0 -4px" }} />

        {/* 使用自定义强调色 Switch 开关 */}
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontSize: "14px", fontWeight: 600 }}>使用自定义强调色</div>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)", marginTop: "2px" }}>
                覆盖主题自带的强调色
              </div>
            </div>
            <label className="fluent-switch">
              <input
                type="checkbox"
                checked={themeCfg.useCustomAccent}
                onChange={(e) => handleToggleCustomAccent(e.target.checked)}
              />
              <span className="switch-slider" />
            </label>
          </div>

          {/* 展开的强调色选色盘 */}
          {themeCfg.useCustomAccent && (
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>选择或拾取强调色：</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", alignItems: "center" }}>
                {ACCENT_PRESETS.map((acc) => (
                  <button
                    key={acc.color}
                    onClick={() => handleSelectAccent(acc.color)}
                    style={{
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      backgroundColor: acc.color,
                      border: themeCfg.customAccent === acc.color ? "2.5px solid var(--text-main)" : "1px solid rgba(0,0,0,0.1)",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      transform: themeCfg.customAccent === acc.color ? "scale(1.15)" : "none",
                      transition: "all 0.15s ease",
                    }}
                    title={acc.name}
                  >
                    {themeCfg.customAccent === acc.color && (
                      <span style={{ color: "#ffffff", fontSize: "12px", fontWeight: "bold" }}>✓</span>
                    )}
                  </button>
                ))}

                {/* 拾色器输入 */}
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
                    title="自定义拾色器"
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

      {/* 历史快照时间线 */}
      <div className="env-var-card" style={{ padding: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", borderBottom: "1px solid var(--border-subtle)", paddingBottom: "8px" }}>
          <span style={{ fontWeight: 600, fontSize: "14px" }}>📸 自动安全快照备份 (最近50份)</span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              className={`fluent-btn ${activeModule === "env" ? "fluent-btn-primary" : ""}`}
              onClick={() => setActiveModule("env")}
            >
              环境变量快照
            </button>
            <button
              className={`fluent-btn ${activeModule === "hosts" ? "fluent-btn-primary" : ""}`}
              onClick={() => setActiveModule("hosts")}
            >
              Hosts 文件快照
            </button>
            <button
              className={`fluent-btn ${activeModule === "net" ? "fluent-btn-primary" : ""}`}
              onClick={() => setActiveModule("net")}
            >
              网络配置快照
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
            正在加载快照历史...
          </div>
        ) : snapshots.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)" }}>
            当前模块暂无历史快照记录（系统将在首次应用更改时自动生成）
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {snapshots.map((snap) => (
              <div
                key={snap.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "rgba(0, 0, 0, 0.15)",
                  borderRadius: "var(--radius-sm)",
                  fontFamily: "var(--font-mono)",
                  fontSize: "12px",
                }}
              >
                <div>
                  <span style={{ color: "var(--text-muted)", marginRight: "12px" }}>
                    {snap.created_at}
                  </span>
                  <span style={{ fontWeight: 600 }}>{snap.summary}</span>
                </div>
                <span style={{ color: "var(--color-info)", fontSize: "11px" }}>
                  ID: {snap.id}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

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
    </div>
  );
};
