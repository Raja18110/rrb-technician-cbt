import pymupdf
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

master_pdf = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
doc = pymupdf.open(master_pdf)
page = doc[3] # Page 4

# Find all answer icons (cross is 9x7 or 31x21, checkmark is 6x6 or 16x16)
icons = [
    img for img in page.get_image_info()
    if 54 <= img['bbox'][0] <= 70 and 70 <= img['bbox'][2] <= 80 and img['height'] <= 25
]

print(f"Found {len(icons)} answer icons on page 4:")
for ic in icons:
    print(f"  y0={ic['bbox'][1]:.1f}, w={ic['width']}, h={ic['height']}")

# Draw white rects over all answer icons with generous padding
for ic in icons:
    b = ic['bbox']
    page.draw_rect(pymupdf.Rect(b[0] - 6, b[1] - 4, b[2] + 6, b[3] + 4), color=(1, 1, 1), fill=(1, 1, 1))

# Crop Q19
crop_rect = pymupdf.Rect(20, 268, page.rect.width - 20, 385)
mat = pymupdf.Matrix(2.0, 2.0)
pix = page.get_pixmap(matrix=mat, clip=crop_rect)
pix.save("test_clean_q19.png")
print("Saved clean Q19 card image to test_clean_q19.png!")
