from PIL import Image

for name in ['public/hero-bg.png', 'public/hero-mid.png', 'public/blur-shape.png']:
    try:
        im = Image.open(name)
        print(f"File: {name}, Format: {im.format}, Size: {im.size}, Mode: {im.mode}")
        # Check colors in the center 100x100 box
        w, h = im.size
        box = im.crop((w//2 - 50, h//2 - 50, w//2 + 50, h//2 + 50))
        # Get average color of the center
        pixels = list(box.getdata())
        # Calculate average color
        if im.mode == 'RGBA':
            avg = [sum(x)/len(pixels) for x in zip(*pixels)]
        else:
            avg = [sum(x)/len(pixels) for x in zip(*pixels)]
        print(f"  Center 100x100 average color: {avg}")
    except Exception as e:
        print(f"Error {name}: {e}")
