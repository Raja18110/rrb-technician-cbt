import pymupdf
import re

pdf_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789971032412.pdf'
doc = pymupdf.open(pdf_path)

shift_pages = [1, 19, 37, 55, 73, 91, 109]

for idx, pno in enumerate(shift_pages):
    page = doc[pno - 1]
    text = page.get_text("text")
    
    # Extract date & time
    date_match = re.search(r'(\d{2}/\d{2}/\d{4})', text)
    time_match = re.search(r'(\d{1,2}:\d{2}\s*(?:AM|PM)\s*-\s*\d{1,2}:\d{2}\s*(?:AM|PM))', text)
    
    date_str = date_match.group(1) if date_match else "Unknown Date"
    time_str = time_match.group(1) if time_match else "Unknown Time"
    
    next_pno = shift_pages[idx + 1] if idx + 1 < len(shift_pages) else len(doc) + 1
    page_count = next_pno - pno
    
    # Count questions in this range
    q_nums = set()
    for p in range(pno - 1, next_pno - 1):
        p_text = doc[p].get_text("text")
        found = re.findall(r'Q\.(\d+)', p_text)
        for f in found:
            q_nums.add(int(f))
            
    print(f"Shift {idx + 1} (Pages {pno} to {next_pno - 1}, {page_count} pages):")
    print(f"  Date: {date_str}, Time: {time_str}")
    print(f"  Questions found: {len(q_nums)} (Min: {min(q_nums) if q_nums else 0}, Max: {max(q_nums) if q_nums else 0})")
