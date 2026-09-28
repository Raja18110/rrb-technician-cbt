import pymupdf
from PIL import Image, ImageDraw, ImageFont
import os
import re
import json
import sqlite3
import time
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

PROJECT_DIR = r'C:\Users\rkuma\.gemini\antigravity\scratch\rrb-technician-cbt'
DB_PATH = os.path.join(PROJECT_DIR, 'backend', 'db', 'cbt_platform.sqlite')
CARDS_DIR = os.path.join(PROJECT_DIR, 'cards')
STEMS_DIR = os.path.join(CARDS_DIR, 'stems')
OPTS_DIR = os.path.join(CARDS_DIR, 'options')
DATA_DIR = os.path.join(PROJECT_DIR, 'data')

os.makedirs(CARDS_DIR, exist_ok=True)
os.makedirs(STEMS_DIR, exist_ok=True)
os.makedirs(OPTS_DIR, exist_ok=True)
os.makedirs(DATA_DIR, exist_ok=True)

PDF_PARTS = [
    r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789971032412.pdf',
    r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789984601001.pdf',
    r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789984914382.pdf',
    r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1790061764048.pdf'
]

SHIFTS_CONFIG = [
    {"id": 10, "start_page": 1, "end_page": 18},
    {"id": 11, "start_page": 19, "end_page": 36},
    {"id": 12, "start_page": 37, "end_page": 54},
    {"id": 13, "start_page": 55, "end_page": 72},
    {"id": 14, "start_page": 73, "end_page": 90},
    {"id": 15, "start_page": 91, "end_page": 108},
    {"id": 16, "start_page": 109, "end_page": 127},
    {"id": 17, "start_page": 128, "end_page": 145},
    {"id": 18, "start_page": 146, "end_page": 163},
    {"id": 19, "start_page": 164, "end_page": 182},
    {"id": 20, "start_page": 183, "end_page": 199},
    {"id": 21, "start_page": 200, "end_page": 217},
    {"id": 22, "start_page": 218, "end_page": 235},
    {"id": 23, "start_page": 236, "end_page": 252},
    {"id": 24, "start_page": 253, "end_page": 270},
    {"id": 25, "start_page": 271, "end_page": 287},
    {"id": 26, "start_page": 288, "end_page": 304},
    {"id": 27, "start_page": 305, "end_page": 322},
    {"id": 28, "start_page": 323, "end_page": 340},
    {"id": 29, "start_page": 341, "end_page": 358},
    {"id": 30, "start_page": 359, "end_page": 375},
    {"id": 31, "start_page": 376, "end_page": 393},
    {"id": 32, "start_page": 394, "end_page": 411}
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

def build_all_2024_cbt():
    start_all = time.time()
    print("1. Assembling master PDF from the 4 official crisp 2024 parts...")
    master_doc = pymupdf.open()
    for idx, path in enumerate(PDF_PARTS, 1):
        print(f"   Loading Part {idx}: {os.path.basename(path)}...")
        p_doc = pymupdf.open(path)
        master_doc.insert_pdf(p_doc)
    print(f"   ✓ Master document combined: {len(master_doc)} pages.")

    print("\n2. Eliminating watermark streams across all 411 pages...")
    wm_count = 0
    for xref in range(1, master_doc.xref_length()):
        try:
            obj = master_doc.xref_object(xref)
            if '/Watermark' in obj and '/Subtype /Form' in obj:
                master_doc.update_stream(xref, b'')
                wm_count += 1
        except Exception:
            pass
    print(f"   ✓ Cleared {wm_count} watermark Form XObjects.")

    # Connect to SQLite
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()

    mat = pymupdf.Matrix(2.0, 2.0)
    total_questions = 0

    print("\n3. Processing all 23 shifts (Sets 10 to 32)...")
    for shift in SHIFTS_CONFIG:
        s_id = shift["id"]
        start_p = shift["start_page"] - 1
        end_p = shift["end_page"] - 1
        s_time = time.time()
        print(f"\nProcessing Shift {s_id} (Pages {start_p + 1} to {end_p + 1})...")

        shift_questions = []

        for pno in range(start_p, end_p + 1):
            page = master_doc[pno]
            words = page.get_text("words")

            q_words = [w for w in words if re.match(r'^Q\.(\d+)$', w[4])]
            q_words.sort(key=lambda w: w[1])

            ans_words = [w for w in words if w[4] == 'Ans']
            ans_words.sort(key=lambda w: w[1])

            opt_words = [w for w in words if w[4] in ['1.', '2.', '3.', '4.'] and 70 <= w[0] <= 90]
            opt_words.sort(key=lambda w: w[1])

            # Checkmark / cross icons (x: 50 to 82, tick is width 16, height 16)
            icons = [
                img for img in page.get_image_info()
                if 50 <= img['bbox'][0] <= 82 and 65 <= img['bbox'][2] <= 85 and img['height'] <= 35
            ]

            for i, qw in enumerate(q_words):
                qnum = int(re.match(r'^Q\.(\d+)$', qw[4]).group(1))

                # Find corresponding Ans
                aw = next((a for a in ans_words if a[1] > qw[1]), None)
                if not aw:
                    continue

                next_q_y = q_words[i + 1][1] if i + 1 < len(q_words) else page.rect.height - 30

                # 1. Clean Question Stem (Q.N to Ans)
                stem_top = max(0, qw[1] - 4)
                stem_bot = max(stem_top + 16, aw[1] - 2)
                stem_rect = pymupdf.Rect(20, stem_top, page.rect.width - 20, stem_bot)
                stem_filename = f"cards/stems/set{s_id}_q{qnum}.png"
                pix_stem = page.get_pixmap(matrix=mat, clip=stem_rect)
                pix_stem.save(os.path.join(PROJECT_DIR, stem_filename))

                # 2. Separate Options (A, B, C, D)
                q_opts = [o for o in opt_words if aw[1] < o[1] < next_q_y]
                q_icons = [img for img in icons if aw[1] - 5 <= img['bbox'][1] <= next_q_y]

                opt_images = {}
                correct_letter = "A"

                for opt_idx, ow in enumerate(q_opts):
                    opt_num = opt_idx + 1
                    letter = ["A", "B", "C", "D"][opt_idx] if opt_idx < 4 else "A"

                    # Check if this option has the tick icon
                    has_tick = any(img['width'] == 16 and abs(img['bbox'][1] - ow[1]) < 12 for img in q_icons)
                    if has_tick:
                        correct_letter = letter

                    opt_top = max(0, ow[1] - 3)
                    opt_bot = q_opts[opt_idx + 1][1] - 3 if opt_idx + 1 < len(q_opts) else next_q_y - 4
                    if opt_bot <= opt_top + 8:
                        opt_bot = opt_top + 18
                    # Crop strictly starting at x=86 to exclude tick/cross and numbers
                    opt_rect = pymupdf.Rect(86, opt_top, page.rect.width - 20, opt_bot)
                    opt_filename = f"cards/options/set{s_id}_q{qnum}_opt{opt_num}.png"
                    pix_opt = page.get_pixmap(matrix=mat, clip=opt_rect)
                    pix_opt.save(os.path.join(PROJECT_DIR, opt_filename))
                    opt_images[letter] = opt_filename

                # 3. Clean full unified card (for fallback / review full card)
                card_filename = f"cards/set{s_id}_q{qnum}.png"
                c_top = max(0, qw[1] - 6)
                c_bot = max(c_top + 30, min(page.rect.height, next_q_y - 4))
                card_rect = pymupdf.Rect(20, c_top, page.rect.width - 20, c_bot)
                pix_card = page.get_pixmap(matrix=mat, clip=card_rect)
                pix_card.save(os.path.join(PROJECT_DIR, card_filename))

                # Check text statement
                q_stmt = ""
                try:
                    txt = page.get_text("text", clip=stem_rect)
                    lines = [l.strip() for l in txt.splitlines() if l.strip() and not l.startswith("Q.")]
                    q_stmt = " ".join(lines).strip()
                except Exception:
                    q_stmt = ""

                q_data = {
                    "id": qnum,
                    "section": get_section(qnum),
                    "question": q_stmt,
                    "stem_img": stem_filename,
                    "options": {
                        "A": "Option 1",
                        "B": "Option 2",
                        "C": "Option 3",
                        "D": "Option 4"
                    },
                    "options_img": opt_images,
                    "correct": correct_letter,
                    "has_diagram": True,
                    "diagram_img": None,
                    "card_img": card_filename
                }
                shift_questions.append(q_data)
                total_questions += 1

                # Update SQLite database
                cur.execute("""
                    UPDATE questions
                    SET correct_option = ?,
                        stem_img = ?,
                        opt1_img = ?,
                        opt2_img = ?,
                        opt3_img = ?,
                        opt4_img = ?,
                        card_img = ?,
                        question_text = CASE WHEN ? != '' THEN ? ELSE question_text END
                    WHERE set_id = ? AND qnum = ?
                """, (
                    correct_letter,
                    stem_filename,
                    opt_images.get("A"),
                    opt_images.get("B"),
                    opt_images.get("C"),
                    opt_images.get("D"),
                    card_filename,
                    q_stmt,
                    q_stmt,
                    s_id,
                    qnum
                ))

        # Sort questions by id
        shift_questions.sort(key=lambda x: x["id"])

        # Save to data/set{s_id}.json and data/set{s_id}.js
        json_path = os.path.join(DATA_DIR, f"set{s_id}.json")
        js_path = os.path.join(DATA_DIR, f"set{s_id}.js")

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(shift_questions, f, indent=2, ensure_ascii=False)

        with open(js_path, "w", encoding="utf-8") as f:
            f.write(f"window.SET_{s_id}_DATA = " + json.dumps(shift_questions, indent=2, ensure_ascii=False) + ";\n")

        conn.commit()
        print(f"  ✓ Set {s_id} completed: {len(shift_questions)} questions processed in {time.time() - s_time:.2f}s")

    conn.close()
    print(f"\n🎉 ALL 23 SHIFTS (Sets 10 to 32) COMPLETED: {total_questions} questions built in {time.time() - start_all:.2f}s!")

if __name__ == "__main__":
    build_all_2024_cbt()
