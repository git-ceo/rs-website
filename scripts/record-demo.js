/**
 * 高清流畅录制官网演示视频
 * 固定帧率截图 + 与滚动同步（每帧推进 demo），避免 CDP 抓拍抖动
 */
const { chromium } = require('playwright');
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'recordings');
const VIEWPORT = { width: 1920, height: 1080 };
const CAPTURE_FPS = 30;
const FRAME_MS = 1000 / CAPTURE_FPS;
const FINALE_SEC = 2.2;
const JPEG_QUALITY = 90;

function ensureRecordUrl(url) {
    const u = new URL(url);
    u.searchParams.set('demo', '1');
    u.searchParams.set('clean', '1');
    u.searchParams.set('sc', '1');
    u.searchParams.set('record', '1');
    return u.toString();
}

function rmDir(dir) {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
}

async function waitForPaint(page) {
    await page.evaluate(function () {
        return new Promise(function (resolve) {
            requestAnimationFrame(function () {
                requestAnimationFrame(resolve);
            });
        });
    });
}

async function demoRecordTick(page, deltaMs) {
    try {
        return await page.evaluate(function (dt) {
            if (!window.DemoMode || typeof window.DemoMode.recordTick !== 'function') {
                return { booting: true };
            }
            return window.DemoMode.recordTick(dt);
        }, deltaMs);
    } catch (e) {
        return { booting: true };
    }
}

async function waitForDemoReady(page) {
    await page.waitForLoadState('domcontentloaded', { timeout: 45000 });
    await page.waitForFunction(function () {
        return window.DemoMode && typeof window.DemoMode.recordTick === 'function';
    }, { timeout: 45000 });
}

async function captureDemo(page, framesDir) {
    let index = 0;
    let finaleFrames = 0;
    const finaleHoldFrames = Math.round(FINALE_SEC * CAPTURE_FPS);
    const maxFrames = CAPTURE_FPS * 150;

    while (index < maxFrames) {
        const loopStart = Date.now();
        let status = { booting: true, allDone: false };

        try {
            status = await demoRecordTick(page, FRAME_MS);
            if (!status.booting && !status.navigating) {
                await waitForPaint(page);
                const file = path.join(framesDir, 'frame-' + String(index).padStart(6, '0') + '.jpg');
                await page.screenshot({ path: file, type: 'jpeg', quality: JPEG_QUALITY });
                index++;
            }
        } catch (err) {
            const msg = err && err.message ? err.message : '';
            if (msg.indexOf('Execution context was destroyed') !== -1 || msg.indexOf('navigation') !== -1) {
                await waitForDemoReady(page);
                continue;
            }
            throw err;
        }

        if (status.allDone) {
            finaleFrames++;
            if (finaleFrames >= finaleHoldFrames) break;
        } else {
            finaleFrames = 0;
        }

        const elapsed = Date.now() - loopStart;
        const delay = FRAME_MS - elapsed;
        if (delay > 0) await page.waitForTimeout(delay);
    }

    return index;
}

function encodeFrames(framesDir, frameCount, outMp4) {
    const duration = (frameCount / CAPTURE_FPS).toFixed(1);
    console.log('合成', frameCount, '帧 → 约', duration, '秒 @', CAPTURE_FPS, 'fps');

    execFileSync(ffmpegPath, [
        '-y', '-framerate', String(CAPTURE_FPS),
        '-i', path.join(framesDir, 'frame-%06d.jpg'),
        '-c:v', 'libx264', '-crf', '16', '-preset', 'medium',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        outMp4
    ], { stdio: 'inherit' });
}

async function main() {
    const inputUrl = process.argv[2] || 'http://localhost:3456/demo.html';
    const demoUrl = ensureRecordUrl(inputUrl);
    const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
    const framesDir = path.join(OUT_DIR, '_frames_' + stamp);
    const outMp4 = path.join(OUT_DIR, 'demo-' + stamp + '.mp4');

    fs.mkdirSync(OUT_DIR, { recursive: true });
    fs.mkdirSync(framesDir, { recursive: true });

    console.log('启动浏览器录屏:', demoUrl);
    console.log('抓拍', CAPTURE_FPS, 'fps，滚动与帧同步');

    const browser = await chromium.launch({
        headless: true,
        args: ['--disable-frame-rate-limit', '--disable-gpu-vsync', '--force-device-scale-factor=1']
    });

    const context = await browser.newContext({
        viewport: VIEWPORT,
        deviceScaleFactor: 1
    });

    const page = await context.newPage();
    const recordStart = Date.now();

    try {
        const res = await page.goto(demoUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
        if (!res || !res.ok()) throw new Error('页面打开失败 HTTP ' + (res ? res.status() : 'unknown'));

        await waitForDemoReady(page);

        console.log('录制中...');
        var frameCount = await captureDemo(page, framesDir);
    } finally {
        await context.close();
        await browser.close();
    }

    const elapsed = Math.max((Date.now() - recordStart) / 1000, 1);
    if (frameCount < 30) {
        rmDir(framesDir);
        throw new Error('录制帧数过少: ' + frameCount);
    }

    console.log('抓拍完成:', frameCount, '帧 /', elapsed.toFixed(1), '秒');
    encodeFrames(framesDir, frameCount, outMp4);
    rmDir(framesDir);

    const sizeMB = (fs.statSync(outMp4).size / 1024 / 1024).toFixed(1);
    const playSec = (frameCount / CAPTURE_FPS).toFixed(1);
    console.log('录制完成:', outMp4, '(' + sizeMB, 'MB,', playSec, '秒,', CAPTURE_FPS, 'fps)');
}

main().catch(function (err) {
    console.error('录屏失败:', err.message);
    process.exit(1);
});
