import os
from datetime import date, timedelta
from config import Config
from models import db, Customer, Order
from flask import Flask

def get_relative_date(days_offset):
    target = date.today() + timedelta(days=days_offset)
    return target.strftime('%Y-%m-%d')

SAMPLE_ORDERS = [
    {
        "order_number": "C101",
        "customer_name": "Priya Sharma",
        "phone": "+91 98765 43210",
        "email": "priya.sharma@example.com",
        "address": "Flat 402, Rosewood Heights, Bandra West, Mumbai",
        "cake_name": "Pastel Pink Floral Cake",
        "flavour": "Vanilla",
        "weight": "1 kg",
        "shape": "Round",
        "design_description": "Pastel pink buttercream base with piped floral blossoms and gold leaf accents",
        "theme": "Floral Elegance",
        "colour": "Pastel Pink & Cream",
        "decorations": "Fresh edible roses, gold leaf, sugar pearls",
        "egg_preference": "Eggless",
        "custom_message": "Happy 25th Birthday Priya!",
        "special_instructions": "Low sugar cream requested. Keep chilled.",
        "cake_image_path": "/static/images/sample_cakes/vanilla_floral.jpg",
        "order_offset": -1,
        "delivery_offset": 0, # Today
        "delivery_time": "04:30 PM",
        "status": "Preparing",
        "assigned_baker": "Chef Meera",
        "total_price": 1200.0,
        "advance_payment": 600.0,
        "payment_method": "UPI"
    },
    {
        "order_number": "C102",
        "customer_name": "Rahul Mehta",
        "phone": "+91 87654 32109",
        "email": "rahul.m@example.com",
        "address": "B-12, Green Acres Villa, Juhu, Mumbai",
        "cake_name": "Double Chocolate Drip Cake",
        "flavour": "Chocolate",
        "weight": "2 kg",
        "shape": "Round",
        "design_description": "Rich Belgian chocolate ganache drip with loaded chocolate truffles and wafers",
        "theme": "Chocoholic Delight",
        "colour": "Dark Chocolate & Gold",
        "decorations": "Ferrero Rocher, KitKat wafers, gold shimmer",
        "egg_preference": "Contains Egg",
        "custom_message": "Happy Birthday Champ!",
        "special_instructions": "Pack with cold gel pack for transport.",
        "cake_image_path": "/static/images/sample_cakes/chocolate_drip.jpg",
        "order_offset": -2,
        "delivery_offset": 0, # Today
        "delivery_time": "06:00 PM",
        "status": "Ready",
        "assigned_baker": "Chef Rahul",
        "total_price": 2000.0,
        "advance_payment": 2000.0,
        "payment_method": "Card"
    },
    {
        "order_number": "C103",
        "customer_name": "Ananya Verma",
        "phone": "+91 91234 56789",
        "email": "ananya.v@example.com",
        "address": "15 Lotus Apartments, Indiranagar, Bengaluru",
        "cake_name": "Lavender Rose Red Velvet",
        "flavour": "Red Velvet",
        "weight": "1.5 kg",
        "shape": "Round",
        "design_description": "Soft purple lavender textured frosting with fresh dried petals",
        "theme": "Botanical Garden",
        "colour": "Lavender & White",
        "decorations": "Cream cheese swirl, dried rose buds",
        "egg_preference": "Eggless",
        "custom_message": "Forever & Always",
        "special_instructions": "Less sweet cream cheese frosting.",
        "cake_image_path": "/static/images/sample_cakes/red_velvet.jpg",
        "order_offset": -1,
        "delivery_offset": 0, # Today
        "delivery_time": "07:30 PM",
        "status": "Ready",
        "assigned_baker": "Chef Meera",
        "total_price": 1800.0,
        "advance_payment": 1000.0,
        "payment_method": "UPI"
    },
    {
        "order_number": "C104",
        "customer_name": "Karan Sethi",
        "phone": "+91 99887 76655",
        "email": "karan.sethi@example.com",
        "address": "Penthouse 9A, Sky View Towers, Worli, Mumbai",
        "cake_name": "Spider Superhero Theme Cake",
        "flavour": "Butterscotch",
        "weight": "2 kg",
        "shape": "Round",
        "design_description": "Handcrafted Spiderman edible sugar fondant topper on blue web background",
        "theme": "Superhero Marvel",
        "colour": "Royal Blue & Red",
        "decorations": "Fondant mask, web piping, caramel crunch",
        "egg_preference": "Eggless",
        "custom_message": "Happy 7th Birthday Aarav!",
        "special_instructions": "Make extra crunchy praline inside layers.",
        "cake_image_path": "/static/images/sample_cakes/butterscotch_cartoon.jpg",
        "order_offset": -1,
        "delivery_offset": 1, # Tomorrow
        "delivery_time": "03:00 PM",
        "status": "Pending",
        "assigned_baker": "Chef Kabir",
        "total_price": 2200.0,
        "advance_payment": 1000.0,
        "payment_method": "UPI"
    },
    {
        "order_number": "C105",
        "customer_name": "Neha Kapoor",
        "phone": "+91 90909 10101",
        "email": "neha.k@example.com",
        "address": "704 Silver Sands, Juhu Tara Road, Mumbai",
        "cake_name": "Wild Berry Blueberry Cheesecake",
        "flavour": "Blueberry",
        "weight": "1 kg",
        "shape": "Round",
        "design_description": "Naked drip style cake topped with organic blueberries and fresh mint",
        "theme": "Rustic Berries",
        "colour": "Purple Berry & Cream",
        "decorations": "Fresh blueberries, berry compote drip, rosemary twigs",
        "egg_preference": "Contains Egg",
        "custom_message": "Congratulations Doctor Neha!",
        "special_instructions": "Include 5 sparkling candles and wooden knife.",
        "cake_image_path": "/static/images/sample_cakes/blueberry_cheesecake.jpg",
        "order_offset": -1,
        "delivery_offset": 1, # Tomorrow
        "delivery_time": "05:00 PM",
        "status": "Preparing",
        "assigned_baker": "Chef Rahul",
        "total_price": 1400.0,
        "advance_payment": 700.0,
        "payment_method": "Cash"
    },
    {
        "order_number": "C106",
        "customer_name": "Riya Desai",
        "phone": "+91 93456 78901",
        "email": "riya.desai@example.com",
        "address": "Row House 3, Golden Palm, Koregaon Park, Pune",
        "cake_name": "Golden Sunflower Celebration Cake",
        "flavour": "Chocolate",
        "weight": "1 kg",
        "shape": "Round",
        "design_description": "Piped bright yellow sunflower buttercream border with chocolate crumb centre",
        "theme": "Sunflower Sunshine",
        "colour": "Sun Yellow & Chocolate Brown",
        "decorations": "Buttercream sunflower petals, dark chocolate ganache center",
        "egg_preference": "Eggless",
        "custom_message": "You Are My Sunshine ♡",
        "special_instructions": "Allergic to walnuts, ensure nut-free bakery prep.",
        "cake_image_path": "/static/images/sample_cakes/sunflower_yellow.jpg",
        "order_offset": -2,
        "delivery_offset": 1, # Tomorrow
        "delivery_time": "06:30 PM",
        "status": "Pending",
        "assigned_baker": "Chef Meera",
        "total_price": 1300.0,
        "advance_payment": 500.0,
        "payment_method": "UPI"
    },
    {
        "order_number": "C107",
        "customer_name": "Sneha Iyer",
        "phone": "+91 88776 65544",
        "email": "sneha.iyer@example.com",
        "address": "Villa 22, Whispering Palms, Alibaug",
        "cake_name": "3-Tier Pastel Royal Wedding Cake",
        "flavour": "Vanilla",
        "weight": "3 kg",
        "shape": "Tiered",
        "design_description": "Three tier luxury wedding cake with cascade of blush sugar roses",
        "theme": "Royal Wedding",
        "colour": "Champagne & Blush Pink",
        "decorations": "Sugar cascade roses, edible pearls, gold lace detailing",
        "egg_preference": "Eggless",
        "custom_message": "Sneha & Rohan",
        "special_instructions": "Assemble top tier on site if needed. Handle with extreme care.",
        "cake_image_path": "/static/images/sample_cakes/tiered_wedding.jpg",
        "order_offset": -5,
        "delivery_offset": -1, # Delivered yesterday
        "delivery_time": "02:00 PM",
        "status": "Delivered",
        "assigned_baker": "Chef Rahul & Chef Meera",
        "total_price": 3800.0,
        "advance_payment": 3800.0,
        "payment_method": "Bank Transfer"
    },
    {
        "order_number": "C108",
        "customer_name": "Aditi Malhotra",
        "phone": "+91 77665 44332",
        "email": "aditi.m@example.com",
        "address": "Flat 302, Palm Breeze, Carter Road, Mumbai",
        "cake_name": "Velvet Crimson Heart Cake",
        "flavour": "Red Velvet",
        "weight": "1 kg",
        "shape": "Heart",
        "design_description": "Velvet spray textured crimson heart with vintage shell piped borders",
        "theme": "Anniversary Romance",
        "colour": "Deep Crimson Red",
        "decorations": "Shell piping, edible silver pearls, glossy glaze",
        "egg_preference": "Eggless",
        "custom_message": "Happy 5th Anniversary Sweetheart",
        "special_instructions": "Add heart shaped anniversary topper.",
        "cake_image_path": "/static/images/sample_cakes/heart_anniversary.jpg",
        "order_offset": -3,
        "delivery_offset": -1, # Delivered yesterday
        "delivery_time": "08:00 PM",
        "status": "Delivered",
        "assigned_baker": "Chef Kabir",
        "total_price": 1600.0,
        "advance_payment": 1600.0,
        "payment_method": "Card"
    },
    {
        "order_number": "C109",
        "customer_name": "Vikram Rathore",
        "phone": "+91 98220 11223",
        "email": "vikram.r@example.com",
        "address": "401 Lake Palace View, Powai, Mumbai",
        "cake_name": "Fresh Strawberry Chantilly Cake",
        "flavour": "Strawberry",
        "weight": "1 kg",
        "shape": "Round",
        "design_description": "Japanese style fluffy sponge layered with fresh sliced strawberries and whipped cream",
        "theme": "Summer Fresh",
        "colour": "Ruby Red & Snow White",
        "decorations": "Fresh whole strawberries, mint leaves, powdered sugar snow",
        "egg_preference": "Eggless",
        "custom_message": "Best Mom Ever!",
        "special_instructions": "Deliver strictly before 5 PM before party guests arrive.",
        "cake_image_path": "/static/images/sample_cakes/strawberry_shortcake.jpg",
        "order_offset": 0,
        "delivery_offset": 0, # Today
        "delivery_time": "04:00 PM",
        "status": "Pending",
        "assigned_baker": "Chef Meera",
        "total_price": 1500.0,
        "advance_payment": 500.0,
        "payment_method": "UPI"
    },
    {
        "order_number": "C110",
        "customer_name": "Pooja Nair",
        "phone": "+91 97400 33445",
        "email": "pooja.nair@example.com",
        "address": "C-501, Prestige Oasis, HSR Layout, Bengaluru",
        "cake_name": "Caramel Lotus Biscoff Crunch",
        "flavour": "Caramel Biscoff",
        "weight": "2 kg",
        "shape": "Round",
        "design_description": "Caramelized biscuit spread drip with Lotus biscuits crown and crunchy crumb base",
        "theme": "Gourmet Dessert",
        "colour": "Warm Golden Caramel & Cream",
        "decorations": "Lotus Biscoff cookies, golden caramel drizzle, piped rosettes",
        "egg_preference": "Eggless",
        "custom_message": "Happy Promotion Pooja!",
        "special_instructions": "Make sure to write message clearly on chocolate plaque.",
        "cake_image_path": "/static/images/sample_cakes/biscoff_delight.jpg",
        "order_offset": -1,
        "delivery_offset": 0, # Today
        "delivery_time": "06:00 PM",
        "status": "Preparing",
        "assigned_baker": "Chef Rahul",
        "total_price": 2400.0,
        "advance_payment": 1200.0,
        "payment_method": "UPI"
    },
    {
        "order_number": "C111",
        "customer_name": "Sameer Joshi",
        "phone": "+91 96555 44332",
        "email": "sameer.j@example.com",
        "address": "Row House 8, Nilgiri Greens, Shivaji Nagar, Pune",
        "cake_name": "Belgian Truffle Square Royale",
        "flavour": "Dark Chocolate",
        "weight": "1.5 kg",
        "shape": "Square",
        "design_description": "70% Dark cocoa square cake with geometric mirror glaze",
        "theme": "Minimalist Modern",
        "colour": "Glossy Dark Noir",
        "decorations": "Chocolate shards, 24k gold leaf flakes",
        "egg_preference": "Eggless",
        "custom_message": "Cheers to 30 Years!",
        "special_instructions": "Handle with care, delicate mirror glaze.",
        "cake_image_path": "/static/images/sample_cakes/chocolate_drip.jpg",
        "order_offset": 0,
        "delivery_offset": 2, # In 2 days
        "delivery_time": "07:00 PM",
        "status": "Pending",
        "assigned_baker": "Chef Meera",
        "total_price": 2100.0,
        "advance_payment": 1000.0,
        "payment_method": "Card"
    },
    {
        "order_number": "C112",
        "customer_name": "Devika Sen",
        "phone": "+91 95111 22334",
        "email": "devika.sen@example.com",
        "address": "4B, Royal Regency, Colaba, Mumbai",
        "cake_name": "Ethereal Tiered Blossom Cake",
        "flavour": "Vanilla Berry",
        "weight": "2.5 kg",
        "shape": "Tiered",
        "design_description": "Two tier pastel textured cake with white peony sugar flowers",
        "theme": "Vintage Elegance",
        "colour": "Ivory Cream & Soft Pink",
        "decorations": "White peonies, piped pearls, ribbon band",
        "egg_preference": "Eggless",
        "custom_message": "Happy 50th Golden Jubilee",
        "special_instructions": "Special anniversary greeting card to be delivered along.",
        "cake_image_path": "/static/images/sample_cakes/tiered_wedding.jpg",
        "order_offset": -1,
        "delivery_offset": 3, # In 3 days
        "delivery_time": "01:30 PM",
        "status": "Ready",
        "assigned_baker": "Chef Rahul",
        "total_price": 3500.0,
        "advance_payment": 3500.0,
        "payment_method": "Bank Transfer"
    }
]

