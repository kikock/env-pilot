use crate::common::error::{AppError, AppResult, ErrorCode};
use crate::net::model::AdapterInfo;
use std::net::Ipv4Addr;

/// 枚举本机所有活跃的物理与虚拟网卡配置
pub fn list_adapters() -> AppResult<Vec<AdapterInfo>> {
    #[cfg(windows)]
    unsafe {
        use std::ffi::CStr;
        use windows_sys::Win32::Foundation::ERROR_BUFFER_OVERFLOW;
        use windows_sys::Win32::NetworkManagement::IpHelper::{
            GetAdaptersAddresses, GAA_FLAG_INCLUDE_GATEWAYS, IP_ADAPTER_ADDRESSES_LH,
        };
        use windows_sys::Win32::Networking::WinSock::{
            AF_INET, AF_UNSPEC, SOCKADDR_IN,
        };

        let mut buf_len: u32 = 16384;
        let mut buf: Vec<u8> = vec![0; buf_len as usize];

        let flags = GAA_FLAG_INCLUDE_GATEWAYS;
        let family = AF_UNSPEC as u32;

        let mut ret = GetAdaptersAddresses(
            family,
            flags,
            std::ptr::null_mut(),
            buf.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH,
            &mut buf_len,
        );

        if ret == ERROR_BUFFER_OVERFLOW {
            buf.resize(buf_len as usize, 0);
            ret = GetAdaptersAddresses(
                family,
                flags,
                std::ptr::null_mut(),
                buf.as_mut_ptr() as *mut IP_ADAPTER_ADDRESSES_LH,
                &mut buf_len,
            );
        }

        if ret != 0 {
            return Err(AppError::new(
                ErrorCode::InternalError,
                format!("获取网络适配器失败 (Win32错误码: {})", ret),
            ));
        }

        let mut adapters = Vec::new();
        let mut curr = buf.as_ptr() as *const IP_ADAPTER_ADDRESSES_LH;

        while !curr.is_null() {
            let item = &*curr;

            // 过滤回环接口 (Loopback: IfType 24)
            if item.IfType != 24 {
                // 友好名称 FriendlyName
                let name = pwstr_to_string(item.FriendlyName);
                let desc = pwstr_to_string(item.Description);
                let guid = CStr::from_ptr(item.AdapterName as *const i8)
                    .to_string_lossy()
                    .to_string();

                // MAC 地址
                let mac = if item.PhysicalAddressLength > 0 {
                    let slice = std::slice::from_raw_parts(
                        item.PhysicalAddress.as_ptr(),
                        item.PhysicalAddressLength as usize,
                    );
                    slice
                        .iter()
                        .map(|b| format!("{:02X}", b))
                        .collect::<Vec<_>>()
                        .join("-")
                } else {
                    String::new()
                };

                let is_up = item.OperStatus == 1; // IfOperStatusUp
                let is_wireless = item.IfType == 71; // IF_TYPE_IEEE80211
                let is_dhcp = (item.Anonymous2.Flags & 0x0004) != 0; // IP_ADAPTER_DHCP_ENABLED

                // 单播 IP 与 子网掩码
                let mut ip_str = String::new();
                let mut mask_str = String::new();
                let mut u_ptr = item.FirstUnicastAddress;
                while !u_ptr.is_null() {
                    let u = &*u_ptr;
                    let sa = &*u.Address.lpSockaddr;
                    if sa.sa_family as u32 == AF_INET as u32 {
                        let sin = &*(u.Address.lpSockaddr as *const SOCKADDR_IN);
                        let ip_bytes = sin.sin_addr.S_un.S_addr.to_ne_bytes();
                        let ip = Ipv4Addr::from(ip_bytes);
                        ip_str = ip.to_string();

                        let prefix = u.OnLinkPrefixLength;
                        let mask_u32 = if prefix == 0 {
                            0
                        } else {
                            !0u32 << (32 - prefix)
                        };
                        let mask = Ipv4Addr::from(mask_u32.to_be());
                        mask_str = mask.to_string();
                        break;
                    }
                    u_ptr = u.Next;
                }

                // 网关 Gateway
                let mut gateway_str = String::new();
                let mut gw_ptr = item.FirstGatewayAddress;
                while !gw_ptr.is_null() {
                    let gw = &*gw_ptr;
                    let sa = &*gw.Address.lpSockaddr;
                    if sa.sa_family as u32 == AF_INET as u32 {
                        let sin = &*(gw.Address.lpSockaddr as *const SOCKADDR_IN);
                        let ip_bytes = sin.sin_addr.S_un.S_addr.to_ne_bytes();
                        let ip = Ipv4Addr::from(ip_bytes);
                        gateway_str = ip.to_string();
                        break;
                    }
                    gw_ptr = gw.Next;
                }

                // DNS 服务器列表
                let mut dns_list = Vec::new();
                let mut dns_ptr = item.FirstDnsServerAddress;
                while !dns_ptr.is_null() {
                    let dns = &*dns_ptr;
                    let sa = &*dns.Address.lpSockaddr;
                    if sa.sa_family as u32 == AF_INET as u32 {
                        let sin = &*(dns.Address.lpSockaddr as *const SOCKADDR_IN);
                        let ip_bytes = sin.sin_addr.S_un.S_addr.to_ne_bytes();
                        let ip = Ipv4Addr::from(ip_bytes);
                        dns_list.push(ip.to_string());
                    }
                    dns_ptr = dns.Next;
                }

                // 仅保留有名称的有效网卡
                if !name.is_empty() {
                    adapters.push(AdapterInfo {
                        guid,
                        index: item.Anonymous1.Anonymous.IfIndex,
                        name,
                        description: desc,
                        mac,
                        is_dhcp,
                        ip: ip_str,
                        mask: mask_str,
                        gateway: gateway_str,
                        dns: dns_list,
                        is_up,
                        is_wireless,
                    });
                }
            }

            curr = item.Next;
        }

        // 排序：物理网卡排在前，无线在前
        adapters.sort_by(|a, b| {
            let up_cmp = b.is_up.cmp(&a.is_up);
            if up_cmp != std::cmp::Ordering::Equal {
                up_cmp
            } else {
                b.is_wireless.cmp(&a.is_wireless)
            }
        });

        Ok(adapters)
    }

    #[cfg(not(windows))]
    Ok(Vec::new())
}

#[cfg(windows)]
unsafe fn pwstr_to_string(ptr: *const u16) -> String {
    if ptr.is_null() {
        return String::new();
    }
    let mut len = 0;
    while *ptr.add(len) != 0 {
        len += 1;
    }
    let slice = std::slice::from_raw_parts(ptr, len);
    String::from_utf16_lossy(slice)
}
