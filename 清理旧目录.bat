@echo off
chcp 65001
echo ========================================
echo  清理迁移后的冗余目录
echo  请先关闭 Cursor/编辑器 及 node 服务
echo ========================================
pause

taskkill /F /IM node.exe >nul 2>&1

cd /d "%~dp0"

if exist "www.myrstech.cn" (
    echo 正在删除 www.myrstech.cn ...
    rmdir /S /Q "www.myrstech.cn"
    if exist "www.myrstech.cn" (
        echo [失败] www.myrstech.cn 仍被占用，请关闭占用程序后重试
    ) else (
        echo [完成] 已删除 www.myrstech.cn
    )
) else (
    echo [跳过] www.myrstech.cn 不存在
)

if exist "bak\www.myrshx.com-0.2" (
    echo 正在删除 bak\www.myrshx.com-0.2 ...
    rmdir /S /Q "bak\www.myrshx.com-0.2"
)

if exist "bak" (
    rmdir "bak" 2>nul
    if exist "bak" (
        echo [提示] bak 目录非空，请手动检查
    ) else (
        echo [完成] 已删除 bak
    )
)

echo.
echo 当前项目目录：
dir /ad /b
echo.
pause
