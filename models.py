from datetime import datetime, timezone
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

def get_utc_now():
    return datetime.now(timezone.utc)

class Customer(db.Model):
    __tablename__ = 'customers'

    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(120), nullable=False)
    phone = db.Column(db.String(40), nullable=False, index=True)
    email = db.Column(db.String(120), nullable=True)
    address = db.Column(db.Text, nullable=True)
    additional_contact = db.Column(db.String(100), nullable=True)
    created_at = db.Column(db.DateTime, default=get_utc_now)

    orders = db.relationship('Order', backref='customer', lazy='dynamic', cascade='all, delete-orphan')

    def to_dict(self, include_orders=False):
        order_list = self.orders.all()
        total_spent = sum(o.total_price for o in order_list)
        latest_order = max([o.delivery_date for o in order_list], default=None) if order_list else None
        
        data = {
            'id': self.id,
            'name': self.name,
            'phone': self.phone,
            'email': self.email or '',
            'address': self.address or '',
            'additional_contact': self.additional_contact or '',
            'total_orders': len(order_list),
            'total_spent': round(total_spent, 2),
            'latest_order': latest_order or '',
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else ''
        }
        if include_orders:
            data['orders'] = [order.to_dict(include_customer=False) for order in order_list]
        return data


class Order(db.Model):
    __tablename__ = 'orders'

    id = db.Column(db.Integer, primary_key=True)
    order_number = db.Column(db.String(30), unique=True, nullable=False, index=True)
    customer_id = db.Column(db.Integer, db.ForeignKey('customers.id', ondelete='CASCADE'), nullable=False)
    
    # Cake details
    cake_name = db.Column(db.String(150), nullable=False)
    flavour = db.Column(db.String(80), nullable=False)
    weight = db.Column(db.String(50), nullable=False) # e.g. "1 kg", "2 kg"
    shape = db.Column(db.String(50), default='Round') # Round, Square, Heart, Tiered, Custom
    design_description = db.Column(db.Text, nullable=True)
    theme = db.Column(db.String(80), nullable=True)
    colour = db.Column(db.String(80), nullable=True)
    decorations = db.Column(db.String(255), nullable=True)
    egg_preference = db.Column(db.String(20), default='Eggless') # Eggless / Contains Egg
    custom_message = db.Column(db.String(255), nullable=True)
    special_instructions = db.Column(db.Text, nullable=True)
    cake_image_path = db.Column(db.String(255), nullable=True)
    
    # Order & Delivery details
    order_date = db.Column(db.String(20), nullable=False) # YYYY-MM-DD
    delivery_date = db.Column(db.String(20), nullable=False) # YYYY-MM-DD
    delivery_time = db.Column(db.String(30), nullable=True) # e.g. "04:00 PM"
    delivery_address = db.Column(db.Text, nullable=True)
    status = db.Column(db.String(30), default='Pending') # Pending, Preparing, Ready, Delivered
    assigned_baker = db.Column(db.String(100), nullable=True)
    
    # Payment details
    total_price = db.Column(db.Float, default=0.0)
    advance_payment = db.Column(db.Float, default=0.0)
    remaining_balance = db.Column(db.Float, default=0.0)
    payment_status = db.Column(db.String(30), default='Partial') # Unpaid, Partial, Paid
    payment_method = db.Column(db.String(50), default='UPI') # Cash, UPI, Card, Net Banking

    created_at = db.Column(db.DateTime, default=get_utc_now)
    updated_at = db.Column(db.DateTime, default=get_utc_now, onupdate=get_utc_now)

    def calculate_balance(self):
        self.total_price = max(0.0, float(self.total_price or 0.0))
        self.advance_payment = max(0.0, float(self.advance_payment or 0.0))
        self.remaining_balance = max(0.0, self.total_price - self.advance_payment)
        if self.advance_payment >= self.total_price and self.total_price > 0:
            self.payment_status = 'Paid'
        elif self.advance_payment > 0:
            self.payment_status = 'Partial'
        else:
            self.payment_status = 'Unpaid'

    def to_dict(self, include_customer=True):
        data = {
            'id': self.id,
            'order_number': self.order_number,
            'customer_id': self.customer_id,
            'cake_name': self.cake_name,
            'flavour': self.flavour,
            'weight': self.weight,
            'shape': self.shape,
            'design_description': self.design_description or '',
            'theme': self.theme or '',
            'colour': self.colour or '',
            'decorations': self.decorations or '',
            'egg_preference': self.egg_preference or 'Eggless',
            'custom_message': self.custom_message or '',
            'special_instructions': self.special_instructions or '',
            'cake_image_path': self.cake_image_path or '/static/images/placeholders/cake_placeholder.png',
            'order_date': self.order_date,
            'delivery_date': self.delivery_date,
            'delivery_time': self.delivery_time or 'Anytime',
            'delivery_address': self.delivery_address or '',
            'status': self.status,
            'assigned_baker': self.assigned_baker or 'Unassigned',
            'total_price': round(self.total_price, 2),
            'advance_payment': round(self.advance_payment, 2),
            'remaining_balance': round(self.remaining_balance, 2),
            'payment_status': self.payment_status,
            'payment_method': self.payment_method or 'UPI',
            'created_at': self.created_at.strftime('%Y-%m-%d %H:%M:%S') if self.created_at else '',
            'updated_at': self.updated_at.strftime('%Y-%m-%d %H:%M:%S') if self.updated_at else ''
        }
        if include_customer and self.customer:
            data['customer'] = {
                'id': self.customer.id,
                'name': self.customer.name,
                'phone': self.customer.phone,
                'email': self.customer.email or '',
                'address': self.customer.address or ''
            }
        return data
