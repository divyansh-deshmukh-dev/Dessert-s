import os
import io
import unittest
from PIL import Image
from app import app, db
from models import Order, Customer

class CakeShopAppTestCase(unittest.TestCase):
    def setUp(self):
        app.config['TESTING'] = True
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        self.app_context = app.app_context()
        self.app_context.push()
        db.create_all()
        from seed import seed_database
        seed_database(app)
        self.client = app.test_client()

    def tearDown(self):
        db.session.remove()
        self.app_context.pop()

    def test_01_index_page(self):
        resp = self.client.get('/')
        self.assertEqual(resp.status_code, 200)
        self.assertIn(b"Dessert's", resp.data)
        self.assertIn(b"Today's Orders", resp.data)
        print("[PASS] Test 01: Index page rendered successfully.")

    def test_02_get_orders_and_counts(self):
        resp = self.client.get('/api/orders')
        self.assertEqual(resp.status_code, 200)
        data = resp.json
        self.assertTrue(data['success'])
        self.assertGreaterEqual(len(data['orders']), 1)
        
        # Check status counts
        counts = data['status_counts']
        self.assertIn('all', counts)
        self.assertIn('pending', counts)
        self.assertIn('preparing', counts)
        self.assertIn('ready', counts)
        self.assertIn('delivered', counts)
        print(f"[PASS] Test 02: Orders and status counts verified: {counts}")

    def test_03_status_filtering(self):
        resp = self.client.get('/api/orders?status=Ready')
        self.assertEqual(resp.status_code, 200)
        data = resp.json
        for o in data['orders']:
            self.assertEqual(o['status'].lower(), 'ready')
        print(f"[PASS] Test 03: Status filter 'Ready' returned {len(data['orders'])} orders.")

    def test_04_search_filter(self):
        # Search by customer name "Priya"
        resp = self.client.get('/api/orders?search=Priya')
        self.assertEqual(resp.status_code, 200)
        data = resp.json
        self.assertGreaterEqual(len(data['orders']), 1)
        self.assertIn('Priya', data['orders'][0]['customer']['name'])

        # Search by order number "C102"
        resp2 = self.client.get('/api/orders?search=C102')
        self.assertEqual(resp2.status_code, 200)
        data2 = resp2.json
        self.assertEqual(len(data2['orders']), 1)
        self.assertEqual(data2['orders'][0]['order_number'], 'C102')
        print("[PASS] Test 04: Search functionality verified.")

    def test_05_stats_and_calendar(self):
        resp = self.client.get('/api/stats')
        self.assertEqual(resp.status_code, 200)
        data = resp.json
        self.assertTrue(data['success'])
        self.assertGreater(data['total_sales'], 0)
        self.assertIn('calendar_dates', data)
        self.assertGreater(len(data['calendar_dates']), 0)
        print(f"[PASS] Test 05: Stats verified: Sales INR {data['total_sales']}, Calendar dates: {len(data['calendar_dates'])}")

    def test_06_create_order_with_photo_upload(self):
        # Create a dummy image in memory
        img_byte_arr = io.BytesIO()
        img = Image.new('RGB', (100, 100), color=(255, 180, 190))
        img.save(img_byte_arr, format='JPEG')
        img_byte_arr.seek(0)

        order_payload = {
            'customer_name': 'Aarohi Sen',
            'phone': '+91 91122 33445',
            'email': 'aarohi@example.com',
            'address': 'Flat 101, Sunshine Park, Pune',
            'cake_name': 'Rose Gold Pistachio Cake',
            'flavour': 'Pistachio Rose',
            'weight': '1.5 kg',
            'shape': 'Heart',
            'egg_preference': 'Eggless',
            'theme': 'Vintage Romantic',
            'colour': 'Blush Pink & Gold',
            'decorations': 'Crushed pistachio, gold foil, dried rose petals',
            'custom_message': 'Happy Anniversary Aarohi & Kabir',
            'special_instructions': 'Strictly eggless, deliver by 4 PM.',
            'order_date': '2026-10-11',
            'delivery_date': '2026-10-15',
            'delivery_time': '04:00 PM',
            'status': 'Pending',
            'assigned_baker': 'Chef Meera',
            'total_price': '1850.0',
            'advance_payment': '1000.0',
            'payment_method': 'UPI'
        }

        # Send multipart form data with file
        data = {**order_payload, 'cake_photo': (img_byte_arr, 'custom_cake.jpg')}
        resp = self.client.post('/api/orders', data=data, content_type='multipart/form-data')
        self.assertEqual(resp.status_code, 201)
        res_json = resp.json
        self.assertTrue(res_json['success'])
        created_order = res_json['order']
        self.assertEqual(created_order['cake_name'], 'Rose Gold Pistachio Cake')
        self.assertEqual(created_order['remaining_balance'], 850.0)
        self.assertTrue(created_order['cake_image_path'].startswith('/static/uploads/'))

        # Verify image file exists persistently on filesystem
        rel_path = created_order['cake_image_path'].lstrip('/')
        self.assertTrue(os.path.exists(rel_path), f"File {rel_path} must exist on disk")
        print(f"[PASS] Test 06: Order {created_order['order_number']} created with photo persistently saved at {rel_path}")

        # Test Status Update
        order_id = created_order['id']
        patch_resp = self.client.patch(f'/api/orders/{order_id}/status', json={'status': 'Preparing'})
        self.assertEqual(patch_resp.status_code, 200)
        self.assertEqual(patch_resp.json['order']['status'], 'Preparing')
        print(f"[PASS] Test 07: Status successfully patched to 'Preparing'")

        # Test Delete by ID
        del_resp = self.client.delete(f'/api/orders/{order_id}')
        self.assertEqual(del_resp.status_code, 200)
        self.assertTrue(del_resp.json['success'])
        print(f"[PASS] Test 08: Order {order_id} successfully deleted via DELETE.")

        # Test Delete non-existent order returns 404 JSON
        del_404 = self.client.delete(f'/api/orders/{order_id}')
        self.assertEqual(del_404.status_code, 404)
        self.assertFalse(del_404.json['success'])
        self.assertIn('not found', del_404.json['message'])
        print(f"[PASS] Test 08b: Deleting non-existent order returns clean JSON 404.")

    def test_09_customers_api(self):
        resp = self.client.get('/api/customers')
        self.assertEqual(resp.status_code, 200)
        data = resp.json
        self.assertTrue(data['success'])
        self.assertGreater(len(data['customers']), 0)
        print(f"[PASS] Test 09: Customers API returned {len(data['customers'])} customers.")

    def test_10_csv_export(self):
        resp = self.client.get('/api/export/csv')
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.content_type, 'text/csv; charset=utf-8')
        self.assertIn(b"Order Number", resp.data)
        print("[PASS] Test 10: CSV export generated successfully.")

if __name__ == '__main__':
    unittest.main()
