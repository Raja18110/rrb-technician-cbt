import pymupdf

pdf_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
doc = pymupdf.open(pdf_path)

# Let's inspect page 4 (which has Q.19)
page = doc[3] # 0-indexed page 4
print("Page 4 text:")
print(page.get_text("text"))

print("\n--- Page 4 get_text('blocks') ---")
for b in page.get_text("blocks"):
    print(b)
