/**
 * 将已有帧目录编码为 60fps MP4
 * 与 test-from-frames.mp4 相同画质，仅将输出帧率提升到 60fps（保留原播放节奏）
 * 用法: node scripts/encode-frames-60fps.js <frames目录> [输出文件]
 */
const { execFileSync } = require('child_process');
const ffmpegPath = require('ffmpeg-static');
const fs = require('fs');
const path = require('path');

const TARGET_FPS = 60;
const PLAYBACK_FPS = 24;

function main() {
    const framesDir = path.resolve(process.argv[2] || '');
    if (!framesDir || !fs.existsSync(framesDir)) {
        console.error('用法: node scripts/encode-frames-60fps.js <frames目录> [输出文件]');
        process.exit(1);
    }

    const files = fs.readdirSync(framesDir).filter(function (f) { return /^frame-\d+\.jpg$/.test(f); });
    if (files.length < 2) {
        console.error('帧数不足');
        process.exit(1);
    }

    const outMp4 = process.argv[3]
        ? path.resolve(process.argv[3])
        : path.join(path.dirname(framesDir), 'demo-60fps-' + path.basename(framesDir).replace('_frames_', '') + '.mp4');

    const durationSec = (files.length / PLAYBACK_FPS).toFixed(1);
    console.log('帧数:', files.length, '→ 约', durationSec, '秒 @', TARGET_FPS, 'fps');

    execFileSync(ffmpegPath, [
        '-y', '-framerate', String(PLAYBACK_FPS),
        '-i', path.join(framesDir, 'frame-%06d.jpg'),
        '-vf', 'fps=' + TARGET_FPS,
        '-c:v', 'libx264', '-crf', '16', '-preset', 'medium',
        '-pix_fmt', 'yuv420p', '-movflags', '+faststart',
        outMp4
    ], { stdio: 'inherit' });

    const sizeMB = (fs.statSync(outMp4).size / 1024 / 1024).toFixed(1);
    console.log('完成:', outMp4, '(' + sizeMB, 'MB,', TARGET_FPS, 'fps)');
}

main();
