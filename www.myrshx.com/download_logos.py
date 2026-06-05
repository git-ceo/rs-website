# -*- coding: utf-8 -*-
"""
Download client logos from official websites.
Falls back to SVG text logo when download fails.
"""
import requests
from bs4 import BeautifulSoup
import os
import re
import json
import urllib3
from urllib.parse import urljoin

urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

HEADERS = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 '
                  '(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
}

SAVE_DIR = r"d:\workspace\rs-website\www.myrshx.com\images\logos"
os.makedirs(SAVE_DIR, exist_ok=True)

CLIENTS = [
    {"key": "caep",      "name": "中国工程物理研究院",      "short": "CAEP",     "url": "https://www.caep.cn/",      "lines": ["中国工程物理", "研究院"], "en": "CAEP"},
    {"key": "swust",     "name": "西南科技大学",            "short": "SWUST",    "url": "https://www.swust.edu.cn/", "lines": ["西南科技大学"],          "en": "SWUST"},
    {"key": "mtc",       "name": "绵阳师范学院",            "short": "MTC",      "url": "https://www.mtc.edu.cn/",   "lines": ["绵阳师范学院"],          "en": "MTC"},
    {"key": "cardc",     "name": "中国空气动力研究与发展中心","short": "CARDC",   "url": "https://www.cardc.cn/",     "lines": ["中国空气动力", "研究与发展中心"], "en": "CARDC"},
    {"key": "changhong", "name": "四川长虹",                "short": "Changhong","url": "https://www.changhong.com/","lines": ["四川长虹"],              "en": "CHANGHONG"},
    {"key": "jezetek",   "name": "四川九洲",                "short": "Jezetek",  "url": "https://www.jezetek.cc/",   "lines": ["四川九洲"],              "en": "JEZETEK"},
    {"key": "hys",       "name": "好医生药业",              "short": "HYS",      "url": "https://www.hys.cn/",       "lines": ["好医生药业"],            "en": "HYS"},
    {"key": "emtco",     "name": "四川东材科技",            "short": "EMTCO",    "url": "https://www.emtco.cn/",     "lines": ["四川东材科技"],          "en": "EMTCO"},
    {"key": "swjtu",     "name": "西南交通大学",            "short": "SWJTU",    "url": "https://www.swjtu.edu.cn/", "lines": ["西南交通大学"],          "en": "SWJTU"},
    {"key": "cnpc",      "name": "中国石油",                "short": "CNPC",     "url": "https://www.cnpc.com.cn/",  "lines": ["中国石油"],              "en": "CNPC"},
    {"key": "sccdc",     "name": "四川省疾控中心",          "short": "SCCDC",    "url": "https://www.sccdc.cn/",     "lines": ["四川省", "疾控中心"],     "en": "SCCDC"},
    {"key": "spqi",      "name": "四川省质检院",            "short": "SPQI",     "url": "https://www.spqi.com.cn/",  "lines": ["四川省质检院"],          "en": "SPQI"},
]

LOGO_PATTERN = re.compile(r'logo', re.I)


def find_logo_url(base_url):
    try:
        resp = requests.get(base_url, headers=HEADERS, timeout=12, verify=False)
        resp.encoding = resp.apparent_encoding or 'utf-8'
        soup = BeautifulSoup(resp.text, 'html.parser')

        candidates = []

        # 1) <link rel="icon"|"shortcut icon"|"apple-touch-icon">
        for link in soup.find_all('link'):
            rel = ' '.join(link.get('rel') or []).lower()
            if any(k in rel for k in ['icon', 'shortcut', 'apple-touch']):
                href = link.get('href')
                if href:
                    candidates.append(('icon-link', urljoin(base_url, href)))

        # 2) img tags with logo in src/alt/class/id
        for img in soup.find_all('img'):
            src = img.get('src') or img.get('data-src') or img.get('data-original') or ''
            alt = (img.get('alt') or '').lower()
            cls = ' '.join(img.get('class') or []).lower()
            iid = (img.get('id') or '').lower()
            score = 0
            if LOGO_PATTERN.search(src): score += 3
            if LOGO_PATTERN.search(alt): score += 2
            if LOGO_PATTERN.search(cls): score += 2
            if LOGO_PATTERN.search(iid): score += 2
            if score and src:
                candidates.append((f'img-logo-{score}', urljoin(base_url, src)))

        # 3) header/nav top first <img>
        for tag in soup.find_all(['header', 'div'], class_=re.compile(r'header|nav|top|banner', re.I)):
            img = tag.find('img')
            if img:
                src = img.get('src') or img.get('data-src') or ''
                if src:
                    candidates.append(('header-img', urljoin(base_url, src)))
                    break

        # 4) any img near top
        first_img = soup.find('img')
        if first_img:
            src = first_img.get('src') or first_img.get('data-src') or ''
            if src:
                candidates.append(('first-img', urljoin(base_url, src)))

        # rank: prefer those with logo keyword and not favicon-only
        def rank(item):
            tag, u = item
            s = 0
            if 'logo' in u.lower(): s += 5
            if u.lower().endswith('.svg'): s += 2
            if u.lower().endswith('.png'): s += 2
            if u.lower().endswith('.jpg') or u.lower().endswith('.jpeg'): s += 1
            if 'favicon' in u.lower(): s -= 3
            if tag.startswith('img-logo'):
                try:
                    s += int(tag.rsplit('-', 1)[-1])
                except Exception:
                    pass
            if tag == 'icon-link': s -= 1
            return -s

        candidates.sort(key=rank)
        seen = set()
        result = []
        for _, u in candidates:
            if u in seen:
                continue
            seen.add(u)
            result.append(u)
        return result
    except Exception as e:
        print(f"[ERR fetch] {base_url}: {e}")
        return []