def seed_database(app):
    with app.app_context():
        db.create_all()
        
        # Check if already seeded
        if Order.query.count() > 0:
            print(f"Database already has {Order.query.count()} orders. Skipping seed to preserve data.")
            return

        print("Seeding database with realistic cake shop orders...")
        
        for item in SAMPLE_ORDERS:
            # Find or create customer
            customer = Customer.query.filter_by(phone=item["phone"]).first()
            if not customer:
                customer = Customer(
                    name=item["customer_name"],
                    phone=item["phone"],
                    email=item.get("email"),
                    address=item.get("address")
                )
                db.session.add(customer)
                db.session.flush()

            # Create order
            order_date = get_relative_date(item["order_offset"])
            delivery_date = get_relative_date(item["delivery_offset"])
            
            order = Order(
                order_number=item["order_number"],
                customer_id=customer.id,
                cake_name=item["cake_name"],
                flavour=item["flavour"],
                weight=item["weight"],
                shape=item.get("shape", "Round"),
                design_description=item.get("design_description", ""),
                theme=item.get("theme", ""),
                colour=item.get("colour", ""),
                decorations=item.get("decorations", ""),
                egg_preference=item.get("egg_preference", "Eggless"),
                custom_message=item.get("custom_message", ""),
                special_instructions=item.get("special_instructions", ""),
                cake_image_path=item.get("cake_image_path"),
                order_date=order_date,
                delivery_date=delivery_date,
                delivery_time=item.get("delivery_time", "05:00 PM"),
                delivery_address=item.get("address"),
                status=item.get("status", "Pending"),
                assigned_baker=item.get("assigned_baker", "Chef Rahul"),
                total_price=item.get("total_price", 0.0),
                advance_payment=item.get("advance_payment", 0.0),
                payment_method=item.get("payment_method", "UPI")
            )
            order.calculate_balance()
            db.session.add(order)

        db.session.commit()
        print(f"Successfully seeded {len(SAMPLE_ORDERS)} orders and {Customer.query.count()} customers!")

if __name__ == '__main__':
    from app import app
    seed_database(app)
