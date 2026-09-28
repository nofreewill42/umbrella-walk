#!/usr/bin/env python3
"""Quick look at frames without rendering video: draws a contact sheet of stills.

  python3 tools/preview.py --shot 6 --at 0.5 1.0 2.9 3.3      frames of shot 6 at those seconds (from the start of the shot)
  python3 tools/preview.py --shot 9 --every 0.25               every quarter second through shot 9
  python3 tools/preview.py --at 12.5 40                        absolute film times
  options: --cols 4  --width 480 (width of each still)  --out out/preview.jpg

Every still is labelled with its time. This is the fastest way to check a change (a few seconds).
"""
import argparse
import base64
import io
import json
import pathlib
import sys

from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

ROOT = pathlib.Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / 'tools'))
from build import build  # noqa: E402


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--shot', type=int, help='times are relative to the start of this shot (1-based)')
    ap.add_argument('--at', type=float, nargs='+', help='times in seconds')
    ap.add_argument('--every', type=float, help='sample the whole shot every N seconds')
    ap.add_argument('--cols', type=int, default=4)
    ap.add_argument('--width', type=int, default=480)
    ap.add_argument('--out', default=str(ROOT / 'out' / 'preview.jpg'))
    args = ap.parse_args()

    build(quiet=True)
    from timeline import CUTS as cuts
    off, length = 0.0, cuts[-1] / 24
    if args.shot:
        off, length = cuts[args.shot - 1] / 24, (cuts[args.shot] - cuts[args.shot - 1]) / 24
    if args.every:
        times = [round(i * args.every, 3) for i in range(int(length / args.every) + 1) if i * args.every < length]
    elif args.at:
        times = args.at
    else:
        times = [round(length * (i + .5) / 8, 3) for i in range(8)]

    js = (ROOT / 'dist' / 'film.js').read_text(encoding='utf-8')
    stills, errors = [], []
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.on('pageerror', lambda e: errors.append(str(e)))
        page.set_content("<canvas id=c width=1920 height=1080></canvas><script>" + js + "</script>")
        for t in times:
            data = page.evaluate("t=>{const c=document.getElementById('c');FILM.renderFrame(c.getContext('2d'),t);"
                                 "return c.toDataURL('image/jpeg',.9)}", off + t)
            stills.append(Image.open(io.BytesIO(base64.b64decode(data.split(',')[1]))).convert('RGB'))
        browser.close()

    w = args.width
    h = round(w * 1080 / 1920)
    rows = (len(stills) + args.cols - 1) // args.cols
    sheet = Image.new('RGB', (args.cols * w, rows * h))
    for i, (im, t) in enumerate(zip(stills, times)):
        im = im.resize((w, h), Image.LANCZOS)
        d = ImageDraw.Draw(im)
        d.rectangle([0, 0, 64, 16], fill=(0, 0, 0))
        d.text((4, 2), f'{t:.2f}', fill=(255, 255, 0))
        sheet.paste(im, ((i % args.cols) * w, (i // args.cols) * h))
    out = pathlib.Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(out, quality=90)
    print(f'saved {out}' + (f'  (page errors: {errors[:3]})' if errors else ''))


if __name__ == '__main__':
    main()
