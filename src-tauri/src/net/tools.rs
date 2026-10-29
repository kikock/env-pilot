use crate::common::error::{AppError, AppResult, ErrorCode};
use crate::common::process::run_command;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader};
use std::net::Ipv4Addr;
use std::os::windows::process::CommandExt;
use std::process::{Command, Stdio};
use std::str::FromStr;
use std::sync::{LazyLock, Mutex};
use tauri::Emitter;

static ACTIVE_PIDS: LazyLock<Mutex<HashMap<String, u32>>> =
    LazyLock::new(|| Mutex::new(HashMap::new()));

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScannedHost {
    pub ip: String,
    pub hostname: String,
    pub mac: String,
    pub vendor: String,
    pub os: String,
    pub latency_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NetConnectionInfo {
    pub proto: String,
    pub local_ip: String,
    pub local_port: u16,
    pub remote_ip: String,
    pub remote_port: u16,
    pub remote_host: String,
    pub state: String,
    pub pid: u32,
    pub process_name: String,
    pub path: String,
}

/// 启动流式网络命令执行（支持 ping -t / ping /t 等长周期命令实时按行输出）
pub fn start_net_tool_stream(
    app: tauri::AppHandle,
    session_id: String,
    cmd: &str,
    args: &str,
    target: &str,
) -> AppResult<()> {
    let lower_cmd = cmd.trim().to_lowercase();
    let allowed = ["ping", "tracert", "nslookup", "netstat", "ipconfig"];
    if !allowed.contains(&lower_cmd.as_str()) {
        return Err(AppError::new(
            ErrorCode::ValidationFailed,
            format!("不支持的网络命令: {}", cmd),
        ));
    }

    let mut cmd_args: Vec<String> = Vec::new();
    if !args.trim().is_empty() {
        for part in args.split_whitespace() {
            cmd_args.push(part.to_string());
        }
    }
    if !target.trim().is_empty() {
        cmd_args.push(target.trim().to_string());
    }

    const CREATE_NO_WINDOW: u32 = 0x08000000;
    let mut command = Command::new(&lower_cmd);
    command.args(&cmd_args);
    command.stdout(Stdio::piped());
    command.stderr(Stdio::piped());
    command.creation_flags(CREATE_NO_WINDOW);

    let mut child = command.spawn().map_err(|e| {
        AppError::new(
            ErrorCode::CommandFailed,
            format!("启动程序 '{}' 失败: {}", lower_cmd, e),
        )
    })?;

    let pid = child.id();
    if let Ok(mut map) = ACTIVE_PIDS.lock() {
        map.insert(session_id.clone(), pid);
    }

    let session_for_thread = session_id.clone();
    let app_for_thread = app.clone();

    // 在独立后台线程中流式读取 stdout / stderr，每产生一行即刻 emit 给前端
    std::thread::spawn(move || {
        let stdout_opt = child.stdout.take();
        let stderr_opt = child.stderr.take();

        let event_line = format!("net-tool-line-{}", session_for_thread);
        let event_done = format!("net-tool-done-{}", session_for_thread);

        // 标准输出读取线程
        if let Some(stdout) = stdout_opt {
            let mut reader = BufReader::new(stdout);
            let mut buf = Vec::new();
            while let Ok(n) = reader.read_until(b'\n', &mut buf) {
                if n == 0 {
                    break;
                }
                let text = crate::common::process::decode_oem(&buf);
                let trimmed = text.trim_end_matches(['\r', '\n']).to_string();
                let _ = app_for_thread.emit(&event_line, trimmed);
                buf.clear();
            }
        }

        // 标准错误读取
        if let Some(stderr) = stderr_opt {
            let mut reader = BufReader::new(stderr);
            let mut buf = Vec::new();
            while let Ok(n) = reader.read_until(b'\n', &mut buf) {
                if n == 0 {
                    break;
                }
                let text = crate::common::process::decode_oem(&buf);
                let trimmed = text.trim_end_matches(['\r', '\n']).to_string();
                let _ = app_for_thread.emit(&event_line, trimmed);
                buf.clear();
            }
        }

        let _ = child.wait();

        // 执行完成或被中断后，清理活跃 PID 记录并发送结束事件
        if let Ok(mut map) = ACTIVE_PIDS.lock() {
            map.remove(&session_for_thread);
        }
        let _ = app_for_thread.emit(&event_done, ());
    });

    Ok(())
}

/// 手动终止正在流式运行的网络命令
pub fn stop_net_tool_stream(session_id: &str) -> AppResult<()> {
    let pid_opt = if let Ok(mut map) = ACTIVE_PIDS.lock() {
        map.remove(session_id)
    } else {
        None
    };

    if let Some(pid) = pid_opt {
        const CREATE_NO_WINDOW: u32 = 0x08000000;
        let _ = Command::new("taskkill")
            .args(["/F", "/T", "/PID", &pid.to_string()])
            .creation_flags(CREATE_NO_WINDOW)
            .output();
    }
    Ok(())
}

/// 执行网络命令（同步单次执行兼容）
pub fn run_net_tool(cmd: &str, args: &str, target: &str) -> AppResult<String> {
    let lower_cmd = cmd.trim().to_lowercase();
    let allowed = ["ping", "tracert", "nslookup", "netstat", "ipconfig"];
    if !allowed.contains(&lower_cmd.as_str()) {
        return Err(AppError::new(
            ErrorCode::ValidationFailed,
            format!("不支持的网络命令: {}", cmd),
        ));
    }

    let mut cmd_args: Vec<String> = Vec::new();
    if !args.trim().is_empty() {
        for part in args.split_whitespace() {
            cmd_args.push(part.to_string());
        }
    }
    if !target.trim().is_empty() {
        cmd_args.push(target.trim().to_string());
    }

    let str_args: Vec<&str> = cmd_args.iter().map(|s| s.as_str()).collect();
    let out = run_command(&lower_cmd, &str_args, None)?;
    if !out.stdout.is_empty() {
        Ok(out.stdout)
    } else {
        Ok(out.stderr)
    }
}

/// 解析单行 IP 地址并转为 u32
fn ip_to_u32(ip_str: &str) -> Option<u32> {
    Ipv4Addr::from_str(ip_str.trim()).ok().map(|ip| {
        let octets = ip.octets();
        ((octets[0] as u32) << 24)
            | ((octets[1] as u32) << 16)
            | ((octets[2] as u32) << 8)
            | (octets[3] as u32)
    })
}

fn u32_to_ip(val: u32) -> String {
    format!(
        "{}.{}.{}.{}",
        (val >> 24) & 0xFF,
        (val >> 16) & 0xFF,
        (val >> 8) & 0xFF,
        val & 0xFF
    )
}

/// 局域网 IPv4 范围扫描 (单次上限 256 个 IP，防止过载)
pub async fn scan_ipv4_range(start_ip: &str, end_ip: &str) -> AppResult<Vec<ScannedHost>> {
    let s = ip_to_u32(start_ip).ok_or_else(|| {
        AppError::new(ErrorCode::ValidationFailed, "起始 IPv4 地址格式不正确")
    })?;
    let e = ip_to_u32(end_ip).ok_or_else(|| {
        AppError::new(ErrorCode::ValidationFailed, "结束 IPv4 地址格式不正确")
    })?;

    if s > e {
        return Err(AppError::new(
            ErrorCode::ValidationFailed,
            "起始 IP 不能大于结束 IP",
        ));
    }
    let count = e - s + 1;
    if count > 256 {
        return Err(AppError::new(
            ErrorCode::ValidationFailed,
            "单次扫描范围最大支持 256 个 IP",
        ));
    }

    let mut tasks = Vec::new();
    for curr in s..=e {
        let ip_str = u32_to_ip(curr);
        tasks.push(tokio::spawn(async move {
            let start_time = std::time::Instant::now();
            let out = tokio::process::Command::new("ping")
                .args(["-n", "1", "-w", "400", &ip_str])
                .output()
                .await;

            if let Ok(res) = out {
                if res.status.success() {
                    let text = String::from_utf8_lossy(&res.stdout);
                    if text.contains("TTL=") || text.contains("ttl=") {
                        let latency = start_time.elapsed().as_millis() as u64;
                        return Some(ScannedHost {
                            ip: ip_str,
                            hostname: "...".to_string(),
                            mac: "--:--:--:--:--:--".to_string(),
                            vendor: "".to_string(),
                            os: "Windows / Linux".to_string(),
                            latency_ms: latency,
                        });
                    }
                }
            }
            None
        }));
    }

    let mut results = Vec::new();
    for t in tasks {
        if let Ok(Some(host)) = t.await {
            results.push(host);
        }
    }

    results.sort_by(|a, b| {
        let a_num = ip_to_u32(&a.ip).unwrap_or(0);
        let b_num = ip_to_u32(&b.ip).unwrap_or(0);
        a_num.cmp(&b_num)
    });

    Ok(results)
}

/// 获取系统活动网络连接与监听端口表 (类似 TCPView)
pub fn get_active_connections() -> AppResult<Vec<NetConnectionInfo>> {
    let out = run_command("netstat", &["-ano"], None)?;
    if !out.success {
        return Err(AppError::new(
            ErrorCode::CommandFailed,
            format!("获取连接表失败: {}", out.stderr),
        ));
    }

    let mut connections = Vec::new();
    for line in out.stdout.lines() {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("Active") || trimmed.starts_with("活动连接") || trimmed.starts_with("Proto") || trimmed.starts_with("协议") {
            continue;
        }

        let parts: Vec<&str> = trimmed.split_whitespace().collect();
        if parts.len() >= 4 {
            let proto = parts[0].to_uppercase();
            let local_addr = parts[1];
            let remote_addr = parts[2];
            let (state, pid_str) = if proto == "TCP" && parts.len() >= 5 {
                (parts[3].to_string(), parts[4])
            } else {
                ("LISTENING".to_string(), parts.last().copied().unwrap_or("0"))
            };

            let pid = pid_str.parse::<u32>().unwrap_or(0);
            let (local_ip, local_port) = parse_host_port(local_addr);
            let (remote_ip, remote_port) = parse_host_port(remote_addr);

            connections.push(NetConnectionInfo {
                proto,
                local_ip,
                local_port,
                remote_ip,
                remote_port,
                remote_host: "...".to_string(),
                state,
                pid,
                process_name: format!("PID: {}", pid),
                path: "".to_string(),
            });
        }
    }

    Ok(connections)
}

fn parse_host_port(addr: &str) -> (String, u16) {
    if let Some(idx) = addr.rfind(':') {
        let host = &addr[..idx];
        let port = addr[idx + 1..].parse::<u16>().unwrap_or(0);
        (host.to_string(), port)
    } else {
        (addr.to_string(), 0)
    }
}
