import pymupdf
import json
import os
import re
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

MASTER_PDF = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
PROJECT_DIR = r'C:\Users\rkuma\.gemini\antigravity\scratch\rrb-technician-cbt'
CARDS_DIR = os.path.join(PROJECT_DIR, 'cards')
DATA_DIR = os.path.join(PROJECT_DIR, 'data')

os.makedirs(CARDS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

SHIFTS_PART_4 = [
    {
        "id": 28,
        "title": "RRB Tech III - 29 Dec 2024 Shift 2",
        "datetime": "29 Dec 2024 (12:45 PM - 2:15 PM)",
        "start_page": 323,
        "end_page": 340,
        "series": "CEN 02/2024"
    },
    {
        "id": 29,
        "title": "RRB Tech III - 29 Dec 2024 Shift 3",
        "datetime": "29 Dec 2024 (4:30 PM - 6:00 PM)",
        "start_page": 341,
        "end_page": 358,
        "series": "CEN 02/2024"
    },
    {
        "id": 30,
        "title": "RRB Tech III - 30 Dec 2024 Shift 1",
        "datetime": "30 Dec 2024 (9:00 AM - 10:30 AM)",
        "start_page": 359,
        "end_page": 375,
        "series": "CEN 02/2024"
    },
    {
        "id": 31,
        "title": "RRB Tech III - 30 Dec 2024 Shift 2",
        "datetime": "30 Dec 2024 (12:45 PM - 2:15 PM)",
        "start_page": 376,
        "end_page": 393,
        "series": "CEN 02/2024"
    },
    {
        "id": 32,
        "title": "RRB Tech III - 30 Dec 2024 Shift 3",
        "datetime": "30 Dec 2024 (4:30 PM - 6:00 PM)",
        "start_page": 394,
        "end_page": 411,
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
    
    print(f"Ingesting Set {set_id}: {shift_info['title']} (Pages {start_p + 1} to {end_p + 1})...")
    
    questions = []
    
    for pno in range(start_p, end_p + 1):
        page = doc[pno]
        words = page.get_text("words")
        
        q_markers = []
        for w in words:
            m = re.match(r'^Q\.(\d+)$', w[4])
            if m:
                qnum = int(m.group(1))
                q_markers.append((qnum, w[1], w[3]))
                
        q_markers.sort(key=lambda x: x[1])
        
        icons = [img for img in page.get_image_info() if (img['width'] == 16 and img['height'] == 16) or (img['width'] == 31 and img['height'] == 21)]
        icons.sort(key=lambda img: img['bbox'][1])
        
        page_height = page.rect.height
        page_width = page.rect.width
        
        for i, (qnum, y0, y1) in enumerate(q_markers):
            top_y = max(0, y0 - 10)
            if i + 1 < len(q_markers):
                bottom_y = q_markers[i + 1][1] - 8
            else:
                bottom_y = min(page_height - 35, page_height)
                
            crop_rect = pymupdf.Rect(20, top_y, page_width - 20, bottom_y)
            
            card_filename = f"cards/set{set_id}_q{qnum}.png"
            card_path = os.path.join(PROJECT_DIR, card_filename)
            
            mat = pymupdf.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat, clip=crop_rect)
            pix.save(card_path)
            
            q_icons = [img for img in icons if top_y <= img['bbox'][1] <= bottom_y + 10]
            
            correct_opt = "A"
            for opt_idx, icon in enumerate(q_icons):
                if icon['width'] == 16 and icon['height'] == 16:
                    correct_opt = ["A", "B", "C", "D"][opt_idx] if opt_idx < 4 else "A"
                    break
                    
            q_text_region = page.get_text("text", clip=crop_rect)
            lines = [l.strip() for l in q_text_region.splitlines() if l.strip()]
            clean_q_lines = [l for l in lines if not any(k in l for k in ["WWW.ALLEXAMREVIEW.COM", "Section : RRB", "2024/"])]
            full_text = " ".join(clean_q_lines)
            
            m_stmt = re.search(r'Q\.\d+\s+(.*?)(?:Ans|\n|$)', full_text)
            q_stmt = m_stmt.group(1).strip() if m_stmt else f"Question {qnum}"
            has_diagram = len(page.get_images()) > 8
            
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
            
    questions.sort(key=lambda x: x["id"])
    print(f"  Set {set_id} completed with {len(questions)} questions.")
    
    json_path = os.path.join(DATA_DIR, f"set{set_id}.json")
    js_path = os.path.join(DATA_DIR, f"set{set_id}.js")
    
    with open(json_path, 'w', encoding='utf-8') as f:
        json.dump(questions, f, indent=2, ensure_ascii=False)
        
    with open(js_path, 'w', encoding='utf-8') as f:
        f.write(f"window.SET_{set_id}_DATA = {json.dumps(questions, indent=2, ensure_ascii=False)};\n")
        
    return len(questions)

def main():
    print(f"Opening {MASTER_PDF} to process Sets 28 to 32 (Part 4)...")
    doc = pymupdf.open(MASTER_PDF)
    
    total_q = 0
    for s in SHIFTS_PART_4:
        count = process_shift(doc, s)
        total_q += count
        
    print(f"\nSuccessfully processed all {len(SHIFTS_PART_4)} shifts ({total_q} total questions)!")

if __name__ == '__main__':
    main()
