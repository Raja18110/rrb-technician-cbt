import pymupdf
import re
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

master_pdf = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
doc = pymupdf.open(master_pdf)

shifts_28_32 = [
    (28, 323, 340),
    (29, 341, 358),
    (30, 359, 375),
    (31, 376, 393),
    (32, 394, 411)
]

for set_id, start_p, end_p in shifts_28_32:
    page = doc[start_p - 1]
    text = page.get_text("text")
    date_m = re.search(r'(\d{2}/\d{2}/\d{4})', text)
    time_m = re.search(r'(\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM))', text)
    d_str = date_m.group(1) if date_m else ""
    t_str = time_m.group(1) if time_m else ""
    print(f"Set {set_id}: Pages {start_p} to {end_p} | Date: {d_str} | Time: {t_str}")
