import pymupdf

pdf_path = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789971032412.pdf'
doc = pymupdf.open(pdf_path)
print(f"Total Pages in media_1789971032412.pdf: {len(doc)}")

shifts = []
for pno in range(len(doc)):
    page = doc[pno]
    text = page.get_text("text")
    if "Test Date" in text or "CEN RRB - 02/2024" in text:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        date_line = next((l for l in lines if "Test Date" in l or ("2024" in l and "/" in l)), "")
        time_line = next((l for l in lines if "Test Time" in l or ("AM" in l or "PM" in l)), "")
        shifts.append((pno + 1, date_line, time_line))

print(f"Found {len(shifts)} shift headers:")
for s in shifts:
    print(f"  Page {s[0]}: {s[1]} | {s[2]}")
