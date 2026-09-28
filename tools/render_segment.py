#!/usr/bin/env python3
"""Render a range of frames of dist/film.js to an H.264 video (no audio).

usage: python3 tools/render_segment.py OUT.mp4 FIRST_FRAME END_FRAME

Frames are drawn by the film's own renderFrame() in headless Chromium at
1920x1080 and piped to ffmpeg. Normally you don't call this directly:
tools/render_film.py runs it once per shot, in parallel.
"""
import base64
import pathlib
import subprocess
import sys
import time

from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
FPS = 24


def render(out, start, end, log=print):
    js = (ROOT / 'dist' / 'film.js').read_text(encoding='utf-8')
    html = ("<html><body style='margin:0;background:#000'>"
            "<canvas id=c width=1920 height=1080></canvas><script>" + js + "</script></body></html>")
    ff = subprocess.Popen(
        ['ffmpeg', '-v', 'error', '-y', '-f', 'image2pipe', '-framerate', str(FPS), '-c:v', 'mjpeg', '-i', '-',
         '-c:v', 'libx264', '-preset', 'medium', '-crf', '17', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', str(out)],
        stdin=subprocess.PIPE)
    errors = []
    t0 = time.time()
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content(html)
        for i in range(start, end):
            data = page.evaluate(
                "t=>{const c=document.getElementById('c');FILM.renderFrame(c.getContext('2d'),t);"
                "return c.toDataURL('image/jpeg',.95)}", i / FPS)
            ff.stdin.write(base64.b64decode(data.split(',')[1]))
        browser.close()
    ff.stdin.close()
    ff.wait()
    log(f'{pathlib.Path(out).name}: frames {start}-{end - 1} in {time.time() - t0:.0f}s')
    if errors:
        log('page errors: ' + ' | '.join(errors[:5]))
    return not errors and ff.returncode == 0


if __name__ == '__main__':
    ok = render(sys.argv[1], int(sys.argv[2]), int(sys.argv[3]))
    sys.exit(0 if ok else 1)
