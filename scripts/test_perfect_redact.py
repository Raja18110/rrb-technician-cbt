import pymupdf

pdf_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
doc = pymupdf.open(pdf_path)
page = doc[3] # Page 4

words = page.get_text("words")
q19_w = [w for w in words if w[4] == "Q.19"][0]
q20_w = [w for w in words if w[4] == "Q.20"][0]

# Find all spans in Q19
d = page.get_text("dict")
spans = [s for b in d['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans'] if q19_w[1] - 5 <= s['bbox'][1] <= q20_w[1] - 5]

# Option number spans (1., 2., 3., 4.)
opt_spans = [s for s in spans if s['text'].strip() in ['1.', '2.', '3.', '4.']]
opt_spans.sort(key=lambda s: s['bbox'][1])

# Also find all image icons in Q19
icons = [img for img in page.get_image_info() if img['bbox'][0] < 90 and q19_w[1] - 5 <= img['bbox'][1] <= q20_w[1] - 5]

# 1. Redact the entire left column (x from 25 to 90) covering Ans, icons, and colored numbers
if opt_spans:
    top_y = min(s['bbox'][1] for s in opt_spans) - 5
    bottom_y = max(s['bbox'][3] for s in opt_spans) + 5
    left_rect = pymupdf.Rect(25, top_y, 90, bottom_y)
    page.add_redact_annot(left_rect, fill=(1, 1, 1))
    page.apply_redactions()

    # 2. Draw neutral black numbers at each option's y position
    for idx, s in enumerate(opt_spans):
        # Insert clean neutral text "1.", "2.", "3.", "4." at x=78
        y_pos = s['bbox'][3] - 2
        page.insert_text((75, y_pos), f"{idx + 1}.", fontname="helv", fontsize=10, color=(0.15, 0.15, 0.15))

# Crop and save
crop_rect = pymupdf.Rect(20, q19_w[1] - 10, page.rect.width - 20, q20_w[1] - 8)
mat = pymupdf.Matrix(2.0, 2.0)
pix = page.get_pixmap(matrix=mat, clip=crop_rect)

test_out = r'C:\Users\rkuma\.gemini\antigravity\scratch\rrb-technician-cbt\cards\test_clean_q19_perfect.png'
pix.save(test_out)
print(f"Saved perfect clean card to {test_out}")
