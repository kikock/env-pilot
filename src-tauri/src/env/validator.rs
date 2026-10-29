use crate::env::model::{EnvIssue, EnvItem, EnvVar, IssueSeverity};
use std::collections::{HashMap, HashSet};
use std::path::Path;

/// 判断某个环境变量是否属于多值变量（按分号拆分）
pub fn is_multi_value_var(name: &str, raw_val: &str) -> bool {
    let upper = name.to_uppercase();
    if matches!(
        upper.as_str(),
        "PATH" | "PATHEXT" | "PSMODULEPATH" | "CLASSPATH" | "INCLUDE" | "LIB"
    ) {
        return true;
    }
    // 包含分号且包含类似盘符路径特征
    raw_val.contains(';') && (raw_val.contains(":\\") || raw_val.contains(":/"))
}

/// 保护变量名单
pub fn is_protected_var(name: &str) -> bool {
    let upper = name.to_uppercase();
    matches!(
        upper.as_str(),
        "PATH"
            | "PATHEXT"
            | "SYSTEMROOT"
            | "WINDIR"
            | "COMSPEC"
            | "TEMP"
            | "TMP"
            | "OS"
            | "PSMODULEPATH"
            | "DRIVERDATA"
            | "ALLUSERSPROFILE"
            | "COMPUTERNAME"
            | "USERNAME"
            | "USERPROFILE"
    )
}

/// 规范化路径字符串（小写、统一斜杠、去除末尾反斜杠）
fn normalize_path(p: &str) -> String {
    let p = p.trim().to_lowercase().replace('/', "\\");
    p.trim_end_matches('\\').to_string()
}

/// 校验并构建单个 EnvVar 的完整健康视图（包括展开值、多子项、路径存在性、重复检测等）
pub fn validate_and_enrich_var(
    var: &mut EnvVar,
    lookup: &HashMap<String, String>,
) {
    let (expanded, unresolved) = crate::env::expander::expand_env_string(&var.raw_value, lookup);
    var.expanded_value = expanded.clone();
    var.issues.clear();

    for unres in unresolved {
        var.issues.push(EnvIssue {
            severity: IssueSeverity::Warning,
            message: format!("未解析的环境变量引用: %{}%", unres),
        });
    }

    if var.raw_value.len() > 2047 {
        var.issues.push(EnvIssue {
            severity: IssueSeverity::Warning,
            message: format!(
                "变量长度超过 2047 字符 (当前 {} 字符)，部分旧版 Windows 工具可能截断",
                var.raw_value.len()
            ),
        });
    }

    if var.is_multi {
        let raw_splits: Vec<&str> = var.raw_value.split(';').collect();
        let mut items = Vec::new();
        let mut seen_normalized = HashSet::new();

        for raw_item in raw_splits {
            let trimmed = raw_item.trim();
            if trimmed.is_empty() {
                items.push(EnvItem {
                    raw: String::new(),
                    expanded: String::new(),
                    exists: true,
                    is_duplicate: false,
                    is_empty: true,
                    issues: vec![EnvIssue {
                        severity: IssueSeverity::Info,
                        message: "连续分号形成的空项".to_string(),
                    }],
                });
                continue;
            }

            let (exp_item, item_unres) =
                crate::env::expander::expand_env_string(trimmed, lookup);
            let mut item_issues = Vec::new();

            for un in item_unres {
                item_issues.push(EnvIssue {
                    severity: IssueSeverity::Warning,
                    message: format!("未解析的引用: %{}%", un),
                });
            }

            let norm = normalize_path(&exp_item);
            let is_dup = !seen_normalized.insert(norm);
            if is_dup {
                item_issues.push(EnvIssue {
                    severity: IssueSeverity::Warning,
                    message: "检测到重复的 Path 项".to_string(),
                });
            }

            // 判断是否是文件/目录路径并校验存在性
            let is_path_like = exp_item.contains(":\\")
                || exp_item.contains(":/")
                || exp_item.starts_with("\\\\");

            let exists = if is_path_like {
                let p = Path::new(&exp_item);
                let ok = p.exists();
                if !ok {
                    item_issues.push(EnvIssue {
                        severity: IssueSeverity::Error,
                        message: format!("路径不存在: {}", exp_item),
                    });
                }
                ok
            } else {
                true
            };

            items.push(EnvItem {
                raw: trimmed.to_string(),
                expanded: exp_item,
                exists,
                is_duplicate: is_dup,
                is_empty: false,
                issues: item_issues,
            });
        }

        var.items = items;
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::env::model::{EnvScope, ValueKind};

    #[test]
    fn test_is_multi_and_protected() {
        assert!(is_multi_value_var("Path", "C:\\a;C:\\b"));
        assert!(is_multi_value_var("PATHEXT", ".COM;.EXE"));
        assert!(!is_multi_value_var("JAVA_HOME", "D:\\jdk"));

        assert!(is_protected_var("Path"));
        assert!(is_protected_var("SystemRoot"));
        assert!(is_protected_var("ComSpec"));
        assert!(!is_protected_var("CUSTOM_VARIABLE_XYZ"));
    }

    #[test]
    fn test_validate_duplicate_and_invalid_path() {
        let mut var = EnvVar {
            name: "Path".into(),
            raw_value: "C:\\Windows\\System32;c:\\windows\\system32\\;D:\\this_path_does_not_exist_at_all_12345".into(),
            expanded_value: String::new(),
            kind: ValueKind::Sz,
            scope: EnvScope::System,
            is_multi: true,
            items: Vec::new(),
            issues: Vec::new(),
            is_protected: true,
        };

        let lookup = HashMap::new();
        validate_and_enrich_var(&mut var, &lookup);

        assert_eq!(var.items.len(), 3);
        // 第一项有效且非重复
        assert!(!var.items[0].is_duplicate);
        // 第二项与第一项规范化相同，判定为重复
        assert!(var.items[1].is_duplicate);
        assert!(var.items[1].issues.iter().any(|i| i.message.contains("重复")));
        // 第三项路径不存在，判定为 Error
        assert!(!var.items[2].exists);
        assert!(var.items[2].issues.iter().any(|i| i.severity == IssueSeverity::Error));
    }
}
