#!/usr/bin/env python3
"""Download brand logos from Wikipedia"""
import urllib.request
import ssl
import os
import time

ssl_ctx = ssl.create_default_context()

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'image/svg+xml,image/*,*/*',
}

brands = {
    'thermofisher': 'https://upload.wikimedia.org/wikipedia/en/5/5d/Thermo_Fisher_Scientific_Logo.svg',
    'sigma': 'https://upload.wikimedia.org/wikipedia/commons/e/e2/Logo_Merck_KGaA_2015.svg',
    '3m': 'https://upload.wikimedia.org/wikipedia/en/7/7d/3M_2025_logo.svg',
    'mettler-toledo': 'https://upload.wikimedia.org/wikipedia/commons/5/56/Mettler_Toledo.svg',
    'eppendorf': 'https://upload.wikimedia.org/wikipedia/en/f/fa/Eppendorf_logo.svg',
    'jk': 'https://upload.wikimedia.org/wikipedia/en/4/41/J%26K_Scientific_logo.svg',
    'asone': '',
    'synthware': '',
    'aladdin': '',
    'bidepharm': '',
    'yheng': '',
    'leici': '',
    'lianhua': '',
    'shubo': '',
    'kysd': '',
    'zoyet': '',
}

base = 'www.myrshx.com/images/brands'
os.makedirs(base, exist_ok=True)

for name, url in brands.items():
    if not url:
        print(f"SKIP {name}: no URL")
        continue
    ext = url.split('.')[-1].split('?')[0]
    fpath = f'{base}/{name}.{ext}'
    if os.path.exists(fpath):
        print(f"EXISTS {name}.{ext}")
        continue
    try:
        req = urllib.request.Request(url, headers=HEADERS)
        resp = urllib.request.urlopen(req, context=ssl_ctx, timeout=15)
        content = resp.read()
        with open(fpath, 'wb') as f:
            f.write(content)
        print(f"OK {name}.{ext} ({len(content)} bytes)")
    except Exception as e:
        print(f"FAIL {name}: {e}")
    time.sleep(0.5)
