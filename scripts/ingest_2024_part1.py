import pymupdf
import json
import os
import re
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

PDF_PATH = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789971032412.pdf'
PROJECT_DIR = r'C:\Users\rkuma\.gemini\antigravity\scratch\rrb-technician-cbt'
CARDS_DIR = os.path.join(PROJECT_DIR, 'cards')
DATA_DIR = os.path.join(PROJECT_DIR, 'data')

os.makedirs(CARDS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

# Define the 6 complete shifts in Part 1
SHIFTS_CONFIG = [
    {
        "id": 10,
        "title": "RRB Tech III - 20 Dec 2024 Shift 2",
        "datetime": "20 Dec 2024 (12:45 PM - 2:15 PM)",
        "start_page": 1,
        "end_page": 18,
        "series": "CEN 02/2024"
    },
    {
        "id": 11,
        "title": "RRB Tech III - 20 Dec 2024 Shift 3",
        "datetime": "20 Dec 2024 (4:30 PM - 6:00 PM)",
        "start_page": 19,
        "end_page": 36,
        "series": "CEN 02/2024"
    },
    {
        "id": 12,
        "title": "RRB Tech III - 23 Dec 2024 Shift 1",
        "datetime": "23 Dec 2024 (9:00 AM - 10:30 AM)",
        "start_page": 37,
        "end_page": 54,
        "series": "CEN 02/2024"
    },
    {
        "id": 13,
        "title": "RRB Tech III - 23 Dec 2024 Shift 2",
        "datetime": "23 Dec 2024 (12:45 PM - 2:15 PM)",
        "start_page": 55,
        "end_page": 72,
        "series": "CEN 02/2024"
    },
    {
        "id": 14,
        "title": "RRB Tech III - 23 Dec 2024 Shift 3",
        "datetime": "23 Dec 2024 (4:30 PM - 6:00 PM)",
        "start_page": 73,
        "end_page": 90,
        "series": "CEN 02/2024"
    },
    {
        "id": 15,
        "title": "RRB Tech III - 24 Dec 2024 Shift 1",
        "datetime": "24 Dec 2024 (9:00 AM - 10:30 AM)",
        "start_page": 91,
        "end_page": 108,
        "series": "CEN 02/2024"
    }
]

def get_section(qnum):
    if 1 <= qnum <= 40:
        return "General Science"
    elif 41 <= qnum <= 65:
        return "Mathematics"
    elif 66 <= qnum <= 90:
        return "General Intelligence & Reasoning"
    else:
        return "General Awareness"

def process_shift(doc, shift_info):
    set_id = shift_info["id"]
    start_p = shift_info["start_page"] - 1
    end_p = shift_info["end_page"] - 1
    
    print(f"\n⚡ Ingesting Set {set_id}: {shift_info['title']} (Pages {start_p + 1} to {end_p + 1})...")
    
    questions = []
    
    for pno in range(start_p, end_p + 1):
        page = doc[pno]
        words = page.get_text("words")
        
        # Find all question headers on this page
        # Note: on page 1 of each shift, there's header metadata above Q1
        q_markers = []
        for w in words:
            m = re.match(r'^Q\.(\d+)$', w[4])
            if m:
                qnum = int(m.group(1))
                q_markers.append((qnum, w[1], w[3])) # (qnum, y0, y1)
                
        # Sort by vertical position
        q_markers.sort(key=lambda x: x[1])
        
        # Get all option icons on page (width 16/16 = checkmark, width 31/21 = cross)
        icons = [img for img in page.get_image_info() if (img['width'] == 16 and img['height'] == 16) or (img['width'] == 31 and img['height'] == 21)]
        icons.sort(key=lambda img: img['bbox'][1])
        
        page_height = page.rect.height
        page_width = page.rect.width
        
        for i, (qnum, y0, y1) in enumerate(q_markers):
            # Determine crop rectangle
            # Top of question card
            top_y = max(0, y0 - 10)
            # Bottom of question card
            if i + 1 < len(q_markers):
                bottom_y = q_markers[i + 1][1] - 8
            else:
                # Last question on page: stops before footer timestamp line or bottom margin
                bottom_y = min(page_height - 35, page_height)
                
            crop_rect = pymupdf.Rect(20, top_y, page_width - 20, bottom_y)
            
            # Save question card image at 2x resolution
            card_filename = f"cards/set{set_id}_q{qnum}.png"
            card_path = os.path.join(PROJECT_DIR, card_filename)
            
            mat = pymupdf.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat, clip=crop_rect)
            pix.save(card_path)
            
            # Find correct option among icons within [top_y, bottom_y]
            q_icons = [img for img in icons if top_y <= img['bbox'][1] <= bottom_y + 10]
            
            correct_opt = "A" # fallback
            for opt_idx, icon in enumerate(q_icons):
                if icon['width'] == 16 and icon['height'] == 16:
                    correct_opt = ["A", "B", "C", "D"][opt_idx] if opt_idx < 4 else "A"
                    break
                    
            # Extract question text in this region
            q_text_region = page.get_text("text", clip=crop_rect)
            lines = [l.strip() for l in q_text_region.splitlines() if l.strip()]
            
            # Clean lines
            clean_q_lines = []
            for l in lines:
                if "WWW.ALLEXAMREVIEW.COM" in l or "Section : RRB" in l or "2024/" in l:
                    continue
                clean_q_lines.append(l)
                
            full_text = " ".join(clean_q_lines)
            
            # Extract question statement
            q_stmt = ""
            m_stmt = re.search(r'Q\.\d+\s+(.*?)(?:Ans|\n|$)', full_text)
            if m_stmt:
                q_stmt = m_stmt.group(1).strip()
            else:
                q_stmt = f"Question {qnum}"
                
            # Check for diagram
            has_diagram = len(page.get_images()) > 8 # high image count signifies diagrams
            
            questions.append({
                "id": qnum,
                "section": get_section(qnum),
                "question": q_stmt,
                "options": {
                    "A": "Option 1 (See Question Card)",
                    "B": "Option 2 (See Question Card)",
                    "C": "Option 3 (See Question Card)",
                    "D": "Option 4 (See Question Card)"
                },
                "correct": correct_opt,
                "has_diagram": has_diagram,
                "diagram_img": None,
                "card_img": card_filename
            })
            
    # Sort by question ID
    questions.sort(key=lambda x: x["id"])
    print(f"  ✅ Set {set_id} completed with {len(questions)} questions.")
    
    # Save JSON and JS
    json_path = os.path.join(DATA_DIR, f"set{set_id}.json")
    js_path = os.path.join(DATA_DIR, f"set{set_id}.js")
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
        
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(f"window.SET_{set_id}_DATA = {json.dumps(questions, indent=2, ensure_ascii=False)};\n")
        
    return len(questions)

def main():
    print(f"📖 Opening {PDF_PATH}...")
    doc = pymupdf.open(PDF_PATH)
    
    total_q = 0
    for s in SHIFTS_CONFIG:
        count = process_shift(doc, s)
        total_q += count
        
    print(f"\n🎉 Successfully processed all {len(SHIFTS_CONFIG)} shifts ({total_q} total questions)!")

if __name__ == '__main__':
    main()
