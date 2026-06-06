from PIL import Image

for name in ['public/hero-bg.png', 'public/hero-mid.png', 'public/blur-shape.png']:
    try:
        im = Image.open(name)
        w, h = im.size
        # Let's inspect brightness transitions across a horizontal line at y = h/2
        # and a vertical line at x = w/2
        y_mid = h // 2
        x_mid = w // 2
        
        row_pixels = [im.getpixel((x, y_mid)) for x in range(w)]
        col_pixels = [im.getpixel((x_mid, y)) for y in range(h)]
        
        # Check for large sudden jumps in RGB values between adjacent pixels
        row_diffs = []
        for i in range(len(row_pixels) - 1):
            p1 = row_pixels[i]
            p2 = row_pixels[i+1]
            diff = sum(abs(a - b) for a, b in zip(p1[:3], p2[:3]))
            row_diffs.append((diff, i))
            
        col_diffs = []
        for i in range(len(col_pixels) - 1):
            p1 = col_pixels[i]
            p2 = col_pixels[i+1]
            diff = sum(abs(a - b) for a, b in zip(p1[:3], p2[:3]))
            col_diffs.append((diff, i))
            
        # Sort and get top transitions
        row_diffs.sort(reverse=True)
        col_diffs.sort(reverse=True)
        
        print(f"File: {name}")
        print("  Top horizontal transitions (x index, difference):")
        for diff, idx in row_diffs[:5]:
            if diff > 30:
                print(f"    x={idx} to {idx+1}: diff={diff}")
        print("  Top vertical transitions (y index, difference):")
        for diff, idx in col_diffs[:5]:
            if diff > 30:
                print(f"    y={idx} to {idx+1}: diff={diff}")
    except Exception as e:
        print(f"Error {name}: {e}")
