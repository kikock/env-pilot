use std::collections::HashMap;

/// 递归展开变量字符串中引用的 `%VAR%` 宏
/// - `lookup`: 包含当前全部变量（包括用户正在草稿中修改的暂存变量）的映射表（键统一转换为小写进行匹配）
/// - 支持深度上限 8 层递归，杜绝循环引用死锁
pub fn expand_env_string(raw: &str, lookup: &HashMap<String, String>) -> (String, Vec<String>) {
    let mut current = raw.to_string();
    let mut unresolved = Vec::new();
    let mut depth = 0;

    while depth < 8 {
        let mut replaced = false;
        let mut new_str = String::with_capacity(current.len());
        let mut chars = current.chars().peekable();

        while let Some(c) = chars.next() {
            if c == '%' {
                let mut var_name = String::new();
                let mut found_end = false;

                while let Some(&next_c) = chars.peek() {
                    if next_c == '%' {
                        chars.next(); // 消费结束的 '%'
                        found_end = true;
                        break;
                    }
                    if let Some(ch) = chars.next() {
                        var_name.push(ch);
                    }
                }

                if found_end && !var_name.is_empty() {
                    let key = var_name.to_lowercase();
                    if let Some(val) = lookup.get(&key) {
                        new_str.push_str(val);
                        replaced = true;
                    } else {
                        // 未解析的宏保留为 %NAME%
                        new_str.push('%');
                        new_str.push_str(&var_name);
                        new_str.push('%');
                        if depth == 0 && !unresolved.contains(&var_name) {
                            unresolved.push(var_name);
                        }
                    }
                } else {
                    new_str.push('%');
                    new_str.push_str(&var_name);
                }
            } else {
                new_str.push(c);
            }
        }

        current = new_str;
        if !replaced {
            break;
        }
        depth += 1;
    }

    (current, unresolved)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_expand_simple() {
        let mut map = HashMap::new();
        map.insert("systemroot".to_string(), "C:\\Windows".to_string());
        map.insert("system32".to_string(), "%SystemRoot%\\System32".to_string());

        let (res, _) = expand_env_string("%system32%\\wbem", &map);
        assert_eq!(res, "C:\\Windows\\System32\\wbem");
    }

    #[test]
    fn test_expand_unresolved_variable() {
        let map = HashMap::new();
        let (res, unresolved) = expand_env_string("%NON_EXISTING%\\bin", &map);
        assert_eq!(res, "%NON_EXISTING%\\bin");
        assert_eq!(unresolved, vec!["NON_EXISTING"]);
    }

    #[test]
    fn test_expand_circular_reference_protection() {
        // TC-ENV-07: 宏循环依赖 A -> B -> A，不能死锁，深度达到上限后停止
        let mut map = HashMap::new();
        map.insert("var_a".to_string(), "%VAR_B%\\foo".to_string());
        map.insert("var_b".to_string(), "%VAR_A%\\bar".to_string());

        let (res, _) = expand_env_string("%VAR_A%", &map);
        // 确保能正常退出且未造成 panic
        assert!(!res.is_empty());
    }
}
