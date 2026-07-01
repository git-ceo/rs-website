@echo off
chcp 65001 >nul
echo ========================================
echo   荣盛官网 - 全量部署到 192.168.0.168
echo ========================================
echo.

echo [1/2] 连接 VPN...
rasdial rsvpn rsvpn rshuangdong
if errorlevel 1 (
    echo VPN 连接失败，请检查网络后重试。
    pause
    exit /b 1
)
echo VPN 已连接。
echo.

echo [2/2] 开始全量部署（静态文件 + server + 重启）...
echo 若提示输入密码，请输入 devin@192.168.0.168 的 SSH 密码。
echo.
cd /d "%~dp0"
python deploy.py --rs-website
echo.
if errorlevel 1 (
    echo 部署失败，请检查上方输出。
) else (
    echo 部署完成: http://192.168.0.168:3000
)
pause
