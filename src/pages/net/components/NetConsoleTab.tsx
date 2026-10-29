import React, { useState, useRef, useEffect } from "react";
import { api } from "../../../services/api";

export const NetConsoleTab: React.FC = () => {
  const [cmd, setCmd] = useState<string>("ping");
  const [args, setArgs] = useState<string>("");
  const [target, setTarget] = useState<string>("127.0.0.1");
  const [output, setOutput] = useState<string>(
    "Windows IP 诊断与网络命令控制台已就绪。\n选择上方命令并填写参数或目标后，点击右侧【▶ 执行】按钮即可运行。\n支持 ping -t / ping /t 等长周期流式命令持续输出，随时可点击【⏹ 停止】中断。"
  );
  const [isRunning, setIsRunning] = useState<boolean>(false);

  const activeSessionRef = useRef<string | null>(null);
  const stopFnRef = useRef<(() => void) | null>(null);
  const terminalRef = useRef<HTMLDivElement>(null);

  // 当终端内容更新时自动滚动到底部
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output]);

  // 组件卸载时确保杀死可能正在流式运行的后台子进程
  useEffect(() => {
    return () => {
      if (activeSessionRef.current) {
        api.stopNetToolStream(activeSessionRef.current).catch(() => {});
      }
      if (stopFnRef.current) {
        stopFnRef.current();
      }
    };
  }, []);

  const handleStart = async () => {
    if (isRunning) return;

    const sessionId = Date.now().toString();
    activeSessionRef.current = sessionId;
    setIsRunning(true);

    const fullCmdText = `> ${cmd} ${args.trim()} ${target.trim()}`.replace(/\s+/g, " ");
    setOutput((prev) => `${prev}\n\n${fullCmdText}\n正在启动流式执行...`);

    try {
      const stop = await api.startNetToolStream(
        sessionId,
        cmd,
        args,
        target,
        (line: string) => {
          setOutput((prev) => (prev ? `${prev}\n${line}` : line));
        },
        () => {
          setIsRunning(false);
          activeSessionRef.current = null;
          stopFnRef.current = null;
          setOutput((prev) => `${prev}\n[命令执行已结束]`);
        }
      );
      stopFnRef.current = stop;
    } catch (e: any) {
      setIsRunning(false);
      activeSessionRef.current = null;
      stopFnRef.current = null;
      setOutput((prev) => `${prev}\n[启动失败]: ${e?.message || e}`);
    }
  };

  const handleStop = async () => {
    if (!isRunning || !activeSessionRef.current) return;

    try {
      if (stopFnRef.current) {
        stopFnRef.current();
      } else {
        await api.stopNetToolStream(activeSessionRef.current);
      }
      setOutput((prev) => `${prev}\n\n[用户已手动终止该命令]`);
    } catch (e: any) {
      setOutput((prev) => `${prev}\n[停止命令异常]: ${e?.message || e}`);
    } finally {
      setIsRunning(false);
      activeSessionRef.current = null;
      stopFnRef.current = null;
    }
  };

  const handleClear = () => {
    setOutput("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", padding: "16px", gap: "12px", boxSizing: "border-box" }}>
      {/* 顶部控制栏 */}
      <div
        className="env-var-card"
        style={{
          padding: "10px 14px",
          display: "flex",
          alignItems: "center",
          gap: "10px",
          flexWrap: "wrap",
          background: "var(--bg-card)",
          width: "100%",
          boxSizing: "border-box",
        }}
      >
        {/* 命令选择 */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>命令:</span>
          <select
            className="fluent-input"
            style={{ width: "110px", fontWeight: 600 }}
            value={cmd}
            disabled={isRunning}
            onChange={(e) => setCmd(e.target.value)}
          >
            <option value="ping">ping</option>
            <option value="tracert">tracert</option>
            <option value="nslookup">nslookup</option>
            <option value="netstat">netstat</option>
            <option value="ipconfig">ipconfig</option>
          </select>
        </div>

        {/* 参数快捷输入 */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>参数:</span>
          <input
            className="fluent-input"
            style={{ width: "140px", fontFamily: "var(--font-mono)" }}
            value={args}
            disabled={isRunning}
            onChange={(e) => setArgs(e.target.value)}
            placeholder="如 -t, -n 4 或 /all"
          />
        </div>

        {/* 常用持续 Ping 快捷按钮 */}
        {cmd === "ping" && !isRunning && (
          <div style={{ display: "flex", gap: "4px" }}>
            <button
              className="fluent-btn"
              style={{ fontSize: "11px", padding: "2px 6px" }}
              title="设置持续 Ping 直到手动停止"
              onClick={() => setArgs("-t")}
            >
              /t (持续)
            </button>
            <button
              className="fluent-btn"
              style={{ fontSize: "11px", padding: "2px 6px" }}
              title="设置 Ping 4 次"
              onClick={() => setArgs("-n 4")}
            >
              -n 4
            </button>
          </div>
        )}

        {/* 目标 IP / 域名 */}
        <div style={{ display: "flex", alignItems: "center", gap: "6px", flex: 1, minWidth: "180px" }}>
          <span style={{ fontSize: "12px", color: "var(--text-muted)" }}>目标名称或 IP:</span>
          <input
            className="fluent-input"
            style={{ flex: 1, fontFamily: "var(--font-mono)" }}
            value={target}
            disabled={isRunning}
            onChange={(e) => setTarget(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !isRunning) handleStart();
            }}
            placeholder="如 127.0.0.1, 192.168.1.1, baidu.com"
          />
        </div>

        {/* 执行 / 停止控制按钮 */}
        {!isRunning ? (
          <button
            className="fluent-btn fluent-btn-primary"
            style={{
              padding: "4px 14px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              minWidth: "85px",
              justifyContent: "center",
            }}
            onClick={handleStart}
          >
            <span>▶</span>
            <span>执行</span>
          </button>
        ) : (
          <button
            className="fluent-btn"
            style={{
              padding: "4px 14px",
              fontSize: "12px",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              minWidth: "85px",
              justifyContent: "center",
              backgroundColor: "rgba(220, 38, 38, 0.15)",
              color: "var(--color-danger)",
              borderColor: "var(--color-danger)",
            }}
            onClick={handleStop}
          >
            <span>⏹</span>
            <span>停止</span>
          </button>
        )}

        <button
          className="fluent-btn"
          style={{ padding: "4px 10px", fontSize: "12px" }}
          onClick={handleClear}
          title="清空终端屏幕输出"
        >
          🗑️ 清空
        </button>
      </div>

      {/* 终端黑色输出窗口 */}
      <div
        ref={terminalRef}
        style={{
          flex: 1,
          width: "100%",
          boxSizing: "border-box",
          backgroundColor: "#0c0c0c",
          border: "1px solid var(--border-subtle)",
          borderRadius: "var(--radius-md)",
          padding: "14px",
          color: "#cccccc",
          fontFamily: "var(--font-mono)",
          fontSize: "12px",
          lineHeight: "1.6",
          overflowY: "auto",
          whiteSpace: "pre-wrap",
          wordBreak: "break-all",
          boxShadow: "inset 0 2px 6px rgba(0, 0, 0, 0.4)",
        }}
      >
        {output}
      </div>
    </div>
  );
};
