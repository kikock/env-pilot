@echo off
chcp 65001 >nul
echo [EnvPilot] 正在启动桌面客户端...
npm run tauri dev
pause
