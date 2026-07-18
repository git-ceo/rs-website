## deploy
python deploy.py
python deploy.py --restart-only

## local dev
start-local.bat
# 或: cd www.myrshx.com/server && npm install && set PORT=3456 && node server.js
# 访问 http://localhost:3456/  （不要用 python -m http.server，否则 /api/* 会 404）

## vpn
rasdial rsvpn rsvpn rshuangdong
