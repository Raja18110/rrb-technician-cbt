import pymupdf

full_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
p1_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789971032412.pdf'
p2_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789984601001.pdf'
p3_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789984914382.pdf'

doc_full = pymupdf.open(full_path)
doc_p1 = pymupdf.open(p1_path)
doc_p2 = pymupdf.open(p2_path)
doc_p3 = pymupdf.open(p3_path)

print(f"Full PDF pages: {len(doc_full)}")
print(f"Part 1 pages: {len(doc_p1)}")
print(f"Part 2 pages: {len(doc_p2)}")
print(f"Part 3 pages: {len(doc_p3)}")

# Check text equality between full PDF page 109 and Part 2 page 1
print("Part 2 Page 1 text[:100]:", repr(doc_p2[0].get_text("text")[:100]))
print("Full PDF Page 111 text[:100]:", repr(doc_full[110].get_text("text")[:100]))
print("Are they identical?", doc_p2[0].get_text("text")[:100] == doc_full[110].get_text("text")[:100])
