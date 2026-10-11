# Dessert's — Bakery Order Management System 🎂

A complete, modern, responsive Cake Shop Order Management application designed for **"Dessert's"**, an artisanal cake shop and bakery studio. Inspired by a premium bakery dashboard aesthetic, featuring soft pastel pinks, creams, dark chocolate typography, and intuitive real-time order tracking.

---

## ✨ Key Features

### 1. Dashboard & Order Tracking
- **Order Status Tabs**: Instant filtering with live order counters:
  - `All` (12)
  - `Pending` (4)
  - `Preparing` (3)
  - `Ready` (3)
  - `Delivered` (2)
- **Visual Order Table**:
  - Auto-generated sequential order numbers (e.g. `C101`, `C102`) with weight pill badges.
  - High-resolution thumbnails of the actual cake requested.
  - Customer contact details with direct phone link.
  - Cake specifications (Flavour, Weight, Shape, Price in ₹).
  - Delivery dates with smart relative flags (`Today`, `Tomorrow`, `Day after`).
  - Color-coded status badges with quick status change menus.
  - Quick actions: View Details, Edit Order, Print Ticket, Delete.
- **Search & Filters**:
  - Global live search across Order Number, Customer Name, Phone Number, and Cake Flavour.
  - Filter by Flavour, Delivery Date, and Status.
  - Sort by Newest, Earliest Delivery, Latest Delivery, and Price.

### 2. Add & Edit Cake Orders (Core Feature)
- **Customer Information**: Full name, contact number, optional email, delivery address, and extra notes.
- **Cake Details**:
  - Cake Type / Name
  - Flavour (Vanilla, Chocolate, Red Velvet, Butterscotch, Blueberry, etc.)
  - Weight (500 g, 1 kg, 1.5 kg, 2 kg, 2.5 kg, 3 kg, Custom)
  - Shape (Round, Square, Heart, Tiered, Custom)
  - Dietary Preference (Eggless / Contains Egg)
  - Theme & Colour Palette
  - Decorations & Toppings
  - Custom Text to Write on Cake
  - Special Instructions & Baker Notes
- **Persistent Cake Photo Upload**:
  - Drag-and-drop zone with instant visual preview.
  - Browse file selector for JPG, PNG, and WEBP formats.
  - Replace and remove options.
  - Persistent server-side storage in `/static/uploads/`.
- **Order & Financial Calculation**:
  - Real-time balance calculation: `Remaining Balance = Total Price - Advance Payment`.
  - Prevents negative balances or advance payments exceeding total price.
  - Payment method options (UPI, Cash on Delivery, Card, Bank Transfer).
  - "Save Order" and "Save & Add Another" workflows.

### 3. Interactive Calendars
- **Right-Side Mini Calendar**: Current month overview with delivery dot indicators on scheduled dates. Clicking any date instantly filters orders for that day.
- **Full Calendar View**: Dedicated monthly calendar grid with daily delivery counts and a drawer showing scheduled cake deliveries for any selected date.

### 4. Specialized Operations Views
- **Delivery Management View**: Delivery cards displaying customer address, phone number, cake image, delivery time slot, balance due, and a one-click "Delivered" completion button.
- **Customer Directory**: Customer profiles tracking lifetime orders and total spend in ₹, with an order history modal showcasing past cakes ordered.
- **Printing & Reports**:
  - Clean `@media print` layout hiding sidebars and buttons.
  - Print Daily Orders Manifest.
  - Print individual Kitchen Order Tickets / Invoices.
  - One-click CSV export with UTF-8 BOM encoding for Excel.

---

## 🗂️ Project Structure

```
d:\Dessert's\
├── app.py                     # Flask application entry point, REST APIs, and image handlers
├── config.py                  # App configuration (paths, limits, secret key)
├── models.py                  # SQLAlchemy models (Order, Customer)
├── seed.py                    # Database seeder with 12 realistic bakery orders & customers
├── download_samples.py        # Utility to download/generate sample cake photography
├── test_app.py                # Comprehensive automated test suite
├── requirements.txt           # Python dependencies
├── static/
│   ├── css/
│   │   ├── style.css          # Main stylesheet with pastel pink theme & responsive layout
│   │   └── print.css          # Print-optimized stylesheet for orders & tickets
│   ├── js/
│   │   ├── app.js             # Core frontend controller (views, table, modals, search)
│   │   ├── calendar.js        # Mini & full interactive calendar module
│   │   └── order-form.js      # Add/Edit order form with live balance calculation & drag-drop
│   ├── images/
│   │   ├── logo.svg           # Custom Dessert's cake brand logo
│   │   ├── sample_cakes/      # Sample cake photos (Vanilla, Chocolate drip, Red velvet, etc.)
│   │   └── placeholders/      # Default fallback cake illustration
│   └── uploads/               # Persistent directory for user-uploaded cake images
└── templates/
    └── index.html             # Responsive Single-Page Application layout & modals
```

---

## 🚀 Installation & Running Locally

### 1. Requirements
- Python 3.10+ (tested on Python 3.13)
- pip

### 2. Install Dependencies
```bash
pip install -r requirements.txt
```

### 3. Initialize & Seed Database
The application automatically creates the SQLite database (`desserts.db`) and seeds it with 12 realistic orders on first launch. To manually run or inspect the seeder:
```bash
python seed.py
```

### 4. Start the Application
```bash
python app.py
```
Open your web browser and navigate to:
```
http://127.0.0.1:5000
```

---

## 🧪 Running Automated Tests

Run the test suite to verify all endpoints, database operations, and photo uploads:
```bash
python test_app.py
```
All 8 test suites validate:
- HTML view rendering
- Order filtering and live count accuracy
- Keyword search across names, order IDs, and flavours
- Date filtering and statistics API
- Order creation with file upload persistence
- Status patching (`Pending` → `Preparing` → `Ready` → `Delivered`)
- Customer order history tracking
- CSV report generation

---

## 📸 Image Upload Persistence

When a user uploads a cake photo in the **Add Order** or **Edit Order** form:
1. The server generates a unique timestamped filename: `cake_<timestamp>_<uuid>.<ext>`.
2. The file is saved directly to disk in `static/uploads/`.
3. The file path (`/static/uploads/...`) is saved in the SQLite `orders` table.
4. Images remain accessible across server restarts, browser refreshes, and database queries.
5. If no photo is provided, a clean placeholder cake illustration is displayed.
