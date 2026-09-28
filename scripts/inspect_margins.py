from PIL import Image

im = Image.open('test_clean_q19.png').convert('RGB')
w, h = im.size

# Let's see non-white pixels across x columns
non_white_by_x = []
for x in range(w):
    non_white = sum(1 for y in range(h) if im.getpixel((x, y)) != (255, 255, 255))
    non_white_by_x.append(non_white)

print(f"Image width: {w}, height: {h}")
# Find where "Ans" is on the left
print("Columns with pixels between x=0 and x=250:")
for x in range(0, 250, 10):
    print(f"  x={x:3d} to {x+9:3d}: max non-white = {max(non_white_by_x[x:x+10])}")
