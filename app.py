import os
import uuid
import csv
import io
from datetime import datetime, date
from flask import Flask, render_template, request, jsonify, send_file, url_for
from werkzeug.utils import secure_filename

from config import Config
from models import db, Customer, Order
from seed import seed_database

app = Flask(__name__)
app.config.from_object(Config)

# Ensure upload directory exists
os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

# Initialize database
db.init_app(app)

with app.app_context():
    if not app.config.get('TESTING'):
        db.create_all()
        seed_database(app)

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in app.config['ALLOWED_EXTENSIONS']

def generate_next_order_number():
    """Generates the next sequential order number like C101, C102..."""
    all_orders = Order.query.with_entities(Order.order_number).all()
    max_num = 100
    for (ord_no,) in all_orders:
        if ord_no and ord_no.startswith('C') and ord_no[1:].isdigit():
            num = int(ord_no[1:])
            if num > max_num:
                max_num = num
    return f"C{max_num + 1}"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/favicon.ico')
def favicon():
    return send_file(os.path.join(app.root_path, 'static', 'images', 'favicon.png'), mimetype='image/png')

# ----------------- ORDER APIS -----------------

@app.route('/api/orders', methods=['GET'])
def get_orders():
    query = Order.query.join(Customer)
    
    # Filter by Status
    status = request.args.get('status', 'All').strip()
    if status and status.lower() != 'all':
        query = query.filter(Order.status.ilike(status))
        
    # Filter by Date (e.g., today, tomorrow, specific YYYY-MM-DD)
    date_filter = request.args.get('date', '').strip()
    if date_filter:
        today_str = date.today().strftime('%Y-%m-%d')
        if date_filter.lower() == 'today':
            query = query.filter(Order.delivery_date == today_str)
        elif date_filter.lower() == 'tomorrow':
            tomorrow_str = (date.today() + timedelta(days=1)).strftime('%Y-%m-%d')
            query = query.filter(Order.delivery_date == tomorrow_str)
        else:
            query = query.filter(Order.delivery_date == date_filter)

    # Filter by Flavour
    flavour_filter = request.args.get('flavour', '').strip()
    if flavour_filter:
        query = query.filter(Order.flavour.ilike(f"%{flavour_filter}%"))

    # Filter by Payment Status
    payment_status = request.args.get('payment_status', '').strip()
    if payment_status:
        query = query.filter(Order.payment_status.ilike(payment_status))

    # Search keyword (searches order_number, customer name, phone, flavour, cake_name)
    search = request.args.get('search', '').strip()
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            db.or_(
                Order.order_number.ilike(search_pattern),
                Customer.name.ilike(search_pattern),
                Customer.phone.ilike(search_pattern),
                Order.flavour.ilike(search_pattern),
                Order.cake_name.ilike(search_pattern)
            )
        )

    # Sorting
    sort_by = request.args.get('sort', 'newest').strip()
    if sort_by == 'earliest_delivery':
        query = query.order_by(Order.delivery_date.asc(), Order.id.asc())
    elif sort_by == 'latest_delivery':
        query = query.order_by(Order.delivery_date.desc(), Order.id.desc())
    elif sort_by == 'price_high':
        query = query.order_by(Order.total_price.desc())
    elif sort_by == 'price_low':
        query = query.order_by(Order.total_price.asc())
    elif sort_by == 'order_no':
        query = query.order_by(Order.order_number.asc())
    else: # newest
        query = query.order_by(Order.id.desc())

    # Calculate status counts across entire dataset
    all_orders = Order.query.all()
    status_counts = {
        'all': len(all_orders),
        'pending': sum(1 for o in all_orders if o.status.lower() == 'pending'),
        'preparing': sum(1 for o in all_orders if o.status.lower() == 'preparing'),
        'ready': sum(1 for o in all_orders if o.status.lower() == 'ready'),
        'delivered': sum(1 for o in all_orders if o.status.lower() == 'delivered')
    }

    # Pagination
    total_matching = query.count()
    per_page_param = request.args.get('per_page', '8')
    if per_page_param.lower() == 'all':
        orders = query.all()
        page = 1
        total_pages = 1
    else:
        try:
            per_page = int(per_page_param)
        except ValueError:
            per_page = 8
        try:
            page = int(request.args.get('page', 1))
        except ValueError:
            page = 1
        
        paginated = query.paginate(page=page, per_page=per_page, error_out=False)
        orders = paginated.items
        total_pages = paginated.pages or 1

    return jsonify({
        'success': True,
        'orders': [o.to_dict() for o in orders],
        'total_count': total_matching,
        'page': page,
        'total_pages': total_pages,
        'status_counts': status_counts
    })

