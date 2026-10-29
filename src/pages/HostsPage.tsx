import React from "react";
import { ConfirmModal } from "../components/ConfirmModal";
import { useHostsState } from "./hosts/hooks/useHostsState";
import { HostsProfileSidebar } from "./hosts/components/HostsProfileSidebar";

export const HostsPage: React.FC = () => {
  const {
    profiles,
    systemHosts,
    selectedId,
    activeContent,
    setActiveContent,
    isApplying,
    msg,
    setMsg,
    confirmDialog,
    setConfirmDialog,
    isNewOpen,
    setIsNewOpen,
    newProfileName,
    setNewProfileName,
    handleSelectProfile,
    handleToggleProfile,
    handleSaveCurrent,
    handleCreateProfile,
    handleDeleteProfile,
    handleFlushDns,
  } = useHostsState();

  const isReadonly = selectedId === "__system__";
  const currentProfile = profiles.find((p) => p.id === selectedId);

  return (
    <div style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>
      {/* 左侧方案侧边栏 */}
      <HostsProfileSidebar
        systemHosts={systemHosts}
        profiles={profiles}
        selectedId={selectedId}
        onSelectProfile={handleSelectProfile}
        onToggleProfile={handleToggleProfile}
        onOpenCreate={() => {
          setNewProfileName("");
          setIsNewOpen(true);
        }}
        onDeleteProfile={handleDeleteProfile}
      />

      {/* 右侧编辑器区域 */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", background: "var(--bg-app)" }}>
        {/* 工具栏 */}
        <div className="toolbar" style={{ background: "var(--bg-sidebar)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <span style={{ fontSize: "16px" }}>{isReadonly ? "💻" : "📄"}</span>
            <span style={{ fontWeight: 600, fontSize: "14px" }}>
              {isReadonly ? "系统当前生效 Hosts (只读)" : currentProfile?.name || "未知方案"}
            </span>
            {!isReadonly && currentProfile && (
              <span
                className={`badge ${currentProfile.enabled ? "badge-success" : "badge-standard"}`}
                style={{ fontSize: "11px" }}
              >
                {currentProfile.enabled ? "● 已启用" : "○ 已停用"}
              </span>
            )}
          </div>

          <div className="toolbar-actions">
            <button className="fluent-btn" onClick={handleFlushDns} title="清空并刷新本地 DNS 解析缓存">
              <span>🧹</span> 刷新 DNS 缓存
            </button>
            {!isReadonly && (
              <button
                className="fluent-btn fluent-btn-primary"
                onClick={handleSaveCurrent}
                disabled={isApplying}
              >
                <span>💾</span> {isApplying ? "保存并同步中..." : "保存方案"}
              </button>
            )}
          </div>
        </div>

        {/* 提示消息 */}
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

        {/* 文本编辑器 */}
        <div style={{ flex: 1, padding: "12px", display: "flex", flexDirection: "column" }}>
          <textarea
            className="fluent-input"
            style={{
              flex: 1,
              fontFamily: "var(--font-mono)",
              fontSize: "13px",
              lineHeight: 1.6,
              resize: "none",
              padding: "12px",
              background: isReadonly ? "rgba(0,0,0,0.05)" : "var(--bg-card)",
              cursor: isReadonly ? "default" : "text",
            }}
            readOnly={isReadonly}
            value={activeContent}
            onChange={(e) => setActiveContent(e.target.value)}
            placeholder="# 在此输入 Hosts 规则，例如:\n# 127.0.0.1 localhost\n# 0.0.0.0 ad.example.com"
          />
        </div>

        {/* 底部统计栏 */}
        <div className="app-statusbar">
          <div>
            行数: {activeContent.split("\n").length} 行 • 有效规则:{" "}
            {
              activeContent
                .split("\n")
                .map((l) => l.trim())
                .filter((l) => l && !l.startsWith("#")).length
            }{" "}
            条
          </div>
          <div>提示：每行一条，前缀 # 表示注释；右侧勾选即刻应用</div>
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
            <div className="modal-body" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                  方案名称
                </label>
                <input
                  className="fluent-input"
                  placeholder="如 开发环境, 广告屏蔽, GitHub 加速"
                  value={newProfileName}
                  onChange={(e) => setNewProfileName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleCreateProfile();
                  }}
                  autoFocus
                />
              </div>
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

      {/* 确认提示模态弹窗 */}
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
