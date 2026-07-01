// ================================================
// app.js — Controlador principal de la SPA
// ================================================

const App = {
  currentSection: 'dashboard',

  sectionTitles: {
    dashboard:    'Inicio',
    productos:    'Productos',
    menus:        'Menús',
    presupuesto:  'Presupuesto',
    servicios:    'Servicios',
    pagos:        'Pagos',
    estadisticas: 'Estadísticas',
    gastos:       'Gastos',
    usuarios:     'Usuarios',
    gestion:      'Gestión'
  },

  init() {
    // Aplicar clase al body si el usuario es Limitado
    document.body.classList.toggle('rol-limitado', this.isLimitado);
    this.bindNav();
    this.bindHamburger();
    this.navigate('dashboard');
  },

  bindNav() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        this.navigate(item.dataset.section);
        // Cerrar menú móvil
        document.getElementById('mobileNav').classList.add('hidden');
        document.getElementById('sidebarOverlay').classList.remove('active');
      });
    });
  },

  bindHamburger() {
    const btn     = document.getElementById('hamburger');
    const nav     = document.getElementById('mobileNav');
    const overlay = document.getElementById('sidebarOverlay');
    btn.addEventListener('click', () => {
      nav.classList.toggle('hidden');
      overlay.classList.toggle('active');
    });
    overlay.addEventListener('click', () => {
      nav.classList.add('hidden');
      overlay.classList.remove('active');
    });
  },

  navigate(section) {
    this.currentSection = section;

    // Actualizar nav activo (tanto topbar como móvil)
    document.querySelectorAll('.nav-item').forEach(item => {
      item.classList.toggle('active', item.dataset.section === section);
    });

    // Mostrar spinner mientras carga
    const content = document.getElementById('mainContent');
    content.innerHTML = '<div class="loading-spinner"><div class="spinner-ring"></div></div>';

    // Renderizar sección
    switch (section) {
      case 'dashboard':    Calendar.render();      break;
      case 'productos':    Productos.render();     break;
      case 'menus':        Menus.render();         break;
      case 'servicios':    Servicios.render();     break;
      case 'presupuesto':  Presupuestos.render();  break;
      case 'pagos':        Pagos.render();         break;
      case 'estadisticas': Estadisticas.render();  break;
      case 'gastos':       Gastos.render();        break;
      case 'usuarios':     Usuarios.render();      break;
      case 'gestion':       Gestion.render();      break;
      default:
        content.innerHTML = `
          <div class="coming-soon">
            <div class="cs-icon">🚧</div>
            <h3>${this.sectionTitles[section] || section}</h3>
            <p>Esta sección estará disponible próximamente.</p>
          </div>`;
    }
  },

  // ── Selector de mes en castellano ────────────────
  // Devuelve el HTML de dos selects (mes + año) para reemplazar input[type="month"]
  // id: prefijo, val: "2026-05"
  monthSelectHTML(id, val) {
    const MESES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                   'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const [y, m] = (val || '').split('-');
    const anioAct = new Date().getFullYear();
    const years = [anioAct - 1, anioAct, anioAct + 1];
    const mOpts = MESES.map((n, i) => {
      const v = String(i + 1).padStart(2, '0');
      return `<option value="${v}" ${m === v ? 'selected' : ''}>${n}</option>`;
    }).join('');
    const yOpts = years.map(yr =>
      `<option value="${yr}" ${String(yr) === y ? 'selected' : ''}>${yr}</option>`
    ).join('');
    return `<select id="${id}-mes" class="filter-input-inline" style="min-width:110px">${mOpts}</select>` +
           `<select id="${id}-anio" class="filter-input-inline" style="min-width:70px">${yOpts}</select>`;
  },

  // Lee el valor "YYYY-MM" combinado de los dos selects
  monthSelectValue(id) {
    const m = document.getElementById(`${id}-mes`)?.value;
    const y = document.getElementById(`${id}-anio`)?.value;
    return (y && m) ? `${y}-${m}` : null;
  },

  // ── Modal ──────────────────────────────────────

  _modalDirty: false,

  openModal(title, bodyHtml, size = 'md') {
    this._modalDirty = false;
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    const box = document.getElementById('modalBox');
    box.className = `modal-box modal-${size}`;
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('hidden');
    // Marcar dirty ante cualquier cambio del usuario en el formulario
    document.getElementById('modalBody').addEventListener('input',  () => { this._modalDirty = true; }, { capture: true });
    document.getElementById('modalBody').addEventListener('change', () => { this._modalDirty = true; }, { capture: true });
  },

  closeModal() {
    if (this._modalDirty) {
      this._showConfirm('¿Desea salir sin guardar?', () => this._doCloseModal());
      return;
    }
    this._doCloseModal();
  },

  _showConfirm(message, onConfirm) {
    const overlay = document.getElementById('confirmOverlay');
    document.getElementById('confirmMsg').textContent = message;
    overlay.classList.remove('hidden');
    const ok     = document.getElementById('confirmOk');
    const cancel = document.getElementById('confirmCancel');
    const cleanup = () => {
      overlay.classList.add('hidden');
      ok.replaceWith(ok.cloneNode(true));
      cancel.replaceWith(cancel.cloneNode(true));
    };
    document.getElementById('confirmOk').addEventListener('click', () => { cleanup(); onConfirm(); }, { once: true });
    document.getElementById('confirmCancel').addEventListener('click', () => cleanup(), { once: true });
  },

  closeModalForce() {
    this._modalDirty = false;
    this._doCloseModal();
  },

  _doCloseModal() {
    this._modalDirty = false;
    document.getElementById('modalOverlay').classList.add('hidden');
    document.getElementById('modalBody').innerHTML = '';
  },

  // ── Toast ──────────────────────────────────────

  toast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const t = document.createElement('div');
    t.className = `toast toast-${type}`;
    t.textContent = message;
    container.appendChild(t);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => t.classList.add('show'));
    });
    setTimeout(() => {
      t.classList.remove('show');
      setTimeout(() => t.remove(), 300);
    }, 3200);
  },

  // ── User info ─────────────────────────────────
  currentUser: null,
  userDoc: null,
  get isLimitado() {
    if (this.currentUser?.email === 'cococateringsanisidro@gmail.com') return false;
    return this.userDoc?.rol === 'limitado';
  },
  setUser(user, doc = null) {
    this.currentUser = user;
    this.userDoc = doc;
  }
};

// Cerrar modal con botón y clic fuera
document.getElementById('modalClose').addEventListener('click', () => App.closeModal());
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') App.closeModal();
});
