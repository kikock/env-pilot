import React, { useState, useEffect } from "react";
import { api, NetConnectionInfo } from "../../../services/api";

export const NetConnectionsTab: React.FC = () => {
  const [connections, setConnections] = useState<NetConnectionInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [search, setSearch] = useState("");

  const loadConnections = async () => {
    try {
      setLoading(true);
      const res = await api.getActiveConnections();
      setConnections(res);
    } catch (e) {
      console.error("获取活动连接失败:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadConnections();
  }, []);

  const filtered = connections.filter((item) => {
    // 协议过滤
    if (filterType === "TCP" && !item.proto.toUpperCase().includes("TCP")) return false;
    if (filterType === "UDP" && !item.proto.toUpperCase().includes("UDP")) return false;
    if (filterType === "LISTEN" && item.state !== "LISTENING") return false;

    // 搜索过滤
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      item.process_name.toLowerCase().includes(q) ||
      item.local_port.toString().includes(q) ||
      item.remote_port.toString().includes(q) ||
      item.local_ip.includes(q) ||
      item.remote_ip.includes(q) ||
      item.pid.toString().includes(q)
    );
  });

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", padding: "16px", gap: "12px", boxSizing: "border-box" }}>
      {/* 顶部工具与过滤栏 */}
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
        <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>过滤类型:</span>
        <select
          className="fluent-input"
          style={{ width: "160px", fontSize: "12px" }}
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
        >
          <option value="ALL">全部 (TCP & UDP v4/v6)</option>
          <option value="TCP">仅 TCP 连接</option>
          <option value="UDP">仅 UDP 监听/连接</option>
          <option value="LISTEN">仅监听端点 (LISTENING)</option>
        </select>

        <button
          className="fluent-btn fluent-btn-primary"
          style={{ padding: "4px 12px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px" }}
          onClick={loadConnections}
          disabled={loading}
        >
          <span>{loading ? "⏳" : "🔄"}</span>
          <span>{loading ? "正在刷新..." : "刷新活动连接"}</span>
        </button>

        <span style={{ fontSize: "12px", color: "var(--text-muted)", marginLeft: "4px" }}>
          共 {connections.length} 条记录 (筛选显示 {filtered.length})
        </span>

        {/* 快速搜索框 */}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: "6px" }}>
          <input
            className="fluent-input"
            style={{ width: "200px", fontSize: "12px" }}
            placeholder="🔍 搜索 PID、端口、进程..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 连接与端口列表表格 */}
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
            gridTemplateColumns: "minmax(140px, 1.6fr) minmax(110px, 1.2fr) minmax(80px, 0.9fr) minmax(110px, 1.2fr) minmax(80px, 0.9fr) minmax(70px, 0.7fr) minmax(100px, 1fr) minmax(70px, 0.7fr)",
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
          <span>进程</span>
          <span>本地 IP</span>
          <span>端口 (本地)</span>
          <span>远程 IP</span>
          <span>端口 (远程)</span>
          <span>协议</span>
          <span>连接状态</span>
          <span style={{ textAlign: "right" }}>PID</span>
        </div>

        {/* 表体 */}
        <div style={{ flex: 1, overflowY: "auto", width: "100%", boxSizing: "border-box" }}>
          {loading ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
              正在枚举本机活动网络端口与连接...
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "12px" }}>
              未检索到符合条件的活动网络连接
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isListening = item.state === "LISTENING";
              return (
                <div
                  key={idx}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(140px, 1.6fr) minmax(110px, 1.2fr) minmax(80px, 0.9fr) minmax(110px, 1.2fr) minmax(80px, 0.9fr) minmax(70px, 0.7fr) minmax(100px, 1fr) minmax(70px, 0.7fr)",
                    padding: "8px 14px",
                    borderBottom: "1px solid var(--border-subtle)",
                    fontSize: "12px",
                    alignItems: "center",
                    fontFamily: "var(--font-mono)",
                    width: "100%",
                    boxSizing: "border-box",
                  }}
                >
                  {/* 进程名称 */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                    title={item.path || item.process_name}
                  >
                    <span>⚡</span>
                    <span style={{ fontWeight: 600, color: "var(--text-main)", overflow: "hidden", textOverflow: "ellipsis" }}>
                      {item.process_name}
                    </span>
                  </div>

                  {/* 本地 IP */}
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.local_ip}
                  </span>

                  {/* 本地端口 */}
                  <span style={{ fontWeight: 600, color: "var(--color-primary)" }}>
                    {item.local_port}
                  </span>

                  {/* 远程 IP */}
                  <span style={{ color: "var(--text-muted)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {item.remote_ip || "*"}
                  </span>

                  {/* 远程端口 */}
                  <span style={{ color: "var(--text-muted)" }}>
                    {item.remote_port === 0 ? "*" : item.remote_port}
                  </span>

                  {/* 协议 */}
                  <span style={{ fontSize: "11px", color: "var(--text-secondary)" }}>
                    {item.proto}
                  </span>

                  {/* 状态 */}
                  <div>
                    <span
                      style={{
                        padding: "2px 6px",
                        borderRadius: "4px",
                        fontSize: "10px",
                        fontWeight: 600,
                        backgroundColor: isListening ? "rgba(59, 130, 246, 0.15)" : "rgba(34, 197, 94, 0.15)",
                        color: isListening ? "var(--color-primary)" : "var(--color-success)",
                      }}
                    >
                      {item.state}
                    </span>
                  </div>

                  {/* PID */}
                  <span style={{ textAlign: "right", color: "var(--text-muted)" }}>
                    {item.pid}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
