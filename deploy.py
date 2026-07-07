#!/usr/bin/env python3
"""myrs-deploy: deploy myrs-tools or rs-website to 192.168.0.168"""
import argparse, subprocess, sys, time
from pathlib import Path

RU, RH = "devin", "192.168.0.168"

def run(c, w=None):
    print(f"  >> {c}")
    return subprocess.run(c, shell=True, cwd=w).returncode

def _ssh_(c):
    return run(f"ssh -o StrictHostKeyChecking=no {RU}@{RH} \"{c}\"")

def _scp_(l, r):
    return run(f"scp -r \"{l}\" {RU}@{RH}:{r}/")

# myrs-tools
P = Path("D:\\dev\\myrs-tools")
RB = "/www/wwwroot/myrs-tools"
LUI = P / "myrs-tools-ui/dist"
LAPI = P / "myrs-tools-api/dist"
RUI = f"{RB}/myrs-tools-ui/dist"
RAPI = f"{RB}/myrs-tools-api/dist"

def mt_build():
    print("\n[1/4] build...")
    if run("npm run build:release --prefix myrs-tools-api", P): sys.exit(1)
    print("OK")

def mt_uf():
    print(f"\n[2/4] upload front -> {RUI}")
    _ssh_(f"sudo chown -R {RU}:{RU} {RUI}")
    if _scp_(str(LUI) + "\\*", RUI): sys.exit(1)
    print("OK")

def mt_ub():
    print(f"\n[3/4] upload back -> {RAPI}")
    _ssh_(f"sudo chown -R {RU}:{RU} {RAPI}")
    if _scp_(str(LAPI) + "\\*", RAPI): sys.exit(1)
    print("OK")

def mt_r():
    print("\n[4/4] restart")
    _ssh_("sudo chown -R www:www /www/wwwroot/myrs-tools/")
    _ssh_("ps aux | grep node | grep -v grep | awk '{print $2}' | xargs -r sudo kill")
    r = _ssh_("cd /www/wwwroot/myrs-tools/myrs-tools-api && nohup sudo -u www node dist/index.js > /tmp/myrs.log 2>&1 &")
    if r: sys.exit(1)
    print("OK")

def mt_v():
    print("\n[verify]")
    time.sleep(2)
    c = _ssh_("curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:9003/")
    s = "OK" if c == 0 else "WARN: " + str(c)
    print(s)

# rs-website
RSS = Path("D:\\dev\\rs-website\\www.myrshx.com")
RSR = "/www/wwwroot/www.myrshx.com"
RSP = 3000

def rs_static():
    print(f"\n[1/3] upload static -> {RSR}")
    _ssh_(f"sudo chown -R {RU}:{RU} {RSR}")
    for f in RSS.iterdir():
        n = f.name
        if n in ("server", "download_logos.py") or n.startswith("npm "): continue
        if f.is_dir(): r = _scp_(str(f), RSR)
        else: r = run(f"scp \"{f}\" {RU}@{RH}:{RSR}/")
        if r: print(f"  WARN: {n}")
    print("OK static")

def rs_server():
    print(f"\n[2/3] upload server -> {RSR}/server")
    sv = RSS / "server"
    rsv = f"{RSR}/server"
    _ssh_(f"mkdir -p {rsv}")
    for f in sv.iterdir():
        n = f.name
        if n in ("node_modules", "setup-deps.bat"): continue
        if f.is_dir(): r = _scp_(str(f), rsv)
        else: r = run(f"scp \"{f}\" {RU}@{RH}:{rsv}/")
        if r: print(f"  WARN: {n}")
    _ssh_(f"cd {rsv} && [ -d node_modules ] && echo ok || npm install --production")
    print("OK server")

def rs_r():
    print(f"\n[3/3] restart :{RSP}")
    _ssh_(f"sudo chown -R www:www {RSR}")
    _ssh_("ps aux | grep server.js | grep -v grep | awk '{print $2}' | xargs -r sudo kill")
    time.sleep(1)
    r = _ssh_(f"cd {RSR}/server && nohup sudo -u www node server.js > /tmp/rs-website.log 2>&1 </dev/null &")
    print("OK restarted" if not r else "WARN restart")

def rs_v():
    print(f"\n[verify] :{RSP}")
    time.sleep(2)
    c = _ssh_(f"curl -s -o /dev/null -w '%{{http_code}}' http://127.0.0.1:{RSP}/")
    print("OK" if c == 0 else f"WARN: {c}")

def rs_web():
    rs_static(); rs_server(); rs_r(); rs_v()
    print(f"\nDone! http://192.168.0.168:{RSP}")

if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--frontend-only", action="store_true")
    p.add_argument("--backend-only", action="store_true")
    p.add_argument("--restart-only", action="store_true")
    p.add_argument("--skip-build", action="store_true")
    p.add_argument("--rs-website", action="store_true")
    p.add_argument("--rs-restart-only", action="store_true")
    a = p.parse_args()
    if a.rs_restart_only: rs_r(); rs_v(); sys.exit(0)
    if a.rs_website: rs_web(); sys.exit(0)
    if a.restart_only: mt_r(); mt_v()
    elif a.frontend_only:
        if not a.skip_build: mt_build()
        mt_uf(); mt_r(); mt_v()
    elif a.backend_only:
        if not a.skip_build: mt_build()
        mt_ub(); mt_r(); mt_v()
    else:
        if not a.skip_build: mt_build()
        mt_uf(); mt_ub(); mt_r(); mt_v()
    print("\nDone! :9003")