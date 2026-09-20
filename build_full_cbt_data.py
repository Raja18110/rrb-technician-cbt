import sys, os, pymupdf, json, re

sys.stdout.reconfigure(encoding="utf-8")

output_dir = os.path.dirname(os.path.abspath(__file__))
pdf_path = os.environ.get("CBT_PDF_PATH", os.path.join(output_dir, "rrb_exam_papers.pdf"))
if not os.path.exists(pdf_path):
    # Safe fallback if source extraction PDF is not present
    doc = None
else:
    doc = pymupdf.open(pdf_path)

cards_dir = os.path.join(output_dir, "cards")
os.makedirs(cards_dir, exist_ok=True)
data_dir = os.path.join(output_dir, "data")
os.makedirs(data_dir, exist_ok=True)

sets_info = [
    (1, "RRB Tech III - 06 Mar 2026 Shift 1", "06 Mar 2026 (9:00 AM - 10:30 AM)", 2, 14),
    (2, "RRB Tech III - 06 Mar 2026 Shift 2", "06 Mar 2026 (12:45 PM - 2:15 PM)", 15, 28),
    (3, "RRB Tech III - 06 Mar 2026 Shift 3", "06 Mar 2026 (4:30 PM - 6:00 PM)", 29, 41),
    (4, "RRB Tech III - 09 Mar 2026 Shift 1", "09 Mar 2026 (9:00 AM - 10:30 AM)", 42, 54),
    (5, "RRB Tech III - 09 Mar 2026 Shift 2", "09 Mar 2026 (12:45 PM - 2:15 PM)", 55, 67),
    (6, "RRB Tech III - 09 Mar 2026 Shift 3", "09 Mar 2026 (4:30 PM - 6:00 PM)", 68, 80),
    (7, "RRB Tech III - 10 Mar 2026 Shift 1", "10 Mar 2026 (9:00 AM - 10:30 AM)", 81, 93),
    (8, "RRB Tech III - 10 Mar 2026 Shift 2", "10 Mar 2026 (12:45 PM - 2:15 PM)", 94, 106),
    (9, "RRB Tech III - 10 Mar 2026 Shift 3", "10 Mar 2026 (4:30 PM - 6:00 PM)", 107, 119),
]

def sort_key(r):
    if r.width > 400:
        return (0, r.y0)
    col = 0 if r.x0 < 300 else 1
    return (col, r.y0)

def parse_box_content(txt):
    lines = [l.strip() for l in txt.split("\n") if l.strip()]
    if not lines:
        return None
    
    m = re.match(r"^Q(\d+)\s+(.+)", lines[0])
    if not m:
        return None
    
    qnum = int(m.group(1))
    sec = m.group(2).strip()
    body_lines = lines[1:]
    
    opt_indices = []
    opt_letters = ["A", "B", "C", "D"]
    for idx, l in enumerate(body_lines):
        for ol in opt_letters:
            # Match strictly "A." or standalone "A"
            if re.match(rf"^{ol}\.(?:\s+|$)", l) or l == ol:
                opt_indices.append((idx, ol))
                break
    
    options = {"A": "", "B": "", "C": "", "D": ""}
    correct = None
    q_text = ""
    
    # Check for correct answer checkmark
    for idx, l in enumerate(body_lines):
        if "✓" in l:
            # check which option was nearest preceding
            for ol in reversed(opt_indices):
                if ol[0] <= idx:
                    correct = ol[1]
                    break
    
    if len(opt_indices) >= 4:
        opt_indices = sorted(opt_indices, key=lambda x: x[0])
        first_opt_idx = opt_indices[0][0]
        q_text = " ".join(body_lines[:first_opt_idx])
        
        for i in range(len(opt_indices)):
            cur_idx, cur_opt = opt_indices[i]
            next_idx = opt_indices[i+1][0] if i+1 < len(opt_indices) else len(body_lines)
            opt_chunk = " ".join(body_lines[cur_idx:next_idx])
            
            if "✓" in opt_chunk:
                correct = cur_opt
                opt_chunk = opt_chunk.replace("✓", "").strip()
            
            clean_opt = re.sub(rf"^{cur_opt}\.?", "", opt_chunk).strip()
            options[cur_opt] = clean_opt
    else:
        # Fallback: if options cannot be split
        q_text = " ".join(body_lines).replace("✓", "").strip()
        
    return qnum, sec, q_text, options, correct

