use crate::hosts::model::{HostsProfile, HostsSettings, WriteStrategy};

const BEGIN_MARKER: &str = "# EnvPilot BEGIN — 由 EnvPilot 自动托管，请勿手动编辑此区间";
const END_MARKER: &str = "# EnvPilot END";

/// 将已启用的方案列表合成最终准备写入系统的 hosts 文件文本
pub fn compose_hosts_content(
    current_system_content: &str,
    profiles: &[HostsProfile],
    settings: &HostsSettings,
) -> String {
    // 过滤出启用的方案并按顺序排序
    let mut enabled: Vec<&HostsProfile> = profiles.iter().filter(|p| p.enabled).collect();
    enabled.sort_by_key(|p| p.order);

    // 构建托管区块内容
    let mut managed_block = String::new();
    managed_block.push_str(BEGIN_MARKER);
    managed_block.push_str("\r\n");

    for p in enabled {
        managed_block.push_str(&format!("# ---- 方案: {} ----\r\n", p.name));
        for line in p.content.lines() {
            let trimmed = line.trim_end();
            managed_block.push_str(trimmed);
            managed_block.push_str("\r\n");
        }
        managed_block.push_str("\r\n");
    }
    managed_block.push_str(END_MARKER);
    managed_block.push_str("\r\n");

    if settings.write_strategy == WriteStrategy::Overwrite {
        let mut out = String::new();
        out.push_str("# EnvPilot Managed Hosts File\r\n\r\n");
        out.push_str(&managed_block);
        return out;
    }

    // 托管模式：保留系统原有用户手写内容，仅替换 BEGIN ... END 标记之间的区间
    let content = current_system_content;
    let begin_idx = content.find("# EnvPilot BEGIN");
    let end_idx = content.find("# EnvPilot END");

    if let (Some(b), Some(e)) = (begin_idx, end_idx) {
        if b < e {
            // 找到配对标记，替换中间部分
            let before = &content[..b];
            let after_end_line = match content[e..].find('\n') {
                Some(newline_pos) => &content[e + newline_pos + 1..],
                None => "",
            };

            let mut result = before.to_string();
            result.push_str(&managed_block);
            result.push_str(after_end_line);
            return result;
        }
    }

    // 原文件中没有标记，无损追加到末尾
    let mut result = content.trim_end().to_string();
    if !result.is_empty() {
        result.push_str("\r\n\r\n");
    }
    result.push_str(&managed_block);
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::hosts::model::ProfileKind;

    #[test]
    fn test_compose_append() {
        let original = "127.0.0.1 localhost\r\n";
        let profiles = vec![HostsProfile {
            id: "1".into(),
            name: "test".into(),
            kind: ProfileKind::Local,
            enabled: true,
            content: "0.0.0.0 ad.example.com".into(),
            order: 0,
        }];
        let settings = HostsSettings::default();
        let res = compose_hosts_content(original, &profiles, &settings);
        assert!(res.contains("127.0.0.1 localhost"));
        assert!(res.contains(BEGIN_MARKER));
        assert!(res.contains("0.0.0.0 ad.example.com"));
        assert!(res.contains(END_MARKER));
    }
}