@app.route('/api/orders/next-number', methods=['GET'])
def get_next_order_number():
    next_num = generate_next_order_number()
    return jsonify({'next_order_number': next_num})

@app.route('/api/orders', methods=['POST'])
def create_order():
    try:
        # Check if form data or JSON
        data = request.form.to_dict() if request.form else (request.get_json() or {})
        
        # Validation for required fields
        required_fields = ['customer_name', 'phone', 'cake_name', 'flavour', 'weight', 'delivery_date', 'total_price']
        for field in required_fields:
            if not data.get(field):
                return jsonify({'success': False, 'message': f"Field '{field}' is required."}), 400

        # Handle Customer (link existing by phone or create new)
        phone = data.get('phone', '').strip()
        customer = Customer.query.filter_by(phone=phone).first()
        if not customer:
            customer = Customer(
                name=data.get('customer_name', '').strip(),
                phone=phone,
                email=data.get('email', '').strip() or None,
                address=data.get('address', '').strip() or None,
                additional_contact=data.get('additional_contact', '').strip() or None
            )
            db.session.add(customer)
            db.session.flush()
        else:
            # Update customer details if provided
            customer.name = data.get('customer_name', customer.name).strip()
            if data.get('email'): customer.email = data.get('email').strip()
            if data.get('address'): customer.address = data.get('address').strip()
            if data.get('additional_contact'): customer.additional_contact = data.get('additional_contact').strip()
            db.session.flush()

        # Handle Cake Photo Upload
        cake_image_path = None
        if 'cake_photo' in request.files:
            file = request.files['cake_photo']
            if file and file.filename and allowed_file(file.filename):
                ext = file.filename.rsplit('.', 1)[1].lower()
                unique_filename = f"cake_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}.{ext}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)
                cake_image_path = f"/static/uploads/{unique_filename}"
        
        if not cake_image_path:
            # Check if an existing or sample path was specified
            cake_image_path = data.get('cake_image_path') or '/static/images/placeholders/cake_placeholder.png'

        # Order Number
        order_number = data.get('order_number', '').strip()
        if not order_number:
            order_number = generate_next_order_number()
        else:
            existing = Order.query.filter_by(order_number=order_number).first()
            if existing:
                order_number = generate_next_order_number()

        # Dates
        order_date = data.get('order_date') or date.today().strftime('%Y-%m-%d')
        delivery_date = data.get('delivery_date') or date.today().strftime('%Y-%m-%d')
        delivery_time = data.get('delivery_time') or '05:00 PM'

        # Financials
        try:
            total_price = max(0.0, float(data.get('total_price', 0.0)))
        except ValueError:
            total_price = 0.0
            
        try:
            advance_payment = max(0.0, float(data.get('advance_payment', 0.0)))
        except ValueError:
            advance_payment = 0.0

        if advance_payment > total_price:
            advance_payment = total_price

        # Build order
        order = Order(
            order_number=order_number,
            customer_id=customer.id,
            cake_name=data.get('cake_name', '').strip(),
            flavour=data.get('flavour', '').strip(),
            weight=data.get('weight', '1 kg').strip(),
            shape=data.get('shape', 'Round').strip(),
            design_description=data.get('design_description', '').strip(),
            theme=data.get('theme', '').strip(),
            colour=data.get('colour', '').strip(),
            decorations=data.get('decorations', '').strip(),
            egg_preference=data.get('egg_preference', 'Eggless').strip(),
            custom_message=data.get('custom_message', '').strip(),
            special_instructions=data.get('special_instructions', '').strip(),
            cake_image_path=cake_image_path,
            order_date=order_date,
            delivery_date=delivery_date,
            delivery_time=delivery_time,
            delivery_address=data.get('delivery_address') or customer.address or '',
            status=data.get('status', 'Pending').strip(),
            assigned_baker=data.get('assigned_baker', 'Chef Rahul').strip(),
            total_price=total_price,
            advance_payment=advance_payment,
            payment_method=data.get('payment_method', 'UPI').strip()
        )
        order.calculate_balance()

        db.session.add(order)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f"Order {order.order_number} saved successfully!",
            'order': order.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f"Error creating order: {str(e)}"}), 500

