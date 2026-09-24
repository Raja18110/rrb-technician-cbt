import pymupdf

pdf_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789971032412.pdf'
doc = pymupdf.open(pdf_path)

page = doc[0] # Page 1
rects = page.get_drawings()
# Find questions by looking for "Q." text
words = page.get_text("words") # (x0, y0, x1, y1, word, block_no, line_no, word_no)
q_words = [w for w in words if w[4].startswith("Q.")]

print("Questions on page 1:")
for w in q_words:
    print(f"  {w[4]} at y0={w[1]:.1f}")

# Find green checkmark images (width=16, height=16 or has-mask)
check_images = [img for img in page.get_image_info() if img['width'] == 16 and img['height'] == 16]
print(f"Found {len(check_images)} checkmark images on page 1:")
for c in check_images:
    print(f"  Checkmark at y0={c['bbox'][1]:.1f}")
