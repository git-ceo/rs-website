@echo off
chcp 65001
echo 正在停止项目服务...

:: 停止占用 3000 端口的所有进程（node 服务）
taskkill /f /im node.exe >nul 2>&1

echo 服务已停止！
pause