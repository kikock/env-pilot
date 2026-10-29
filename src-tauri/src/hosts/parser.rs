use crate::hosts::model::SystemHostsInfo;
use std::fs;
use std::net::IpAddr;
use std::path::PathBuf;
use std::str::FromStr;

/// 获取 Windows 系统 hosts 文件的绝对路径 (通常为 C:\Windows\System32\drivers\etc\hosts)
pub fn get_system_hosts_path() -> PathBuf {
    let system_root = std::env::var("SystemRoot").unwrap_or_else(|_| "C:\\Windows".to_string());
    PathBuf::from(system_root).join("System32\\drivers\\etc\\hosts")
}

/// 读取系统 hosts 文件原始内容，自动识别编码 (UTF-8, UTF-16, GBK) 并探查只读属性
pub fn read_system_hosts() -> std::io::Result<SystemHostsInfo> {
    let path = get_system_hosts_path();
    if !path.exists() {
        return Ok(SystemHostsInfo {
            path: path.to_string_lossy().to_string(),
            content: String::new(),
            is_readonly: false,
            encoding: "UTF-8".to_string(),
        });
    }

    let metadata = fs::metadata(&path)?;
    let is_readonly = metadata.permissions().readonly();
    let bytes = fs::read(&path)?;

    let (content, encoding) = decode_hosts_bytes(&bytes);

    Ok(SystemHostsInfo {
        path: path.to_string_lossy().to_string(),
        content,
        is_readonly,
        encoding,
    })
}

/// 识别文件字节编码并解码
pub fn decode_hosts_bytes(bytes: &[u8]) -> (String, String) {
    if bytes.is_empty() {
        return (String::new(), "UTF-8".to_string());
    }

    // 1. 检查 UTF-8 BOM: EF BB BF
    if bytes.starts_with(&[0xEF, 0xBB, 0xBF]) {
        let (cow, _, _) = encoding_rs::UTF_8.decode(&bytes[3..]);
        return (cow.into_owned(), "UTF-8 (BOM)".to_string());
    }

    // 2. 检查 UTF-16LE BOM: FF FE
    if bytes.starts_with(&[0xFF, 0xFE]) {
        let (cow, _, _) = encoding_rs::UTF_16LE.decode(&bytes[2..]);
        return (cow.into_owned(), "UTF-16LE".to_string());
    }

    // 3. 严格尝试标准 UTF-8
    if let Ok(utf8) = std::str::from_utf8(bytes) {
        return (utf8.to_string(), "UTF-8".to_string());
    }

    // 4. 回退为 GBK
    let (cow, _, _) = encoding_rs::GBK.decode(bytes);
    (cow.into_owned(), "GBK".to_string())
}

/// 语法校验：检查单行 hosts 记录是否合法
pub fn validate_hosts_line(line: &str) -> Option<String> {
    let trimmed = line.trim();
    if trimmed.is_empty() || trimmed.starts_with('#') {
        return None;
    }

    let parts: Vec<&str> = trimmed.split_whitespace().collect();
    if parts.is_empty() {
        return None;
    }

    // 第一列应为 IP 地址
    let ip_str = parts[0];
    if IpAddr::from_str(ip_str).is_err() {
        return Some(format!("非法 IP 地址: '{}'", ip_str));
    }

    if parts.len() < 2 {
        return Some("缺少映射的主机名".to_string());
    }

    None
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_hosts_line() {
        assert_eq!(validate_hosts_line("127.0.0.1 localhost"), None);
        assert_eq!(validate_hosts_line("::1 localhost"), None);
        assert_eq!(validate_hosts_line("# 这是一个注释"), None);
        assert_eq!(validate_hosts_line("   "), None);

        // 非法 IP
        let err1 = validate_hosts_line("999.1.1.1 domain.local");
        assert!(err1.is_some());
        assert!(err1.unwrap().contains("非法 IP 地址"));

        // 缺少主机名
        let err2 = validate_hosts_line("127.0.0.1");
        assert_eq!(err2, Some("缺少映射的主机名".to_string()));
    }

    #[test]
    fn test_decode_hosts_bytes_encodings() {
        // UTF-8 without BOM
        let (s1, enc1) = decode_hosts_bytes(b"127.0.0.1 test.local\n");
        assert_eq!(enc1, "UTF-8");
        assert!(s1.contains("127.0.0.1"));

        // UTF-8 with BOM
        let mut with_bom = vec![0xEF, 0xBB, 0xBF];
        with_bom.extend_from_slice("127.0.0.1 test.local\n".as_bytes());
        let (s2, enc2) = decode_hosts_bytes(&with_bom);
        assert_eq!(enc2, "UTF-8 (BOM)");
        assert!(s2.contains("127.0.0.1"));

        // GBK
        let (gbk_cow, _, _) = encoding_rs::GBK.encode("# 测试机房配置\n192.168.1.1 server\n");
        let (s3, enc3) = decode_hosts_bytes(&gbk_cow);
        assert!(enc3 == "GBK" || enc3 == "UTF-8");
        assert!(s3.contains("192.168.1.1"));
    }
}
