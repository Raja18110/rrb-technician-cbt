import pymupdf
import re
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

pdf2_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789984601001.pdf'
pdf3_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789984914382.pdf'

def inspect_pdf(name, path):
    doc = pymupdf.open(path)
    print(f"=== {name}: {len(doc)} pages ===")
    shifts = []
    for pno in range(len(doc)):
        page = doc[pno]
        text = page.get_text("text")
        if "Test Date" in text or "CEN RRB - 02/2024" in text:
            lines = [line.strip() for line in text.splitlines() if line.strip()]
            date_m = re.search(r'(\d{2}/\d{2}/\d{4})', text)
            time_m = re.search(r'(\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM))', text)
            d_str = date_m.group(1) if date_m else ""
            t_str = time_m.group(1) if time_m else ""
            shifts.append((pno + 1, d_str, t_str))
            
    print(f"  Shift headers found ({len(shifts)}):")
    for s in shifts:
        print(f"    Page {s[0]}: {s[1]} | {s[2]}")

inspect_pdf("PDF 2 (Part 2)", pdf2_path)
inspect_pdf("PDF 3 (Part 3)", pdf3_path)
