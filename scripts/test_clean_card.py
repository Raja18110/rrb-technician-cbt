import pymupdf
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

master_pdf = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
doc = pymupdf.open(master_pdf)
page = doc[3] # Page 4 (contains Q18 to Q22, including Q19)

# Find all icons on this page
icons = [img for img in page.get_image_info() if (img['width'] == 16 and img['height'] == 16) or (img['width'] == 31 and img['height'] == 21)]

print(f"Found {len(icons)} tick/cross icons on page 4.")

# Draw white rectangles over all icons
for icon in icons:
    bbox = pymupdf.Rect(icon['bbox'])
    # Expand slightly to cover any borders/shadows
    clean_rect = pymupdf.Rect(bbox.x0 - 2, bbox.y0 - 2, bbox.x1 + 2, bbox.y1 + 2)
    page.draw_rect(clean_rect, color=(1, 1, 1), fill=(1, 1, 1))

# Now crop Q19 (y ~ 270 to 380)
crop_rect = pymupdf.Rect(20, 268, page.rect.width - 20, 385)
mat = pymupdf.Matrix(2.0, 2.0)
pix = page.get_pixmap(matrix=mat, clip=crop_rect)
pix.save("test_clean_q19.png")
print("Saved test_clean_q19.png successfully!")
