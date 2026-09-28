import pymupdf
from PIL import Image, ImageDraw
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

master_pdf = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
doc = pymupdf.open(master_pdf)

# Let's test on page 0 (Q1 to Q4) and page 3 (Q18 to Q22)
for test_page_idx in [0, 3]:
    page = doc[test_page_idx]
    
    # 1. Identify all answer icons on the page
    # In this PDF: answer icons have 50 <= x0 <= 75 and 68 <= x1 <= 80 and height <= 30
    icons = [
        img for img in page.get_image_info()
        if 50 <= img['bbox'][0] <= 75 and 68 <= img['bbox'][2] <= 82 and img['height'] <= 30
    ]
    
    # Draw white rectangles over all answer icons on the PDF page
    for ic in icons:
        b = ic['bbox']
        page.draw_rect(pymupdf.Rect(b[0] - 6, b[1] - 4, b[2] + 6, b[3] + 4), color=(1, 1, 1), fill=(1, 1, 1), overlay=True)

    # Render full page pixmap at 2x
    mat = pymupdf.Matrix(2.0, 2.0)
    pix = page.get_pixmap(matrix=mat)
    
    # Convert to PIL
    im = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
    draw = ImageDraw.Draw(im)
    
    # 2. In PIL, also wipe the icon column across the y-positions of all icons with pure white
    # At 2x: x in points (54 to 80) -> x in pixels (108 to 160)
    for ic in icons:
        b = ic['bbox']
        y0_px = int(b[1] * 2) - 4
        y1_px = int(b[3] * 2) + 4
        draw.rectangle([100, y0_px, 165, y1_px], fill=(255, 255, 255))
        
    im.save(f"test_clean_page_{test_page_idx}.png")
    print(f"Page {test_page_idx}: Processed {len(icons)} icons and saved test_clean_page_{test_page_idx}.png")

    # Verify no green or red pixels in the icon column (x between 100 and 165)
    green = sum(1 for x in range(100, 165) for y in range(im.size[1]) if im.getpixel((x,y))[1] > 140 and im.getpixel((x,y))[0] < 110)
    red = sum(1 for x in range(100, 165) for y in range(im.size[1]) if im.getpixel((x,y))[0] > 170 and im.getpixel((x,y))[1] < 90 and im.getpixel((x,y))[2] < 90)
    print(f"  Color check: Green={green}, Red={red}")
