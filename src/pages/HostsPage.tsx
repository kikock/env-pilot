import React, { useState, useEffect } from "react";
import {
  api,
  HostsProfile,
  HostsSettings,
  SystemHostsInfo,
} from "../services/api";
import { ConfirmModal } from "../components/ConfirmModal";

export const HostsPage: React.FC = () => {
  const [profiles, setProfiles] = useState<HostsProfile[]>([]);
  const [settings, setSettings] = useState<HostsSettings>({
    is_single_mode: false,
    write_strategy: "Managed",
    auto_flush_dns: true,
  });
  const [systemHosts, setSystemHosts] = useState<SystemHostsInfo | null>(null);
  const [selectedId, setSelectedId] = useState<string>("__system__");
  const [activeContent, setActiveContent] = useState("");
  const [loading, setLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  // 通用美化确认弹窗
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    subMessage?: string;
    onConfirm: () => void;
  } | null>(null);

  // 新建弹窗
  const [isNewOpen, setIsNewOpen] = useState(false);
  const [newProfileName, setNewProfileName] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);
      const sys = await api.getSystemHosts();
      setSystemHosts(sys);

      const [profs, sets] = await api.getHostsProfiles();
      setProfiles(profs);
      setSettings(sets);

      if (selectedId === "__system__") {
        setActiveContent(sys.content);
      } else {
        const found = profs.find((p) => p.id === selectedId);
        if (found) setActiveContent(found.content);
      }
    } catch (e: any) {
      setMsg({ text: `加载 Hosts 失败: ${e?.message || e}`, ok: false });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSelectProfile = (id: string) => {
    // 切换前保存上一个编辑中的草稿
    if (selectedId !== "__system__") {
      setProfiles((prev) =>
        prev.map((p) => (p.id === selectedId ? { ...p, content: activeContent } : p))
      );
    }

    setSelectedId(id);
    if (id === "__system__") {
      setActiveContent(systemHosts?.content || "");
    } else {
      const target = profiles.find((p) => p.id === id);
      if (target) setActiveContent(target.content);
    }
  };

  // 拨动开关
  const handleToggleProfile = async (id: string) => {
    const updated = profiles.map((p) => {
      if (settings.is_single_mode) {
        return { ...p, enabled: p.id === id ? !p.enabled : false };
      }
      return p.id === id ? { ...p, enabled: !p.enabled } : p;
    });

    setProfiles(updated);
    // 自动应用到系统
    try {
      setIsApplying(true);
      await api.applyHosts(updated, settings);
      const sys = await api.getSystemHosts();
      setSystemHosts(sys);
      if (selectedId === "__system__") setActiveContent(sys.content);
      setMsg({ text: "Hosts 方案已成功切换并更新到系统 hosts 文件！", ok: true });
    } catch (e: any) {
      setMsg({ text: `应用失败: ${e?.message || e}`, ok: false });
    } finally {
      setIsApplying(false);
    }
  };

  // 保存当前方案
  const handleSaveCurrent = async () => {
    if (selectedId === "__system__") return;

    const updated = profiles.map((p) =>
      p.id === selectedId ? { ...p, content: activeContent } : p
    );
    setProfiles(updated);

    try {
      setIsApplying(true);
      await api.saveHostsProfiles(updated, settings);
      // 如果当前编辑的方案正在启用，则联动应用到系统
      const current = updated.find((p) => p.id === selectedId);
      if (current?.enabled) {
        await api.applyHosts(updated, settings);
        const sys = await api.getSystemHosts();
        setSystemHosts(sys);
      }
      setMsg({ text: "方案已成功保存并实时同步生效！", ok: true });
    } catch (e: any) {
      setMsg({ text: `保存失败: ${e?.message || e}`, ok: false });
    } finally {
      setIsApplying(false);
    }
  };

  // 新建方案
  const handleCreateProfile = async () => {
    if (!newProfileName.trim()) return;
    const newProf: HostsProfile = {
      id: `hosts-${Date.now()}`,
      name: newProfileName.trim(),
      kind: { type: "Local" },
      enabled: false,
      content: `# ${newProfileName.trim()}\r\n127.0.0.1 example.local`,
      order: profiles.length,
    };
    const nextProfiles = [...profiles, newProf];
    setProfiles(nextProfiles);
    await api.saveHostsProfiles(nextProfiles, settings);
    setIsNewOpen(false);
    setNewProfileName("");
    handleSelectProfile(newProf.id);
  };

  // 删除方案
  const handleDeleteProfile = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      title: "删除 Hosts 方案",
      message: `确定要删除 Hosts 方案 "${name}" 吗？`,
      subMessage: "此操作将永久移除该方案的自定义域名解析规则。",
      onConfirm: async () => {
        setConfirmDialog(null);
        const nextProfiles = profiles.filter((p) => p.id !== id);
        setProfiles(nextProfiles);
        await api.saveHostsProfiles(nextProfiles, settings);
        handleSelectProfile("__system__");
        setMsg({ text: `已成功删除方案 "${name}"`, ok: true });
      },
    });
  };

  // 刷新 DNS
  const handleFlushDns = async () => {
    try {
      await api.flushDns();
      setMsg({ text: "系统 DNS 缓存已成功刷新！", ok: true });
    } catch (e: any) {
      setMsg({ text: `刷新 DNS 失败: ${e?.message || e}`, ok: false });
    }
  };

  const lineCount = activeContent.split("\n").length;

  return (
    <div style={{ display: "flex", height: "100%", overflow: "hidden" }}>
      {/* 左侧方案管理导航 */}
      <div
        style={{
          width: "280px",
          background: "var(--bg-sidebar)",
          borderRight: "1px solid var(--border-subtle)",
          display: "flex",
          flexDirection: "column",
          padding: "12px",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "4px" }}>
          <span style={{ fontWeight: 600, fontSize: "13px" }}>方案列表 (SwitchHosts)</span>
          <button
            className="fluent-btn"
            style={{ padding: "3px 8px", fontSize: "11px" }}
            onClick={() => setIsNewOpen(true)}
          >
            + 新建方案
          </button>
        </div>

        {/* 系统 Hosts 固定第一项 */}
        <div
          className={`nav-item ${selectedId === "__system__" ? "active" : ""}`}
          onClick={() => handleSelectProfile("__system__")}
          style={{ justifyContent: "space-between" }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span>🖥</span>
            <span>系统 Hosts (只读查看)</span>
          </div>
          <span style={{ fontSize: "10px", color: "var(--text-muted)" }}>
            {systemHosts?.is_readonly ? "只读" : "可写"}
          </span>
        </div>

        <div style={{ height: "1px", background: "var(--border-subtle)", margin: "4px 0" }} />

        {/* 用户方案列表 */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: "4px" }}>
          {profiles.map((p) => (
            <div
              key={p.id}
              className={`nav-item ${selectedId === p.id ? "active" : ""}`}
              onClick={() => handleSelectProfile(p.id)}
              style={{ justifyContent: "space-between" }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                <span>📄</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {p.name}
                </span>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "6px" }} onClick={(e) => e.stopPropagation()}>
                {/* 方案开关 */}
                <input
                  type="checkbox"
                  style={{ cursor: "pointer", width: "16px", height: "16px" }}
                  checked={p.enabled}
                  onChange={() => handleToggleProfile(p.id)}
                  title={p.enabled ? "点击停用" : "点击启用并写入系统 hosts"}
                />

                <span
                  style={{ color: "var(--text-muted)", cursor: "pointer", fontSize: "12px" }}
                  onClick={() => handleDeleteProfile(p.id, p.name)}
                  title="删除方案"
                >
                  🗑
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* 底部模式与快捷工具 */}
        <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "8px", display: "flex", flexDirection: "column", gap: "6px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: "11px", color: "var(--text-muted)" }}>
            <span>托管模式:</span>
            <span style={{ color: "var(--color-success)" }}># EnvPilot BEGIN/END 区块</span>
          </div>
          <button className="fluent-btn" style={{ width: "100%", justifyContent: "center" }} onClick={handleFlushDns}>
            ⚡ 刷新系统 DNS 缓存
          </button>
        </div>
      </div>

      {/* 右侧 Hosts 文本编辑器 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-app)" }}>
        {/* 工具栏 */}
        <div className="toolbar">
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ fontWeight: 600 }}>
              {selectedId === "__system__"
                ? "系统 hosts 真实内容"
                : `编辑方案: ${profiles.find((p) => p.id === selectedId)?.name || ""}`}
            </span>
            {selectedId === "__system__" && (
              <span className="badge badge-standard">系统文件只读防护</span>
            )}
          </div>

          <div className="toolbar-actions">
            {selectedId !== "__system__" && (
              <button
                className="fluent-btn fluent-btn-primary"
                onClick={handleSaveCurrent}
                disabled={isApplying}
              >
                💾 保存并实时同步
              </button>
            )}
          </div>
        </div>

        {/* 状态消息 */}
        {msg && (
          <div
            style={{
              padding: "6px 16px",
              background: msg.ok ? "var(--color-success-bg)" : "var(--color-danger-bg)",
              color: msg.ok ? "var(--color-success)" : "var(--color-danger)",
              fontSize: "12px",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{msg.text}</span>
            <span style={{ cursor: "pointer" }} onClick={() => setMsg(null)}>
              ✕
            </span>
          </div>
        )}

        {/* 等宽代码编辑区 */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden", position: "relative" }}>
          <textarea
            style={{
              width: "100%",
              height: "100%",
              padding: "16px",
              background: "var(--bg-surface)",
              color: "var(--text-main)",
              border: "none",
              outline: "none",
              resize: "none",
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              lineHeight: "1.6",
              whiteSpace: "pre",
            }}
            value={activeContent}
            onChange={(e) => setActiveContent(e.target.value)}
            readOnly={selectedId === "__system__"}
            placeholder="在此输入 hosts 规则，例如：\n127.0.0.1 my.app.local\n0.0.0.0 ad.tracker.com"
          />
        </div>

        {/* 底部状态 */}
        <div className="app-statusbar">
          <div>
            行数: {lineCount} 行 • 编码: {systemHosts?.encoding || "UTF-8"} • 换行符: CRLF
          </div>
          <div>格式说明: IP 与主机名之间以空格或制表符隔开，'#' 为注释</div>
        </div>
      </div>

      {/* 新建方案弹窗 */}
      {isNewOpen && (
        <div className="modal-overlay" onClick={() => setIsNewOpen(false)}>
          <div className="modal-card" style={{ maxWidth: "420px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>新建 Hosts 方案</span>
              <button className="fluent-btn" style={{ border: "none" }} onClick={() => setIsNewOpen(false)}>
                ✕
              </button>
            </div>
            <div className="modal-body">
              <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                方案名称
              </label>
              <input
                className="fluent-input"
                placeholder="如 测试机房屏蔽, 生产域名映射"
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="fluent-btn" onClick={() => setIsNewOpen(false)}>
                取消
              </button>
              <button className="fluent-btn fluent-btn-primary" onClick={handleCreateProfile}>
                创建方案
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 美化后的通用确认弹窗 */}
      {confirmDialog && (
        <ConfirmModal
          isOpen={confirmDialog.isOpen}
          title={confirmDialog.title}
          message={confirmDialog.message}
          subMessage={confirmDialog.subMessage}
          onConfirm={confirmDialog.onConfirm}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};
