/**
 * Dessert's - Calendar Component
 * Handles mini calendar in right panel and full calendar view
 */

const CalendarModule = {
  currentDate: new Date(),
  selectedDate: null,
  calendarData: {},

  init(statsCalendarData = {}) {
    this.calendarData = statsCalendarData;
    this.renderMiniCalendar();
  },

  updateData(statsCalendarData) {
    this.calendarData = statsCalendarData || {};
    this.renderMiniCalendar();
    if (document.getElementById('full-calendar-container')) {
      this.renderFullCalendar();
    }
  },

  formatDateKey(dateObj) {
    const y = dateObj.getFullYear();
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const d = String(dateObj.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  },

  prevMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() - 1);
    this.renderMiniCalendar();
    if (document.getElementById('full-calendar-container')) {
      this.renderFullCalendar();
    }
  },

  nextMonth() {
    this.currentDate.setMonth(this.currentDate.getMonth() + 1);
    this.renderMiniCalendar();
    if (document.getElementById('full-calendar-container')) {
      this.renderFullCalendar();
    }
  },

  renderMiniCalendar() {
    const monthTitle = document.getElementById('cal-month-title');
    const daysGrid = document.getElementById('cal-days-grid');
    if (!monthTitle || !daysGrid) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    monthTitle.textContent = `${monthNames[month]} ${year}`;

    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    daysGrid.innerHTML = '';

    const todayKey = this.formatDateKey(new Date());

    // Previous month filler days
    for (let x = firstDayIndex; x > 0; x--) {
      const dayNum = prevMonthDays - x + 1;
      const cell = document.createElement('div');
      cell.className = 'cal-day other-month';
      cell.textContent = dayNum;
      daysGrid.appendChild(cell);
    }

    // Current month days
    for (let i = 1; i <= totalDays; i++) {
      const cell = document.createElement('div');
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      cell.className = 'cal-day';
      cell.textContent = i;

      if (dateKey === todayKey) {
        cell.classList.add('today');
      }

      if (this.selectedDate === dateKey) {
        cell.classList.add('selected');
      }

      // Check for scheduled orders on this date
      if (this.calendarData[dateKey] && this.calendarData[dateKey].count > 0) {
        const dot = document.createElement('div');
        dot.className = 'cal-dot';
        cell.appendChild(dot);
      }

      cell.addEventListener('click', () => {
        this.selectDate(dateKey);
      });

      daysGrid.appendChild(cell);
    }
  },

  selectDate(dateKey) {
    this.selectedDate = this.selectedDate === dateKey ? null : dateKey;
    this.renderMiniCalendar();

    // Trigger filter in Main Dashboard / All Orders
    if (window.App) {
      if (this.selectedDate) {
        window.App.filterByDate(this.selectedDate);
      } else {
        window.App.filterByDate(''); // Clear date filter
      }
    }
  },

  renderFullCalendar() {
    const container = document.getElementById('full-calendar-container');
    if (!container) return;

    const year = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();
    const monthNames = [
      "January", "February", "March", "April", "May", "June",
      "July", "August", "September", "October", "November", "December"
    ];

    const titleEl = document.getElementById('full-cal-month-title');
    if (titleEl) {
      titleEl.textContent = `${monthNames[month]} ${year}`;
    }

    const firstDayIndex = new Date(year, month, 1).getDay();
    const totalDays = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    const grid = document.getElementById('full-cal-days-grid');
    if (!grid) return;
    grid.innerHTML = '';

    const todayKey = this.formatDateKey(new Date());

    // Prev month days
    for (let x = firstDayIndex; x > 0; x--) {
      const cell = document.createElement('div');
      cell.className = 'full-cal-day-cell other-month';
      cell.innerHTML = `<span class="day-number text-muted">${prevMonthDays - x + 1}</span>`;
      grid.appendChild(cell);
    }

    // Month days
    for (let i = 1; i <= totalDays; i++) {
      const cell = document.createElement('div');
      const dateKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      cell.className = 'full-cal-day-cell';
      if (dateKey === todayKey) cell.style.borderColor = 'var(--primary)';
      if (this.selectedDate === dateKey) cell.classList.add('selected');

      const dateOrders = (this.calendarData[dateKey] && this.calendarData[dateKey].orders) || [];

      let ordersHtml = '';
      dateOrders.slice(0, 3).forEach(ord => {
        let badgeColor = '#9A6700; background: #FEF6E8';
        if (ord.status.toLowerCase() === 'preparing') badgeColor = '#C05621; background: #FFF0E6';
        if (ord.status.toLowerCase() === 'ready') badgeColor = '#1F7A4D; background: #EDF9F2';
        if (ord.status.toLowerCase() === 'delivered') badgeColor = '#B83262; background: #FCEEF3';

        ordersHtml += `
          <div class="cal-order-chip" style="color: ${badgeColor};" onclick="event.stopPropagation(); window.App.viewOrder(${ord.id})">
            ${ord.order_number} - ${ord.cake_name}
          </div>
        `;
      });

      if (dateOrders.length > 3) {
        ordersHtml += `<div class="cal-order-chip text-muted" style="background:#F1D7DC; color:#5D3841;">+${dateOrders.length - 3} more</div>`;
      }

      cell.innerHTML = `
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="day-number">${i}</span>
          ${dateOrders.length > 0 ? `<span style="font-size:11px; font-weight:700; color:var(--primary);">${dateOrders.length} cakes</span>` : ''}
        </div>
        <div style="display:flex; flex-direction:column; gap:3px; margin-top:4px;">
          ${ordersHtml}
        </div>
      `;

      cell.addEventListener('click', () => {
        this.selectDate(dateKey);
        this.showDateDetails(dateKey, dateOrders);
      });

      grid.appendChild(cell);
    }
  },

  showDateDetails(dateKey, orders) {
    const drawer = document.getElementById('cal-date-orders-drawer');
    if (!drawer) return;

    const title = document.getElementById('cal-drawer-title');
    const list = document.getElementById('cal-drawer-list');

    const formattedDate = new Date(dateKey + 'T00:00:00').toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });

    title.textContent = `Deliveries on ${formattedDate} (${orders.length})`;

    if (orders.length === 0) {
      list.innerHTML = `<p class="text-muted" style="padding: 16px 0;">No cake deliveries scheduled for this date.</p>`;
      return;
    }

    list.innerHTML = orders.map(ord => `
      <div style="display:flex; align-items:center; gap:12px; padding:10px 0; border-bottom:1px solid var(--border-light); cursor:pointer;" onclick="window.App.viewOrder(${ord.id})">
        <img src="${ord.cake_image_path}" style="width:42px; height:42px; border-radius:8px; object-fit:cover; border:1px solid var(--border-color);">
        <div style="flex:1;">
          <div style="font-weight:700; font-size:13px;">${ord.order_number} · ${ord.cake_name}</div>
          <div style="font-size:11.5px; color:var(--text-muted);">${ord.customer_name} · ${ord.weight} · ${ord.delivery_time}</div>
        </div>
        <span class="status-badge ${ord.status.toLowerCase()}">${ord.status}</span>
      </div>
    `).join('');
  }
};

window.CalendarModule = CalendarModule;
