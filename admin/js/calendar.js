// ================================================
// calendar.js — Calendario del dashboard
// Muestra pedidos aprobados + servicios por fecha
// ================================================

const Calendar = {
  currentDate: new Date(),
  events: [],

  _totalServicioFinal(s = {}) {
    const subtotal = Number(s.subtotalBruto || 0);
    const descuento = Number(s.descuento || 0);
    if (subtotal > 0 && descuento > 0) return Math.round(subtotal * (1 - descuento / 100));
    return Math.round(Number(s.total || 0));
  },

  _normalizarServicio(s = {}) {
    return { ...s, total: this._totalServicioFinal(s) };
  },

  _logicalEventKey(ev = {}) {
    const d = ev.data || {};
    if (ev.type === 'pedido') {
      const solicitudId = d.solicitudId || ev.solicitudId;
      const orderId = d.orderId || ev.orderId;
      const codigo = d.codigoPedido || d.codigo;
      if (solicitudId) return `pedido:sol:${solicitudId}`;
      if (orderId) return `pedido:order:${orderId}`;
      if (codigo) return `pedido:codigo:${codigo}`;
    }
    return `${ev.source}:${ev.id}`;
  },

  _eventPriority(ev = {}) {
    const d = ev.data || {};
    let score = ev.source === 'servicio' ? 20 : 10;
    const estadoPago = String(ev.estadoPago || d.estadoPago || '').toLowerCase();
    const status = String(d.paymentStatus || d.status || '').toLowerCase();
    if (estadoPago === 'completo' || status === 'paid' || status === 'pagado') score += 6;
    if (estadoPago === 'parcial') score += 3;
    if (d.serviceId || ev.source === 'servicio') score += 2;
    return score;
  },

  async render() {
    const content = document.getElementById('mainContent');    content.innerHTML = `
      <div class="calendar-wrapper">
        <div class="calendar-body">
          <!-- Grid del calendario -->
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
          <!-- Panel lateral derecho: controles + leyenda + detalle día -->
          <div class="calendar-sidebar">
            <div class="calendar-nav">
              <button class="cal-nav-btn" id="calPrev" title="Mes anterior">&#8249;</button>
              <h2 class="cal-month-title" id="calTitle">Cargando…</h2>
              <button class="cal-nav-btn" id="calNext" title="Mes siguiente">&#8250;</button>
            </div>
            <div class="calendar-legend">
              <span class="legend-item"><span class="legend-dot dot-pedido"></span>Pedidos</span>
              <span class="legend-item"><span class="legend-dot dot-evento"></span>Eventos</span>
            </div>
            <div class="day-detail-panel hidden" id="dayPanel">
              <div class="day-panel-header">
                <h3 id="dayPanelTitle"></h3>
                <button id="dayPanelClose" title="Cerrar">✕</button>
              </div>
              <div id="dayPanelContent" class="day-events-list"></div>
            </div>
          </div>
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
    // Botones laterales de navegación
    content.querySelectorAll('.dash-side-btn').forEach(btn => {
      btn.addEventListener('click', () => App.navigate(btn.dataset.section));
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
        if (d.serviceId) return;
        // Usamos fechaEntrega si existe, luego fechaPedido (campo del admin), sino fecha de creación
        const raw = d.fechaEntrega || d.fechaPedido || d.fecha;
        if (!raw) return;
        const dateStr = typeof raw === 'string'
          ? raw.slice(0, 10)
          : (raw.toDate ? raw.toDate().toISOString().slice(0, 10) : null);
        if (!dateStr) return;

        const status = (d.status || '').toLowerCase();
        const aprobadoDesdeGestion = !!d.solicitudId && ['pending', 'approved', 'aprobado'].includes(status);
        if (!aprobadoDesdeGestion && !['paid', 'pagado', 'aprobado', 'approved'].includes(status)) return;

        this.events.push({
          isPaid: true,
          id:     doc.id,
          source: 'order',
          type:   'pedido',
          date:   dateStr,
          title:  d.cliente?.nombre || d.orderId || 'Pedido',
          total:  d.total || d.subtotal || null,
          orderId: doc.id,
          solicitudId: d.solicitudId || null,
          data:   { id: doc.id, ...d, orderId: d.orderId || doc.id }
        });
      });
    } catch (e) {
      console.warn('Calendar: error cargando pedidos', e);
    }

    try {
      // Servicios desde admin_servicios + pagos reales
      const [sSnap, pSnap] = await Promise.all([
        db.collection('admin_servicios').get(),
        db.collection('admin_pagos').get().catch(() => ({ docs: [] }))
      ]);

      // Acumular pagos por servicioId
      const pagosBySvc = {};
      pSnap.docs.forEach(d => {
        const pd = d.data();
        if (!pd.servicioId) return;
        pagosBySvc[pd.servicioId] = (pagosBySvc[pd.servicioId] || 0) + (pd.monto || 0);
      });

      const totalUpdates = [];
      sSnap.forEach(doc => {
        const d = this._normalizarServicio(doc.data());
        if (!d.fechaEvento) return;
        if (d.subtotalBruto > 0 && d.descuento > 0 && Math.round(Number(doc.data().total || 0)) !== d.total) {
          totalUpdates.push(doc.ref.update({ total: d.total }).catch(e => console.warn('No se pudo normalizar total de servicio', doc.id, e)));
        }
        const montoPagado = pagosBySvc[doc.id] || 0;
        const total       = d.total || 0;
        let ep = 'sin_pago';
        if (montoPagado >= total && total > 0) ep = 'completo';
        else if (montoPagado > 0) ep = 'parcial';
        this.events.push({
          id:         doc.id,
          source:     'servicio',
          type:       d.tipoServicio === 'pedido' ? 'pedido' : 'evento',
          date:       d.fechaEvento,
          title:      d.cliente?.nombre || 'Servicio',
          estadoPago: ep,
          horaEvento: d.horaEvento || null,
          orderId:    d.orderId || null,
          solicitudId: d.solicitudId || null,
          data:       { id: doc.id, ...d, montoPagado, estadoPago: ep }
        });
      });
      if (totalUpdates.length) await Promise.all(totalUpdates);
    } catch (e) {
      // La colección puede no existir todavía
    }

    // Deduplicar por pedido lógico: una misma solicitud puede existir como order
    // y como servicio, o tener servicios antiguos duplicados.
    const byLogicalKey = new Map();
    this.events.forEach(ev => {
      const key = this._logicalEventKey(ev);
      const prev = byLogicalKey.get(key);
      if (!prev || this._eventPriority(ev) > this._eventPriority(prev)) {
        byLogicalKey.set(key, ev);
      }
    });
    this.events = Array.from(byLogicalKey.values());
  },

  _draw() {
    const MONTHS = ['Enero','Febrero','Marzo','Abril','Mayo','Junio',
                    'Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
    const year  = this.currentDate.getFullYear();
    const month = this.currentDate.getMonth();

    const calTitle = document.getElementById('calTitle');
    const grid     = document.getElementById('calGrid');
    if (!calTitle || !grid) return; // el usuario navegó a otra sección

    calTitle.textContent = `${MONTHS[month]} ${year}`;
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
            let pagoIcon  = '';
            if (ev.source === 'servicio') {
              const ep = ev.estadoPago || 'sin_pago';
              if (ep === 'sin_pago')  { chipExtra = ' chip-svc-sinpago'; pagoIcon = '<span class="chip-pago-icon chip-warn" title="Sin pago">⚠️</span>'; }
              else if (ep === 'parcial') { chipExtra = ' chip-svc-parcial'; pagoIcon = '<span class="chip-pago-icon chip-warn" title="Pago parcial">⚠️</span>'; }
              else if (ep === 'completo') { pagoIcon = '<span class="chip-pago-icon chip-ok" title="Pagado">✅</span>'; }
            } else if (ev.source === 'order') {
              pagoIcon = ev.isPaid
                ? '<span class="chip-pago-icon chip-ok" title="Pagado">✅</span>'
                : '<span class="chip-pago-icon chip-warn" title="Pendiente de pago">⏳</span>';
            }
            const label = ev.horaEvento
              ? `${ev.horaEvento} ${this._esc(ev.title)}`
              : this._esc(ev.title);
            return `<div class="event-chip chip-${ev.type}${chipExtra}" title="${this._esc(ev.title)}">${pagoIcon}${label}</div>`;
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
      if (ev.source === 'order') {
        const tel = d.cliente?.telefono || d.telefono || '';
        const wsp = tel ? `https://wa.me/${tel.replace(/\D/g,'')}` : '';
        const total = Number(ev.total || 0);
        const isPaid = ['paid', 'pagado'].includes((d.paymentStatus || d.status || '').toLowerCase());
        const productos = (d.productos || []).slice(0, 5)
          .map(p => {
            const nom = p.nombre || p.name || '';
            const qty = p.cantidad ?? p.quantity ?? 1;
            return `<span class="dev-tag">${this._esc(nom)} ×${qty}</span>`;
          }).join('');
        return `
          <div class="day-event-card event-pedido" data-orderid="${ev.id}" style="cursor:pointer">
            <div class="dev-header">
              <span class="dev-type">🛒 Pedido ${isPaid ? '<span class="dev-paid-badge">✅ Pagado</span>' : ''}</span>
              ${total ? `<span class="dev-total">$${total.toLocaleString('es-AR')}</span>` : ''}
            </div>
            <div class="dev-name">${this._esc(ev.title)}</div>
            <div class="dev-detail">
              ${tel ? `<a href="${wsp}" target="_blank" rel="noopener" class="dev-wsp">💬 ${tel}</a>` : ''}
              ${d.cliente?.email ? `<br>✉️ ${d.cliente.email}` : ''}
              ${(() => {
                const te = d.cliente?.tipoEntrega || d.tipoEntrega
                  || (d.localidad === 'Retiro en local' ? 'retiro'
                  : (!d.direccionEnvio?.calle && d.costoEnvio === 0 ? 'retiro' : 'envio'));
                if (te === 'retiro') return '<br>📦 <strong>Retiro en local</strong>';
                return d.direccionEnvio?.calle ? `<br>📍 ${d.direccionEnvio.calle} ${d.direccionEnvio.altura || ''}, ${d.direccionEnvio.ciudad || ''}` : '<br>🚚 Envío a domicilio';
              })()} 
            </div>
            ${productos ? `<div class="dev-products">${productos}</div>` : ''}
            <div style="margin-top:6px;font-size:.72rem;color:var(--bordo);font-weight:600">Ver detalle →</div>
          </div>`;
      } else {
        const epLabels = { sin_pago: 'Sin pago', parcial: 'Parcial', completo: 'Completo' };
        const epColors = { sin_pago: 'var(--error)', parcial: 'var(--warning)', completo: 'var(--success)' };
        const ep = ev.estadoPago || d.estadoPago || 'sin_pago';
        const total      = Number(d.total || 0);
        const pagado     = Number(d.montoPagado || 0);
        const saldo      = Math.max(0, total - pagado);
        const tel        = d.cliente?.telefono || '';
        const wsp        = tel ? `https://wa.me/${tel.replace(/\D/g,'')}` : '';
        return `
          <div class="day-event-card event-servicio" data-svcid="${ev.id}" style="cursor:pointer">
            <div class="dev-header">
              <span class="dev-type">${d.tipoServicio === 'pedido' ? '🛒 Pedido' : '📅 Evento'} #${String(d.numero || '').padStart(3,'0')}</span>
              ${total ? `<span class="dev-total">$${total.toLocaleString('es-AR')}</span>` : ''}
            </div>
            <div class="dev-name">${this._esc(ev.title)}</div>
            <div class="dev-detail">
              ${d.horaEvento ? `🕐 ${d.horaEvento}` : ''}
              ${d.tipoEvento ? `<br>🎉 ${d.tipoEvento}` : ''}
              ${d.personas ? `<br>👥 ${d.personas} personas` : ''}
              ${tel ? `<br><a href="${wsp}" target="_blank" rel="noopener" class="dev-wsp">💬 ${tel}</a>` : ''}
            </div>
            <div class="dev-pago-row">
              <span class="dev-pago-item" style="color:var(--success)">✓ Cobrado<br><strong>$${pagado.toLocaleString('es-AR')}</strong></span>
              <span class="dev-pago-sep"></span>
              <span class="dev-pago-item" style="color:${saldo > 0 ? 'var(--warning)' : 'var(--success)'}">${saldo > 0 ? '⏳ Saldo' : '✔ Saldo'}<br><strong>$${saldo.toLocaleString('es-AR')}</strong></span>
              <span class="dev-pago-badge" style="background:${epColors[ep]}">${epLabels[ep]}</span>
            </div>
            <div style="margin-top:6px;font-size:.72rem;color:var(--bordo);font-weight:600">Ver detalle →</div>
          </div>`;
      }
    }).join('');

    // Click en cards de servicio → abrir detalle
    content.querySelectorAll('.event-servicio[data-svcid]').forEach(card => {
      card.addEventListener('click', () => {
        const ev = events.find(e => e.id === card.dataset.svcid);
        if (ev?.data) Servicios._openDetail(ev.data);
      });
    });

    // Click en cards de pedido → abrir popup con detalle completo
    content.querySelectorAll('.event-pedido[data-orderid]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('a')) return; // no interceptar clicks en links
        const ev = events.find(e => e.id === card.dataset.orderid);
        if (ev) this._openOrderDetail(ev);
      });
    });
  },

  _openOrderDetail(ev) {
    const d = ev.data;
    const isPaid = ['paid', 'pagado'].includes((d.paymentStatus || d.status || '').toLowerCase());
    const total = Number(ev.total || d.total || d.subtotal || 0);
    const subtotal = Number(d.subtotal || 0);
    const costoEnvio = typeof d.costoEnvio === 'number' ? d.costoEnvio : (d.envioGratis ? 0 : null);
    const tel = d.cliente?.telefono || d.telefono || '';
    const wsp = tel ? `https://wa.me/${tel.replace(/\D/g,'')}` : '';
    // Detectar retiro: campo explícito, o localidad = 'Retiro en local', o dirección vacía con costo $0
    const tipoEntrega = d.cliente?.tipoEntrega || d.tipoEntrega
      || (d.localidad === 'Retiro en local' ? 'retiro'
      : (!d.direccionEnvio?.calle && d.costoEnvio === 0 ? 'retiro' : 'envio'));
    const esRetiro = tipoEntrega === 'retiro';

    const productosRows = (d.productos || []).map(p => {
      const nom     = p.nombre || p.name || '';
      const qty     = p.cantidad ?? p.quantity ?? 1;
      const precio  = p.precio  ?? p.price  ?? 0;
      const itemTotal = Math.round(precio * qty);
      return `<tr>
        <td style="padding:6px 8px">${this._esc(nom)}</td>
        <td style="padding:6px 8px;text-align:center">×${qty}</td>
        <td style="padding:6px 8px;text-align:right">${precio > 0 ? '$' + itemTotal.toLocaleString('es-AR') : 'Consultar'}</td>
      </tr>`;
    }).join('');

    const dir = d.direccionEnvio;
    const dirTexto = dir?.calle
      ? `${dir.calle} ${dir.altura || ''}${dir.piso ? ', Piso ' + dir.piso : ''}${dir.depto ? ' Depto ' + dir.depto : ''}, ${dir.ciudad || ''}, ${dir.provincia || ''} ${dir.codigoPostal || ''}`
      : '';

    const html = `
      <div id="calOrderModal" style="
        position:fixed;inset:0;z-index:9999;
        display:flex;align-items:center;justify-content:center;
        background:rgba(0,0,0,.55);padding:16px">
        <div style="
          background:var(--blanco);border-radius:16px;
          max-width:520px;width:100%;max-height:90vh;overflow-y:auto;
          box-shadow:0 8px 40px rgba(0,0,0,.25);padding:28px 28px 24px">
          <!-- Header -->
          <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:18px">
            <div>
              <div style="font-family:\'Cormorant Garamond\',serif;font-size:1.4rem;font-weight:700;color:var(--negro)">${this._esc(ev.title)}</div>
            </div>
            <button id="calOrderModalClose" style="
              background:none;border:none;font-size:1.4rem;cursor:pointer;
              color:var(--text-muted);line-height:1;padding:0 4px">✕</button>
          </div>

          <!-- Datos del cliente -->
          <div style="background:#f9f6f3;border-radius:10px;padding:14px 16px;margin-bottom:16px;font-size:.83rem;line-height:1.9">
            ${tel ? `💬 <a href="${wsp}" target="_blank" rel="noopener" style="color:#25D366;font-weight:600;text-decoration:none">${tel}</a><br>` : ''}
            ${d.cliente?.email ? `✉️ ${this._esc(d.cliente.email)}<br>` : ''}
            ${d.cliente?.dni ? `🪪 DNI: ${this._esc(d.cliente.dni)}<br>` : ''}
            ${esRetiro
              ? `📦 <strong>Retiro en local</strong>`
              : dirTexto ? `📍 ${this._esc(dirTexto)}` : ''}
          </div>

          <!-- Fecha de entrega -->
          ${ev.date ? `<div style="font-size:.8rem;color:var(--text-muted);margin-bottom:14px">📅 Fecha de entrega: <strong>${ev.date}</strong></div>` : ''}

          <!-- Productos -->
          <table style="width:100%;border-collapse:collapse;margin-bottom:16px;font-size:.82rem">
            <thead>
              <tr style="border-bottom:2px solid var(--border)">
                <th style="padding:6px 8px;text-align:left;color:var(--text-muted);font-weight:600">Producto</th>
                <th style="padding:6px 8px;text-align:center;color:var(--text-muted);font-weight:600">Cant.</th>
                <th style="padding:6px 8px;text-align:right;color:var(--text-muted);font-weight:600">Total</th>
              </tr>
            </thead>
            <tbody>${productosRows}</tbody>
          </table>

          <!-- Totales -->
          <div style="border-top:2px solid var(--border);padding-top:12px;font-size:.85rem">
            ${subtotal ? `<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span>Subtotal</span><strong>$${subtotal.toLocaleString('es-AR')}</strong></div>` : ''}
            <div style="display:flex;justify-content:space-between;margin-bottom:8px">
              <span>Envío ${esRetiro ? '(retiro)' : ''}</span>
              <strong style="color:${costoEnvio === 0 ? 'var(--success)' : 'var(--negro)'}">
                ${costoEnvio === 0 ? '🎉 Gratis' : costoEnvio > 0 ? '$' + costoEnvio.toLocaleString('es-AR') : '—'}
              </strong>
            </div>
            <div style="display:flex;justify-content:space-between;font-size:1rem;font-weight:700;color:var(--bordo)">
              <span>Total</span><span>$${total.toLocaleString('es-AR')}</span>
            </div>
          </div>
        </div>
      </div>`;

    document.body.insertAdjacentHTML('beforeend', html);
    const modal = document.getElementById('calOrderModal');
    document.getElementById('calOrderModalClose').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
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
