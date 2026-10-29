import React from "react";
import { api } from "../services/api";

interface FooterBadgesProps {
  version?: string;
  style?: React.CSSProperties;
}

export const FooterBadges: React.FC<FooterBadgesProps> = ({
  version = "2.0.3",
  style,
}) => {
  const handleOpenAuthor = (e: React.MouseEvent) => {
    e.stopPropagation();
    api.openBrowser("http://home.34462958.xyz");
  };

  const handleOpenRepo = (e: React.MouseEvent) => {
    e.stopPropagation();
    api.openBrowser("https://github.com/kikock/env-pilot");
  };

  return (
    <div className="footer-badges-container" style={style}>
      {/* 徽标 1: 版本号 */}
      <div className="badge-pill" title={`EnvPilot 当前发布版本: v${version}`}>
        <span className="badge-side badge-side-dark">v</span>
        <span className="badge-side badge-side-blue">{version}</span>
      </div>

      {/* 徽标 2: 作者主页 */}
      <div
        className="badge-pill badge-clickable"
        onClick={handleOpenAuthor}
        title="点击访问作者主页: http://home.34462958.xyz"
      >
        <span className="badge-side badge-side-dark">by</span>
        <span className="badge-side badge-side-green">kikock</span>
      </div>

      {/* 徽标 3: Git 开源仓库 */}
      <div
        className="badge-pill badge-clickable"
        onClick={handleOpenRepo}
        title="点击访问 GitHub 源码仓库: https://github.com/kikock/env-pilot"
      >
        <span className="badge-side badge-side-dark badge-git-label">
          <svg
            width="11"
            height="11"
            viewBox="0 0 24 24"
            fill="none"
            style={{ flexShrink: 0, transform: "rotate(45deg)" }}
          >
            <rect x="2" y="2" width="20" height="20" rx="4" fill="#F05032" />
            <circle cx="9" cy="9" r="2.2" fill="#ffffff" />
            <circle cx="9" cy="15" r="2.2" fill="#ffffff" />
            <circle cx="15" cy="12" r="2.2" fill="#ffffff" />
            <line x1="9" y1="9" x2="9" y2="15" stroke="#ffffff" strokeWidth="2" />
            <path d="M9 12h3a3 3 0 0 1 3 3" stroke="#ffffff" strokeWidth="2" fill="none" />
          </svg>
          <span>Git</span>
        </span>
        <span className="badge-side badge-side-blue">仓库 ↗</span>
      </div>
    </div>
  );
};
