@echo off
chcp 65001
echo 开始安装/更新项目依赖
cd /d "d:\workspace\rs-website\www.myrshx.com\server"
npm install
echo 依赖安装完成！
pause