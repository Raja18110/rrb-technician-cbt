import pymupdf
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

pdf2025 = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789728414898.pdf'
doc = pymupdf.open(pdf2025)
page = doc[0]

# Find and redact all checkmark characters on page 1
d = page.get_text("dict")
for b in d['blocks']:
    if 'lines' in b:
        for l in b['lines']:
            for s in l['spans']:
                if '✓' in s['text'] or '\u2713' in s['text']:
                    rect = pymupdf.Rect(s['bbox']) + (-2, -2, 2, 2)
                    page.add_redact_annot(rect, fill=(1, 1, 1))

page.apply_redactions()

# Render Q1
crop_rect = pymupdf.Rect(20, 180, page.rect.width - 20, 310)
mat = pymupdf.Matrix(2.0, 2.0)
pix = page.get_pixmap(matrix=mat, clip=crop_rect)

test_out = r'C:\Users\rkuma\.gemini\antigravity\scratch\rrb-technician-cbt\cards\test_clean_2025_q1.png'
pix.save(test_out)
print(f"Saved sanitized 2025 Q1 card to {test_out}")
