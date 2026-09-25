import os
from PIL import Image, ImageDraw, ImageFont

os.makedirs('public/icons', exist_ok=True)

def create_icon(size, is_maskable=False):
    # Base background: vibrant VKU theme color #0284c7 with subtle gradient/depth
    img = Image.new('RGBA', (size, size), (2, 132, 199, 255))
    draw = ImageDraw.Draw(img)

    # Rounded rectangle if not maskable
    if not is_maskable:
        # Create transparent base and rounded rect
        img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        draw = ImageDraw.Draw(img)
        radius = int(size * 0.22)
        draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=(2, 132, 199, 255))
        
        # Inner subtle gradient highlight
        draw.rounded_rectangle([int(size*0.04), int(size*0.04), int(size*0.96), int(size*0.96)], 
                               radius=int(radius*0.85), 
                               outline=(56, 189, 248, 160), width=int(size*0.02))

    # Safe zone scaling: if maskable, shrink content by 20% to stay in safe area
    scale = 0.65 if is_maskable else 0.85
    cx, cy = size / 2, size / 2

    # Draw clipboard / building inspection badge
    # Draw white clipboard shape
    pad_x = int(size * (0.28 if is_maskable else 0.22))
    pad_top = int(size * (0.22 if is_maskable else 0.16))
    pad_bot = int(size * (0.82 if is_maskable else 0.84))
    r = int(size * 0.05)
    
    draw.rounded_rectangle([pad_x, pad_top, size - pad_x, pad_bot], radius=r, fill=(255, 255, 255, 245))

    # Clipboard clip at top
    clip_w = int(size * 0.22)
    clip_h = int(size * 0.08)
    clip_x1 = int(cx - clip_w / 2)
    clip_y1 = int(pad_top - clip_h * 0.4)
    draw.rounded_rectangle([clip_x1, clip_y1, clip_x1 + clip_w, clip_y1 + clip_h], 
                           radius=int(clip_h*0.4), fill=(14, 165, 233, 255))

    # Inner lines on clipboard (representing inspection checklist)
    line_x1 = int(pad_x + size * 0.07)
    line_x2 = int(size - pad_x - size * 0.07)
    
    # Checkbox 1 + line
    y1 = int(pad_top + size * 0.16)
    draw.ellipse([line_x1, y1, line_x1 + int(size*0.06), y1 + int(size*0.06)], fill=(16, 185, 129, 255))
    draw.line([line_x1 + int(size*0.09), y1 + int(size*0.03), line_x2, y1 + int(size*0.03)], 
              fill=(100, 116, 139, 255), width=max(2, int(size*0.03)))

    # Checkbox 2 + line
    y2 = int(pad_top + size * 0.27)
    draw.ellipse([line_x1, y2, line_x1 + int(size*0.06), y2 + int(size*0.06)], fill=(16, 185, 129, 255))
    draw.line([line_x1 + int(size*0.09), y2 + int(size*0.03), line_x2, y2 + int(size*0.03)], 
              fill=(100, 116, 139, 255), width=max(2, int(size*0.03)))

    # Checkbox 3 + line
    y3 = int(pad_top + size * 0.38)
    draw.ellipse([line_x1, y3, line_x1 + int(size*0.06), y3 + int(size*0.06)], fill=(14, 165, 233, 255))
    draw.line([line_x1 + int(size*0.09), y3 + int(size*0.03), line_x2, y3 + int(size*0.03)], 
              fill=(100, 116, 139, 255), width=max(2, int(size*0.03)))

    # Large Checkmark badge in bottom right corner of clipboard
    badge_r = int(size * 0.16)
    bx = int(size - pad_x - badge_r * 0.5)
    by = int(pad_bot - badge_r * 0.6)
    draw.ellipse([bx - badge_r, by - badge_r, bx + badge_r, by + badge_r], fill=(16, 185, 129, 255), outline=(255, 255, 255, 255), width=max(2, int(size*0.025)))
    
    # White checkmark tick
    p1 = (bx - int(badge_r * 0.5), by)
    p2 = (bx - int(badge_r * 0.1), by + int(badge_r * 0.45))
    p3 = (bx + int(badge_r * 0.55), by - int(badge_r * 0.45))
    draw.line([p1, p2, p3], fill=(255, 255, 255, 255), width=max(3, int(size*0.05)), joint='curve')

    return img

icon_192 = create_icon(192, is_maskable=False)
icon_192.save('public/icons/icon-192.png', 'PNG')

icon_512 = create_icon(512, is_maskable=False)
icon_512.save('public/icons/icon-512.png', 'PNG')

icon_192_m = create_icon(192, is_maskable=True)
icon_192_m.save('public/icons/icon-192-maskable.png', 'PNG')

icon_512_m = create_icon(512, is_maskable=True)
icon_512_m.save('public/icons/icon-512-maskable.png', 'PNG')

# Favicon
icon_192.resize((48, 48), Image.Resampling.LANCZOS).save('public/favicon.ico')
print('PWA icons generated successfully.')
