import pymupdf

pdf1_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789728414898.pdf'
doc = pymupdf.open(pdf1_path)
page = doc[0] # Page 1

print("Text on page 1 of 2025 PDF:")
print(page.get_text("text")[:500])

print("\nImages on page 1 of 2025 PDF:")
print(page.get_image_info()[:5])
