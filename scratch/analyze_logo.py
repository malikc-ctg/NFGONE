from PIL import Image
from collections import Counter

im = Image.open('public/logo.png')
w, h = im.size

colors = []
for x in range(341, 625):
    for y in range(408, 731):
        r, g, b, a = im.getpixel((x, y))
        if a > 0:
            colors.append((r, g, b, a))

counter = Counter(colors)
print("Top 10 colors in the logo bounding box:")
for col, count in counter.most_common(10):
    print(f"Color: {col}, Count: {count}")
