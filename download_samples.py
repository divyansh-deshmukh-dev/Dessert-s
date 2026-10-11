import os
import urllib.request
from PIL import Image, ImageDraw, ImageFont

CAKE_IMAGES = {
    "vanilla_floral.jpg": "https://images.unsplash.com/photo-1535141192574-5d4897c13136?w=600&auto=format&fit=crop&q=80",
    "chocolate_drip.jpg": "https://images.unsplash.com/photo-1578985545062-69928b1d9587?w=600&auto=format&fit=crop&q=80",
    "red_velvet.jpg": "https://images.unsplash.com/photo-1586788680434-30d324b2d46f?w=600&auto=format&fit=crop&q=80",
    "butterscotch_cartoon.jpg": "https://images.unsplash.com/photo-1621303837174-89787a7d4729?w=600&auto=format&fit=crop&q=80",
    "blueberry_cheesecake.jpg": "https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=600&auto=format&fit=crop&q=80",
    "sunflower_yellow.jpg": "https://images.unsplash.com/photo-1542826438-bd32f43d626f?w=600&auto=format&fit=crop&q=80",
    "tiered_wedding.jpg": "https://images.unsplash.com/photo-1519869325930-281384150729?w=600&auto=format&fit=crop&q=80",
    "heart_anniversary.jpg": "https://images.unsplash.com/photo-1606890737304-57a1ca8a5b62?w=600&auto=format&fit=crop&q=80",
    "strawberry_shortcake.jpg": "https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?w=600&auto=format&fit=crop&q=80",
    "biscoff_delight.jpg": "https://images.unsplash.com/photo-1627834377411-8da5f4f09de8?w=600&auto=format&fit=crop&q=80"
}

output_dir = os.path.join("static", "images", "sample_cakes")
os.makedirs(output_dir, exist_ok=True)

headers = {
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
}

def create_fallback(filename, text, bg_color):
    img = Image.new('RGB', (500, 500), color=bg_color)
    draw = ImageDraw.Draw(img)
    # Draw simple cake shape
    draw.rounded_rectangle([100, 200, 400, 380], radius=20, fill=(255, 230, 235), outline=(214, 90, 121), width=4)
    draw.rounded_rectangle([150, 120, 350, 200], radius=15, fill=(255, 210, 220), outline=(214, 90, 121), width=4)
    # Candle
    draw.rectangle([245, 70, 255, 120], fill=(255, 255, 255), outline=(214, 90, 121), width=2)
    # Flame
    draw.ellipse([240, 50, 260, 70], fill=(255, 190, 60))
    # Text
    draw.text((250, 420), text, fill=(80, 30, 40), anchor="mm")
    filepath = os.path.join(output_dir, filename)
    img.save(filepath, "JPEG")
    print(f"Created fallback cake image: {filename}")

for filename, url in CAKE_IMAGES.items():
    filepath = os.path.join(output_dir, filename)
    if not os.path.exists(filepath):
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as response, open(filepath, 'wb') as out_file:
                out_file.write(response.read())
            print(f"Downloaded {filename}")
        except Exception as e:
            print(f"Error downloading {filename}: {e}. Creating fallback.")
            create_fallback(filename, filename.replace(".jpg", "").replace("_", " ").title(), (254, 243, 245))

# Also create placeholder image
placeholder_dir = os.path.join("static", "images", "placeholders")
os.makedirs(placeholder_dir, exist_ok=True)
placeholder_path = os.path.join(placeholder_dir, "cake_placeholder.png")
if not os.path.exists(placeholder_path):
    img = Image.new('RGBA', (400, 400), color=(255, 245, 247, 255))
    draw = ImageDraw.Draw(img)
    # Cute cake illustration
    draw.rounded_rectangle([90, 180, 310, 300], radius=18, fill=(255, 225, 235, 255), outline=(224, 105, 139, 255), width=3)
    draw.rounded_rectangle([130, 110, 270, 180], radius=14, fill=(255, 205, 220, 255), outline=(224, 105, 139, 255), width=3)
    # Candle
    draw.rectangle([195, 75, 205, 110], fill=(255, 255, 255, 255), outline=(224, 105, 139, 255), width=2)
    # Flame
    draw.ellipse([192, 55, 208, 75], fill=(255, 180, 50, 255))
    # Text
    draw.text((200, 340), "Dessert's Bakery", fill=(120, 50, 70, 255), anchor="mm")
    img.save(placeholder_path, "PNG")
    print("Created cake placeholder image.")
