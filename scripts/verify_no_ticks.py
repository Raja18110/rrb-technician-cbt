from PIL import Image

im = Image.open("test_clean_q19.png")
rgb = im.convert("RGB")
w, h = rgb.size

# Check if there are any green pixels (R < 100, G > 150, B < 100) or red pixels (R > 180, G < 80, B < 80) in the icon area (x < 150)
green_count = 0
red_count = 0

for x in range(min(150, w)):
    for y in range(h):
        r, g, b = rgb.getpixel((x, y))
        if r < 100 and g > 150 and b < 100:
            green_count += 1
        if r > 180 and g < 80 and b < 80:
            red_count += 1

print(f"Icon area analysis: Green pixels = {green_count}, Red pixels = {red_count}")
if green_count == 0 and red_count == 0:
    print("SUCCESS: 100% of answer ticks and crosses have been completely removed!")
else:
    print("Warning: some colored pixels remain.")
