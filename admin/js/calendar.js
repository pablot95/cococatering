// ================================================
// calendar.js — Calendario del dashboard
// Muestra pedidos aprobados + servicios por fecha
// ================================================

const Calendar = {
  currentDate: new Date(),
  events: [],

  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="calendar-wrapper">
        <div class="calendar-toolbar">
          <div class="calendar-nav">
            <button class="cal-nav-btn" id="calPrev" title="Mes anterior">&#8249;</button>
            <h2 class="cal-month-title" id="calTitle">Cargando…</h2>
            <button class="cal-nav-btn" id="calNext" title="Mes siguiente">&#8250;</button>
          </div>
          <div class="calendar-legend">
            <span class="legend-item"><span class="legend-dot dot-pedido"></span>Pedidos</span>
            <span class="legend-item"><span class="legend-dot dot-servicio"></span>Servicios</span>
          </div>
        </div>
        <div class="calendar-grid-wrapper">
          <div class="calendar-header-row">
            <div>Dom</div><div>Lun</div><div>Mar</div>
            <div>Mié</div><div>Jue</div><div>Vie</div><div>Sáb</div>
          </div>
          <div class="calendar-grid" id="calGrid">
            <div class="loading-spinner" style="grid-column:1/-1">
              <div class="spinner-ring"></div>
            </div>
          </div>
        </div>
        <div class="day-detail-panel hidden" id="dayPanel">
          <div class="day-panel-header">
            <h3 id="dayPanelTitle"></h3>
            <button id="dayPanelClose" title="Cerrar">✕</button>
          </div>
          <div id="dayPanelContent" class="day-events-list"></div>
        </div>
      </div>`;

    document.getElementById('calPrev').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() - 1);
      this._draw();
    });
    document.getElementById('calNext').addEventListener('click', () => {
      this.currentDate.setMonth(this.currentDate.getMonth() + 1);
      this._draw();
    });
    document.getElementById('dayPanelClose').addEventListener('click', () => {
      document.getElementById('dayPanel').classList.add('hidden');
    });

    await this._loadEvents();
    this._draw();
  },

  async _loadEvents() {
    this.events = [];
    try {
      // Pedidos aprobados
      const snap = await db.collection('orders').get();
      snap.forEach(doc => {
        const d = doc.data();
        // Usamos fechaEntrega si existe, sino fecha de creación
        const raw = d.fechaEntrega || d.fecha;
        if (!raw) return;
        const dateStr = typeof raw === 'string'
          ? raw.slice(0, 10)
          : (raw.toDate ? raw.toDate().toISOString().slice(0, 10) : null);
        if (!dateStr) return;

        const status = (d.status || '').toLowerCase();
        // Mostrar en calendario solo pedidos aprobados / pagados
        if (!['approved', 'pagado', 'aprobado', 'paid'].includes(status) && status !== '') {
          // Si status existe y no es aprobado, saltar
          if (status) return;
        }

        this.events.push({
          id:    doc.id,
          type:  'pedido',
          date:  dateStr,
          title: d.cliente?.nombre || d.orderId || 'Pedido',
          total: d.total || d.subtotal || null,
          data:  d
        });
      });
    } catch (e) {
      console.warn('Calendar: error cargando pedidos', e);
    }

    try {
      // Servicios desde admin_servicios
      const snap = await db.collection('admin_servicios').get();
      snap.forEach(doc => {
        const d = doc.data();
        if (!d.fechaEvento) return;
        const ep = d.estadoPago || 'sin_pago';
        this.events.push({
          id:         doc.id,
          type:       'servicio',
          date:       d.fechaEvento,
          title:      d.cliente?.nombre || 'Servicio',
          estadoPago: ep,
          horaEvento: d.horaEvento || null,
          data:       d
        });
      });
    } catch (e) {
      // La colección puede no existir todavía
    }
  },

  _draw() {
    const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const year  = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    document.getElementById('calTitle').textContent = `${MONTHS[month]} ${year}`;

    const grid     = document.getElementById('calGrid');
    const firstDay = new Date(year, month, 1).getDay();
    const daysInM  = new Date(year, month + 1, 0).getDate();
    const todayStr = new Date().toISOString().slice(0, 10);

    grid.innerHTML = '';

    // Celdas vacías antes del día 1
    for (let i = 0; i < firstDay; i++) {
      const el = document.createElement('div');
      el.className = 'cal-day cal-day-empty';
      grid.appendChild(el);
    }

    // Días del mes
    for (let d = 1; d <= daysInM; d++) {
      const yy   = String(year);
      const mm   = String(month + 1).padStart(2, '0');
      const dd   = String(d).padStart(2, '0');
      const key  = `${yy}-${mm}-${dd}`;
      const evs  = this.events.filter(e => e.date === key);
      const isToday = key === todayStr;

      const cell = document.createElement('div');
      cell.className = `cal-day${isToday ? ' today' : ''}${evs.length ? ' has-events' : ''}`;

      cell.innerHTML = `
        <span class="day-num">${d}</span>
        <div class="day-chips">
          ${evs.slice(0, 3).map(ev => {
            let chipExtra = '';
            if (ev.type === 'servicio') {
              if (ev.estadoPago === 'sin_pago') chipExtra = ' chip-svc-sinpago';
              else if (ev.estadoPago === 'parcial') chipExtra = ' chip-svc-parcial';
            }
            const label = ev.horaEvento
              ? `${ev.horaEvento} ${this._esc(ev.title)}`
              : this._esc(ev.title);
            return `<div class="event-chip chip-${ev.type}${chipExtra}" title="${this._esc(ev.title)}">${label}</div>`;
          }).join('')}
          ${evs.length > 3
            ? `<div class="event-chip chip-more">+${evs.length - 3} más</div>`
            : ''}
        </div>`;

      cell.addEventListener('click', () =>
        this._openDay(key, evs, d, MONTHS[month], year)
      );
      grid.appendChild(cell);
    }
  },

  _openDay(dateStr, events, day, month, year) {
    const panel = document.getElementById('dayPanel');
    panel.classList.remove('hidden');
    document.getElementById('dayPanelTitle').textContent =
      `${day} de ${month} de ${year}`;

    const content = document.getElementById('dayPanelContent');
    if (events.length === 0) {
      content.innerHTML = '<p class="no-events">No hay eventos registrados en este día.</p>';
      return;
    }

    content.innerHTML = events.map(ev => {
      const d = ev.data;
      if (ev.type === 'pedido') {
        const productos = (d.productos || []).slice(0, 5)
          .map(p => `<span class="dev-tag">${this._esc(p.nombre)} ×${p.cantidad}</span>`).join('');
        return `
          <div class="day-event-card event-pedido">
            <div class="dev-header">
              <span class="dev-type">🛒 Pedido</span>
              ${ev.total ? `<span class="dev-total">$${Number(ev.total).toLocaleString('es-AR')}</span>` : ''}
            </div>
            <div class="dev-name">${this._esc(ev.title)}</div>
            <div class="dev-detail">
              ${d.cliente?.telefono ? `📱 ${d.cliente.telefono}` : ''}
              ${d.cliente?.email ? `<br>✉️ ${d.cliente.email}` : ''}
              ${d.direccionEnvio?.calle ? `<br>📍 ${d.direccionEnvio.calle} ${d.direccionEnvio.altura || ''}, ${d.direccionEnvio.ciudad || ''}` : ''}
            </div>
            ${productos ? `<div class="dev-products">${productos}</div>` : ''}
          </div>`;
      } else {
        const epLabels = { sin_pago: 'Sin pago', parcial: 'Parcial', completo: 'Completo' };
        const epColors = { sin_pago: 'var(--error)', parcial: 'var(--warning)', completo: 'var(--success)' };
        const ep = ev.estadoPago || d.estadoPago || 'sin_pago';
        return `
          <div class="day-event-card event-servicio">
            <div class="dev-header">
              <span class="dev-type">📅 Servicio #${String(d.numero || '').padStart(3,'0')}</span>
              ${d.total ? `<span class="dev-total">$${Number(d.total).toLocaleString('es-AR')}</span>` : ''}
            </div>
            <div class="dev-name">${this._esc(ev.title)}</div>
            <div class="dev-detail">
              ${d.horaEvento ? `🕐 ${d.horaEvento}` : ''}
              ${d.tipoEvento ? `<br>🎉 ${d.tipoEvento}` : ''}
              ${d.personas ? `<br>👥 ${d.personas} personas` : ''}
              ${d.cliente?.telefono ? `<br>📱 ${d.cliente.telefono}` : ''}
              <br><span style="font-weight:600;color:${epColors[ep]}">${epLabels[ep]}</span>
            </div>
          </div>`;
      }
    }).join('');
  },

  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }
};
