@echo off
chcp 65001
echo 正在启动项目...
cd /d "d:\workspace\rs-website\www.myrshx.com\server"

start http://localhost:3000/
start http://localhost:3000/admin/
rem admin 123456

npm start