def download_image(url, save_path_base):
    """Try downloading image; auto-detect extension; return saved path or None."""
    try:
        resp = requests.get(url, headers=HEADERS, timeout=15, verify=False, stream=True)
        if resp.status_code != 200:
            return None
        content = resp.content
        if len(content) < 500:
            return None
        # detect format by magic
        ext = None
        if content[:8] == b'\x89PNG\r\n\x1a\n':
            ext = '.png'
        elif content[:3] == b'\xff\xd8\xff':
            ext = '.jpg'
        elif content[:6] in (b'GIF87a', b'GIF89a'):
            ext = '.gif'
        elif content[:4] == b'RIFF' and content[8:12] == b'WEBP':
            ext = '.webp'
        elif content.lstrip()[:5].lower() == b'<?xml' or b'<svg' in content[:200].lower():
            ext = '.svg'
        elif content[:2] == b'\x00\x00' and content[2:4] in (b'\x01\x00', b'\x02\x00'):
            ext = '.ico'
        else:
            ct = resp.headers.get('Content-Type', '').lower()
            if 'png' in ct: ext = '.png'
            elif 'jpeg' in ct or 'jpg' in ct: ext = '.jpg'
            elif 'svg' in ct: ext = '.svg'
            elif 'gif' in ct: ext = '.gif'
            elif 'webp' in ct: ext = '.webp'
            elif 'icon' in ct: ext = '.ico'
            else: return None
        save_path = save_path_base + ext
        with open(save_path, 'wb') as f:
            f.write(content)
        return save_path
    except Exception as e:
        print(f"[ERR download] {url}: {e}")
        return None


def make_svg(client):
    lines = client["lines"]
    en = client["en"]
    if len(lines) == 1:
        text_block = f'<text x="100" y="42" text-anchor="middle" font-size="16" font-weight="bold" fill="#004182" font-family="Microsoft YaHei,SimHei,Arial">{lines[0]}</text>'
    else:
        text_block = (
            f'<text x="100" y="30" text-anchor="middle" font-size="13" font-weight="bold" fill="#004182" font-family="Microsoft YaHei,SimHei,Arial">{lines[0]}</text>'
            f'<text x="100" y="50" text-anchor="middle" font-size="13" font-weight="bold" fill="#004182" font-family="Microsoft YaHei,SimHei,Arial">{lines[1]}</text>'
        )
    en_block = f'<text x="100" y="72" text-anchor="middle" font-size="10" fill="#666" font-family="Arial">{en}</text>'
    svg = (
        '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="80" viewBox="0 0 200 80">'
        '<rect width="200" height="80" fill="white"/>'
        f'{text_block}{en_block}'
        '</svg>'
    )
    path = os.path.join(SAVE_DIR, f"{client['key']}_text.svg")
    with open(path, 'w', encoding='utf-8') as f:
        f.write(svg)
    return path


def main():
    success = []
    failed = []
    manifest_clients = []

    for c in CLIENTS:
        print(f"\n=== {c['name']} ({c['url']}) ===")
        urls = find_logo_url(c['url'])
        print(f"  candidates: {len(urls)}")
        for u in urls[:6]:
            print(f"   - {u}")

        saved = None
        base = os.path.join(SAVE_DIR, c['key'])
        for u in urls[:6]:
            p = download_image(u, base)
            if p:
                # skip pure favicon ico
                if p.lower().endswith('.ico'):
                    if not saved:
                        saved = p
                    continue
                saved = p
                print(f"  ✓ downloaded -> {os.path.basename(p)}")
                break

        svg_path = make_svg(c)
        rel_svg = 'images/logos/' + os.path.basename(svg_path)

        if saved:
            rel_logo = 'images/logos/' + os.path.basename(saved)
            success.append(c['key'])
        else:
            rel_logo = rel_svg
            failed.append(c['key'])
            print(f"  ✗ no logo, fallback to SVG")

        manifest_clients.append({
            "name": c['name'],
            "short": c['short'],
            "url": c['url'],
            "logo": rel_logo,
            "fallback": rel_svg,
        })

    manifest = {"clients": manifest_clients}
    mpath = os.path.join(SAVE_DIR, 'logos_manifest.json')
    with open(mpath, 'w', encoding='utf-8') as f:
        json.dump(manifest, f, ensure_ascii=False, indent=2)

    print("\n" + "=" * 50)
    print(f"SUCCESS ({len(success)}): {', '.join(success) or '-'}")
    print(f"FAILED  ({len(failed)}): {', '.join(failed) or '-'}")
    print(f"Manifest: {mpath}")


if __name__ == '__main__':
    main()