sets_meta = []

for s_num, s_title, s_datetime, p_start, p_end in sets_info:
    set_questions = []
    for pno in range(p_start, p_end + 1):
        page = doc[pno]
        drawings = page.get_drawings()
        qboxes = [d["rect"] for d in drawings if 200 < d["rect"].width < 560 and 40 < d["rect"].height < 750]
        qboxes = sorted(qboxes, key=sort_key)
        
        for box in qboxes:
            txt = page.get_text("text", clip=box).strip()
            parsed = parse_box_content(txt)
            if not parsed:
                continue
            
            qnum, sec, q_text, options, correct = parsed
            card_rel_path = f"cards/set{s_num}_q{qnum}.png"
            card_full_path = os.path.join(output_dir, card_rel_path)
            
            if not os.path.exists(card_full_path):
                pix = page.get_pixmap(clip=box, dpi=130)
                pix.save(card_full_path)
                
            has_diagram = False
            diag_rel_path = ""
            for img_info in page.get_images(full=True):
                xref = img_info[0]
                img_rects = page.get_image_rects(xref)
                for ir in img_rects:
                    if box.contains(ir):
                        has_diagram = True
                        diag_name = f"diag_s{s_num}_q{qnum}_{xref}.png"
                        diag_rel_path = f"cards/{diag_name}"
                        diag_full_path = os.path.join(output_dir, diag_rel_path)
                        if not os.path.exists(diag_full_path):
                            dpix = page.get_pixmap(clip=ir, dpi=150)
                            dpix.save(diag_full_path)
                        break
                if has_diagram:
                    break
                    
            set_questions.append({
                "id": qnum,
                "section": sec,
                "question": q_text,
                "options": options,
                "correct": correct,
                "has_diagram": has_diagram,
                "diagram_img": diag_rel_path if has_diagram else None,
                "card_img": card_rel_path
            })
            
    set_questions = sorted(set_questions, key=lambda x: x["id"])
    
    # Save set JSON and JS
    set_file = os.path.join(data_dir, f"set{s_num}.json")
    with open(set_file, "w", encoding="utf-8") as f:
        json.dump(set_questions, f, ensure_ascii=False, indent=2)
        
    set_js_file = os.path.join(data_dir, f"set{s_num}.js")
    with open(set_js_file, "w", encoding="utf-8") as f:
        f.write(f"window.SET_{s_num}_DATA = " + json.dumps(set_questions, ensure_ascii=False, indent=2) + ";\n")
        
    sets_meta.append({
        "id": s_num,
        "title": s_title,
        "datetime": s_datetime,
        "total_questions": len(set_questions),
        "total_marks": 100,
        "duration_minutes": 90,
        "negative_marking": 0.3333,
        "sections": [
            {"name": "General Science", "count": 40, "marks": 40},
            {"name": "Mathematics", "count": 25, "marks": 25},
            {"name": "General Intelligence & Reasoning", "count": 25, "marks": 25},
            {"name": "General Awareness", "count": 10, "marks": 10}
        ]
    })
    print(f"Set {s_num} generated with {len(set_questions)} questions.")

meta_js_file = os.path.join(data_dir, "sets_meta.js")
with open(meta_js_file, "w", encoding="utf-8") as f:
    f.write("window.SETS_METADATA = " + json.dumps(sets_meta, ensure_ascii=False, indent=2) + ";\n")

print("All 9 sets updated!")