def find_order_by_id_or_number(order_id):
    order_id_str = str(order_id).strip()
    order = None
    if order_id_str.isdigit():
        order = db.session.get(Order, int(order_id_str))
    if not order:
        order = Order.query.filter_by(order_number=order_id_str).first()
    return order

@app.route('/api/orders/<order_id>', methods=['GET'])
def get_order(order_id):
    order = find_order_by_id_or_number(order_id)
    if not order:
        return jsonify({'success': False, 'message': f"Order '{order_id}' not found."}), 404
    return jsonify({'success': True, 'order': order.to_dict()})

@app.route('/api/orders/<order_id>', methods=['PUT', 'POST'])
def update_order(order_id):
    order = find_order_by_id_or_number(order_id)
    if not order:
        return jsonify({'success': False, 'message': f"Order '{order_id}' not found."}), 404
    data = request.form.to_dict() if request.form else (request.get_json() or {})
    
    try:
        # Update customer
        if order.customer:
            if data.get('customer_name'): order.customer.name = data.get('customer_name').strip()
            if data.get('phone'): order.customer.phone = data.get('phone').strip()
            if 'email' in data: order.customer.email = data.get('email', '').strip() or None
            if 'address' in data: order.customer.address = data.get('address', '').strip() or None

        # Handle cake photo upload replacement
        if 'cake_photo' in request.files:
            file = request.files['cake_photo']
            if file and file.filename and allowed_file(file.filename):
                ext = file.filename.rsplit('.', 1)[1].lower()
                unique_filename = f"cake_{int(datetime.now().timestamp())}_{uuid.uuid4().hex[:6]}.{ext}"
                file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
                file.save(file_path)
                order.cake_image_path = f"/static/uploads/{unique_filename}"
        elif data.get('remove_image') == 'true':
            order.cake_image_path = '/static/images/placeholders/cake_placeholder.png'

        # Update cake details
        if data.get('cake_name'): order.cake_name = data.get('cake_name').strip()
        if data.get('flavour'): order.flavour = data.get('flavour').strip()
        if data.get('weight'): order.weight = data.get('weight').strip()
        if data.get('shape'): order.shape = data.get('shape').strip()
        if 'design_description' in data: order.design_description = data.get('design_description', '').strip()
        if 'theme' in data: order.theme = data.get('theme', '').strip()
        if 'colour' in data: order.colour = data.get('colour', '').strip()
        if 'decorations' in data: order.decorations = data.get('decorations', '').strip()
        if 'egg_preference' in data: order.egg_preference = data.get('egg_preference', 'Eggless').strip()
        if 'custom_message' in data: order.custom_message = data.get('custom_message', '').strip()
        if 'special_instructions' in data: order.special_instructions = data.get('special_instructions', '').strip()

        # Update delivery & order details
        if data.get('delivery_date'): order.delivery_date = data.get('delivery_date').strip()
        if data.get('delivery_time'): order.delivery_time = data.get('delivery_time').strip()
        if 'delivery_address' in data: order.delivery_address = data.get('delivery_address', '').strip()
        if data.get('status'): order.status = data.get('status').strip()
        if 'assigned_baker' in data: order.assigned_baker = data.get('assigned_baker', '').strip()
        if 'payment_method' in data: order.payment_method = data.get('payment_method', 'UPI').strip()

        # Financials
        if 'total_price' in data:
            order.total_price = max(0.0, float(data.get('total_price') or 0.0))
        if 'advance_payment' in data:
            order.advance_payment = max(0.0, float(data.get('advance_payment') or 0.0))

        order.calculate_balance()
        db.session.commit()

        return jsonify({
            'success': True,
            'message': f"Order {order.order_number} updated successfully!",
            'order': order.to_dict()
        })

    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f"Error updating order: {str(e)}"}), 500

