import pymupdf
from PIL import Image, ImageDraw, ImageFont
import os
import re
import time
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = r'C:\Users\rkuma\.gemini\antigravity\scratch\rrb-technician-cbt'
PDF_PATH = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
CARDS_DIR = os.path.join(PROJECT_DIR, 'cards')
os.makedirs(CARDS_DIR, exist_ok=True)

try:
    font = ImageFont.truetype('arial.ttf', 20)
except Exception:
    font = ImageFont.load_default()

SHIFTS_CONFIG = [
    {"id": 10, "start_page": 1, "end_page": 18},
    {"id": 11, "start_page": 19, "end_page": 36},
    {"id": 12, "start_page": 37, "end_page": 54},
    {"id": 13, "start_page": 55, "end_page": 72},
    {"id": 14, "start_page": 73, "end_page": 90},
    {"id": 15, "start_page": 91, "end_page": 108},
    {"id": 16, "start_page": 109, "end_page": 127},
    {"id": 17, "start_page": 128, "end_page": 145},
    {"id": 18, "start_page": 146, "end_page": 163},
    {"id": 19, "start_page": 164, "end_page": 182},
    {"id": 20, "start_page": 183, "end_page": 199},
    {"id": 21, "start_page": 200, "end_page": 217},
    {"id": 22, "start_page": 218, "end_page": 235},
    {"id": 23, "start_page": 236, "end_page": 252},
    {"id": 24, "start_page": 253, "end_page": 270},
    {"id": 25, "start_page": 271, "end_page": 287},
    {"id": 26, "start_page": 288, "end_page": 304},
    {"id": 27, "start_page": 305, "end_page": 322},
    {"id": 28, "start_page": 323, "end_page": 340},
    {"id": 29, "start_page": 341, "end_page": 358},
    {"id": 30, "start_page": 359, "end_page": 375},
    {"id": 31, "start_page": 376, "end_page": 393},
    {"id": 32, "start_page": 394, "end_page": 411}
]

def clean_and_generate_cards():
    start_total = time.time()
    print(f"Loading master 2024 PDF from {PDF_PATH}...")
    doc = pymupdf.open(PDF_PATH)
    print(f"Loaded PDF with {len(doc)} pages.")

    total_cards = 0

    for shift in SHIFTS_CONFIG:
        set_id = shift["id"]
        start_p = shift["start_page"] - 1
        end_p = shift["end_page"] - 1
        shift_start = time.time()
        shift_cards = 0

        print(f"\nProcessing Set {set_id} (Pages {start_p + 1} to {end_p + 1})...")

        for pno in range(start_p, end_p + 1):
            page = doc[pno]
            words = page.get_text("words")
            q_markers = []
            for w in words:
                m = re.match(r'^Q\.(\d+)$', w[4])
                if m:
                    qnum = int(m.group(1))
                    q_markers.append((qnum, w[1], w[3]))
            q_markers.sort(key=lambda x: x[1])

            if not q_markers:
                continue

            # 1. Mask answer icons (cross / checkmark) strictly up to x=76.8
            icons = [
                img for img in page.get_image_info()
                if 50 <= img['bbox'][0] <= 82 and 65 <= img['bbox'][2] <= 85 and img['height'] <= 35
            ]
            for ic in icons:
                b = ic['bbox']
                page.draw_rect(
                    pymupdf.Rect(b[0] - 3, b[1] - 3, min(b[2] + 1, 76.8), b[3] + 3),
                    color=(1, 1, 1),
                    fill=(1, 1, 1),
                    overlay=True
                )

            # 2. Identify option number spans and Ans labels to mask & redraw
            spans_to_redraw = []
            for b in page.get_text('dict')['blocks']:
                if 'lines' in b:
                    for l in b['lines']:
                        for s in l['spans']:
                            t = s.get('text', '').strip()
                            if t in ['1.', '2.', '3.', '4.'] and 70 <= s['bbox'][0] <= 92:
                                sb = s['bbox']
                                page.draw_rect(
                                    pymupdf.Rect(sb[0] - 2, sb[1] - 2, sb[2] + 2, sb[3] + 2),
                                    color=(1, 1, 1),
                                    fill=(1, 1, 1),
                                    overlay=True
                                )
                                spans_to_redraw.append((t, sb))
                            elif t == 'Ans' and 20 <= s['bbox'][0] <= 52:
                                sb = s['bbox']
                                page.draw_rect(
                                    pymupdf.Rect(sb[0] - 2, sb[1] - 2, sb[2] + 2, sb[3] + 2),
                                    color=(1, 1, 1),
                                    fill=(1, 1, 1),
                                    overlay=True
                                )

            # Render page pixmap at 2x resolution
            mat = pymupdf.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat)
            im = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
            draw = ImageDraw.Draw(im)

            # Redraw clean neutral option numbers in dark gray
            for t, sb in spans_to_redraw:
                x_px = int(sb[0] * 2)
                y_px = int(sb[1] * 2) - 2
                draw.text((x_px, y_px), t, fill=(45, 55, 72), font=font)

            # Desaturate any colored text in options zone (x: 100 to 500)
            px = im.load()
            for y in range(im.size[1]):
                for x in range(100, min(im.size[0], 500)):
                    r, g, b = px[x, y]
                    if max(r, g, b) - min(r, g, b) > 15:
                        gray = int(0.299 * r + 0.587 * g + 0.114 * b)
                        px[x, y] = (gray, gray, gray) if gray <= 230 else (255, 255, 255)

            # Crop individual question cards from the clean page
            page_height = page.rect.height
            page_width = page.rect.width
            for i, (qnum, y0, y1) in enumerate(q_markers):
                top_y = max(0, y0 - 10)
                if i + 1 < len(q_markers):
                    bottom_y = q_markers[i + 1][1] - 8
                else:
                    bottom_y = min(page_height - 35, page_height)

                crop_box = (
                    int(20 * 2),
                    int(top_y * 2),
                    int((page_width - 20) * 2),
                    int(bottom_y * 2)
                )
                q_img = im.crop(crop_box)
                card_filename = f"set{set_id}_q{qnum}.png"
                q_img.save(os.path.join(CARDS_DIR, card_filename))
                shift_cards += 1
                total_cards += 1

        print(f"  ✓ Set {set_id} completed: {shift_cards} cards generated in {time.time() - shift_start:.2f}s")

    print(f"\nAll done! Total {total_cards} clean question cards generated across all 23 shifts in {time.time() - start_total:.2f}s.")

if __name__ == "__main__":
    clean_and_generate_cards()
