import pymupdf
import re
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

pdf2025 = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789728414898.pdf'
doc = pymupdf.open(pdf2025)
page = doc[0]

d = page.get_text("dict")
check_spans = []
for b in d['blocks']:
    if 'lines' in b:
        for l in b['lines']:
            for s in l['spans']:
                if '✓' in s['text'] or '\u2713' in s['text']:
                    check_spans.append((s['text'], s['bbox'], s['color']))

print(f"Checkmark spans on page 1 of 2025 PDF: {len(check_spans)}")
for c in check_spans:
    print(c)