@app.route('/api/orders/<order_id>/status', methods=['PATCH', 'POST'])
def update_order_status(order_id):
    order = find_order_by_id_or_number(order_id)
    if not order:
        return jsonify({'success': False, 'message': f"Order '{order_id}' not found."}), 404
    data = request.get_json() or {}
    new_status = data.get('status', '').strip()

    valid_statuses = ['Pending', 'Preparing', 'Ready', 'Delivered']
    matched_status = next((s for s in valid_statuses if s.lower() == new_status.lower()), None)
    if not matched_status:
        return jsonify({'success': False, 'message': 'Invalid status'}), 400

    order.status = matched_status
    db.session.commit()

    all_orders = Order.query.all()
    status_counts = {
        'all': len(all_orders),
        'pending': sum(1 for o in all_orders if o.status.lower() == 'pending'),
        'preparing': sum(1 for o in all_orders if o.status.lower() == 'preparing'),
        'ready': sum(1 for o in all_orders if o.status.lower() == 'ready'),
        'delivered': sum(1 for o in all_orders if o.status.lower() == 'delivered')
    }

    return jsonify({
        'success': True,
        'message': f"Order status updated to {matched_status}",
        'order': order.to_dict(),
        'status_counts': status_counts
    })

@app.route('/api/orders/<order_id>', methods=['DELETE', 'POST'])
@app.route('/api/orders/<order_id>/delete', methods=['DELETE', 'POST'])
def delete_order(order_id):
    try:
        order = find_order_by_id_or_number(order_id)
        if not order:
            return jsonify({'success': False, 'message': f"Order '{order_id}' not found."}), 404
        order_num = order.order_number
        db.session.delete(order)
        db.session.commit()
        return jsonify({'success': True, 'message': f"Order {order_num} has been deleted."})
    except Exception as e:
        db.session.rollback()
        return jsonify({'success': False, 'message': f"Failed to delete order: {str(e)}"}), 500

# ----------------- CUSTOMER APIS -----------------

@app.route('/api/customers', methods=['GET'])
def get_customers():
    search = request.args.get('search', '').strip()
    query = Customer.query
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            db.or_(
                Customer.name.ilike(search_pattern),
                Customer.phone.ilike(search_pattern),
                Customer.email.ilike(search_pattern)
            )
        )
    customers = query.order_by(Customer.name.asc()).all()
    return jsonify({
        'success': True,
        'customers': [c.to_dict() for c in customers]
    })

@app.route('/api/customers/<int:customer_id>', methods=['GET'])
def get_customer_details(customer_id):
    customer = db.get_or_404(Customer, customer_id)
    return jsonify({
        'success': True,
        'customer': customer.to_dict(include_orders=True)
    })

# ----------------- STATS & CALENDAR APIS -----------------

