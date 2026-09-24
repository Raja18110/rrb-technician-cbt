import pymupdf
import os

pdf_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789971032412.pdf'
doc = pymupdf.open(pdf_path)
page = doc[0]

# Question words
words = page.get_text("words")
q_words = sorted([w for w in words if w[4].startswith("Q.")], key=lambda w: w[1])

print(f"Questions on page 1: {[w[4] for w in q_words]}")

# Check option icons for Q1 to Q4
all_icons = [img for img in page.get_image_info() if (img['width'] == 16 and img['height'] == 16) or (img['width'] == 31 and img['height'] == 21)]
all_icons.sort(key=lambda img: img['bbox'][1])

for idx, qw in enumerate(q_words):
    qnum_str = qw[4].replace("Q.", "")
    y_start = qw[1] - 8
    y_end = q_words[idx + 1][1] - 8 if idx + 1 < len(q_words) else 800
    
    # icons in this range
    q_icons = [img for img in all_icons if y_start <= img['bbox'][1] <= y_end]
    correct_opt = None
    for opt_idx, icon in enumerate(q_icons):
        if icon['width'] == 16 and icon['height'] == 16:
            correct_opt = ["A", "B", "C", "D"][opt_idx] if opt_idx < 4 else f"Opt{opt_idx+1}"
            
    print(f"  Q{qnum_str} (y={y_start:.1f} to {y_end:.1f}): {len(q_icons)} options found, correct: {correct_opt}")
