import pymupdf
import re
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

pdf_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
doc = pymupdf.open(pdf_path)

total_pages = len(doc)
print(f"Total pages: {total_pages}")

# Let's count how many pages have question text
questions_with_text = 0
questions_with_blank_text = 0

for pno in range(total_pages):
    text = doc[pno].get_text("text")
    blocks = [b.strip() for b in text.split("Q.") if b.strip()]
    for b in blocks:
        # Check if there is text between Q.N and Ans
        lines = [l.strip() for l in b.splitlines() if l.strip()]
        if len(lines) > 0 and lines[0][0].isdigit():
            # This is a question block
            has_ans = any(l.startswith("Ans") for l in lines)
            if has_ans:
                ans_idx = next(i for i, l in enumerate(lines) if l.startswith("Ans"))
                q_text = " ".join(lines[1:ans_idx])
                if len(q_text) > 3:
                    questions_with_text += 1
                else:
                    questions_with_blank_text += 1

print(f"Questions with extractable text: {questions_with_text}")
print(f"Questions with blank/rasterized text: {questions_with_blank_text}")
