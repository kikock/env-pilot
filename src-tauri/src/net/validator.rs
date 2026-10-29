use std::net::Ipv4Addr;
use std::str::FromStr;

/// 校验子网掩码是否为合法连续的 IPv4 掩码（例如 255.255.255.0）
/// 不允许 255.0.255.0 这类不连续掩码
pub fn validate_subnet_mask(mask_str: &str) -> Result<u32, String> {
    let addr = Ipv4Addr::from_str(mask_str).map_err(|_| "子网掩码格式非法".to_string())?;
    let mask_u32: u32 = u32::from(addr);

    // 连续掩码的特征：取反后的值 + 1 是 2 的幂次方，或者全 1 (255.255.255.255)
    if mask_u32 == 0 {
        return Err("子网掩码不能为全 0 (0.0.0.0)".to_string());
    }

    let inverted = !mask_u32;
    // 检查 inverted 是否全部位于低位（inverted + 1 是否只有 1 个 bit 为 1）
    if inverted.wrapping_add(1) & inverted != 0 {
        return Err("子网掩码必须为连续的高位 1（如 255.255.255.0），当前掩码不连续".to_string());
    }

    Ok(mask_u32)
}

/// 校验 IP 与网关是否处于相同子网网段
pub fn validate_same_subnet(ip_str: &str, gw_str: &str, mask_str: &str) -> Result<(), String> {
    if gw_str.trim().is_empty() {
        return Ok(()); // 网关为空允许跳过检查
    }

    let ip_addr = Ipv4Addr::from_str(ip_str).map_err(|_| "IP 地址格式非法".to_string())?;
    let gw_addr = Ipv4Addr::from_str(gw_str).map_err(|_| "默认网关地址格式非法".to_string())?;
    let mask_u32 = validate_subnet_mask(mask_str)?;

    let ip_u32 = u32::from(ip_addr);
    let gw_u32 = u32::from(gw_addr);

    if (ip_u32 & mask_u32) != (gw_u32 & mask_u32) {
        return Err(format!(
            "默认网关 ({}) 与当前 IP ({}) 不在同一子网网段（子网掩码: {}）",
            gw_str, ip_str, mask_str
        ));
    }

    if ip_u32 == gw_u32 {
        return Err("默认网关地址不能与本机 IP 地址相同".to_string());
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_valid_subnet_masks() {
        assert!(validate_subnet_mask("255.255.255.0").is_ok());
        assert!(validate_subnet_mask("255.255.0.0").is_ok());
        assert!(validate_subnet_mask("255.0.0.0").is_ok());
        assert!(validate_subnet_mask("255.255.255.128").is_ok());
        assert!(validate_subnet_mask("255.255.255.252").is_ok());
    }

    #[test]
    fn test_invalid_discontinuous_subnet_masks() {
        // TC-NET-08: 掩码 255.0.255.0
        let err = validate_subnet_mask("255.0.255.0").unwrap_err();
        assert!(err.contains("不连续"));

        let err2 = validate_subnet_mask("255.255.254.1").unwrap_err();
        assert!(err2.contains("不连续"));

        assert!(validate_subnet_mask("invalid.mask").is_err());
    }

    #[test]
    fn test_same_subnet_validation() {
        // 相同子网
        assert!(validate_same_subnet("192.168.1.100", "192.168.1.1", "255.255.255.0").is_ok());
        assert!(validate_same_subnet("10.0.1.5", "10.0.0.1", "255.255.0.0").is_ok());

        // TC-NET-07: 网关与 IP 不在同网段
        let err = validate_same_subnet("192.168.1.100", "192.168.2.1", "255.255.255.0").unwrap_err();
        assert!(err.contains("不在同一子网网段"));

        // 网关与 IP 地址相同
        let err_same = validate_same_subnet("192.168.1.1", "192.168.1.1", "255.255.255.0").unwrap_err();
        assert!(err_same.contains("不能与本机 IP 地址相同"));
    }
}
