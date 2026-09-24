import pymupdf

pdf_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789971032412.pdf'
doc = pymupdf.open(pdf_path)
page = doc[0] # Page 1

img_list = page.get_images()
print(f"Total images on page 1: {len(img_list)}")
for img in img_list[:10]:
    xref = img[0]
    base_img = doc.extract_image(xref)
    print(f"  xref: {xref}, width: {base_img['width']}, height: {base_img['height']}, format: {base_img['ext']}")

# Also let's find the rect locations of images on page 1
for img_info in page.get_image_info():
    print(f"  img bbox: {img_info['bbox']}, xref: {img_info['xref']}")
