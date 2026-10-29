import React from "react";
import {
  AdapterInfo,
  AdapterTabConfig,
  HostsProfile,
  NetProfile,
} from "../../../services/api";
import { Ipv4DnsForm } from "./Ipv4DnsForm";

interface AdapterConfigCardProps {
  currentProfile: NetProfile;
  currentTab: AdapterTabConfig;
  activeTabIdx: number;
  setActiveTabIdx: (idx: number) => void;
  adapters: AdapterInfo[];
  matchedAdapter?: AdapterInfo;
  hostsProfiles: HostsProfile[];
  onAddTab: () => void;
  onCaptureCurrent: () => void;
  onUpdateTab: (updated: AdapterTabConfig) => void;
  onUpdateProfile: (updated: NetProfile) => void;
}

export const AdapterConfigCard: React.FC<AdapterConfigCardProps> = ({
  currentProfile,
  currentTab,
  activeTabIdx,
  setActiveTabIdx,
  adapters,
  matchedAdapter,
  hostsProfiles,
  onAddTab,
  onCaptureCurrent,
  onUpdateTab,
  onUpdateProfile,
}) => {
  return (
    <div style={{ padding: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* 网卡多页签切换 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          borderBottom: "1px solid var(--border-subtle)",
          paddingBottom: "8px",
        }}
      >
        {currentProfile.adapters.map((adp, idx) => (
          <button
            key={idx}
            className={`fluent-btn ${activeTabIdx === idx ? "fluent-btn-primary" : ""}`}
            onClick={() => setActiveTabIdx(idx)}
          >
            #{idx + 1} {adp.adapter_name}
          </button>
        ))}

        <button
          className="fluent-btn"
          onClick={onAddTab}
          title="为此方案添加第二块网卡绑定配置"
        >
          + 添加网卡页签
        </button>

        <div style={{ flex: 1 }} />

        <button className="fluent-btn" onClick={onCaptureCurrent}>
          ⤓ 从当前物理配置一键读取
        </button>
      </div>

      {/* 当前绑定的网卡选择与状态 */}
      <div className="env-var-card" style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <label style={{ fontSize: "12px", color: "var(--text-secondary)", width: "80px" }}>
            目标适配器:
          </label>
          <select
            className="fluent-input"
            style={{ flex: 1 }}
            value={currentTab.adapter_name}
            onChange={(e) =>
              onUpdateTab({ ...currentTab, adapter_name: e.target.value })
            }
          >
            {adapters.map((a) => (
              <option key={a.name} value={a.name}>
                {a.name} ({a.description}) — {a.ip || "无IP"}
              </option>
            ))}
          </select>
        </div>

        {matchedAdapter && (
          <div style={{ fontSize: "11px", color: "var(--text-muted)", paddingLeft: "92px" }}>
            硬件设备: {matchedAdapter.description} | MAC: {matchedAdapter.mac} | 连接状态:{" "}
            <span style={{ color: matchedAdapter.is_up ? "var(--color-success)" : "var(--color-danger)" }}>
              {matchedAdapter.is_up ? "● 已连接" : "○ 未插网线/未连接"}
            </span>
          </div>
        )}
      </div>

      {/* 两列布局：左列配置 IP 与 DNS，右列配置代理与联动 Hosts */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <Ipv4DnsForm currentTab={currentTab} onUpdateTab={onUpdateTab} />

        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* 附加项：系统代理 */}
          <div className="env-var-card">
            <div
              style={{
                fontWeight: 600,
                marginBottom: "12px",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "6px",
              }}
            >
              附加设置：Windows 系统代理
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="radio"
                  name="proxyMode"
                  checked={currentProfile.proxy.mode === "Keep"}
                  onChange={() =>
                    onUpdateProfile({
                      ...currentProfile,
                      proxy: { ...currentProfile.proxy, mode: "Keep" },
                    })
                  }
                />
                <span>保持当前系统代理不变</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="radio"
                  name="proxyMode"
                  checked={currentProfile.proxy.mode === "Disable"}
                  onChange={() =>
                    onUpdateProfile({
                      ...currentProfile,
                      proxy: { ...currentProfile.proxy, mode: "Disable" },
                    })
                  }
                />
                <span>关闭系统代理 (直连)</span>
              </label>

              <label style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <input
                  type="radio"
                  name="proxyMode"
                  checked={currentProfile.proxy.mode === "Manual"}
                  onChange={() =>
                    onUpdateProfile({
                      ...currentProfile,
                      proxy: { ...currentProfile.proxy, mode: "Manual" },
                    })
                  }
                />
                <span>启用手动系统代理:</span>
              </label>

              {currentProfile.proxy.mode === "Manual" && (
                <div style={{ paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
                  <input
                    className="fluent-input"
                    placeholder="代理服务器地址:端口 (如 127.0.0.1:7890)"
                    value={currentProfile.proxy.server}
                    onChange={(e) =>
                      onUpdateProfile({
                        ...currentProfile,
                        proxy: { ...currentProfile.proxy, server: e.target.value },
                      })
                    }
                  />
                  <input
                    className="fluent-input"
                    placeholder="例外地址 (如 localhost;127.*;192.168.*)"
                    value={currentProfile.proxy.bypass}
                    onChange={(e) =>
                      onUpdateProfile({
                        ...currentProfile,
                        proxy: { ...currentProfile.proxy, bypass: e.target.value },
                      })
                    }
                  />
                </div>
              )}
            </div>
          </div>

          {/* 附加项：联动 Hosts 方案 */}
          <div className="env-var-card">
            <div
              style={{
                fontWeight: 600,
                marginBottom: "12px",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: "6px",
              }}
            >
              附加设置：联动启用 Hosts 方案
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "12px", color: "var(--text-secondary)" }}>
                激活此网络方案时，同时自动激活指定的 Hosts 方案：
              </div>
              <select
                className="fluent-input"
                value={currentProfile.linked_hosts_id || ""}
                onChange={(e) =>
                  onUpdateProfile({
                    ...currentProfile,
                    linked_hosts_id: e.target.value || null,
                  })
                }
              >
                <option value="">(不联动 Hosts 方案)</option>
                {hostsProfiles.map((hp) => (
                  <option key={hp.id} value={hp.id}>
                    {hp.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
