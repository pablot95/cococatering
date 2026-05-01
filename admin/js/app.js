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
      case 'gestion':
        content.innerHTML = `
          <div class="coming-soon">
            <div class="cs-icon">⚙️</div>
            <h3>Panel de Gestión</h3>
            <p>El panel de gestión existente se abre en una pestaña separada.</p>
            <a href="../gestion/gestion.html" target="_blank" class="btn-primary" style="margin-top:20px">
              Abrir Gestión →
            </a>
          </div>`;
        break;
      default:
        content.innerHTML = `
          <div class="coming-soon">
            <div class="cs-icon">🚧</div>
            <h3>${this.sectionTitles[section] || section}</h3>
            <p>Esta sección estará disponible próximamente.</p>
          </div>`;
    }
  },

  // ── Modal ──────────────────────────────────────

  openModal(title, bodyHtml, size = 'md') {
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = bodyHtml;
    const box = document.getElementById('modalBox');
    box.className = `modal-box modal-${size}`;
    const overlay = document.getElementById('modalOverlay');
    overlay.classList.remove('hidden');
  },

  closeModal() {
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
  setUser(user) {
    this.currentUser = user;
  }
};

// Cerrar modal con botón y clic fuera
document.getElementById('modalClose').addEventListener('click', () => App.closeModal());
document.getElementById('modalOverlay').addEventListener('click', (e) => {
  if (e.target.id === 'modalOverlay') App.closeModal();
});
