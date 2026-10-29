import React, { useState } from "react";
import { api, ScannedHost } from "../../../services/api";

export const NetScannerTab: React.FC = () => {
  const [startIp, setStartIp] = useState("192.168.1.0");
  const [endIp, setEndIp] = useState("192.168.1.255");
  const [isScanning, setIsScanning] = useState(false);
  const [hosts, setHosts] = useState<ScannedHost[]>([]);
  const [search, setSearch] = useState("");
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleStartScan = async () => {
    if (isScanning) return;
    try {
      setIsScanning(true);
      setStatusMsg("正在多协程并发扫描局域网存活主机...");
      const res = await api.scanSubnet(startIp, endIp);
      setHosts(res);
      setStatusMsg(`扫描完成，在当前网段共发现 ${res.length} 台在线设备。`);
    } catch (e: any) {
      setStatusMsg(`扫描中断: ${e?.message || e}`);
    } finally {
      setIsScanning(false);
    }
  };

  const filtered = hosts.filter((h) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      h.ip.toLowerCase().includes(q) ||
      h.hostname.toLowerCase().includes(q) ||
      h.mac.toLowerCase().includes(q)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", padding: "16px", gap: "12px", boxSizing: "border-box" }}>
      {/* 顶部工具栏 */}
      <div
        className="env-var-card"
        style={{
          padding: "8px 14px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap",
          width: "100%",
          boxSizing: "border-box",
          background: "var(--bg-card)",
        }}
      >
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>模式:</span>
        <select className="fluent-input" style={{ width: "100px", fontSize: "12px" }}>
          <option>IPv4 范围</option>
        </select>

        <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "4px" }}>范围:</span>
        <input
          className="fluent-input"
          style={{ width: "120px", fontFamily: "var(--font-mono)" }}
          value={startIp}
          onChange={(e) => setStartIp(e.target.value)}
          placeholder="起始 IP"
        />
        <span style={{ color: "var(--text-muted)" }}>-</span>
        <input
          className="fluent-input"
          style={{ width: "120px", fontFamily: "var(--font-mono)" }}
          value={endIp}
          onChange={(e) => setEndIp(e.target.value)}
          placeholder="结束 IP"
        />

        <button
          className="fluent-btn fluent-btn-primary"
          style={{
            padding: "4px 12px",
            fontSize: "12px",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
          onClick={handleStartScan}
          disabled={isScanning}
        >
          <span>{isScanning ? "⏹" : "▶"}</span>
          <span>{isScanning ? "正在扫描..." : "开始扫描"}</span>
        </button>

        {/* 快速搜索框 */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            className="fluent-input"
            style={{ width: "180px", fontSize: "12px" }}
            placeholder="🔍 搜索 IP、主机名..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {statusMsg && (
        <div style={{ fontSize: "11px", color: "var(--color-info)", paddingLeft: "4px" }}>
          ℹ {statusMsg}
        </div>
      )}

      {/* 扫描结果树形表格 */}
      <div
        className="env-var-card"
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          padding: "0",
          overflow: "hidden",
          boxSizing: "border-box",
        }}
      >
        {/* 表头 */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(140px, 1.4fr) minmax(130px, 1.3fr) minmax(150px, 1.4fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(90px, 0.8fr)",
            padding: "8px 14px",
            background: "rgba(0, 0, 0, 0.2)",
            borderBottom: "1px solid var(--border-subtle)",
            fontSize: "12px",
            fontWeight: 600,
            color: "var(--text-secondary)",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <span>IP 地址</span>
          <span>主机名称</span>
          <span>MAC 地址</span>
          <span>设备群组</span>
          <span>系统 (OS)</span>
          <span style={{ textAlign: "right" }}>响应 / 延迟</span>
        </div>

        {/* 表体 */}
        <div style={{ flex: 1, overflowY: "auto", width: "100%", boxSizing: "border-box" }}>
          {filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
              {isScanning ? "正在扫描局域网节点..." : "暂无扫描结果，请在上方输入 IP 范围并点击【开始扫描】"}
            </div>
          ) : (
            filtered.map((h, idx) => (
              <div
                key={idx}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(140px, 1.4fr) minmax(130px, 1.3fr) minmax(150px, 1.4fr) minmax(100px, 1fr) minmax(100px, 1fr) minmax(90px, 0.8fr)",
                  padding: "8px 14px",
                  borderBottom: "1px solid var(--border-subtle)",
                  fontSize: "12px",
                  alignItems: "center",
                  fontFamily: "var(--font-mono)",
                  width: "100%",
                  boxSizing: "border-box",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: "var(--color-success)" }}>🖳</span>
                  <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>{h.ip}</span>
                </div>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.hostname || "..."}</span>
                <span style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.mac || "--:--:--:--"}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.vendor || "局域网"}</span>
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{h.os}</span>
                <span style={{ textAlign: "right", color: h.latency_ms < 5 ? "var(--color-success)" : "var(--color-warning)" }}>
                  {h.latency_ms} ms
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
