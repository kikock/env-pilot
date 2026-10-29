import React, { useState } from "react";
import { ConfirmModal } from "../components/ConfirmModal";
import { useNetProfiles } from "./net/hooks/useNetProfiles";
import { NetProfileSidebar } from "./net/components/NetProfileSidebar";
import { AdapterConfigCard } from "./net/components/AdapterConfigCard";
import { NetConsoleTab } from "./net/components/NetConsoleTab";
import { NetAdapterDetailTab } from "./net/components/NetAdapterDetailTab";
import { NetScannerTab } from "./net/components/NetScannerTab";
import { NetConnectionsTab } from "./net/components/NetConnectionsTab";
import { api } from "../services/api";

type NetMainTab = "profiles" | "console" | "adapters" | "scanner" | "connections";

export const NetPage: React.FC = () => {
  const [mainTab, setMainTab] = useState<NetMainTab>("profiles");
  const [autoSave, setAutoSave] = useState(true);

  const {
    profiles,
    adapters,
    hostsProfiles,
    selectedProfileId,
    setSelectedProfileId,
    activeTabIdx,
    setActiveTabIdx,
    isActivating,
    msg,
    setMsg,
    confirmDialog,
    setConfirmDialog,
    isNewOpen,
    setIsNewOpen,
    newName,
    setNewName,
    isRenameOpen,
    setIsRenameOpen,
    renameName,
    setRenameName,
    currentProfile,
    currentTab,
    matchedAdapter,
    updateCurrentTab,
    updateCurrentProfile,
    handleCaptureCurrent,
    handleActivate,
    handleAddTab,
    handleCreateProfile,
    handleOpenRename,
    handleSaveRename,
    handleDeleteProfile,
    loadData,
  } = useNetProfiles();

  const handleManualSave = async () => {
    try {
      await api.saveNetProfiles(profiles);
      setMsg({ text: "已成功手动保存网络方案配置到磁盘！", ok: true });
    } catch (e: any) {
      setMsg({ text: `保存失败: ${e?.message || e}`, ok: false });
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", overflow: "hidden" }}>
      {/* 顶部主工作区选项卡 */}
      <div className="scope-tabs" style={{ flexShrink: 0 }}>
        <div
          className={`scope-tab ${mainTab === "profiles" ? "active" : ""}`}
          onClick={() => setMainTab("profiles")}
        >
          <span>⚙️ 网络方案配置</span>
          <span className="scope-count">{profiles.length}</span>
        </div>
        <div
          className={`scope-tab ${mainTab === "console" ? "active" : ""}`}
          onClick={() => setMainTab("console")}
        >
          <span>💻 控制台</span>
        </div>
        <div
          className={`scope-tab ${mainTab === "adapters" ? "active" : ""}`}
          onClick={() => setMainTab("adapters")}
        >
          <span>🔌 适配器详情</span>
          <span className="scope-count">{adapters.length}</span>
        </div>
        <div
          className={`scope-tab ${mainTab === "scanner" ? "active" : ""}`}
          onClick={() => setMainTab("scanner")}
        >
          <span>🔍 网络扫描器</span>
        </div>
        <div
          className={`scope-tab ${mainTab === "connections" ? "active" : ""}`}
          onClick={() => setMainTab("connections")}
        >
          <span>🌐 本机连接与端口</span>
        </div>
      </div>

      {/* 工作区内容渲染 */}
      <div style={{ flex: 1, minHeight: 0, display: "flex", width: "100%", overflow: "hidden" }}>
        {mainTab === "console" && <NetConsoleTab />}

        {mainTab === "adapters" && (
          <NetAdapterDetailTab adapters={adapters} onRefreshAdapters={loadData} />
        )}

        {mainTab === "scanner" && <NetScannerTab />}

        {mainTab === "connections" && <NetConnectionsTab />}

        {mainTab === "profiles" && (
          <div style={{ display: "flex", height: "100%", width: "100%", overflow: "hidden" }}>
            {/* 左侧方案侧边栏 */}
            <NetProfileSidebar
              profiles={profiles}
              selectedProfileId={selectedProfileId}
              onSelectProfile={(id) => {
                setSelectedProfileId(id);
                setActiveTabIdx(0);
              }}
              onOpenCreate={() => {
                setNewName("");
                setIsNewOpen(true);
              }}
              onOpenRename={handleOpenRename}
              onDeleteProfile={handleDeleteProfile}
              adapters={adapters}
              matchedAdapter={matchedAdapter}
            />

            {/* 右侧配置详情区 */}
            <div
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                background: "var(--bg-app)",
                overflowY: "auto",
              }}
            >
              {/* 顶部激活与保存横幅 */}
              <div className="toolbar" style={{ background: "var(--bg-sidebar)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "16px" }}>📶</span>
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>
                    方案: {currentProfile?.name || "未选择"}
                  </span>
                  {currentProfile && (
                    <button
                      className="fluent-btn"
                      style={{ padding: "2px 8px", fontSize: "12px" }}
                      onClick={() => handleOpenRename(currentProfile.id, currentProfile.name)}
                      title="修改当前方案名称"
                    >
                      ✏️ 重命名
                    </button>
                  )}
                </div>

                <div className="toolbar-actions" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  {/* 自动保存状态指示 */}
                  <label
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "5px",
                      fontSize: "12px",
                      cursor: "pointer",
                      color: autoSave ? "var(--color-success)" : "var(--text-muted)",
                      marginRight: "4px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                    />
                    <span>{autoSave ? "⚡ 自动保存已激活" : "自动保存已关闭"}</span>
                  </label>

                  <button
                    className="fluent-btn"
                    style={{ padding: "4px 10px", fontSize: "12px" }}
                    onClick={handleManualSave}
                    title="立即保存全部网络方案到本地存储"
                  >
                    <span>💾</span> 保存方案
                  </button>

                  <button
                    className="fluent-btn fluent-btn-success"
                    style={{ padding: "6px 16px", fontWeight: 600 }}
                    onClick={handleActivate}
                    disabled={isActivating || !currentProfile}
                  >
                    <span>▶</span>{" "}
                    {isActivating
                      ? "正在下发应用 netsh..."
                      : `激活方案: ${currentProfile?.name || ""}`}
                  </button>
                </div>
              </div>

              {/* 提示消息 (3秒自动消失) */}
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

              {currentProfile && currentTab ? (
                <AdapterConfigCard
                  currentProfile={currentProfile}
                  currentTab={currentTab}
                  activeTabIdx={activeTabIdx}
                  setActiveTabIdx={setActiveTabIdx}
                  adapters={adapters}
                  matchedAdapter={matchedAdapter}
                  hostsProfiles={hostsProfiles}
                  onAddTab={handleAddTab}
                  onCaptureCurrent={handleCaptureCurrent}
                  onUpdateTab={updateCurrentTab}
                  onUpdateProfile={updateCurrentProfile}
                />
              ) : (
                <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
                  请在左侧新建或选择一个网络方案
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 新建方案模态弹窗 */}
      {isNewOpen && (
        <div className="modal-overlay" onClick={() => setIsNewOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>新建网络方案</span>
              <button
                className="fluent-btn"
                style={{ border: "none", background: "transparent" }}
                onClick={() => setIsNewOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                方案名称
              </label>
              <input
                className="fluent-input"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleCreateProfile();
                }}
                placeholder="如 家、办公室、调试专用"
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

      {/* 重命名模态弹窗 */}
      {isRenameOpen && (
        <div className="modal-overlay" onClick={() => setIsRenameOpen(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span>修改网络方案名称</span>
              <button
                className="fluent-btn"
                style={{ border: "none", background: "transparent" }}
                onClick={() => setIsRenameOpen(false)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <label style={{ fontSize: "12px", color: "var(--text-secondary)", marginBottom: "4px", display: "block" }}>
                方案名称
              </label>
              <input
                className="fluent-input"
                value={renameName}
                onChange={(e) => setRenameName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleSaveRename();
                }}
                autoFocus
              />
            </div>
            <div className="modal-footer">
              <button className="fluent-btn" onClick={() => setIsRenameOpen(false)}>
                取消
              </button>
              <button className="fluent-btn fluent-btn-primary" onClick={handleSaveRename}>
                保存名称
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 确认模态弹窗 */}
      {confirmDialog && (
        <ConfirmModal
          {...confirmDialog}
          onCancel={() => setConfirmDialog(null)}
        />
      )}
    </div>
  );
};
