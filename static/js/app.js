/**
 * Dessert's - Main Application Controller
 * Handles views, orders table, customer directory, delivery management, modals, and printing
 */

const App = {
  currentView: 'dashboard',
  currentStatus: 'All',
  currentDateFilter: '',
  currentSearch: '',
  currentSort: 'newest',
  currentPage: 1,
  totalPages: 1,
  stats: {},
  allOrdersList: [],
  selectedOrderForDelete: null,

  async init() {
    this.bindNavigation();
    this.bindSearchAndFilters();
    this.bindMobileSidebar();
    this.setupDateDisplay();
    
    // Initialize submodules
    if (window.OrderFormModule) window.OrderFormModule.init();

    await this.refreshDashboard();

    // Re-create icons if Lucide is available
    if (window.lucide) window.lucide.createIcons();
  },

  setupDateDisplay() {
    const today = new Date();
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    const dateStr = today.toLocaleDateString('en-IN', options);
    const dateEl = document.getElementById('current-date-text');
    if (dateEl) dateEl.textContent = dateStr;
  },

  bindMobileSidebar() {
    const mobileBtn = document.getElementById('mobile-menu-toggle');
    const closeBtn = document.getElementById('close-sidebar-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');

    const toggleSidebar = (open) => {
      if (open) {
        sidebar.classList.add('mobile-open');
        if (overlay) overlay.classList.add('active');
      } else {
        sidebar.classList.remove('mobile-open');
        if (overlay) overlay.classList.remove('active');
      }
    };

    if (mobileBtn && sidebar) {
      mobileBtn.addEventListener('click', () => {
        const isOpen = sidebar.classList.contains('mobile-open');
        toggleSidebar(!isOpen);
      });
    }

    if (closeBtn && sidebar) {
      closeBtn.addEventListener('click', () => toggleSidebar(false));
    }

    if (overlay) {
      overlay.addEventListener('click', () => toggleSidebar(false));
    }
  },

  bindNavigation() {
    const navItems = document.querySelectorAll('.nav-item[data-view]');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        const view = item.getAttribute('data-view');
        this.switchView(view);
      });
    });
  },

  switchView(viewName) {
    this.currentView = viewName;

    // Update active nav item
    document.querySelectorAll('.nav-item').forEach(item => {
      if (item.getAttribute('data-view') === viewName) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });

    // Close mobile sidebar if open
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('mobile-open');
    if (overlay) overlay.classList.remove('active');

    // Hide specialized view containers
    const specializedViews = ['delivery', 'calendar', 'customers', 'settings'];
    specializedViews.forEach(v => {
      const el = document.getElementById(`view-${v}`);
      if (el) el.style.display = 'none';
    });

    const ordersSection = document.getElementById('view-dashboard');
    const rightPanel = document.getElementById('right-panel');

    const isOrdersView = ['dashboard', 'all-orders', 'pending-orders', 'ready-orders'].includes(viewName);

    if (isOrdersView) {
      if (ordersSection) ordersSection.style.display = 'flex';
      if (rightPanel) rightPanel.style.display = 'flex';

      const headingIcon = document.getElementById('orders-view-icon');
      const headingText = document.getElementById('orders-view-heading');
      const dateBadge = document.getElementById('current-date-text');
      const filterBar = document.getElementById('all-orders-filter-bar');

      if (viewName === 'dashboard') {
        if (headingIcon) headingIcon.setAttribute('data-lucide', 'calendar');
        if (headingText) headingText.textContent = "Today's Orders";
        if (dateBadge) dateBadge.style.display = 'inline-block';
        if (filterBar) filterBar.style.display = 'flex';
        this.currentStatus = 'All';
      } else if (viewName === 'all-orders') {
        if (headingIcon) headingIcon.setAttribute('data-lucide', 'list-ordered');
        if (headingText) headingText.textContent = "All Orders Directory";
        if (dateBadge) dateBadge.style.display = 'none';
        if (filterBar) filterBar.style.display = 'flex';
        this.currentStatus = 'All';
      } else if (viewName === 'pending-orders') {
        if (headingIcon) headingIcon.setAttribute('data-lucide', 'clock');
        if (headingText) headingText.textContent = "Pending Orders";
        if (dateBadge) dateBadge.style.display = 'none';
        if (filterBar) filterBar.style.display = 'flex';
        this.currentStatus = 'Pending';
      } else if (viewName === 'ready-orders') {
        if (headingIcon) headingIcon.setAttribute('data-lucide', 'check-circle-2');
        if (headingText) headingText.textContent = "Ready Orders";
        if (dateBadge) dateBadge.style.display = 'none';
        if (filterBar) filterBar.style.display = 'flex';
        this.currentStatus = 'Ready';
      }

      this.updateStatusTabsUI();
      this.fetchOrders();

    } else if (viewName === 'add-order') {
      // Trigger Add Order modal and remain on current view
      if (window.OrderFormModule) window.OrderFormModule.openAddOrderModal();
    } else {
      // Hide orders view and right panel for specialized screens
      if (ordersSection) ordersSection.style.display = 'none';
      if (rightPanel) rightPanel.style.display = 'none';

      if (viewName === 'delivery') {
        const el = document.getElementById('view-delivery');
        if (el) el.style.display = 'flex';
        this.fetchDeliveryOrders();
      } else if (viewName === 'calendar') {
        const el = document.getElementById('view-calendar');
        if (el) el.style.display = 'flex';
        if (window.CalendarModule) window.CalendarModule.renderFullCalendar();
      } else if (viewName === 'customers') {
        const el = document.getElementById('view-customers');
        if (el) el.style.display = 'flex';
        this.fetchCustomers();
      } else if (viewName === 'settings') {
        const el = document.getElementById('view-settings');
        if (el) el.style.display = 'flex';
      }
    }

    window.scrollTo({ top: 0, behavior: 'smooth' });
    if (window.lucide) window.lucide.createIcons();
  },

  resetFilters() {
    this.currentSearch = '';
    this.currentDateFilter = '';
    this.currentStatus = 'All';
    this.currentFlavour = '';
    this.currentSort = 'newest';
    this.currentPage = 1;

    const searchInput = document.getElementById('global-search-input');
    if (searchInput) searchInput.value = '';

    const flavourSelect = document.getElementById('filter-flavour-select');
    if (flavourSelect) flavourSelect.value = '';

    const sortSelect = document.getElementById('all-orders-sort');
    if (sortSelect) sortSelect.value = 'newest';

    const dateTitle = document.getElementById('dashboard-date-filter-label');
    if (dateTitle) dateTitle.style.display = 'none';

    this.updateStatusTabsUI();
    this.fetchOrders();
  },

  bindSearchAndFilters() {
    // Global Header Search
    const searchInput = document.getElementById('global-search-input');
    if (searchInput) {
      let timeout = null;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
          this.currentSearch = e.target.value.trim();
          this.currentPage = 1;
          this.fetchOrders();
        }, 300);
      });
    }

    // Status Filter Tabs in Dashboard
    const statusTabs = document.querySelectorAll('.tab-btn[data-status]');
    statusTabs.forEach(tab => {
      tab.addEventListener('click', () => {
        this.currentStatus = tab.getAttribute('data-status');
        this.currentPage = 1;
        this.updateStatusTabsUI();
        this.fetchOrders();
      });
    });

    // Sort Dropdown in All Orders
    const sortSelect = document.getElementById('all-orders-sort');
    if (sortSelect) {
      sortSelect.addEventListener('change', (e) => {
        this.currentSort = e.target.value;
        this.currentPage = 1;
        this.fetchOrders();
      });
    }

    // Flavour Filter
    const flavourSelect = document.getElementById('filter-flavour-select');
    if (flavourSelect) {
      flavourSelect.addEventListener('change', (e) => {
        this.currentFlavour = e.target.value;
        this.currentPage = 1;
        this.fetchOrders();
      });
    }
  },

  updateStatusTabsUI() {
    document.querySelectorAll('.tab-btn[data-status]').forEach(tab => {
      if (tab.getAttribute('data-status').toLowerCase() === this.currentStatus.toLowerCase()) {
        tab.classList.add('active');
      } else {
        tab.classList.remove('active');
      }
    });
  },

  filterByDate(dateStr) {
    this.currentDateFilter = dateStr;
    this.currentPage = 1;

    // Update title text if filtered
    const dateTitle = document.getElementById('dashboard-date-filter-label');
    if (dateTitle) {
      if (dateStr) {
        dateTitle.textContent = `Filtered: ${dateStr}`;
        dateTitle.style.display = 'inline-block';
      } else {
        dateTitle.style.display = 'none';
      }
    }

    this.fetchOrders();
  },

  async refreshDashboard() {
    await this.fetchStats();
    await this.fetchOrders();
  },

  async fetchStats() {
    try {
      const resp = await fetch('/api/stats');
      const data = await resp.json();
      if (data.success) {
        this.stats = data;

        // Update Right Panel Counts
        this.setText('stat-total-orders', data.total_orders);
        this.setText('stat-pending-orders', data.pending);
        this.setText('stat-preparing-orders', data.preparing);
        this.setText('stat-ready-orders', data.ready);
        this.setText('stat-delivered-orders', data.delivered);

        // Update Tab Counts
        this.setText('count-tab-all', data.total_orders);
        this.setText('count-tab-pending', data.pending);
        this.setText('count-tab-preparing', data.preparing);
        this.setText('count-tab-ready', data.ready);
        this.setText('count-tab-delivered', data.delivered);

        // Update Sidebar Nav Badges
        this.setText('nav-badge-pending', data.pending);
        this.setText('nav-badge-ready', data.ready);

        // Update Financial metrics
        this.setText('stat-total-sales', `₹${data.total_sales.toLocaleString('en-IN')}`);
        this.setText('stat-advance-received', `₹${data.advance_received.toLocaleString('en-IN')}`);
        this.setText('stat-balance-outstanding', `₹${data.outstanding_balance.toLocaleString('en-IN')}`);

        // Update Calendar
        if (window.CalendarModule) {
          window.CalendarModule.updateData(data.calendar_dates);
        }
      }
    } catch (e) {
      console.error('Error fetching stats:', e);
    }
  },

  setText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
  },

  async fetchOrders() {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align:center; padding: 40px; color: var(--text-muted);">
          <div style="display:flex; justify-content:center; align-items:center; gap:8px;">
            <span>Loading bakery orders...</span>
          </div>
        </td>
      </tr>
    `;

    try {
      let url = `/api/orders?page=${this.currentPage}&per_page=8&status=${encodeURIComponent(this.currentStatus)}`;
      if (this.currentSearch) url += `&search=${encodeURIComponent(this.currentSearch)}`;
      if (this.currentDateFilter) url += `&date=${encodeURIComponent(this.currentDateFilter)}`;
      if (this.currentSort) url += `&sort=${encodeURIComponent(this.currentSort)}`;
      if (this.currentFlavour) url += `&flavour=${encodeURIComponent(this.currentFlavour)}`;

      const resp = await fetch(url);
      const data = await resp.json();

      if (!data.success) {
        tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#C53030;">Failed to load orders.</td></tr>`;
        return;
      }

      this.allOrdersList = data.orders;
      this.totalPages = data.total_pages;

      this.renderOrdersTable(data.orders, data.total_count, data.page);
      this.renderPagination(data.total_count, data.page, data.total_pages);

      // Re-create icons
      if (window.lucide) window.lucide.createIcons();

    } catch (err) {
      console.error(err);
      tableBody.innerHTML = `<tr><td colspan="7" style="text-align:center; padding:30px; color:#C53030;">Error loading orders.</td></tr>`;
    }
  },

  renderOrdersTable(orders, totalCount, page) {
    const tableBody = document.getElementById('orders-table-body');
    if (!tableBody) return;

    if (orders.length === 0) {
      tableBody.innerHTML = `
        <tr>
          <td colspan="7" style="text-align:center; padding: 50px 20px;">
            <div style="display:flex; flex-direction:column; align-items:center; gap:10px;">
              <img src="/static/images/placeholders/cake_placeholder.png" style="width:70px; opacity:0.6;">
              <h4 style="font-size:16px; color:var(--text-secondary);">No orders found</h4>
              <p class="text-muted" style="max-width:300px; font-size:13px;">No cake orders match your current filters. Try resetting the search or add a new order.</p>
              <button class="btn btn-primary btn-sm" onclick="OrderFormModule.openAddOrderModal()">
                + Add New Order
              </button>
            </div>
          </td>
        </tr>
      `;
      return;
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    tableBody.innerHTML = orders.map(ord => {
      // Relative date label
      let relativeDate = '';
      if (ord.delivery_date === todayStr) {
        relativeDate = '(Today)';
      } else if (ord.delivery_date === tomorrowStr) {
        relativeDate = '(Tomorrow)';
      } else {
        const d = new Date(ord.delivery_date + 'T00:00:00');
        const diffDays = Math.round((d - new Date(todayStr + 'T00:00:00')) / (1000 * 60 * 60 * 24));
        if (diffDays === -1) relativeDate = '(Yesterday)';
        else if (diffDays === 2) relativeDate = '(Day after)';
        else if (diffDays > 2) relativeDate = `(In ${diffDays} days)`;
      }

      const formattedDeliveryDate = new Date(ord.delivery_date + 'T00:00:00').toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });

      const customerName = ord.customer ? ord.customer.name : 'Walk-in Customer';
      const customerPhone = ord.customer ? ord.customer.phone : '-';

      return `
        <tr data-order-id="${ord.id}">
          <!-- Order No & Weight -->
          <td>
            <div class="order-no-cell">
              <span class="order-num-text">${ord.order_number}</span>
              <span class="weight-pill">${ord.weight}</span>
            </div>
          </td>

          <!-- Cake Photo Thumbnail -->
          <td>
            <div class="cake-thumb-wrapper" onclick="App.viewOrder(${ord.id})" title="View ${ord.cake_name}">
              <img src="${ord.cake_image_path}" class="cake-thumb-img" alt="${ord.cake_name}" onerror="this.src='/static/images/placeholders/cake_placeholder.png'">
            </div>
          </td>

          <!-- Customer -->
          <td>
            <div class="customer-cell">
              <span class="customer-name">${customerName}</span>
              <span class="customer-phone">
                <i data-lucide="phone" style="width:11px; height:11px;"></i> ${customerPhone}
              </span>
            </div>
          </td>

          <!-- Cake Details -->
          <td>
            <div class="cake-details-cell">
              <span class="cake-flavour">${ord.flavour}</span>
              <span class="cake-specs">${ord.weight} | ${ord.shape}</span>
              <span class="cake-price">₹${ord.total_price.toLocaleString('en-IN')}</span>
            </div>
          </td>

          <!-- Delivery Date -->
          <td>
            <div class="delivery-date-cell">
              <span class="delivery-date-text">${formattedDeliveryDate}</span>
              <span class="delivery-rel-text">${relativeDate}</span>
            </div>
          </td>

          <!-- Status Badge -->
          <td>
            <div class="status-dropdown-wrap" style="position:relative;">
              <span class="status-badge ${ord.status.toLowerCase()}" style="cursor:pointer;" onclick="App.toggleStatusMenu(${ord.id}, event)" title="Click to change status">
                <span class="dot"></span>
                <span>${ord.status}</span>
                <i data-lucide="chevron-down" style="width:12px; height:12px; margin-left:2px;"></i>
              </span>
            </div>
          </td>

          <!-- Action Buttons -->
          <td>
            <div class="table-actions">
              <button class="btn-icon" title="View Order Details" onclick="App.viewOrder(${ord.id})">
                <i data-lucide="eye"></i>
              </button>
              <button class="btn-icon" title="Edit Order" onclick="OrderFormModule.openEditOrderModal(${ord.id})">
                <i data-lucide="pencil"></i>
              </button>
              <button class="btn-icon" title="More Options" onclick="App.showOrderActionMenu(${ord.id}, event)">
                <i data-lucide="more-vertical"></i>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  },

  renderPagination(totalCount, page, totalPages) {
    const infoEl = document.getElementById('pagination-info');
    const controlsEl = document.getElementById('pagination-controls');

    if (infoEl) {
      const start = totalCount === 0 ? 0 : (page - 1) * 8 + 1;
      const end = Math.min(page * 8, totalCount);
      infoEl.textContent = `Showing ${start}-${end} of ${totalCount} orders`;
    }

    if (controlsEl) {
      let html = '';
      html += `
        <button class="page-btn" ${page <= 1 ? 'disabled' : ''} onclick="App.goToPage(${page - 1})">
          <i data-lucide="chevron-left" style="width:14px; height:14px;"></i>
        </button>
      `;

      for (let p = 1; p <= totalPages; p++) {
        html += `
          <button class="page-btn ${p === page ? 'active' : ''}" onclick="App.goToPage(${p})">
            ${p}
          </button>
        `;
      }

      html += `
        <button class="page-btn" ${page >= totalPages ? 'disabled' : ''} onclick="App.goToPage(${page + 1})">
          <i data-lucide="chevron-right" style="width:14px; height:14px;"></i>
        </button>
      `;

      controlsEl.innerHTML = html;
    }
  },

  goToPage(pageNum) {
    if (pageNum < 1 || pageNum > this.totalPages) return;
    this.currentPage = pageNum;
    this.fetchOrders();
  },

  async updateOrderStatus(orderId, newStatus) {
    try {
      const resp = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      const data = await resp.json();
      if (!data.success) throw new Error(data.message);

      this.showToast(`Order status updated to ${newStatus}`, 'success');
      await this.refreshDashboard();

      // If view modal is open, refresh it
      const viewModal = document.getElementById('view-order-modal');
      if (viewModal && viewModal.classList.contains('active')) {
        this.viewOrder(orderId);
      }

    } catch (err) {
      this.showToast('Error updating status: ' + err.message, 'error');
    }
  },

  toggleStatusMenu(orderId, event) {
    event.stopPropagation();
    this.removeDropdowns();

    const menu = document.createElement('div');
    menu.className = 'status-floating-menu';
    menu.style.cssText = `
      position: absolute;
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      padding: 6px;
      z-index: 150;
      min-width: 140px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    `;

    const statuses = ['Pending', 'Preparing', 'Ready', 'Delivered'];
    statuses.forEach(st => {
      const item = document.createElement('button');
      item.className = 'btn btn-sm';
      item.style.cssText = `
        text-align: left;
        justify-content: flex-start;
        padding: 6px 10px;
        background: transparent;
        color: var(--text-primary);
        border: none;
      `;
      item.innerHTML = `<span class="dot" style="width:6px; height:6px; border-radius:50%; background:var(--status-${st.toLowerCase()}-dot); margin-right:6px;"></span> ${st}`;
      item.onmouseover = () => item.style.backgroundColor = 'var(--bg-secondary)';
      item.onmouseout = () => item.style.backgroundColor = 'transparent';
      item.onclick = (e) => {
        e.stopPropagation();
        this.removeDropdowns();
        this.updateOrderStatus(orderId, st);
      };
      menu.appendChild(item);
    });

    const target = event.currentTarget;
    target.parentElement.appendChild(menu);

    const closeHandler = () => {
      this.removeDropdowns();
      document.removeEventListener('click', closeHandler);
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
  },

  showOrderActionMenu(orderId, event) {
    event.stopPropagation();
    this.removeDropdowns();

    const ord = (this.orders || []).find(o => o.id === orderId);
    const orderLabel = ord ? ord.order_number : `Order #${orderId}`;

    const menu = document.createElement('div');
    menu.className = 'status-floating-menu';
    menu.style.cssText = `
      position: absolute;
      right: 20px;
      background: #FFFFFF;
      border: 1px solid var(--border-color);
      border-radius: var(--radius-md);
      box-shadow: var(--shadow-lg);
      padding: 6px;
      z-index: 150;
      min-width: 150px;
      display: flex;
      flex-direction: column;
      gap: 3px;
    `;

    menu.innerHTML = `
      <button class="btn btn-sm" style="justify-content:flex-start;" onclick="App.viewOrder(${orderId})">
        <i data-lucide="eye" style="width:14px; height:14px;"></i> View Details
      </button>
      <button class="btn btn-sm" style="justify-content:flex-start;" onclick="OrderFormModule.openEditOrderModal(${orderId})">
        <i data-lucide="pencil" style="width:14px; height:14px;"></i> Edit Order
      </button>
      <button class="btn btn-sm" style="justify-content:flex-start;" onclick="App.printOrderTicket(${orderId})">
        <i data-lucide="printer" style="width:14px; height:14px;"></i> Print Ticket
      </button>
      <div style="height:1px; background:var(--border-light); margin:3px 0;"></div>
      <button class="btn btn-sm" style="justify-content:flex-start; color:#C53030;" onclick="App.confirmDeleteOrder(${orderId}, '${orderLabel}')">
        <i data-lucide="trash-2" style="width:14px; height:14px; color:#C53030;"></i> Delete Order
      </button>
    `;

    event.currentTarget.parentElement.appendChild(menu);
    if (window.lucide) window.lucide.createIcons();

    const closeHandler = () => {
      this.removeDropdowns();
      document.removeEventListener('click', closeHandler);
    };
    setTimeout(() => document.addEventListener('click', closeHandler), 10);
  },

  removeDropdowns() {
    document.querySelectorAll('.status-floating-menu').forEach(el => el.remove());
  },

  /* ==========================================================================
     View Order Details Modal
     ========================================================================== */
  async viewOrder(orderId) {
    try {
      const resp = await fetch(`/api/orders/${orderId}`);
      const data = await resp.json();
      if (!data.success) throw new Error(data.message);

      const ord = data.order;

      const setTxt = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (text !== undefined && text !== null) ? text : '';
      };

      // Update Modal Header & Title
      setTxt('view-modal-order-number', ord.order_number);
      const cakeImg = document.getElementById('view-cake-img');
      if (cakeImg) cakeImg.src = ord.cake_image_path || '/static/images/placeholders/cake_placeholder.png';

      setTxt('view-cake-name', ord.cake_name);
      setTxt('view-cake-flavour', ord.flavour);
      setTxt('view-cake-weight', ord.weight);
      setTxt('view-cake-shape', ord.shape);
      setTxt('view-cake-egg', ord.egg_preference);
      setTxt('view-cake-theme', ord.theme || 'Standard');
      setTxt('view-cake-colour', ord.colour || 'Pastel');
      setTxt('view-cake-decorations', ord.decorations || 'Standard Icing');
      setTxt('view-cake-message', ord.custom_message ? `"${ord.custom_message}"` : 'None');
      setTxt('view-cake-instructions', ord.special_instructions || 'None');
      setTxt('view-cake-description', ord.design_description || 'Custom handcrafted bakery design.');

      // Customer
      setTxt('view-customer-name', ord.customer ? ord.customer.name : 'Walk-in');
      setTxt('view-customer-phone', ord.customer ? ord.customer.phone : '-');
      setTxt('view-customer-email', ord.customer && ord.customer.email ? ord.customer.email : 'N/A');
      setTxt('view-customer-address', ord.delivery_address || (ord.customer ? ord.customer.address : 'Bakery Pickup'));

      // Order & Delivery
      setTxt('view-order-date', ord.order_date);
      setTxt('view-delivery-date', ord.delivery_date);
      setTxt('view-delivery-time', ord.delivery_time);
      setTxt('view-assigned-baker', ord.assigned_baker);

      // Financials
      setTxt('view-total-price', `₹${ord.total_price.toLocaleString('en-IN')}`);
      setTxt('view-advance-payment', `₹${ord.advance_payment.toLocaleString('en-IN')}`);
      setTxt('view-remaining-balance', `₹${ord.remaining_balance.toLocaleString('en-IN')}`);
      setTxt('view-payment-status', ord.payment_status);
      setTxt('view-payment-method', ord.payment_method);

      // Status Stepper
      this.updateStatusStepper(ord.status, ord.id);

      // Buttons
      const editBtn = document.getElementById('view-edit-btn');
      if (editBtn) {
        editBtn.onclick = () => {
          this.closeModal('view-order-modal');
          OrderFormModule.openEditOrderModal(ord.id);
        };
      }

      const printBtn = document.getElementById('view-print-btn');
      if (printBtn) {
        printBtn.onclick = () => {
          this.printOrderTicket(ord.id);
        };
      }

      const deleteBtn = document.getElementById('view-delete-btn');
      if (deleteBtn) {
        deleteBtn.onclick = () => {
          this.confirmDeleteOrder(ord.id, ord.order_number);
        };
      }

      this.openModal('view-order-modal');
      if (window.lucide) window.lucide.createIcons();

    } catch (err) {
      this.showToast('Failed to view order: ' + err.message, 'error');
    }
  },

  updateStatusStepper(currentStatus, orderId) {
    const steps = ['Pending', 'Preparing', 'Ready', 'Delivered'];
    const currentIndex = steps.findIndex(s => s.toLowerCase() === currentStatus.toLowerCase());

    steps.forEach((step, idx) => {
      const stepEl = document.getElementById(`stepper-${step.toLowerCase()}`);
      if (!stepEl) return;

      if (idx <= currentIndex) {
        stepEl.classList.add('active');
      } else {
        stepEl.classList.remove('active');
      }

      // Clicking any step allows moving directly to that status
      stepEl.onclick = () => {
        this.updateOrderStatus(orderId, step);
      };
    });

    const lines = document.querySelectorAll('.step-line');
    lines.forEach((line, idx) => {
      if (idx < currentIndex) {
        line.classList.add('completed');
      } else {
        line.classList.remove('completed');
      }
    });
  },

  /* ==========================================================================
     Delete Confirmation
     ========================================================================== */
  confirmDeleteOrder(orderId, orderLabel = '') {
    if (!orderId) {
      this.showToast('No order selected for deletion.', 'error');
      return;
    }
    this.selectedOrderForDelete = orderId;
    const labelEl = document.getElementById('delete-confirm-order-text');
    if (labelEl) {
      labelEl.textContent = orderLabel ? `Order ${orderLabel}` : `Order #${orderId}`;
    }
    this.openModal('delete-confirm-modal');
  },

  async executeDeleteOrder() {
    const orderId = this.selectedOrderForDelete;
    if (!orderId) {
      this.closeModal('delete-confirm-modal');
      this.showToast('No order selected for deletion.', 'error');
      return;
    }

    const confirmBtn = document.getElementById('confirm-delete-action-btn');
    if (confirmBtn) {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = '<span>Deleting...</span>';
    }

    try {
      let resp = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
        headers: { 'Accept': 'application/json' }
      });

      // Fallback to POST /delete if method not allowed
      if (!resp.ok && (resp.status === 405 || resp.status === 404)) {
        resp = await fetch(`/api/orders/${orderId}/delete`, {
          method: 'POST',
          headers: { 'Accept': 'application/json' }
        });
      }

      const contentType = resp.headers.get('content-type') || '';
      let data = null;
      if (contentType.includes('application/json')) {
        data = await resp.json();
      } else {
        const text = await resp.text();
        throw new Error(text ? text.slice(0, 100) : `HTTP ${resp.status}`);
      }

      if (!resp.ok || !data.success) {
        throw new Error(data.message || `Failed to delete order (HTTP ${resp.status})`);
      }

      this.closeModal('delete-confirm-modal');
      this.closeModal('view-order-modal');
      this.showToast(data.message || 'Order deleted successfully', 'success');

      // Refresh table, stats, and calendar
      await this.refreshDashboard();
      if (typeof CalendarModule !== 'undefined' && CalendarModule.init) {
        CalendarModule.init();
      }
      if (typeof CustomersModule !== 'undefined' && CustomersModule.fetchCustomers) {
        CustomersModule.fetchCustomers();
      }

    } catch (err) {
      console.error('Delete order error:', err);
      this.showToast('Error deleting order: ' + err.message, 'error');
    } finally {
      this.selectedOrderForDelete = null;
      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = 'Delete Order';
      }
    }
  },

  /* ==========================================================================
     Delivery View
     ========================================================================== */
  async fetchDeliveryOrders() {
    const container = document.getElementById('delivery-cards-container');
    if (!container) return;

    container.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Loading delivery orders...</div>`;

    try {
      const resp = await fetch('/api/orders?per_page=all');
      const data = await resp.json();
      if (!data.success) return;

      // Filter to ready or preparing or scheduled orders
      const orders = data.orders.filter(o => o.status !== 'Delivered');

      if (orders.length === 0) {
        container.innerHTML = `
          <div style="grid-column: 1/-1; text-align:center; padding:50px;">
            <p class="text-muted">All scheduled orders are delivered! No active deliveries pending.</p>
          </div>
        `;
        return;
      }

      container.innerHTML = orders.map(ord => `
        <div class="delivery-card">
          <div class="delivery-card-top">
            <img src="${ord.cake_image_path}" class="delivery-cake-img" onerror="this.src='/static/images/placeholders/cake_placeholder.png'">
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between; align-items:center;">
                <span style="font-weight:700; color:var(--primary);">${ord.order_number}</span>
                <span class="status-badge ${ord.status.toLowerCase()}">${ord.status}</span>
              </div>
              <div style="font-weight:700; font-size:14px; margin-top:2px;">${ord.cake_name}</div>
              <div style="font-size:12px; color:var(--text-muted);">${ord.flavour} · ${ord.weight}</div>
            </div>
          </div>

          <div class="info-box" style="padding:10px 12px; font-size:12.5px;">
            <div style="display:flex; align-items:center; gap:6px; font-weight:600;">
              <i data-lucide="user" style="width:14px; height:14px; color:var(--primary);"></i>
              ${ord.customer ? ord.customer.name : 'Customer'}
            </div>
            <div style="display:flex; align-items:center; gap:6px; color:var(--text-muted);">
              <i data-lucide="phone" style="width:14px; height:14px;"></i>
              <a href="tel:${ord.customer ? ord.customer.phone : ''}" style="color:inherit;">${ord.customer ? ord.customer.phone : '-'}</a>
            </div>
            <div style="display:flex; align-items:flex-start; gap:6px; color:var(--text-muted);">
              <i data-lucide="map-pin" style="width:14px; height:14px; margin-top:2px; flex-shrink:0;"></i>
              <span>${ord.delivery_address || 'Address not specified'}</span>
            </div>
            <div style="display:flex; align-items:center; gap:6px; color:var(--text-muted);">
              <i data-lucide="clock" style="width:14px; height:14px;"></i>
              <span>Delivery Time: <strong>${ord.delivery_time}</strong> (${ord.delivery_date})</span>
            </div>
          </div>

          <div style="display:flex; justify-content:space-between; align-items:center; padding-top:4px;">
            <div>
              <div style="font-size:11px; color:var(--text-muted);">Balance Due:</div>
              <div style="font-size:14px; font-weight:700; color:${ord.remaining_balance > 0 ? '#C53030' : '#10B981'};">
                ${ord.remaining_balance > 0 ? `₹${ord.remaining_balance.toLocaleString('en-IN')}` : 'PAID IN FULL'}
              </div>
            </div>
            <div style="display:flex; gap:8px;">
              <button class="btn btn-secondary btn-sm" onclick="App.viewOrder(${ord.id})">Details</button>
              <button class="btn btn-primary btn-sm" onclick="App.updateOrderStatus(${ord.id}, 'Delivered')">
                <i data-lucide="check" style="width:14px; height:14px;"></i> Delivered
              </button>
            </div>
          </div>
        </div>
      `).join('');

      if (window.lucide) window.lucide.createIcons();

    } catch (e) {
      console.error(e);
    }
  },

  /* ==========================================================================
     Customers View
     ========================================================================== */
  async fetchCustomers() {
    const grid = document.getElementById('customers-grid-container');
    if (!grid) return;

    grid.innerHTML = `<div style="text-align:center; padding:40px; color:var(--text-muted);">Loading customers...</div>`;

    try {
      const resp = await fetch('/api/customers');
      const data = await resp.json();
      if (!data.success) return;

      const customers = data.customers;

      grid.innerHTML = customers.map(c => `
        <div class="customer-card" onclick="App.viewCustomerProfile(${c.id})">
          <div class="customer-card-header">
            <div class="customer-avatar">${c.name.charAt(0).toUpperCase()}</div>
            <div>
              <div style="font-weight:700; font-size:15px;">${c.name}</div>
              <div style="font-size:12px; color:var(--text-muted);">${c.phone}</div>
            </div>
          </div>

          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px; margin-top:4px;">
            <div class="info-box" style="padding:8px 10px; text-align:center;">
              <div style="font-size:11px; color:var(--text-muted);">Total Orders</div>
              <div style="font-size:16px; font-weight:700; color:var(--primary);">${c.total_orders}</div>
            </div>
            <div class="info-box" style="padding:8px 10px; text-align:center;">
              <div style="font-size:11px; color:var(--text-muted);">Total Spent</div>
              <div style="font-size:16px; font-weight:700; color:var(--text-primary);">₹${c.total_spent.toLocaleString('en-IN')}</div>
            </div>
          </div>

          ${c.address ? `
            <div style="font-size:12px; color:var(--text-muted); display:flex; align-items:center; gap:4px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
              <i data-lucide="map-pin" style="width:12px; height:12px; flex-shrink:0;"></i> ${c.address}
            </div>
          ` : ''}
        </div>
      `).join('');

      if (window.lucide) window.lucide.createIcons();

    } catch (e) {
      console.error(e);
    }
  },

  async viewCustomerProfile(customerId) {
    try {
      const resp = await fetch(`/api/customers/${customerId}`);
      const data = await resp.json();
      if (!data.success) throw new Error(data.message);

      const cust = data.customer;
      const setTxt = (id, text) => {
        const el = document.getElementById(id);
        if (el) el.textContent = (text !== undefined && text !== null) ? text : '';
      };
      setTxt('cust-profile-name', cust.name);
      setTxt('cust-profile-phone', cust.phone);
      setTxt('cust-profile-email', cust.email || 'N/A');
      setTxt('cust-profile-address', cust.address || 'N/A');
      setTxt('cust-profile-orders-count', cust.total_orders);
      setTxt('cust-profile-spent', `₹${cust.total_spent.toLocaleString('en-IN')}`);

      const historyContainer = document.getElementById('cust-profile-orders-list');
      if (cust.orders && cust.orders.length > 0) {
        historyContainer.innerHTML = cust.orders.map(ord => `
          <div style="display:flex; align-items:center; gap:14px; padding:12px; border:1px solid var(--border-light); border-radius:var(--radius-md); margin-bottom:10px; cursor:pointer;" onclick="App.closeModal('customer-profile-modal'); App.viewOrder(${ord.id});">
            <img src="${ord.cake_image_path}" style="width:50px; height:50px; border-radius:8px; object-fit:cover; border:1px solid var(--border-color);">
            <div style="flex:1;">
              <div style="display:flex; justify-content:space-between;">
                <strong>${ord.order_number} · ${ord.cake_name}</strong>
                <span class="status-badge ${ord.status.toLowerCase()}">${ord.status}</span>
              </div>
              <div style="font-size:12px; color:var(--text-muted); margin-top:2px;">
                ${ord.flavour} · ${ord.weight} · ₹${ord.total_price.toLocaleString('en-IN')}
              </div>
              <div style="font-size:11.5px; color:var(--text-muted);">
                Delivered: ${ord.delivery_date}
              </div>
            </div>
          </div>
        `).join('');
      } else {
        historyContainer.innerHTML = `<p class="text-muted">No past orders found.</p>`;
      }

      this.openModal('customer-profile-modal');
      if (window.lucide) window.lucide.createIcons();

    } catch (err) {
      this.showToast('Error loading customer: ' + err.message, 'error');
    }
  },

  /* ==========================================================================
     Printing & Exporting
     ========================================================================== */
  printTodayList() {
    window.print();
  },

  printOrderTicket(orderId) {
    // Open modal if not open
    const modal = document.getElementById('view-order-modal');
    if (!modal.classList.contains('active')) {
      this.viewOrder(orderId).then(() => {
        window.print();
      });
    } else {
      window.print();
    }
  },

  downloadCSV() {
    window.location.href = '/api/export/csv';
  },

  /* ==========================================================================
     Modal Helpers
     ========================================================================== */
  openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  },

  closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
    }
  },

  /* ==========================================================================
     Toast Notifications
     ========================================================================== */
  showToast(message, type = 'info') {
    let container = document.getElementById('toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    if (type === 'error') {
      toast.style.borderLeftColor = '#E53E3E';
    } else if (type === 'success') {
      toast.style.borderLeftColor = '#38A169';
    }

    toast.innerHTML = `
      <div style="font-weight:600; font-size:13.5px; color:var(--text-primary);">${message}</div>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }
};

window.App = App;

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
