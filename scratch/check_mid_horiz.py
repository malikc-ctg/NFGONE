from PIL import Image

im = Image.open('public/hero-mid.png')
w, h = im.size
y = h // 2

# Print the R value of every 20th pixel along y = h//2
vals = [im.getpixel((x, y))[0] for x in range(0, w, 20)]
print("R values along horizontal middle line:")
print(vals)
