/**
 * Dessert's - Order Form Component
 * Handles Add/Edit Order with drag-and-drop cake photo upload and live balance calculation
 */

const OrderFormModule = {
  currentOrderId: null,
  selectedFile: null,

  init() {
    this.bindEvents();
  },

  bindEvents() {
    // Live financial balance calculation
    const totalPriceInput = document.getElementById('form-total-price');
    const advancePaymentInput = document.getElementById('form-advance-payment');
    
    if (totalPriceInput && advancePaymentInput) {
      totalPriceInput.addEventListener('input', () => this.calculateBalance());
      advancePaymentInput.addEventListener('input', () => this.calculateBalance());
    }

    // Photo upload elements
    const dropzone = document.getElementById('photo-dropzone');
    const fileInput = document.getElementById('cake-photo-input');
    const removeBtn = document.getElementById('remove-preview-btn');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', (e) => {
        if (e.target.closest('#remove-preview-btn') || e.target.closest('#replace-photo-btn')) return;
        fileInput.click();
      });

      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files[0]) {
          this.handleFileSelected(e.target.files[0]);
        }
      });

      // Drag and drop events
      ['dragenter', 'dragover'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.add('dragover');
        });
      });

      ['dragleave', 'drop'].forEach(eventName => {
        dropzone.addEventListener(eventName, (e) => {
          e.preventDefault();
          e.stopPropagation();
          dropzone.classList.remove('dragover');
        });
      });

      dropzone.addEventListener('drop', (e) => {
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
          this.handleFileSelected(e.dataTransfer.files[0]);
        }
      });
    }

    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.clearPhotoPreview();
      });
    }

    const replaceBtn = document.getElementById('replace-photo-btn');
    if (replaceBtn) {
      replaceBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (fileInput) fileInput.click();
      });
    }
  },

  handleFileSelected(file) {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      window.App.showToast('Please upload a valid image (JPG, PNG, or WEBP)', 'error');
      return;
    }

    // Max 15MB
    if (file.size > 15 * 1024 * 1024) {
      window.App.showToast('File size must be under 15MB', 'error');
      return;
    }

    this.selectedFile = file;

    // Show preview
    const reader = new FileReader();
    reader.onload = (e) => {
      this.showPhotoPreview(e.target.result);
    };
    reader.readAsDataURL(file);
  },

  showPhotoPreview(srcUrl) {
    const promptArea = document.getElementById('upload-prompt-area');
    const previewArea = document.getElementById('upload-preview-area');
    const previewImg = document.getElementById('cake-preview-img');

    if (promptArea && previewArea && previewImg) {
      previewImg.src = srcUrl;
      promptArea.style.display = 'none';
      previewArea.style.display = 'block';
    }
  },

  clearPhotoPreview() {
    this.selectedFile = null;
    const fileInput = document.getElementById('cake-photo-input');
    if (fileInput) fileInput.value = '';

    const promptArea = document.getElementById('upload-prompt-area');
    const previewArea = document.getElementById('upload-preview-area');
    const previewImg = document.getElementById('cake-preview-img');

    if (promptArea && previewArea && previewImg) {
      previewImg.src = '';
      previewArea.style.display = 'none';
      promptArea.style.display = 'flex';
    }
  },

  calculateBalance() {
    const totalPriceEl = document.getElementById('form-total-price');
    const advanceEl = document.getElementById('form-advance-payment');
    const balanceEl = document.getElementById('form-remaining-balance');

    let total = parseFloat(totalPriceEl.value) || 0;
    let advance = parseFloat(advanceEl.value) || 0;

    if (total < 0) {
      total = 0;
      totalPriceEl.value = '0';
    }
    if (advance < 0) {
      advance = 0;
      advanceEl.value = '0';
    }
    if (advance > total) {
      advance = total;
      advanceEl.value = total;
    }

    const remaining = Math.max(0, total - advance);
    if (balanceEl) {
      balanceEl.value = `₹${remaining.toFixed(2)}`;
    }
    return { total, advance, remaining };
  },

  async openAddOrderModal(prefilledDate = null) {
    this.currentOrderId = null;
    this.clearPhotoPreview();

    const form = document.getElementById('order-form');
    if (form) form.reset();

    document.getElementById('modal-form-title').innerHTML = `
      <i data-lucide="cake"></i> Add New Cake Order
    `;

    // Fetch next sequential order number
    try {
      const resp = await fetch('/api/orders/next-number');
      const data = await resp.json();
      if (data.next_order_number) {
        document.getElementById('form-order-number').value = data.next_order_number;
      }
    } catch (e) {
      console.error(e);
    }

    // Default dates
    const todayStr = new Date().toISOString().split('T')[0];
    document.getElementById('form-order-date').value = todayStr;
    document.getElementById('form-delivery-date').value = prefilledDate || todayStr;
    document.getElementById('form-delivery-time').value = '05:00 PM';
    document.getElementById('form-total-price').value = '1200';
    document.getElementById('form-advance-payment').value = '600';
    this.calculateBalance();

    // Open modal
    window.App.openModal('order-form-modal');
    if (window.lucide) window.lucide.createIcons();
  },

  async openEditOrderModal(orderId) {
    this.currentOrderId = orderId;
    this.clearPhotoPreview();

    try {
      const resp = await fetch(`/api/orders/${orderId}`);
      const data = await resp.json();
      if (!data.success) throw new Error(data.message);

      const ord = data.order;
      document.getElementById('modal-form-title').innerHTML = `
        <i data-lucide="edit-3"></i> Edit Order ${ord.order_number}
      `;

      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.value = (val !== undefined && val !== null) ? val : '';
      };

      // Fill Customer
      setVal('form-customer-name', ord.customer ? ord.customer.name : '');
      setVal('form-phone', ord.customer ? ord.customer.phone : '');
      setVal('form-email', ord.customer ? ord.customer.email : '');
      setVal('form-address', ord.customer ? ord.customer.address : '');

      // Fill Cake Details
      setVal('form-cake-name', ord.cake_name);
      setVal('form-flavour', ord.flavour);
      setVal('form-weight', ord.weight);
      setVal('form-shape', ord.shape);
      setVal('form-egg', ord.egg_preference);
      setVal('form-theme', ord.theme);
      setVal('form-colour', ord.colour);
      setVal('form-decorations', ord.decorations);
      setVal('form-custom-message', ord.custom_message);
      setVal('form-special-instructions', ord.special_instructions);
      setVal('form-design-description', ord.design_description);

      // Fill Order Details
      setVal('form-order-number', ord.order_number);
      setVal('form-order-date', ord.order_date);
      setVal('delivery-date', ord.delivery_date);
      setVal('form-delivery-date', ord.delivery_date);
      setVal('form-delivery-time', ord.delivery_time);
      setVal('form-status', ord.status);
      setVal('form-baker', ord.assigned_baker);
      setVal('form-payment-method', ord.payment_method);
      setVal('form-total-price', ord.total_price);
      setVal('form-advance-payment', ord.advance_payment);
      this.calculateBalance();

      // Show existing photo if any
      if (ord.cake_image_path) {
        this.showPhotoPreview(ord.cake_image_path);
      }

      window.App.openModal('order-form-modal');
      if (window.lucide) window.lucide.createIcons();

    } catch (err) {
      window.App.showToast('Failed to load order: ' + err.message, 'error');
    }
  },

  async saveOrder(addAnother = false) {
    const form = document.getElementById('order-form');
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const { total, advance } = this.calculateBalance();

    const formData = new FormData(form);
    formData.set('total_price', total);
    formData.set('advance_payment', advance);

    if (this.selectedFile) {
      formData.set('cake_photo', this.selectedFile);
    }

    const isEdit = !!this.currentOrderId;
    const url = isEdit ? `/api/orders/${this.currentOrderId}` : '/api/orders';

    try {
      const submitBtn = document.getElementById('save-order-btn');
      if (submitBtn) submitBtn.disabled = true;

      const resp = await fetch(url, {
        method: isEdit ? 'PUT' : 'POST',
        body: formData
      });

      const res = await resp.json();
      if (submitBtn) submitBtn.disabled = false;

      if (!res.success) {
        window.App.showToast(res.message || 'Error saving order', 'error');
        return;
      }

      window.App.showToast(res.message || 'Order saved successfully!', 'success');

      // Refresh app data
      await window.App.refreshDashboard();

      if (addAnother) {
        this.openAddOrderModal();
      } else {
        window.App.closeModal('order-form-modal');
        if (res.order && res.order.id) {
          window.App.viewOrder(res.order.id);
        }
      }

    } catch (err) {
      window.App.showToast('Network error saving order: ' + err.message, 'error');
      const submitBtn = document.getElementById('save-order-btn');
      if (submitBtn) submitBtn.disabled = false;
    }
  }
};

window.OrderFormModule = OrderFormModule;
