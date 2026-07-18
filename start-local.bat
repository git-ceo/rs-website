@echo off
chcp 65001 >nul
echo ========================================
echo  荣盛官网 - 本地开发服务（含 API）
echo ========================================
echo.
echo 说明：不要用 python -m http.server
echo       新闻/企业文化/展厅等页面需要 Node API
echo.
cd /d "%~dp0www.myrshx.com\server"
if not exist node_modules (
    echo 正在安装依赖...
    call npm install
)
set PORT=3456
echo 启动中: http://localhost:%PORT%/
echo 演示模式: http://localhost:%PORT%/demo.html
echo.
node server.js
