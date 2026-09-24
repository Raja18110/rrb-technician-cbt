import pymupdf

pdf_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
doc = pymupdf.open(pdf_path)
page = doc[3] # Page 4

# Find all option icons (green checkmark 16x16, red cross 31x21)
icons = [img for img in page.get_image_info() if (img['width'] == 16 and img['height'] == 16) or (img['width'] == 31 and img['height'] == 21)]
print(f"Found {len(icons)} answer icons on page 4.")

# Redact them
for icon in icons:
    # Slightly expand bbox by 1px to ensure clean edge
    rect = pymupdf.Rect(icon['bbox']) + (-1, -1, 1, 1)
    page.add_redact_annot(rect, fill=(1, 1, 1))

page.apply_redactions()

# Now find Q19 and render it
words = page.get_text("words")
q19_w = [w for w in words if w[4] == "Q.19"][0]
q20_w = [w for w in words if w[4] == "Q.20"][0]

crop_rect = pymupdf.Rect(20, q19_w[1] - 10, page.rect.width - 20, q20_w[1] - 8)
mat = pymupdf.Matrix(2.0, 2.0)
pix = page.get_pixmap(matrix=mat, clip=crop_rect)

test_out = r'C:\Users\rkuma\.gemini\antigravity\scratch\rrb-technician-cbt\cards\test_clean_q19.png'
pix.save(test_out)
print(f"Saved clean card to {test_out}")
