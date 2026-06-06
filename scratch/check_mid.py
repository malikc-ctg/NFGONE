from PIL import Image

im = Image.open('public/hero-mid.png')
w, h = im.size

# Let's inspect the transition at y=308 and y=646 at different x positions (e.g. x=200, x=400, x=600, x=800)
for x in [200, 400, 600, 800]:
    print(f"At x={x}:")
    print(f"  y=305: {im.getpixel((x, 305))}")
    print(f"  y=312: {im.getpixel((x, 312))}")
    print(f"  y=640: {im.getpixel((x, 640))}")
    print(f"  y=650: {im.getpixel((x, 650))}")
