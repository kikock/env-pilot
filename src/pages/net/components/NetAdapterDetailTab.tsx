import React, { useState } from "react";
import { AdapterInfo } from "../../../services/api";

interface NetAdapterDetailTabProps {
  adapters: AdapterInfo[];
  onRefreshAdapters: () => void;
}

export const NetAdapterDetailTab: React.FC<NetAdapterDetailTabProps> = ({
  adapters,
  onRefreshAdapters,
}) => {
  const [selectedIdx, setSelectedIdx] = useState<number>(0);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const current = adapters[selectedIdx] || null;

  const copyToClipboard = async (text: string, key: string) => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(text);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = text;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey((prev) => (prev === key ? null : prev));
      }, 2000);
    } catch (e) {
      console.error("复制失败:", e);
    }
  };

  const copyAllDetails = (adp: AdapterInfo) => {
    const text = [
      `【适配器名称】: ${adp.name}`,
      `【硬件描述】: ${adp.description || "原生网络接口"}`,
      `【MAC 物理地址】: ${adp.mac || "无"}`,
      `【DHCP 状态】: ${adp.is_dhcp ? "已启用 (自动获取 IP / DNS)" : "未启用 (手动静态分配)"}`,
      `【IPv4 地址】: ${adp.ip || "未分配"}`,
      `【子网掩码】: ${adp.mask || "255.255.255.0"}`,
      `【默认网关】: ${adp.gateway || "无"}`,
      `【首选 DNS】: ${adp.dns[0] || "自动分配"}`,
      `【备用 DNS】: ${adp.dns[1] || "无"}`,
    ].join("\n");
    copyToClipboard(text, "all");
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    await onRefreshAdapters();
    setIsRefreshing(false);
  };

  const getAdapterIcon = (name: string, desc: string) => {
    const combined = `${name} ${desc}`.toLowerCase();
    if (combined.includes("wi-fi") || combined.includes("wlan") || combined.includes("wireless")) {
      return "📶";
    }
    if (combined.includes("bluetooth") || combined.includes("蓝牙")) {
      return "🔷";
    }
    if (combined.includes("virtual") || combined.includes("veth") || combined.includes("mihomo")) {
      return "🌐";
    }
    return "🖧";
  };

  const renderDetailRow = (label: string, value: string, copyValue?: string, copyKey?: string) => {
    const isCopied = copyKey && copiedKey === copyKey;
    const canCopy = Boolean(copyValue && copyValue !== "无" && copyValue !== "未分配" && copyValue !== "自动分配");

    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "8px 0",
          borderBottom: "1px dashed var(--border-subtle)",
        }}
      >
        <span style={{ color: "var(--text-secondary)", width: "150px", flexShrink: 0 }}>{label}:</span>
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", minWidth: 0 }}>
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontWeight: label.includes("IPv4") ? 600 : 500,
              color: label.includes("IPv4") ? "var(--color-primary)" : "var(--text-main)",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {value}
          </span>
          {canCopy ? (
            <button
              className="fluent-btn"
              title={`复制 ${label}`}
              style={{
                fontSize: "11px",
                padding: "2px 8px",
                height: "24px",
                minWidth: "60px",
                flexShrink: 0,
                cursor: "pointer",
              }}
              onClick={() => copyToClipboard(copyValue!, copyKey!)}
            >
              {isCopied ? <span style={{ color: "var(--color-success)" }}>✓ 已复制</span> : <span>📋 复制</span>}
            </button>
          ) : (
            <div style={{ width: "60px", flexShrink: 0 }} />
          )}
        </div>
      </div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", padding: "16px", gap: "12px", boxSizing: "border-box" }}>
      {/* 顶部工具栏：去掉原获取适配器和接口冗余按钮，保留简洁刷新与设备计数 */}
      <div
        className="env-var-card"
        style={{
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "var(--bg-card)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--text-main)" }}>
            网络适配器与物理接口详情
          </span>
          <button
            className="fluent-btn"
            style={{ fontSize: "11px", padding: "3px 10px" }}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            <span>{isRefreshing ? "⏳ 正在刷新..." : "🔄 刷新设备列表"}</span>
          </button>
        </div>

        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>
          共检测到 {adapters.length} 块网络设备
        </span>
      </div>

      {/* 主体两栏布局 */}
      <div style={{ flex: 1, display: "flex", width: "100%", gap: "12px", minHeight: 0, boxSizing: "border-box" }}>
        {/* 左侧设备树/列表 */}
        <div
          className="env-var-card"
          style={{
            width: "280px",
            minWidth: "240px",
            flexShrink: 0,
            display: "flex",
            flexDirection: "column",
            padding: "8px",
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          <div style={{ fontSize: "12px", color: "var(--text-muted)", marginBottom: "6px", paddingLeft: "6px" }}>
            网络设备树形目录:
          </div>

          {adapters.map((adp, idx) => {
            const isSel = idx === selectedIdx;
            const icon = getAdapterIcon(adp.name, adp.description);
            return (
              <div
                key={idx}
                onClick={() => setSelectedIdx(idx)}
                style={{
                  padding: "8px 10px",
                  borderRadius: "var(--radius-sm)",
                  background: isSel ? "var(--color-primary-bg)" : "transparent",
                  borderLeft: isSel ? "3px solid var(--color-primary)" : "3px solid transparent",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  fontSize: "12px",
                  marginBottom: "4px",
                }}
              >
                <span>{icon}</span>
                <div style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  <div style={{ fontWeight: isSel ? 600 : "normal", color: isSel ? "var(--color-primary)" : "var(--text-main)" }}>
                    {adp.name}
                  </div>
                  <div style={{ fontSize: "10px", color: "var(--text-muted)", textOverflow: "ellipsis", overflow: "hidden" }}>
                    {adp.ip || "未分配 IP"}
                  </div>
                </div>
                {adp.ip && (
                  <span style={{ fontSize: "10px", color: "var(--color-success)" }}>●</span>
                )}
              </div>
            );
          })}
        </div>

        {/* 右侧属性明细表与复制功能 */}
        <div
          className="env-var-card"
          style={{
            flex: 1,
            minWidth: 0,
            width: "100%",
            display: "flex",
            flexDirection: "column",
            padding: "16px",
            overflowY: "auto",
            boxSizing: "border-box",
          }}
        >
          {current ? (
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* 头部：标题与一键复制全部配置按钮 */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  borderBottom: "1px solid var(--border-subtle)",
                  paddingBottom: "12px",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <span style={{ fontSize: "22px" }}>{getAdapterIcon(current.name, current.description)}</span>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "15px", color: "var(--text-main)" }}>{current.name}</div>
                    <div style={{ fontSize: "11px", color: "var(--text-muted)" }}>{current.description || "原生网络接口"}</div>
                  </div>
                </div>

                <button
                  className="fluent-btn fluent-btn-primary"
                  style={{ fontSize: "12px", padding: "4px 12px", display: "flex", alignItems: "center", gap: "6px" }}
                  onClick={() => copyAllDetails(current)}
                >
                  {copiedKey === "all" ? (
                    <span style={{ color: "#fff" }}>✓ 已复制全部参数</span>
                  ) : (
                    <span>📋 复制全部配置</span>
                  )}
                </button>
              </div>

              {/* 核心配置表：每项均提供快捷复制按钮 */}
              <div style={{ display: "flex", flexDirection: "column", fontSize: "12px" }}>
                {renderDetailRow("MAC 物理硬件地址", current.mac || "无", current.mac, "mac")}
                {renderDetailRow(
                  "DHCP 分配状态",
                  current.is_dhcp ? "已启用 (自动获取 IP / DNS)" : "未启用 (手动静态分配)",
                  current.is_dhcp ? "DHCP Enabled" : "Static Manual",
                  "dhcp"
                )}
                {renderDetailRow("IPv4 地址", current.ip || "未分配", current.ip, "ip")}
                {renderDetailRow("子网掩码 (Subnet)", current.mask || "255.255.255.0", current.mask, "mask")}
                {renderDetailRow("默认网关 (Gateway)", current.gateway || "无", current.gateway, "gateway")}
                {renderDetailRow("首选 DNS 服务器", current.dns[0] || "自动分配", current.dns[0], "dns0")}
                {renderDetailRow("备用 DNS 服务器", current.dns[1] || "无", current.dns[1], "dns1")}
              </div>
            </div>
          ) : (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>
              请在左侧选择一个网络适配器以查看配置参数
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
