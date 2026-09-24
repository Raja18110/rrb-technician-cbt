import pymupdf
import re
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

full_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
doc = pymupdf.open(full_path)

shift_pages = []
for pno in range(330): # Up to page 330 (end of Part 3)
    text = doc[pno].get_text("text")
    if "Test Date" in text or "CEN RRB - 02/2024" in text:
        shift_pages.append(pno + 1)

print(f"Shift headers up to page 330: {shift_pages}")

for idx, pno in enumerate(shift_pages):
    page = doc[pno - 1]
    text = page.get_text("text")
    date_m = re.search(r'(\d{2}/\d{2}/\d{4})', text)
    time_m = re.search(r'(\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM))', text)
    d_str = date_m.group(1) if date_m else ""
    t_str = time_m.group(1) if time_m else ""
    next_pno = shift_pages[idx + 1] if idx + 1 < len(shift_pages) else 331
    print(f"Shift {idx + 1}: Pages {pno} to {next_pno - 1} | {d_str} | {t_str}")