@app.route('/api/stats', methods=['GET'])
def get_stats():
    orders = Order.query.all()
    today_str = date.today().strftime('%Y-%m-%d')
    
    total_orders = len(orders)
    pending_orders = sum(1 for o in orders if o.status.lower() == 'pending')
    preparing_orders = sum(1 for o in orders if o.status.lower() == 'preparing')
    ready_orders = sum(1 for o in orders if o.status.lower() == 'ready')
    delivered_orders = sum(1 for o in orders if o.status.lower() == 'delivered')

    # Today's financials and stats
    today_orders = [o for o in orders if o.delivery_date == today_str]
    total_sales = sum(o.total_price for o in orders)
    advance_received = sum(o.advance_payment for o in orders)
    outstanding_balance = sum(o.remaining_balance for o in orders)

    # Date-by-date delivery map for calendar
    calendar_dates = {}
    for o in orders:
        d = o.delivery_date
        if d not in calendar_dates:
            calendar_dates[d] = {
                'count': 0,
                'pending': 0,
                'preparing': 0,
                'ready': 0,
                'delivered': 0,
                'orders': []
            }
        calendar_dates[d]['count'] += 1
        st = o.status.lower()
        if st in calendar_dates[d]:
            calendar_dates[d][st] += 1
        calendar_dates[d]['orders'].append({
            'id': o.id,
            'order_number': o.order_number,
            'cake_name': o.cake_name,
            'flavour': o.flavour,
            'weight': o.weight,
            'customer_name': o.customer.name if o.customer else 'Guest',
            'delivery_time': o.delivery_time,
            'status': o.status,
            'cake_image_path': o.cake_image_path
        })

    return jsonify({
        'success': True,
        'today_date': today_str,
        'total_orders': total_orders,
        'pending': pending_orders,
        'preparing': preparing_orders,
        'ready': ready_orders,
        'delivered': delivered_orders,
        'today_count': len(today_orders),
        'total_sales': round(total_sales, 2),
        'advance_received': round(advance_received, 2),
        'outstanding_balance': round(outstanding_balance, 2),
        'calendar_dates': calendar_dates
    })

# ----------------- CSV EXPORT -----------------

@app.route('/api/export/csv', methods=['GET'])
def export_csv():
    orders = Order.query.order_by(Order.delivery_date.desc(), Order.id.desc()).all()
    
    output = io.StringIO()
    # Write UTF-8 BOM so Excel opens it cleanly with Indian Rupee symbol
    output.write('\ufeff')
    writer = csv.writer(output)
    
    # Headers
    writer.writerow([
        'Order Number', 'Customer Name', 'Phone', 'Email',
        'Cake Name', 'Flavour', 'Weight', 'Shape', 'Egg Preference',
        'Custom Message', 'Delivery Date', 'Delivery Time', 'Delivery Address',
        'Status', 'Total Price (INR)', 'Advance Paid (INR)', 'Remaining Balance (INR)',
        'Payment Status', 'Payment Method', 'Baker'
    ])

    for o in orders:
        cust_name = o.customer.name if o.customer else ''
        cust_phone = o.customer.phone if o.customer else ''
        cust_email = o.customer.email if o.customer else ''
        writer.writerow([
            o.order_number, cust_name, cust_phone, cust_email,
            o.cake_name, o.flavour, o.weight, o.shape, o.egg_preference,
            o.custom_message, o.delivery_date, o.delivery_time, o.delivery_address,
            o.status, o.total_price, o.advance_payment, o.remaining_balance,
            o.payment_status, o.payment_method, o.assigned_baker
        ])

    output.seek(0)
    filename = f"desserts_orders_{date.today().strftime('%Y%m%d')}.csv"
    return send_file(
        io.BytesIO(output.getvalue().encode('utf-8-sig')),
        mimetype='text/csv',
        as_attachment=True,
        download_name=filename
    )


@app.errorhandler(404)
def handle_404(e):
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'message': 'API endpoint or resource not found'}), 404
    return render_template('index.html'), 404

@app.errorhandler(405)
def handle_405(e):
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'message': 'Method not allowed for this API endpoint'}), 405
    return render_template('index.html'), 405

@app.errorhandler(500)
def handle_500(e):
    if request.path.startswith('/api/'):
        return jsonify({'success': False, 'message': 'Internal server error'}), 500
    return render_template('index.html'), 500

if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        seed_database(app)
    app.run(host='127.0.0.1', port=5000, debug=True)
