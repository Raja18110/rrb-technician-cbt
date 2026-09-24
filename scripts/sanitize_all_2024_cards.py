import pymupdf
import re
import os
import sys

if sys.platform == "win32":
    sys.stdout.reconfigure(encoding='utf-8')

MASTER_PDF = r'C:\Users\rkuma\.gemini\antigravity\brain\8cc540e5-bca9-4948-b78a-484a37421685\.user_uploaded\media_1789818121525.pdf'
PROJECT_DIR = r'C:\Users\rkuma\.gemini\antigravity\scratch\rrb-technician-cbt'
CARDS_DIR = os.path.join(PROJECT_DIR, 'cards')

SHIFTS_ALL_2024 = [
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

def sanitize_and_render_shift(shift_info):
    set_id = shift_info["id"]
    start_p = shift_info["start_page"] - 1
    end_p = shift_info["end_page"] - 1
    
    print(f"Sanitizing Set {set_id} (Pages {start_p + 1} to {end_p + 1})...")
    doc = pymupdf.open(MASTER_PDF)
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
        if not q_markers:
            continue
            
        # Get dictionary of blocks/lines/spans
        d = page.get_text("dict")
        all_spans = [s for b in d['blocks'] if 'lines' in b for l in b['lines'] for s in l['spans']]
        
        # Redact each question's option indicators
        for i, (qnum, y0, y1) in enumerate(q_markers):
            if i + 1 < len(q_markers):
                bottom_y = q_markers[i + 1][1] - 8
            else:
                bottom_y = min(page.rect.height - 35, page.rect.height)
                
            # Find option numbers (1., 2., 3., 4.) in this question's vertical range
            opt_spans = [
                s for s in all_spans 
                if y0 - 5 <= s['bbox'][1] <= bottom_y + 5 
                and s['text'].strip() in ['1.', '2.', '3.', '4.']
                and s['bbox'][0] < 95
            ]
            opt_spans.sort(key=lambda s: s['bbox'][1])
            
            if opt_spans:
                opt_top = min(s['bbox'][1] for s in opt_spans) - 4
                opt_bottom = max(s['bbox'][3] for s in opt_spans) + 4
                # Redact x from 25 to 90
                left_rect = pymupdf.Rect(25, opt_top, 90, opt_bottom)
                page.add_redact_annot(left_rect, fill=(1, 1, 1))

        # Apply redactions for this page
        page.apply_redactions()
        
        # Draw clean neutral numbers "1.", "2.", "3.", "4." in black
        for i, (qnum, y0, y1) in enumerate(q_markers):
            if i + 1 < len(q_markers):
                bottom_y = q_markers[i + 1][1] - 8
            else:
                bottom_y = min(page.rect.height - 35, page.rect.height)
                
            opt_spans = [
                s for s in all_spans 
                if y0 - 5 <= s['bbox'][1] <= bottom_y + 5 
                and s['text'].strip() in ['1.', '2.', '3.', '4.']
                and s['bbox'][0] < 95
            ]
            opt_spans.sort(key=lambda s: s['bbox'][1])
            
            for idx, s in enumerate(opt_spans):
                y_pos = s['bbox'][3] - 2
                page.insert_text((75, y_pos), f"{idx + 1}.", fontname="helv", fontsize=10, color=(0.15, 0.15, 0.15))

        # Render question cards
        for i, (qnum, y0, y1) in enumerate(q_markers):
            top_y = max(0, y0 - 10)
            if i + 1 < len(q_markers):
                bottom_y = q_markers[i + 1][1] - 8
            else:
                bottom_y = min(page.rect.height - 35, page.rect.height)
                
            crop_rect = pymupdf.Rect(20, top_y, page.rect.width - 20, bottom_y)
            card_filename = f"cards/set{set_id}_q{qnum}.png"
            card_path = os.path.join(PROJECT_DIR, card_filename)
            
            mat = pymupdf.Matrix(2.0, 2.0)
            pix = page.get_pixmap(matrix=mat, clip=crop_rect)
            pix.save(card_path)

def main():
    print(f"Sanitizing all cards for Sets 10 to 32 from {MASTER_PDF}...")
    for s in SHIFTS_ALL_2024:
        sanitize_and_render_shift(s)
    print("\n🎉 ALL 2024 CARDS SANITIZED SUCCESSFULLY!")

if __name__ == '__main__':
    main()
