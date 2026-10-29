import React from "react";
import { AdapterTabConfig } from "../../../services/api";

interface Ipv4DnsFormProps {
  currentTab: AdapterTabConfig;
  onUpdateTab: (updated: AdapterTabConfig) => void;
}

export const Ipv4DnsForm: React.FC<Ipv4DnsFormProps> = ({
  currentTab,
  onUpdateTab,
}) => {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* IP 与网关面板 */}
      <div className="env-var-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "6px",
          }}
        >
          <label
            style={{
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={currentTab.apply_ip}
              onChange={(e) =>
                onUpdateTab({ ...currentTab, apply_ip: e.target.checked })
              }
            />
            <span>IP 与网关设置</span>
          </label>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {currentTab.apply_ip ? "激活时写入" : "忽略不修改"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            opacity: currentTab.apply_ip ? 1 : 0.4,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="ipv4Mode"
              checked={currentTab.ipv4.mode === "Dhcp"}
              onChange={() =>
                onUpdateTab({
                  ...currentTab,
                  ipv4: { ...currentTab.ipv4, mode: "Dhcp" },
                })
              }
            />
            <span>自动获取 IP 地址 (DHCP)</span>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="ipv4Mode"
              checked={currentTab.ipv4.mode === "Static"}
              onChange={() =>
                onUpdateTab({
                  ...currentTab,
                  ipv4: { ...currentTab.ipv4, mode: "Static" },
                })
              }
            />
            <span>使用下面的 IP 地址 (静态配置):</span>
          </label>

          {currentTab.ipv4.mode === "Static" && (
            <div
              style={{
                paddingLeft: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "70px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  IP 地址:
                </span>
                <input
                  className="fluent-input"
                  style={{ fontFamily: "var(--font-mono)" }}
                  placeholder="如 192.168.1.100"
                  value={currentTab.ipv4.ip}
                  onChange={(e) =>
                    onUpdateTab({
                      ...currentTab,
                      ipv4: { ...currentTab.ipv4, ip: e.target.value },
                    })
                  }
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "70px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  子网掩码:
                </span>
                <input
                  className="fluent-input"
                  style={{ fontFamily: "var(--font-mono)" }}
                  placeholder="如 255.255.255.0"
                  value={currentTab.ipv4.mask}
                  onChange={(e) =>
                    onUpdateTab({
                      ...currentTab,
                      ipv4: { ...currentTab.ipv4, mask: e.target.value },
                    })
                  }
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "70px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  默认网关:
                </span>
                <input
                  className="fluent-input"
                  style={{ fontFamily: "var(--font-mono)" }}
                  placeholder="如 192.168.1.1"
                  value={currentTab.ipv4.gateway}
                  onChange={(e) =>
                    onUpdateTab({
                      ...currentTab,
                      ipv4: { ...currentTab.ipv4, gateway: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* DNS 服务器面板 */}
      <div className="env-var-card">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
            borderBottom: "1px solid var(--border-subtle)",
            paddingBottom: "6px",
          }}
        >
          <label
            style={{
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              gap: "6px",
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={currentTab.apply_dns}
              onChange={(e) =>
                onUpdateTab({ ...currentTab, apply_dns: e.target.checked })
              }
            />
            <span>DNS 服务器设置</span>
          </label>
          <span style={{ fontSize: "11px", color: "var(--text-muted)" }}>
            {currentTab.apply_dns ? "激活时写入" : "忽略不修改"}
          </span>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            opacity: currentTab.apply_dns ? 1 : 0.4,
          }}
        >
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="dnsMode"
              checked={currentTab.dns.mode === "Dhcp"}
              onChange={() =>
                onUpdateTab({
                  ...currentTab,
                  dns: { ...currentTab.dns, mode: "Dhcp" },
                })
              }
            />
            <span>自动获取 DNS 服务器地址</span>
          </label>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              cursor: "pointer",
            }}
          >
            <input
              type="radio"
              name="dnsMode"
              checked={currentTab.dns.mode === "Static"}
              onChange={() =>
                onUpdateTab({
                  ...currentTab,
                  dns: { ...currentTab.dns, mode: "Static" },
                })
              }
            />
            <span>使用下面的 DNS 服务器地址:</span>
          </label>

          {currentTab.dns.mode === "Static" && (
            <div
              style={{
                paddingLeft: "24px",
                display: "flex",
                flexDirection: "column",
                gap: "8px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "70px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  首选 DNS:
                </span>
                <input
                  className="fluent-input"
                  style={{ fontFamily: "var(--font-mono)" }}
                  placeholder="如 223.5.5.5 (阿里公共DNS)"
                  value={currentTab.dns.primary}
                  onChange={(e) =>
                    onUpdateTab({
                      ...currentTab,
                      dns: { ...currentTab.dns, primary: e.target.value },
                    })
                  }
                />
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span
                  style={{
                    width: "70px",
                    fontSize: "12px",
                    color: "var(--text-secondary)",
                  }}
                >
                  备用 DNS:
                </span>
                <input
                  className="fluent-input"
                  style={{ fontFamily: "var(--font-mono)" }}
                  placeholder="如 119.29.29.29 (腾讯DNS)"
                  value={currentTab.dns.secondary}
                  onChange={(e) =>
                    onUpdateTab({
                      ...currentTab,
                      dns: { ...currentTab.dns, secondary: e.target.value },
                    })
                  }
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
