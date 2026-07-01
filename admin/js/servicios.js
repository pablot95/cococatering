// ================================================
// servicios.js — Gestión de servicios / eventos
// Colección: admin_servicios
// ================================================

const Servicios = {
  servicios:    [],
  menus:        [],
  presupuestos: [],
  productos:    [],
  ingredientes: [],
  materiales:   [],
  subproductos: [],
  clientesVip:  [],

  TIPOS_EVENTO: [
    'Cumpleaños', 'Casamiento', 'Corporativo', 'Baby shower',
    'Comunión', 'Bautismo', 'Dulce de 15', 'Graduación', 'Reunión', 'Otro'
  ],
  ESTADOS: {
    pendiente:  { label: 'Pendiente',  css: 'badge-warning' },
    confirmado: { label: 'Confirmado', css: 'badge-info'    },
    completado: { label: 'Completado', css: 'badge-success' },
    cancelado:  { label: 'Cancelado',  css: 'badge-muted'   }
  },
  ESTADOS_PAGO: {
    sin_pago: { label: 'Sin pago',   css: 'badge-error'   },
    parcial:  { label: 'Parcial',    css: 'badge-warning' },
    completo: { label: 'Completo',   css: 'badge-success' }
  },
  CURSO_ORDER: ['Entrada', 'Principal', 'Postre', 'Bebida', 'Otro'],
  CURSOS:      ['Entrada', 'Principal', 'Postre', 'Bebida', 'Otro'],

  async render() {
    document.getElementById('mainContent').innerHTML =
      '<div class="loading-spinner"><div class="spinner-ring"></div></div>';
    await this._load();
    this._renderList();
  },

  async _load() {
    try {
      const [sSnap, mSnap, pSnap, prodSnap, ingSnap, matSnap, subSnap, vipSnap] = await Promise.all([
        db.collection('admin_servicios').get().catch(() => ({ docs: [] })),
        db.collection('admin_menus').get().catch(() => ({ docs: [] })),
        db.collection('admin_presupuestos').get().catch(() => ({ docs: [] })),
        db.collection('admin_productos').get().catch(() => ({ docs: [] })),
        db.collection('admin_ingredientes').get().catch(() => ({ docs: [] })),
        db.collection('admin_materiales').get().catch(() => ({ docs: [] })),
        db.collection('admin_subproductos').get().catch(() => ({ docs: [] })),
        db.collection('admin_clientes_vip').get().catch(() => ({ docs: [] }))
      ]);
      const byNombre = (a, b) => (a.nombre || '').localeCompare(b.nombre || '');
      const totalUpdates = [];
      this.servicios    = sSnap.docs.map(d => {
        const svc = { id: d.id, ...d.data() };
        const totalFinal = this._totalSvcConDescuento(svc);
        if (svc.subtotalBruto > 0 && svc.descuento > 0 && Math.round(Number(svc.total || 0)) !== totalFinal) {
          totalUpdates.push(d.ref.update({ total: totalFinal }).catch(e => console.warn('No se pudo normalizar total de servicio', d.id, e)));
        }
        return { ...svc, total: totalFinal };
      });
      this.servicios = this._dedupePedidosWeb(this.servicios);
      this.menus        = mSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      this.presupuestos = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.productos    = prodSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      this.ingredientes = ingSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      this.materiales   = matSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      this.subproductos = subSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      this.clientesVip  = vipSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      if (totalUpdates.length) await Promise.all(totalUpdates);
      // Presupuestos ordenados por fechaEvento
      this.presupuestos.sort((a, b) => {
        const fa = a.fechaEvento || a.fecha || '';
        const fb = b.fechaEvento || b.fecha || '';
        return fa < fb ? 1 : fa > fb ? -1 : 0;
      });
    } catch (e) {
      this.servicios = []; this.menus = []; this.presupuestos = []; this.productos = [];
      this.ingredientes = []; this.materiales = []; this.subproductos = []; this.clientesVip = [];
    }
  },

  _renderList(filter = {}) {
    // Valor por defecto: primer y último día del mes actual
    if (filter.desde === undefined && filter.hasta === undefined) {
      const hoy = new Date();
      const primerDiaMes = new Date(hoy.getFullYear(), hoy.getMonth(), 1);
      const ultimoDiaMes = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
      filter = { ...filter, desde: primerDiaMes.toISOString().slice(0, 10), hasta: ultimoDiaMes.toISOString().slice(0, 10) };
    }

    let items = this.servicios.slice();

    // Aplicar filtros
    if (filter.cliente) {
      const q = filter.cliente.toLowerCase();
      items = items.filter(s => (s.cliente?.nombre || '').toLowerCase().includes(q));
    }
    if (filter.estado) items = items.filter(s => (s.estado || 'pendiente') === filter.estado);
    if (filter.estadoPago) items = items.filter(s => (s.estadoPago || 'sin_pago') === filter.estadoPago);
    const campoFecha = filter.campoFecha === 'creacion' ? 'fecha' : 'fechaEvento';
    if (filter.desde) items = items.filter(s => (s[campoFecha] || s.fechaEvento || '') >= filter.desde);
    if (filter.hasta) items = items.filter(s => (s[campoFecha] || s.fechaEvento || '') <= filter.hasta);

    // Ordenar descendente por el campo de fecha seleccionado
    // Ordenar
    const orden = filter.orden || 'evento_asc';
    items.sort((a, b) => {
      let fa, fb;
      if (orden === 'creacion_desc') {
        fa = a.fecha || ''; fb = b.fecha || '';
        if (fa && fb) return fa > fb ? -1 : fa < fb ? 1 : 0;
      } else {
        fa = a.fechaEvento || a.fecha || ''; fb = b.fechaEvento || b.fecha || '';
        if (fa && fb) return fa < fb ? -1 : fa > fb ? 1 : 0;
      }
      return (b.numero || 0) - (a.numero || 0);
    });

    const lim = typeof App !== 'undefined' && App.isLimitado;
    const SVC_COLS = lim
      ? '60px 1fr 150px 150px 1fr 70px 80px 140px'
      : '60px 1fr 150px 150px 1fr 70px 80px 140px 90px 100px 100px';
    const sinPago = items.filter(s => (s.estadoPago || 'sin_pago') === 'sin_pago' && s.estado !== 'cancelado').length;
    const parcial = items.filter(s => s.estadoPago === 'parcial').length;

    document.getElementById('mainContent').innerHTML = `
      <div class="section-wrapper">
        <div class="tab-header">
          <h3>SERVICIOS <span class="count-badge" id="svcCountBadge">${items.length}</span></h3>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <span class="badge badge-error" id="svcSinPagoBadge" style="${sinPago && !lim ? '' : 'display:none'}">${sinPago} sin pago</span>
            <span class="badge badge-warning" id="svcParcialBadge" style="${parcial && !lim ? '' : 'display:none'}">${parcial} pago parcial</span>
            <button class="btn-secondary" id="btnSvcFromPres">📋 Desde presupuesto</button>
            <button class="btn-primary" id="btnAddSvc">Nuevo servicio</button>
          </div>
        </div>

        <!-- Filtros -->
        <div class="filter-bar">
          <input id="fSvcCliente" type="text" placeholder="🔍 Buscar cliente…"
            value="${filter.cliente || ''}" class="filter-input">
          <select id="fSvcEstado" class="filter-select">
            <option value="">Todos los estados</option>
            ${Object.entries(this.ESTADOS).map(([k,v]) =>
              `<option value="${k}" ${filter.estado === k ? 'selected' : ''}>${v.label}</option>`
            ).join('')}
          </select>
          <select id="fSvcPago" class="filter-select svc-filter-pago">
            <option value="">Todos los pagos</option>
            ${Object.entries(this.ESTADOS_PAGO).map(([k,v]) =>
              `<option value="${k}" ${filter.estadoPago === k ? 'selected' : ''}>${v.label}</option>`
            ).join('')}
          </select>
          <select id="fSvcCampoFecha" class="filter-select">
            <option value="evento"   ${(filter.campoFecha||'evento') === 'evento'   ? 'selected' : ''}>📅 Fecha evento</option>
            <option value="creacion" ${filter.campoFecha === 'creacion' ? 'selected' : ''}>🗓️ Fecha creación</option>
          </select>
          <input id="fSvcDesde" type="date" value="${filter.desde || ''}" class="filter-input">
          <input id="fSvcHasta" type="date" value="${filter.hasta || ''}" class="filter-input">
          <select id="fSvcOrden" class="filter-select">
            <option value="evento_asc"    ${(filter.orden||'evento_asc')==='evento_asc'    ? 'selected' : ''}>↑ Próximo evento</option>
            <option value="creacion_desc" ${filter.orden==='creacion_desc' ? 'selected' : ''}>↓ Último creado</option>
          </select>
          <button class="btn-secondary" id="btnSvcClearFilter">✕</button>
        </div>

        <div class="prod-list" id="svcRowsContainer"></div>
      </div>`;

    document.getElementById('btnAddSvc').addEventListener('click', () => this._openModal());
    document.getElementById('btnSvcFromPres').addEventListener('click', () => this._openFromPresupuesto());
    this._bindSvcFilters();
    this._renderRowsSvc(items);
  },

  _getSvcFilteredItems(filter) {
    const hoy = new Date();
    if (filter.desde === undefined && filter.hasta === undefined) {
      filter = {
        ...filter,
        desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10),
        hasta: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10)
      };
    }
    let items = this.servicios.slice();
    if (filter.cliente) {
      const q = filter.cliente.toLowerCase();
      items = items.filter(s => (s.cliente?.nombre || '').toLowerCase().includes(q));
    }
    if (filter.estado) items = items.filter(s => (s.estado || 'pendiente') === filter.estado);
    if (filter.estadoPago) items = items.filter(s => (s.estadoPago || 'sin_pago') === filter.estadoPago);
    const campoFecha = filter.campoFecha === 'creacion' ? 'fecha' : 'fechaEvento';
    if (filter.desde) items = items.filter(s => (s[campoFecha] || s.fechaEvento || '') >= filter.desde);
    if (filter.hasta) items = items.filter(s => (s[campoFecha] || s.fechaEvento || '') <= filter.hasta);
    const orden = filter.orden || 'evento_asc';
    items.sort((a, b) => {
      let fa, fb;
      if (orden === 'creacion_desc') {
        fa = a.fecha || ''; fb = b.fecha || '';
        if (fa && fb) return fa > fb ? -1 : fa < fb ? 1 : 0;
      } else {
        fa = a.fechaEvento || a.fecha || ''; fb = b.fechaEvento || b.fecha || '';
        if (fa && fb) return fa < fb ? -1 : fa > fb ? 1 : 0;
      }
      return (b.numero || 0) - (a.numero || 0);
    });
    return { items, filter };
  },

  _renderRowsSvc(items) {
    const cont = document.getElementById('svcRowsContainer');
    if (!cont) return;
    const lim = typeof App !== 'undefined' && App.isLimitado;
    const SVC_COLS = lim
      ? '60px 1fr 150px 150px 1fr 70px 80px 140px'
      : '60px 1fr 150px 150px 1fr 70px 80px 140px 90px 100px 100px';
    const sinPago = items.filter(s => (s.estadoPago || 'sin_pago') === 'sin_pago' && s.estado !== 'cancelado').length;
    const parcial = items.filter(s => s.estadoPago === 'parcial').length;
    const badge = document.getElementById('svcCountBadge');
    if (badge) badge.textContent = items.length;
    const spBadge = document.getElementById('svcSinPagoBadge');
    const paBadge = document.getElementById('svcParcialBadge');
    if (spBadge) { spBadge.textContent = `${sinPago} sin pago`; spBadge.style.display = sinPago && !lim ? '' : 'none'; }
    if (paBadge) { paBadge.textContent = `${parcial} pago parcial`; paBadge.style.display = parcial && !lim ? '' : 'none'; }
    const header = `<div class="prod-list-header" style="grid-template-columns:${SVC_COLS}">
      <span>#</span><span>Cliente</span><span>Fecha Evento</span><span>Fecha Creación</span>
      <span>Tipo</span><span>Pers.</span><span>Sabor</span><span>Menú</span>
      ${lim ? '' : '<span>Total</span><span>Costo</span><span>Pago</span>'}
    </div>`;
    const rows = items.length === 0
      ? '<p class="empty-msg" style="padding:20px">No hay servicios que coincidan.</p>'
      : items.map(s => {
          const ep  = s.estadoPago || 'sin_pago';
          const sinPagoRow = !lim && s.estado !== 'cancelado' && ep === 'sin_pago';
          const costoSvc = (() => {
            if (s.costo) return s.costo;
            if (s.costoInsumos) return s.costoInsumos;
            const fromInsumos = (s.insumos || []).reduce((acc, ins) => acc + (ins.subtotal || 0), 0);
            const fromItems = (s.items || []).reduce((acc, it) => {
              if (it.costoAjustado) return acc + it.costoAjustado;
              if (it.tipo === 'producto') {
                const webId = it.webProductoId || it.id || '';
                const webColl = it.webVinculo?.collection || it.webCollection || '';
                const prod = this.productos.find(p => p.id === it.id)
                  || this.productos.find(p => {
                      const vc = p.webVinculo || p.productoGestionVinculo || p.gestionVinculo;
                      if (!vc) return false;
                      const sameDoc = vc.docId === webId || vc.id === webId || vc.productId === webId;
                      const sameColl = !webColl || !vc.collection || vc.collection === webColl;
                      return sameDoc && sameColl;
                    });
                if (prod?.precioCoste) {
                  const costoUnit = Math.round((prod.precioCoste || 0) / (prod.personas || 1));
                  return acc + costoUnit * (it.cantidad || it.bocados || 1);
                }
              }
              return acc;
            }, 0);
            return fromItems + fromInsumos;
          })();
          const menu = (s.items || []).find(it => it.tipo === 'menu');
          const totalSvc = this._totalSvcConDescuento(s);
          const svcFinCells = lim ? '' : `<span style="font-weight:700">$${Math.round(totalSvc).toLocaleString('es-AR')}</span>
            <span style="color:var(--text-muted)">${costoSvc ? '$' + Math.round(costoSvc).toLocaleString('es-AR') : '—'}</span>
            <span><span class="badge ${this.ESTADOS_PAGO[ep]?.css || 'badge-muted'}" style="font-size:.7rem">${this.ESTADOS_PAGO[ep]?.label || ep}</span></span>`;
          return `<div class="prod-row ${sinPagoRow ? 'row-sin-pago' : ''}" data-id="${s.id}"
            style="grid-template-columns:${SVC_COLS}">
            <span><strong>#${String(s.numero || '').padStart(3,'0')}</strong></span>
            <span class="prod-nombre">${this._esc(s.cliente?.nombre || '—')}</span>
            <span style="font-size:.82rem">${this._formatDate(s.fechaEvento)}</span>
            <span style="font-size:.82rem;color:var(--text-muted)">${this._formatDate(s.fecha)}</span>
            <span>${this._esc(s.tipoEvento || '—')}</span>
            <span>${s.personas || '—'}</span>
            <span style="font-size:.8rem">${this._esc(s.sabor || '—')}</span>
            <span style="font-size:.8rem">${this._esc(menu?.nombre || '-')}</span>
            ${svcFinCells}
          </div>`;
        }).join('');
    cont.innerHTML = header + rows;
    cont.querySelectorAll('.prod-row').forEach(row => {
      row.addEventListener('click', () => {
        const s = this.servicios.find(x => x.id === row.dataset.id);
        if (s) this._openDetail(s);
      });
    });
  },

  _totalPresConDescuento(p = {}) {
    const subtotal = Number(p.subtotalBruto || 0);
    const descuento = Number(p.descuento || 0);
    if (subtotal > 0 && descuento > 0) return Math.round(subtotal * (1 - descuento / 100));
    return Math.round(p.totalGeneral || 0);
  },

  _totalSvcConDescuento(s = {}) {
    const subtotal = Number(s.subtotalBruto || 0);
    const descuento = Number(s.descuento || 0);
    if (subtotal > 0 && descuento > 0) return Math.round(subtotal * (1 - descuento / 100));
    return Math.round(s.total || 0);
  },

  _servicioPedidoKey(s = {}) {
    if (s.tipoServicio !== 'pedido' && !s.solicitudId && !s.orderId && !s.codigoPedido) {
      return `servicio:${s.id}`;
    }
    if (s.solicitudId) return `pedido:sol:${s.solicitudId}`;
    if (s.orderId) return `pedido:order:${s.orderId}`;
    if (s.codigoPedido) return `pedido:codigo:${s.codigoPedido}`;
    return `servicio:${s.id}`;
  },

  _servicioDedupeScore(s = {}) {
    let score = 0;
    if (s.estadoPago === 'completo') score += 30;
    else if (s.estadoPago === 'parcial') score += 20;
    else if (Number(s.montoPagado || 0) > 0) score += 10;
    if (String(s.id || '').startsWith('solicitud_')) score += 5;
    if (s.orderId) score += 3;
    if (s.solicitudId) score += 3;
    return score;
  },

  _dedupePedidosWeb(servicios = []) {
    const byKey = new Map();
    servicios.forEach(s => {
      const key = this._servicioPedidoKey(s);
      const prev = byKey.get(key);
      if (!prev || this._servicioDedupeScore(s) > this._servicioDedupeScore(prev)) {
        byKey.set(key, s);
      }
    });
    return Array.from(byKey.values());
  },

  _bindSvcFilters() {
    const applyFilter = () => {
      const { items } = this._getSvcFilteredItems({
        cliente:    document.getElementById('fSvcCliente').value.trim(),
        estado:     document.getElementById('fSvcEstado').value,
        estadoPago: document.getElementById('fSvcPago').value,
        campoFecha: document.getElementById('fSvcCampoFecha').value,
        desde:      document.getElementById('fSvcDesde').value,
        hasta:      document.getElementById('fSvcHasta').value,
        orden:      document.getElementById('fSvcOrden').value
      });
      this._renderRowsSvc(items);
    };
    document.getElementById('fSvcCliente').addEventListener('input',       applyFilter);
    document.getElementById('fSvcEstado').addEventListener('change',       applyFilter);
    document.getElementById('fSvcPago').addEventListener('change',         applyFilter);
    document.getElementById('fSvcCampoFecha').addEventListener('change',   applyFilter);
    document.getElementById('fSvcDesde').addEventListener('change',        applyFilter);
    document.getElementById('fSvcHasta').addEventListener('change',        applyFilter);
    document.getElementById('fSvcOrden').addEventListener('change',        applyFilter);
    document.getElementById('btnSvcClearFilter').addEventListener('click', () => {
      document.getElementById('fSvcCliente').value = '';
      document.getElementById('fSvcEstado').value = '';
      document.getElementById('fSvcPago').value = '';
      document.getElementById('fSvcDesde').value = '';
      document.getElementById('fSvcHasta').value = '';
      applyFilter();
    });
  },

  // ── Crear desde presupuesto ─────────────────────

  _openFromPresupuesto() {
    App.openModal('Nuevo servicio desde presupuesto', `
      <div class="admin-form">
        <div class="field-group">
          <label>Seleccioná un presupuesto</label>
          <select id="selPresupuesto" style="font-size:.9rem">
            <option value="">— Elegir presupuesto —</option>
            ${this.presupuestos.map(p => `
              <option value="${p.id}">
                #${String(p.numero || '').padStart(3,'0')} — ${this._esc(p.cliente?.nombre || '')}
                ${p.fechaEvento ? ' · ' + this._formatDate(p.fechaEvento) : ''}
                ${p.personas ? ' · ' + p.personas + ' px' : ''}
              </option>`).join('')}
          </select>
        </div>
        <div class="form-actions">
          <button class="btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button class="btn-primary" id="btnConfirmFromPres">Continuar →</button>
        </div>
      </div>`, 'md');

    document.getElementById('btnConfirmFromPres').addEventListener('click', () => {
      const presId = document.getElementById('selPresupuesto').value;
      if (!presId) { App.toast('Elegí un presupuesto', 'warning'); return; }
      const pres = this.presupuestos.find(p => p.id === presId);
      App.closeModalForce();
      if (pres) this._confirmFromPresupuesto(pres);
    });
  },

  _confirmFromPresupuesto(pres) {
    const nextNum = this.servicios.length > 0
      ? Math.max(...this.servicios.map(s => s.numero || 0)) + 1 : 1;

    App.openModal(`Confirmar servicio — Pres. #${String(pres.numero || '').padStart(3,'0')}`, `
      <div class="pres-meta-grid" style="margin-bottom:16px">
        <div class="pres-meta-cell">
          <span class="pres-meta-label">Cliente</span>
          <span class="pres-meta-val">${this._esc(pres.cliente?.nombre || '—')}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label">Teléfono</span>
          <span class="pres-meta-val">${this._esc(pres.cliente?.telefono || '—')}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label">Fecha del evento</span>
          <span class="pres-meta-val">${this._formatDate(pres.fechaEvento)}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label">Tipo de evento</span>
          <span class="pres-meta-val">${this._esc(pres.tipoEvento || '—')}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label">Personas</span>
          <span class="pres-meta-val">${pres.personas || '—'}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label">Niños</span>
          <span class="pres-meta-val">${pres.ninos || 0}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label">Sin TACC</span>
          <span class="pres-meta-val">${pres.sinTacc || 0}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label">Vegetarianos</span>
          <span class="pres-meta-val">${pres.vegetarianos || 0}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label">Total</span>
          <span class="pres-meta-val" style="color:var(--bordo);font-weight:700">$${Math.round(this._totalPresConDescuento(pres)).toLocaleString('es-AR')}</span>
        </div>
        ${pres.tipoPedido ? `<div class="pres-meta-cell">
          <span class="pres-meta-label">Tipo de pedido</span>
          <span class="pres-meta-val">${this._esc(pres.tipoPedido)}</span>
        </div>` : ''}
        ${pres.sabor ? `<div class="pres-meta-cell">
          <span class="pres-meta-label">Sabor</span>
          <span class="pres-meta-val">${this._esc(pres.sabor)}</span>
        </div>` : ''}
      </div>

      <div class="form-row" style="align-items:flex-end;gap:12px">
        <div class="field-group" style="flex:0 0 190px">
          <label>Hora del evento <span style="font-weight:400;color:var(--text-muted)">(opcional)</span></label>
          <select id="cfHora">
            <option value="">— Sin especificar —</option>
            <option value="08:00">08:00 hs</option>
            <option value="09:00">09:00 hs</option>
            <option value="10:00">10:00 hs</option>
            <option value="11:00">11:00 hs</option>
            <option value="12:00">12:00 hs</option>
            <option value="13:00">13:00 hs</option>
            <option value="14:00">14:00 hs</option>
            <option value="15:00">15:00 hs</option>
            <option value="16:00">16:00 hs</option>
            <option value="17:00">17:00 hs</option>
            <option value="18:00">18:00 hs</option>
            <option value="19:00">19:00 hs</option>
            <option value="20:00">20:00 hs</option>
            <option value="21:00">21:00 hs</option>
            <option value="22:00">22:00 hs</option>
          </select>
        </div>
        <div class="field-group" style="flex:0 0 140px">
          <label>N° de servicio</label>
          <input id="cfNumero" type="number" value="${nextNum}" min="1" step="1">
        </div>
        <div class="field-group" style="flex:1">
          <label>Costo estimado</label>
          <input type="text" readonly value="$${Math.round(pres.costo || pres.costoInsumos || 0).toLocaleString('es-AR')}" style="background:var(--bg);color:var(--text-muted)">
        </div>
      </div>

      <div class="form-actions" style="margin-top:16px">
        <button class="btn-secondary" id="btnCfEditarAntes">Editar datos</button>
        <button class="btn-secondary" onclick="App.closeModal()">Cancelar</button>
        <button class="btn-primary" id="btnCfConfirmar">✅ Confirmar servicio</button>
      </div>`, 'lg');

    document.getElementById('btnCfEditarAntes').addEventListener('click', () => {
      App.closeModalForce();
      this._openModal(null, pres);
    });

    document.getElementById('btnCfConfirmar').addEventListener('click', async () => {
      const btn = document.getElementById('btnCfConfirmar');
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        const data = {
          numero:        parseInt(document.getElementById('cfNumero').value) || nextNum,
          fecha:         new Date().toISOString().slice(0, 10),
          estado:        'confirmado',
          estadoPago:    'sin_pago',
          fechaEvento:   pres.fechaEvento || null,
          horaEvento:    document.getElementById('cfHora').value || null,
          tipoEvento:    pres.tipoEvento || null,
          tipoPedido:    pres.tipoPedido || null,
          sabor:         pres.sabor || null,
          personas:      pres.personas || 0,
          ninos:         pres.ninos || 0,
          sinTacc:       pres.sinTacc || 0,
          vegetarianos:  pres.vegetarianos || 0,
          presupuestoId: pres.id,
          subtotalBruto: Math.round(pres.subtotalBruto || pres.totalGeneral || 0),
          descuento:     parseFloat(pres.descuento) || 0,
          total:         Math.round(this._totalPresConDescuento(pres)),
          costo:         Math.round(pres.costo || pres.costoInsumos || 0),
          costoEstimado: Math.round(pres.costo || pres.costoInsumos || 0),
          costoInsumos:  Math.round(pres.costo || pres.costoInsumos || 0),
          insumos:       pres.insumos || [],
          items:         pres.items   || [],
          notas:         pres.notas || '',
          cliente: {
            nombre:   pres.cliente?.nombre || '',
            telefono: pres.cliente?.telefono || ''
          },
          fechaCreacion: firebase.firestore.FieldValue.serverTimestamp(),
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        };
        const ref = await db.collection('admin_servicios').add(data);
        await this._syncGasto(ref.id, data);
        App.closeModalForce();
        App.toast('Servicio creado', 'success');
        await this._load();
        this._renderList();
      } catch (err) {
        console.error(err);
        App.toast('Error al crear el servicio', 'error');
        btn.disabled = false; btn.textContent = '✅ Confirmar servicio';
      }
    });
  },


  // ── Modal: Crear / Editar servicio ──────────────

  _openModal(item = null, pres = null) {
    const isEdit = !!item;
    const nextNum = this.servicios.length > 0
      ? Math.max(...this.servicios.map(s => s.numero || 0)) + 1 : 1;
    const today = new Date().toISOString().slice(0, 10);

    // Pre-llenar datos desde presupuesto si existe
    const clienteNombre = item?.cliente?.nombre || pres?.cliente?.nombre || '';
    const clienteTel    = item?.cliente?.telefono || pres?.cliente?.telefono || '';
    const tipoEvento    = item?.tipoEvento || pres?.tipoEvento || this.TIPOS_EVENTO[0];
    const fechaEvento   = item?.fechaEvento || pres?.fechaEvento || '';
    const personas      = item?.personas || pres?.personas || '';
    const tipoPedido    = item?.tipoPedido || pres?.tipoPedido || '';
    const sabor         = item?.sabor || pres?.sabor || '';
    const presId        = item?.presupuestoId || pres?.id || '';
    const estadoDefault = isEdit ? (item?.estado || 'confirmado') : 'confirmado';

    App.openModal(isEdit ? `Editar servicio #${String(item.numero || '').padStart(3,'00')}` : 'Nuevo servicio', `
      <form id="fSvc" class="admin-form">
        ${pres ? `<div style="background:var(--bordo-light);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:.82rem;color:var(--bordo)">
          📋 Creando desde presupuesto <strong>#${String(pres.numero || '').padStart(3,'0')}</strong>
        </div>` : ''}

        <div class="form-row">
          <div class="field-group">
            <label>N° de servicio</label>
            <input id="sNumero" type="number" value="${item?.numero ?? nextNum}" min="1" step="1" autocomplete="off">
          </div>
          <div class="field-group">
            <label>Fecha de creación</label>
            <input id="sFechaServicio" type="date" value="${item?.fecha || today}">
          </div>
        </div>

        <div class="form-section-title">Cliente</div>
        ${this.clientesVip.length ? `
        <div class="form-row">
          <div class="field-group">
            <label>⭐ Cliente VIP</label>
            <div class="rel-add-wrap">
              <input class="rel-add-input" id="sVipSelector" type="text" placeholder="Buscar cliente VIP…" autocomplete="off">
              <div class="rel-add-dropdown" id="sVipSelector_drop"></div>
            </div>
          </div>
        </div>` : ''}
        <div class="form-row">
          <div class="field-group">
            <label>Nombre *</label>
            <input id="sClienteNombre" type="text" value="${this._esc(clienteNombre)}"
              placeholder="Nombre del cliente" required>
          </div>
          <div class="field-group">
            <label>Teléfono</label>
            <input id="sClienteTel" type="tel" value="${this._esc(clienteTel)}"
              placeholder="Ej: 11 5555-0000">
          </div>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label class="vip-checkbox-label">
              <input type="checkbox" id="sClienteVip" ${item?.cliente?.esVip ? 'checked' : ''}>
              Guardar como Cliente VIP
            </label>
          </div>
        </div>

        <div class="form-row">
          <div class="field-group">
            <label>Tipo de pedido</label>
            <select id="sTipoPedido">
              <option value="" ${!tipoPedido ? 'selected' : ''}>— Sin especificar —</option>
              <option value="Pedido" ${tipoPedido === 'Pedido' ? 'selected' : ''}>Pedido</option>
              <option value="Evento" ${tipoPedido === 'Evento' ? 'selected' : ''}>Evento</option>
            </select>
          </div>
          <div class="field-group">
            <label>Sabor</label>
            <select id="sSabor">
              <option value="" ${!sabor ? 'selected' : ''}>— Sin especificar —</option>
              <option value="Dulce"  ${sabor === 'Dulce'  ? 'selected' : ''}>Dulce</option>
              <option value="Salado" ${sabor === 'Salado' ? 'selected' : ''}>Salado</option>
              <option value="Mixto"  ${sabor === 'Mixto'  ? 'selected' : ''}>Mixto</option>
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="field-group" id="grpSTipoEvento">
            <label>Tipo de evento</label>
            <select id="sTipoEvento" ${tipoPedido !== 'Evento' ? 'disabled' : ''}>
              ${this.TIPOS_EVENTO.map(t =>
                `<option value="${t}" ${tipoEvento === t ? 'selected' : ''}>${t}</option>`
              ).join('')}
            </select>
          </div>
          <div class="field-group">
            <label>Fecha del evento *</label>
            <input id="sFechaEvento" type="date" value="${fechaEvento}" required>
          </div>
        </div>

        <div class="form-row">
          <div class="field-group">
            <label>Personas *</label>
            <input id="sPersonas" type="number" min="1" step="1"
              value="${personas}" placeholder="0" required>
          </div>
          <div class="field-group">
            <label>Hora del evento <span style="font-weight:400;color:var(--text-muted)">(opcional)</span></label>
            <select id="sHora">
              <option value="">— Sin especificar —</option>
              ${['08:00','09:00','10:00','11:00','12:00','13:00','14:00','15:00','16:00','17:00','18:00','19:00','20:00','21:00','22:00'].map(h =>
                `<option value="${h}" ${(item?.horaEvento||pres?.horaEvento||'') === h ? 'selected' : ''}>${h} hs</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Niños</label>
            <input id="sNinos" type="number" min="0" step="1" value="${item?.ninos || pres?.ninos || ''}" placeholder="0">
          </div>
          <div class="field-group">
            <label>Sin TACC</label>
            <input id="sSinTacc" type="number" min="0" step="1" value="${item?.sinTacc || pres?.sinTacc || ''}" placeholder="0">
          </div>
          <div class="field-group">
            <label>Vegetarianos</label>
            <input id="sVegetarianos" type="number" min="0" step="1" value="${item?.vegetarianos || pres?.vegetarianos || ''}" placeholder="0">
          </div>
        </div>

        <div class="form-section-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>Ítems del servicio</span>
          <button type="button" class="btn-primary" id="btnAddItemSvc">Agregar ítem</button>
        </div>

        <div class="items-table">
          <div class="item-row item-header">
            <span>Tipo</span><span></span>
            <span>Cant.</span><span>P. unit.</span><span>Valor Total</span><span></span>
          </div>
          <div id="svcItemsContainer"></div>
        </div>

        <div id="svcDetailPanel" class="detail-panel" style="display:none"></div>

        <div class="ptb-wrap" id="svcTotalBox" style="display:flex;justify-content:flex-end">
          <div class="ptb-main" style="flex:0 0 58%">
            <div class="ptb-row">
              <span class="ptb-row-label">Subtotal</span>
              <span class="ptb-row-val" id="svcDisplaySubtotal">$0</span>
            </div>
            <div class="ptb-row ptb-row--discount">
              <span class="ptb-row-label">Descuento</span>
              <span class="ptb-discount-group">
                <span id="svcDisplayDescuentoMonto" class="ptb-discount-amount"></span>
                <input id="sDescuento" type="number" min="0" max="100" step="1"
                  value="${item?.descuento || pres?.descuento || ''}" placeholder="0" class="ptb-discount-input">
                <span class="ptb-pct">%</span>
              </span>
            </div>
            <div class="ptb-total-row">
              <span class="ptb-total-label">Total general</span>
              <span class="ptb-total-val" id="svcDisplayTotal">$0</span>
            </div>
          </div>
        </div>

        <div class="field-group">
          <label>Dirección de entrega</label>
          <input id="sDireccion" type="text" value="${this._esc(item?.direccionEntrega || pres?.direccionEntrega || '')}" placeholder="Ej: Av. Corrientes 1234, CABA">
        </div>

        <div class="field-group">
          <label>Notas</label>
          <textarea id="sNotas" rows="2" placeholder="Observaciones…">${this._esc(item?.notas || '')}</textarea>
        </div>

        <div class="form-actions">
          ${isEdit ? `<button type="button" class="btn-danger" id="btnDeleteSvcForm" style="margin-right:auto">🗑️ Eliminar</button>` : ''}
          <button type="button" class="btn-secondary" id="btnCancelSvc">Cancelar</button>
          <button type="submit" class="btn-primary" id="btnSaveSvc">${isEdit ? 'Guardar cambios' : 'Crear servicio'}</button>
        </div>
      </form>`, 'xl');

    // Poblar ítems existentes (del servicio o del presupuesto origen)
    const container = document.getElementById('svcItemsContainer');
    const itemsToLoad = this._normalizeItemsForEditor(item?.items?.length ? item.items : (pres?.items?.length ? pres.items : []));
    itemsToLoad.forEach(it => this._addItemRowSvc(container, it));
    // Cargar insumos existentes usando su tipo real (ingrediente/material/subproducto)
    const insumosToLoad = item?.insumos?.length ? item.insumos : (pres?.insumos?.length ? pres.insumos : []);
    insumosToLoad.forEach(ins => this._addItemRowSvc(container, ins));
    this._calcTotalSvc();

    // Si es edición y el costo guardado es 0, recalcularlo desde el DOM y corregir Firestore silenciosamente
    if (isEdit && item?.id) {
      setTimeout(() => {
        const domRows = document.querySelectorAll('#svcItemsContainer .item-row');
        const costoProductos = Array.from(domRows).reduce((acc, r) => {
          if (r.querySelector('.ir-tipo')?.value !== 'producto') return acc;
          const prodId = r.querySelector('.ir-item')?.value;
          const prod = prodId ? this.productos.find(p => p.id === prodId) : null;
          const costoUnit = parseFloat(r.dataset.costo) || ((prod?.precioCoste || 0) / (prod?.personas || 1));
          return acc + (parseFloat(r.querySelector('.ir-cant')?.value) || 0) * costoUnit;
        }, 0);
        const costoInsumos = insumosToLoad.reduce((a, ins) => a + (ins.subtotal || 0), 0);
        const costoReal = Math.round(costoProductos + costoInsumos);
        if (costoReal > 0 && costoReal !== Math.round(item.costo || 0)) {
          db.collection('admin_servicios').doc(item.id)
            .update({ costo: costoReal, costoEstimado: costoReal, costoInsumos: costoReal })
            .catch(() => {});
        }
      }, 200);
    }

    // ── VIP selector ──
    const vipInputS = document.getElementById('sVipSelector');
    const vipDropS  = document.getElementById('sVipSelector_drop');
    if (vipInputS && vipDropS) {
      const vips = this.clientesVip;
      const showVipDropS = (q) => {
        const matches = q.trim()
          ? vips.filter(v => v.nombre.toLowerCase().includes(q.toLowerCase()))
          : vips;
        if (!matches.length) { vipDropS.innerHTML = ''; vipDropS.classList.remove('open'); return; }
        vipDropS.innerHTML = matches.map(v =>
          `<div class="rel-drop-item" data-id="${v.id}">${v.nombre}${v.telefono ? ' — ' + v.telefono : ''}</div>`
        ).join('');
        vipDropS.classList.add('open');
        vipDropS.querySelectorAll('.rel-drop-item').forEach(opt => {
          opt.addEventListener('mousedown', e => {
            e.preventDefault();
            const vip = vips.find(x => x.id === opt.dataset.id);
            if (vip) {
              document.getElementById('sClienteNombre').value = vip.nombre;
              document.getElementById('sClienteTel').value    = vip.telefono || '';
            }
            vipInputS.value = '';
            vipDropS.classList.remove('open');
          });
        });
      };
      vipInputS.addEventListener('focus', () => showVipDropS(vipInputS.value));
      vipInputS.addEventListener('input', () => showVipDropS(vipInputS.value));
      vipInputS.addEventListener('blur',  () => setTimeout(() => vipDropS.classList.remove('open'), 150));
    }
    // ── fin VIP selector ──

    document.getElementById('btnAddItemSvc').addEventListener('click', () => this._addItemRowSvc(container));
    document.getElementById('sPersonas').addEventListener('input', () => this._calcTotalSvc());
    document.getElementById('sDescuento').addEventListener('input', () => this._calcTotalSvc());
    document.getElementById('btnCancelSvc').addEventListener('click', () => App.closeModal());

    // Habilitar/deshabilitar tipo de evento según tipo de pedido
    const sTipoPedidoEl = document.getElementById('sTipoPedido');
    const sTipoEventoEl = document.getElementById('sTipoEvento');
    const _toggleSTipoEvento = () => {
      const esEvento = sTipoPedidoEl.value === 'Evento';
      sTipoEventoEl.disabled = !esEvento;
      document.getElementById('grpSTipoEvento').style.opacity = esEvento ? '1' : '0.45';
    };
    sTipoPedidoEl.addEventListener('change', _toggleSTipoEvento);
    _toggleSTipoEvento();
    if (isEdit) document.getElementById('btnDeleteSvcForm')?.addEventListener('click', async () => {
      App.closeModalForce();
      await this._delete(item.id);
    });

    document.getElementById('fSvc').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSaveSvc');
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        const items = this._collectItemsSvc();
        const insumos = this._collectInsumosFromItemsSvc('#svcItemsContainer');
        const personas = parseInt(document.getElementById('sPersonas').value) || 0;
        const subtotalBruto = items.reduce((a, it) => a + it.subtotal, 0);
        const descuentoPct  = parseFloat(document.getElementById('sDescuento').value) || 0;
        const totalGeneral  = Math.round(subtotalBruto * (1 - descuentoPct / 100));
        const totalBocados  = items.reduce((a, it) => a + (it.bocados ?? it.cantidad ?? 0), 0);
        const costoProductos = Array.from(document.querySelectorAll('#svcItemsContainer .item-row')).reduce((acc, r) => {
          if (r.querySelector('.ir-tipo')?.value !== 'producto') return acc;
          const prodId = r.querySelector('.ir-item')?.value;
          const prod = prodId ? this.productos.find(p => p.id === prodId) : null;
          const costoUnit = parseFloat(r.dataset.costo) || ((prod?.precioCoste || 0) / (prod?.personas || 1));
          return acc + (parseFloat(r.querySelector('.ir-cant')?.value) || 0) * costoUnit;
        }, 0);
        const costo = Math.round(costoProductos + insumos.reduce((a, ins) => a + (ins.subtotal || 0), 0));
        const data = {
          numero:        parseInt(document.getElementById('sNumero').value) || nextNum,
          fecha:         document.getElementById('sFechaServicio').value,
          estado:        'confirmado',
          estadoPago:    item?.estadoPago || 'sin_pago',
          fechaEvento:   document.getElementById('sFechaEvento').value,
          horaEvento:    document.getElementById('sHora').value || null,
          tipoEvento:    document.getElementById('sTipoEvento').value,
          tipoPedido:    document.getElementById('sTipoPedido').value || null,
          sabor:         document.getElementById('sSabor').value || null,
          personas,
          ninos:         parseInt(document.getElementById('sNinos').value)        || 0,
          sinTacc:       parseInt(document.getElementById('sSinTacc').value)      || 0,
          vegetarianos:  parseInt(document.getElementById('sVegetarianos').value) || 0,
          totalBocados,
          items,
          presupuestoId: presId || null,
          subtotalBruto,
          total:     totalGeneral,
          descuento: descuentoPct,
          costoEstimado: costo,
          costo,
          costoInsumos:  costo,
          insumos,
          notas:         document.getElementById('sNotas').value.trim(),
          direccionEntrega: document.getElementById('sDireccion').value.trim() || null,
          cliente: {
            nombre:   document.getElementById('sClienteNombre').value.trim(),
            telefono: document.getElementById('sClienteTel').value.trim(),
            esVip:    document.getElementById('sClienteVip')?.checked || false
          },
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!data.cliente.nombre || !data.fechaEvento) {
          App.toast('Completá nombre del cliente y fecha del evento', 'warning');
          btn.disabled = false; btn.textContent = isEdit ? 'Guardar cambios' : 'Crear servicio';
          return;
        }
        // Guardar/actualizar Cliente VIP si el checkbox está marcado
        if (document.getElementById('sClienteVip')?.checked) {
          const vipId = data.cliente.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');
          await db.collection('admin_clientes_vip').doc(vipId).set(
            { nombre: data.cliente.nombre, telefono: data.cliente.telefono || '', telefonoNorm: (data.cliente.telefono || '').replace(/\D/g, '').slice(-8) },
            { merge: true }
          );
        }
        if (isEdit) {
          await db.collection('admin_servicios').doc(item.id).update(data);
          await this._syncGasto(item.id, data);
        } else {
          data.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
          const ref = await db.collection('admin_servicios').add(data);
          await this._syncGasto(ref.id, data);
        }
        App.closeModalForce();
        App.toast(isEdit ? 'Servicio actualizado' : 'Servicio creado', 'success');
        await this._load();
        this._renderList();
      } catch (err) {
        console.error(err);
        App.toast('Error al guardar', 'error');
        btn.disabled = false; btn.textContent = isEdit ? 'Guardar cambios' : 'Crear servicio';
      }
    });
  },

  // ── Items del servicio: helpers (menú / producto / ingrediente / material / subproducto) ──

  _normalizeItemsForEditor(items = []) {
    return (items || []).map(it => {
      if (it?.tipo !== 'producto') return it;
      if (this.productos.some(p => p.id === it.id)) return it;
      const webId = it.webProductoId || it.id || '';
      const webCollection = it.webVinculo?.collection || it.webCollection || it.collectionName || it.collection || it.collectionId || '';
      const linked = this.productos.find(p => {
        const vinculo = p.webVinculo || p.productoGestionVinculo || p.gestionVinculo;
        if (!vinculo) return false;
        const sameDoc = vinculo.docId === webId || vinculo.id === webId || vinculo.productId === webId;
        const sameCollection = !webCollection || !vinculo.collection || vinculo.collection === webCollection;
        return sameDoc && sameCollection;
      });
      if (!linked) return it;
      const cantidad = it.bocados || it.cantidad || 0;
      const costoUnitario = Math.round((linked.precioCoste || 0) / (linked.personas || 1));
      return {
        ...it,
        id: linked.id,
        nombre: linked.nombre || it.nombre,
        webProductoId: webId,
        webVinculo: linked.webVinculo || it.webVinculo || null,
        productoVinculado: true,
        costoAjustado: it.costoAjustado || Math.round(costoUnitario * cantidad)
      };
    });
  },

  _addItemRowSvc(container, existing = null) {
    const row = document.createElement('div');
    row.className = 'item-row';

    const tipoVal = existing?.tipo || 'producto';
    const COST_TIPOS = ['ingrediente', 'material', 'subproducto'];
    const isCosto = COST_TIPOS.includes(tipoVal);
    const buildOpts = (src, empty, idField, precioField, pxField, extraData) => {
      const emptyOpt = empty ? `<option value="" data-precio="0" data-px="${pxField||1}">— Elegir ítem —</option>` : '';
      return emptyOpt + src.map(x => {
        const precio = x[precioField] || 0;
        const px     = pxField ? (x[pxField] || 1) : 1;
        const extra  = extraData ? extraData(x) : '';
        return `<option value="${x.id}" data-precio="${precio}" data-px="${px}" ${extra} ${existing?.id === x.id ? 'selected' : ''}>${this._esc(x.nombre)}</option>`;
      }).join('');
    };

    let opts, cursoOpts;
    const noEmpty = !!existing;
    if (tipoVal === 'menu') {
      opts = buildOpts(this.menus, !noEmpty, 'id', 'precioVenta', null, x => `data-precio="${x.precioVenta || x.precio || 0}" data-px="1" data-costo="${x.precioCoste || x.costo || 0}"`);
      cursoOpts = '';
    } else if (tipoVal === 'producto') {
      opts = (!noEmpty ? '<option value="" data-precio="0" data-px="1" data-costo="0">— Elegir ítem —</option>' : '') +
        this.productos.map(p =>
          `<option value="${p.id}" data-precio="${Math.round((p.precio||0)/(p.personas||1))}" data-px="${p.personas || 1}" data-costo="${Math.round((p.precioCoste||0)/(p.personas||1))}" ${existing?.id === p.id ? 'selected' : ''}>${this._esc(p.nombre)}</option>`
        ).join('');
      cursoOpts = this.CURSOS.map(c => `<option value="${c}" ${(existing?.curso || 'Principal') === c ? 'selected' : ''}>${c}</option>`).join('');
    } else if (tipoVal === 'ingrediente') {
      opts = (!noEmpty ? '<option value="" data-precio="0" data-px="0" data-costo="0">— Elegir ítem —</option>' : '') +
        this.ingredientes.map(x =>
          `<option value="${x.id}" data-precio="${x.costoUnitario || 0}" data-px="0" data-costo="${x.costoUnitario || 0}" data-unidad="${this._esc(x.unidad || '')}" ${existing?.id === x.id ? 'selected' : ''}>${this._esc(x.nombre)}</option>`
        ).join('');
      cursoOpts = '';
    } else if (tipoVal === 'material') {
      opts = (!noEmpty ? '<option value="" data-precio="0" data-px="0" data-costo="0">— Elegir ítem —</option>' : '') +
        this.materiales.map(x =>
          `<option value="${x.id}" data-precio="${x.costoUnitario || 0}" data-px="0" data-costo="${x.costoUnitario || 0}" data-unidad="${this._esc(x.unidad || '')}" ${existing?.id === x.id ? 'selected' : ''}>${this._esc(x.nombre)}</option>`
        ).join('');
      cursoOpts = '';
    } else {
      opts = (!noEmpty ? '<option value="" data-precio="0" data-px="0" data-costo="0">— Elegir ítem —</option>' : '') +
        this.subproductos.map(x =>
          `<option value="${x.id}" data-precio="${x.costoUnitario || 0}" data-px="0" data-costo="${x.costoUnitario || 0}" data-unidad="${this._esc(x.rendimientoUnidad || '')}" ${existing?.id === x.id ? 'selected' : ''}>${this._esc(x.nombre)}</option>`
        ).join('');
      cursoOpts = '';
    }

    const _pxUnit = (tipoVal === 'producto' && existing?.bocadosUnitarios > 1) ? existing.bocadosUnitarios : 1;
    const precioVal = isCosto
      ? (existing?.costoUnitario || 0)
      : (existing?.subtotal > 0 && existing?.cantidad > 0
          ? Math.round(existing.subtotal / existing.cantidad)
          : Math.round((existing?.precioUnitario || 0) / _pxUnit));

    row.innerHTML = `
      <select class="ir-tipo">
        <option value="menu"         ${tipoVal === 'menu'         ? 'selected' : ''}>Menú</option>
        <option value="producto"     ${tipoVal === 'producto'     ? 'selected' : ''}>Producto</option>
        <option value="ingrediente"  ${tipoVal === 'ingrediente'  ? 'selected' : ''}>Ingrediente</option>
        <option value="material"     ${tipoVal === 'material'     ? 'selected' : ''}>Material</option>
        <option value="subproducto"  ${tipoVal === 'subproducto'  ? 'selected' : ''}>Subproducto</option>
      </select>
      <select class="ir-item">${opts}</select>
      <select class="ir-curso" disabled style="display:none">${cursoOpts}</select>
      <span class="ir-costo-badge" style="${!isCosto ? 'display:none' : ''}">Solo costo</span>
      <input class="ir-cant" type="number" min="0" step="${isCosto ? '0.01' : '1'}" value="${tipoVal === 'producto' ? (existing?.bocados || (existing ? Math.round((existing.cantidad||1)*(existing.bocadosUnitarios||1)) : 1)) : (existing?.cantidad || 1)}">
      <input class="ir-precio" type="number" value="${precioVal}" min="0" step="1"
        title="${isCosto ? 'Costo unitario' : 'Precio unitario'}">
      <input class="ir-sub" type="number" value="${existing?.subtotal || 0}" min="0" step="1"
        title="Valor total">
      <button type="button" class="ir-del" title="Eliminar">✕</button>`;

    if (isCosto) row.classList.add('item-row--costo');

    (() => {
      if (isCosto) { row.dataset.px = 0; row.dataset.costo = 0; return; }
      const sel = row.querySelector('.ir-item');
      const opt = sel?.options[sel?.selectedIndex];
      const _ePxUnit = existing?.bocadosUnitarios || 1;
      row.dataset.costo = existing?.costoAjustado != null
        ? Math.round(existing.costoAjustado / (tipoVal === 'producto' ? (existing.cantidad || _ePxUnit) : 1))
        : (opt?.dataset.costo || 0);
      if (tipoVal === 'menu') {
        row.classList.add('item-row--menu');
        const menu        = opt?.value ? this.menus.find(m => m.id === opt.value) : null;
        const cantInicial = existing?.cantidad || 1;
        const savedProds  = existing?.productos?.length ? existing.productos : (menu?.productos || []);
        const prodsOrig   = savedProds.map(mp => ({ ...mp, originalPersonas: mp.originalPersonas || (mp.personas || 1) / cantInicial }));
        row.dataset.menuProductos         = JSON.stringify(prodsOrig);
        row.dataset.menuProductosOriginal = JSON.stringify(prodsOrig);
        // dataset.px = bocados "por unidad de Cant" (sum de porciones / Cant), para que bocados = cant * px
        const sumPersonas = prodsOrig.reduce((s, mp) => s + (mp.personas || 1), 0);
        row.dataset.px = (sumPersonas / cantInicial) || 1;
        const unitPrecio = existing?.precioUnitario || menu?.precioVenta || menu?.precio || 0;
        const unitCosto  = existing ? (parseFloat(existing.costoAjustado || row.dataset.costo) || 0) : (menu?.precioCoste || menu?.costo || 0);
        row.dataset.menuPrecioOriginal = unitPrecio;
        row.dataset.menuCostoOriginal  = unitCosto;
        const savedInsumos = existing?.menuInsumos?.length ? existing.menuInsumos : [
          ...(menu?.subproductos || []).map(ms => ({ tipo: 'subproducto', id: ms.id, nombre: ms.nombre || '', cantidad: ms.cantidad || 0, originalCantidad: ms.cantidad || 0, costoAjustado: ms.costoAjustado || 0 })),
          ...(menu?.materiales   || []).map(mm => ({ tipo: 'material',    id: mm.id, nombre: mm.nombre || '', cantidad: mm.cantidad || 0, originalCantidad: mm.cantidad || 0, costoAjustado: mm.costoAjustado || 0 })),
          ...(menu?.ingredientes || []).map(mi => ({ tipo: 'ingrediente',  id: mi.id, nombre: mi.nombre || '', cantidad: mi.cantidad || 0, originalCantidad: mi.cantidad || 0, costoAjustado: mi.costoAjustado || 0 }))
        ].filter(x => x.nombre);
        row.dataset.menuInsumos         = JSON.stringify(savedInsumos);
        row.dataset.menuInsumosOriginal = JSON.stringify(savedInsumos);
      } else {
        row.dataset.px = 1;
      }
    })();

    row.querySelector('.ir-tipo').addEventListener('change', (e) => {
      const t     = e.target.value;
      const sel   = row.querySelector('.ir-item');
      const curso = row.querySelector('.ir-curso');
      const badge = row.querySelector('.ir-costo-badge');
      const cant  = row.querySelector('.ir-cant');
      const COST  = ['ingrediente', 'material', 'subproducto'];
      const isC   = COST.includes(t);

      if (t === 'menu') {
        sel.innerHTML = '<option value="" data-precio="0" data-px="1" data-costo="0">— Elegir ítem —</option>' +
          this.menus.map(x => `<option value="${x.id}" data-precio="${x.precioVenta || x.precio || 0}" data-px="1" data-costo="${x.precioCoste || x.costo || 0}">${this._esc(x.nombre)}</option>`).join('');
      } else if (t === 'producto') {
        sel.innerHTML = '<option value="" data-precio="0" data-px="1" data-costo="0">— Elegir ítem —</option>' +
          this.productos.map(x => `<option value="${x.id}" data-precio="${Math.round((x.precio||0)/(x.personas||1))}" data-px="${x.personas || 1}" data-costo="${Math.round((x.precioCoste||0)/(x.personas||1))}">${this._esc(x.nombre)}</option>`).join('');
      } else {
        const src = t === 'ingrediente' ? this.ingredientes : t === 'material' ? this.materiales : this.subproductos;
        sel.innerHTML = '<option value="" data-precio="0" data-px="0" data-costo="0">— Elegir ítem —</option>' +
          src.map(x => `<option value="${x.id}" data-precio="${x.costoUnitario || 0}" data-px="0" data-costo="${x.costoUnitario || 0}" data-unidad="${this._esc(x.unidad || x.rendimientoUnidad || '')}">${this._esc(x.nombre)}</option>`).join('');
      }

      const hideCursoGone  = () => { curso.disabled = true; curso.style.display = 'none'; curso.style.opacity = ''; curso.style.pointerEvents = ''; };
      const showCurso      = () => { curso.disabled = false; curso.style.display = ''; curso.style.opacity = ''; curso.style.pointerEvents = ''; curso.style.borderColor = ''; curso.style.background = ''; };

      if (isC) {
        hideCursoGone();
        badge.style.display = '';
        cant.step = '0.01';
        row.classList.add('item-row--costo');
        row.classList.remove('item-row--menu');
        row.dataset.px = 0; row.dataset.costo = 0;
      } else if (t === 'menu') {
        hideCursoGone();
        badge.style.display = 'none';
        cant.step = '1';
        row.classList.remove('item-row--costo');
        row.classList.add('item-row--menu');
        row.dataset.px = 1; row.dataset.costo = 0;
        row.dataset.menuProductos = '[]';
        row.dataset.menuProductosOriginal = '[]';
      } else {
        curso.innerHTML = this.CURSOS.map(c => `<option value="${c}">${c}</option>`).join('');
        showCurso();
        badge.style.display = 'none';
        cant.step = '1';
        row.classList.remove('item-row--costo');
        row.classList.remove('item-row--menu');
        row.dataset.px = 1; row.dataset.costo = 0;
      }
      row.querySelector('.ir-precio').value = 0;
      this._recalcRowSvc(row);
    });

    row.querySelector('.ir-item').addEventListener('change', (e) => {
      const tipo = row.querySelector('.ir-tipo').value;
      const opt  = e.target.options[e.target.selectedIndex];
      row.querySelector('.ir-precio').value = opt?.dataset.precio || 0;
      row.dataset.costo = opt?.dataset.costo || 0;

      if (tipo === 'menu' && e.target.value) {
        const menu = this.menus.find(m => m.id === e.target.value);
        if (menu) {
          const menuPrecio   = menu.precioVenta || menu.precio || 0;
          const menuCosto    = menu.precioCoste || menu.costo  || 0;
          const prodsOrig    = (menu.productos || []).map(mp => ({ ...mp, originalPersonas: mp.personas || 1 }));
          const totalPx      = prodsOrig.reduce((s, mp) => s + (mp.personas || 1), 0);
          const menuInsumos  = [
            ...(menu.subproductos || []).map(ms => ({ tipo: 'subproducto', id: ms.id, nombre: ms.nombre || '', cantidad: ms.cantidad || 0, originalCantidad: ms.cantidad || 0, costoAjustado: ms.costoAjustado || 0 })),
            ...(menu.materiales   || []).map(mm => ({ tipo: 'material',    id: mm.id, nombre: mm.nombre || '', cantidad: mm.cantidad || 0, originalCantidad: mm.cantidad || 0, costoAjustado: mm.costoAjustado || 0 })),
            ...(menu.ingredientes || []).map(mi => ({ tipo: 'ingrediente',  id: mi.id, nombre: mi.nombre || '', cantidad: mi.cantidad || 0, originalCantidad: mi.cantidad || 0, costoAjustado: mi.costoAjustado || 0 }))
          ].filter(x => x.nombre);
          row.querySelector('.ir-precio').value    = menuPrecio;
          row.dataset.costo                        = menuCosto;
          row.dataset.menuPrecioOriginal           = menuPrecio;
          row.dataset.menuCostoOriginal            = menuCosto;
          row.dataset.px                           = totalPx || 1;
          row.dataset.menuProductos                = JSON.stringify(prodsOrig);
          row.dataset.menuProductosOriginal        = JSON.stringify(prodsOrig);
          row.dataset.menuInsumos                  = JSON.stringify(menuInsumos);
          row.dataset.menuInsumosOriginal          = JSON.stringify(menuInsumos);
          this._recalcRowSvc(row);
          return;
        }
      }
      if (tipo === 'producto' && e.target.value) {
        row.querySelector('.ir-cant').value = opt?.dataset.px || 1;
        row.dataset.px = 1;
      } else if (tipo !== 'menu') {
        row.dataset.px = opt?.dataset.px || 1;
      }
      this._recalcRowSvc(row);
    });

    row.querySelector('.ir-cant').addEventListener('input', () => {
      const tipo = row.querySelector('.ir-tipo').value;
      if (tipo === 'menu') {
        const cant      = parseFloat(row.querySelector('.ir-cant').value) || 1;
        const origProds = JSON.parse(row.dataset.menuProductosOriginal || '[]');
        if (origProds.length > 0) {
          const newProds = origProds.map(mp => ({
            ...mp,
            personas: Math.max(1, Math.round((mp.originalPersonas || mp.personas || 1) * cant))
          }));
          row.dataset.menuProductos = JSON.stringify(newProds);
          row.dataset.px = origProds.reduce((s, mp) => s + (mp.originalPersonas || mp.personas || 1), 0) || 1;
          const origPrecio = parseFloat(row.dataset.menuPrecioOriginal) || 0;
          const origCosto  = parseFloat(row.dataset.menuCostoOriginal)  || 0;
          if (origPrecio > 0) row.querySelector('.ir-precio').value = origPrecio;
          if (origCosto  > 0) row.dataset.costo = origCosto;
          const origInsumos = JSON.parse(row.dataset.menuInsumosOriginal || row.dataset.menuInsumos || '[]');
          if (origInsumos.length > 0) {
            const newInsumos = origInsumos.map(mi => ({
              ...mi,
              cantidad: Math.round((mi.originalCantidad || mi.cantidad || 0) * cant * 100) / 100
            }));
            row.dataset.menuInsumos = JSON.stringify(newInsumos);
          }
        }
      }
      this._recalcRowSvc(row);
    });
    row.querySelector('.ir-precio').addEventListener('input', () => this._recalcRowSvc(row));
    row.querySelector('.ir-sub').addEventListener('input', () => {
      const total = parseFloat(row.querySelector('.ir-sub').value) || 0;
      const cant  = parseFloat(row.querySelector('.ir-cant').value) || 1;
      row.querySelector('.ir-precio').value = Math.round(total / cant);
      this._calcTotalSvc();
    });
    row.querySelector('.ir-del').addEventListener('click', () => { row.remove(); this._calcTotalSvc(); });

    container.appendChild(row);
    this._recalcRowSvc(row);
  },

  _recalcRowSvc(row) {
    const cant   = parseFloat(row.querySelector('.ir-cant').value)   || 0;
    const precio = parseFloat(row.querySelector('.ir-precio').value) || 0;
    row.querySelector('.ir-sub').value = Math.round(cant * precio);
    this._calcTotalSvc();
  },

  _calcTotalSvc() {
    const COST_TIPOS = ['ingrediente', 'material', 'subproducto'];
    const rows = document.querySelectorAll('#svcItemsContainer .item-row');
    let total = 0, bocados = 0, costo = 0;
    const detailRows = [];
    let rowIdx = 0;
    rows.forEach(r => {
      const tipo   = r.querySelector('.ir-tipo')?.value || 'producto';
      const cant   = parseFloat(r.querySelector('.ir-cant')?.value)   || 0;
      const precio = parseFloat(r.querySelector('.ir-precio')?.value) || 0;
      if (COST_TIPOS.includes(tipo)) {
        costo += cant * precio;
        rowIdx++;
        return;
      }
      const px = parseFloat(r.dataset.px) || 1;
      total   += cant * precio;
      bocados += cant * px;
      if (tipo === 'producto') {
        const costoUnit = parseFloat(r.dataset.costo) || 0;
        const prodId = r.querySelector('.ir-item')?.value;
        const prod = prodId ? this.productos.find(p => p.id === prodId) : null;
        const resolvedCosto = costoUnit || ((prod?.precioCoste || 0) / (prod?.personas || 1));
        costo += cant * resolvedCosto;
        const opt = r.querySelector('.ir-item')?.options[r.querySelector('.ir-item')?.selectedIndex];
        detailRows.push({ tipo: 'producto', nombre: opt?.textContent?.trim() || '—', curso: r.querySelector('.ir-curso')?.value || 'Principal', cant, costoPx: resolvedCosto, valorPx: precio });
      } else if (tipo === 'menu') {
        const menuCosto = parseFloat(r.dataset.costo) || 0;
        costo += cant * menuCosto;
        const opt = r.querySelector('.ir-item')?.options[r.querySelector('.ir-item')?.selectedIndex];
        const menuProductos = JSON.parse(r.dataset.menuProductos || '[]');
        detailRows.push({ tipo: 'menu-header', nombre: opt?.textContent?.trim() || '—', cant, rowIdx });
        menuProductos.forEach((mp, mpIdx) => {
          const prod = this.productos.find(p => p.id === mp.id);
          const pxProd = prod?.personas || 1;
          const valorPxBase = prod ? (prod.precioVenta || prod.precio || 0) / pxProd : 0;
          const valorPxUse  = mp.customPrecioUnitario != null ? mp.customPrecioUnitario : valorPxBase;
          detailRows.push({
            tipo: 'menu-prod',
            nombre: mp.nombre || prod?.nombre || '—',
            curso: mp.curso || 'Principal',
            cant: mp.personas || 1,
            costoPx: prod ? (prod.precioCoste || 0) / pxProd : 0,
            valorPx: valorPxUse,
            customValorTotal: mp.customValorTotal,
            rowIdx,
            mpIdx
          });
        });
        const menuInsumos = JSON.parse(r.dataset.menuInsumos || '[]');
        menuInsumos.forEach(mi => {
          detailRows.push({ tipo: 'menu-insumo', tipoInsumo: mi.tipo, nombre: mi.nombre, cantidad: mi.cantidad || 0, costoUnit: mi.costoAjustado || 0 });
        });
      }
      rowIdx++;
    });
    const personas = parseInt(document.getElementById('sPersonas')?.value) || 0;
    const bocPx    = personas > 0 ? (bocados / personas).toFixed(1) : '—';

    const panel = document.getElementById('svcDetailPanel');
    if (panel) {
      if (detailRows.length === 0) {
        panel.style.display = 'none';
      } else {
        panel.style.display = '';
        const fmt = v => '$' + Math.round(v).toLocaleString('es-AR');
        const ganancia = total - costo;
        const costoPxTotal = bocados > 0 ? costo / bocados : 0;
        panel.innerHTML = `
          <div class="dp-table-card">
            <div class="dp-card-header">
              <span class="dp-card-title">📋 Detalle de ítems</span>
            </div>
            <div class="dp-table-scroll">
              <table class="dp-table">
                <thead><tr>
                  <th>Producto</th><th>Curso</th><th>Cant (px)</th><th>Valor/px</th><th>Valor total</th>
                </tr></thead>
                <tbody>${detailRows.map(dr => {
                  if (dr.tipo === 'menu-header') return `<tr class="dp-menu-header">
                      <td colspan="3"><span class="dp-menu-tag">MENÚ</span> ${dr.nombre}</td>
                      <td colspan="2" class="dp-meta"></td></tr>`;
                  if (dr.tipo === 'menu-insumo') return `<tr class="dp-menu-insumo">
                      <td><span class="dp-insumo-tag">${dr.tipoInsumo}</span> ${dr.nombre}</td>
                      <td></td>
                      <td class="dp-center dp-muted">${dr.cantidad}</td>
                      <td></td>
                      <td class="dp-right dp-muted">${dr.costoUnit>0&&dr.cantidad>0?fmt(Math.round(dr.costoUnit*dr.cantidad)):'—'}</td>
                     </tr>`;
                  const valTotal = dr.customValorTotal != null ? dr.customValorTotal : Math.round(dr.cant * dr.valorPx);
                  return `<tr class="${dr.tipo === 'menu-prod' ? 'dp-menu-prod' : ''}">
                      <td>${dr.nombre}</td>
                      <td><span class="dp-curso-tag">${dr.curso||''}</span></td>
                      <td class="dp-center">${dr.tipo === 'menu-prod'
                        ? `<input class="dp-px-edit" type="number" value="${dr.cant}" min="1"
                            data-row="${dr.rowIdx}" data-mp="${dr.mpIdx}"
                            style="width:52px;text-align:center;padding:2px 4px;border:1.5px solid var(--border);border-radius:6px;font-size:.8rem;font-family:inherit">`
                        : dr.cant
                      }</td>
                      <td class="dp-right dp-muted">${dr.valorPx>0?fmt(dr.valorPx):'—'}</td>
                      <td class="dp-right">${dr.tipo === 'menu-prod'
                        ? `<input class="dp-val-edit" type="number" value="${valTotal}" min="0"
                            data-row="${dr.rowIdx}" data-mp="${dr.mpIdx}"
                            style="width:80px;text-align:right;padding:2px 4px;border:1.5px solid var(--bordo-mid);border-radius:6px;font-size:.8rem;font-family:inherit;font-weight:700;color:var(--bordo)">`
                        : (dr.valorPx>0?`<strong>${fmt(valTotal)}</strong>`:'—')
                      }</td>
                     </tr>`;
                }).join('')}</tbody>
              </table>
            </div>
          </div>
          <div class="dp-kpi-grid">
            <div class="dp-kpi-card"><span class="dp-kpi-label">Venta total</span><span class="dp-kpi-val">${fmt(total)}</span></div>
            <div class="dp-kpi-card"><span class="dp-kpi-label">Costo total</span><span class="dp-kpi-val">${fmt(costo)}</span></div>
            <div class="dp-kpi-card dp-kpi-card--${ganancia>=0?'success':'danger'}"><span class="dp-kpi-label">Ganancia</span><span class="dp-kpi-val">${total>0?fmt(ganancia):'—'}</span></div>
            <div class="dp-kpi-card"><span class="dp-kpi-label">Total bocados</span><span class="dp-kpi-val">${bocados}</span></div>
            <div class="dp-kpi-card"><span class="dp-kpi-label">$/persona</span><span class="dp-kpi-val">${personas>0?fmt(total/personas):'—'}</span></div>
          </div>`;
      }
    }
    if (panel) {
      panel.querySelectorAll('.dp-val-edit').forEach(inp => {
        inp.addEventListener('change', () => {
          const ri = +inp.dataset.row, mi = +inp.dataset.mp;
          const newTotal  = parseFloat(inp.value) || 0;
          const allRows   = Array.from(document.querySelectorAll('#svcItemsContainer .item-row'));
          const targetRow = allRows[ri];
          if (!targetRow) return;
          const prods = JSON.parse(targetRow.dataset.menuProductos || '[]');
          if (prods[mi] != null) {
            const cant = prods[mi].personas || 1;
            prods[mi].customValorTotal     = newTotal;
            prods[mi].customPrecioUnitario = cant > 0 ? Math.round(newTotal / cant) : newTotal;
            targetRow.dataset.menuProductos = JSON.stringify(prods);
            const cantRow = parseFloat(targetRow.querySelector('.ir-cant').value) || 1;
            let newMenuPrecio = 0, newMenuCosto = 0;
            prods.forEach(mp => {
              const prod = this.productos.find(p => p.id === mp.id);
              if (prod) {
                const pxProd  = prod.personas || 1;
                const pUnit   = mp.customPrecioUnitario != null ? mp.customPrecioUnitario : Math.round((prod.precioVenta || prod.precio || 0) / pxProd);
                newMenuPrecio += pUnit * (mp.personas || 1);
                newMenuCosto  += Math.round(((prod.precioCoste || 0) / pxProd) * (mp.personas || 1));
              }
            });
            // newMenuPrecio/newMenuCosto son totales absolutos para los mp.personas actuales;
            // dataset.costo y .ir-precio representan el valor "por unidad de Cant" (total = cant * valor)
            if (newMenuPrecio > 0) targetRow.querySelector('.ir-precio').value = Math.round(newMenuPrecio / cantRow);
            if (newMenuCosto  > 0) targetRow.dataset.costo = Math.round(newMenuCosto / cantRow);
            this._recalcRowSvc(targetRow);
          }
        });
      });
    }
    if (panel) {
      panel.querySelectorAll('.dp-px-edit').forEach(inp => {
        inp.addEventListener('change', () => {
          const ri = +inp.dataset.row;
          const mi = +inp.dataset.mp;
          const allRows = Array.from(document.querySelectorAll('#svcItemsContainer .item-row'));
          const targetRow = allRows[ri];
          if (!targetRow) return;
          const prods = JSON.parse(targetRow.dataset.menuProductos || '[]');
          if (prods[mi] != null) {
            prods[mi].personas = parseInt(inp.value) || 1;
            targetRow.dataset.menuProductos = JSON.stringify(prods);
            const cantRow = parseFloat(targetRow.querySelector('.ir-cant').value) || 1;
            const newTotalPx = prods.reduce((s, mp) => s + (mp.personas || 1), 0);
            targetRow.dataset.px = (newTotalPx / cantRow) || 1;
            let newMenuCosto = 0;
            prods.forEach(mp => {
              const prod = this.productos.find(p => p.id === mp.id);
              if (prod) {
                const pxProd = prod.personas || 1;
                newMenuCosto += Math.round(((prod.precioCoste || 0) / pxProd) * (mp.personas || 1));
              }
            });
            // newMenuCosto es el costo total absoluto para los mp.personas actuales;
            // dataset.costo es "por unidad de Cant" (costo total = cant * dataset.costo)
            if (newMenuCosto > 0) targetRow.dataset.costo = Math.round(newMenuCosto / cantRow);
            this._calcTotalSvc();
          }
        });
      });
    }

    const dTotal = document.getElementById('svcDisplayTotal');
    const dSub   = document.getElementById('svcDisplaySubtotal');
    const dCpp   = document.getElementById('svcDisplayCpp');
    const dBoc   = document.getElementById('svcDisplayBocados');
    const dCosto = document.getElementById('svcDisplayCostoInsumos');
    const dDescM = document.getElementById('svcDisplayDescuentoMonto');
    const fCosto = document.getElementById('sCosto');
    const descPct = parseFloat(document.getElementById('sDescuento')?.value) || 0;
    const descMonto = total * (descPct / 100);
    const totalConDesc = total - descMonto;
    const cppFinal = personas > 0 ? Math.round(totalConDesc / personas) : 0;
    if (dSub)   dSub.textContent   = `$${Math.round(total).toLocaleString('es-AR')}`;
    if (dDescM) dDescM.textContent = descMonto > 0 ? `-$${Math.round(descMonto).toLocaleString('es-AR')}` : '';
    if (dTotal) dTotal.textContent = `$${Math.round(totalConDesc).toLocaleString('es-AR')}`;
    if (dCpp)   dCpp.textContent   = `$${cppFinal.toLocaleString('es-AR')}`;
    if (dBoc)   dBoc.textContent   = bocPx;
    if (dCosto) dCosto.textContent = `$${Math.round(costo).toLocaleString('es-AR')}`;
    if (fCosto) fCosto.value = Math.round(costo);
  },

  _collectItemsSvc() {
    const COST_TIPOS = ['ingrediente', 'material', 'subproducto'];
    return Array.from(document.querySelectorAll('#svcItemsContainer .item-row')).flatMap(row => {
      const tipo = row.querySelector('.ir-tipo')?.value || 'producto';
      if (COST_TIPOS.includes(tipo)) return [];
      const itemSel  = row.querySelector('.ir-item');
      const cursoSel = row.querySelector('.ir-curso');
      const cant     = parseFloat(row.querySelector('.ir-cant').value)   || 0;
      const precio   = parseFloat(row.querySelector('.ir-precio').value) || 0;
      const sub      = parseFloat(row.querySelector('.ir-sub').value)    || Math.round(cant * precio);
      const opt      = itemSel?.options[itemSel?.selectedIndex];
      const px       = parseFloat(row.dataset.px) || 1;
      if (!itemSel?.value) return [];

      if (tipo === 'menu') {
        const menuProductos = JSON.parse(row.dataset.menuProductos || '[]');
        const productosInfo = menuProductos.map(mp => {
          const prod = this.productos.find(p => p.id === mp.id);
          return {
            id:       mp.id,
            nombre:   mp.nombre || prod?.nombre || '',
            personas: mp.personas || 1,
            curso:    mp.curso || 'Principal'
          };
        }).filter(mp => mp.id);
        const menuInsumos = JSON.parse(row.dataset.menuInsumos || '[]');
        return [{ tipo: 'menu', id: itemSel.value, nombre: opt ? opt.textContent.trim() : '',
          cantidad: cant, bocadosUnitarios: px, bocados: cant * px,
          precioUnitario: Math.round(precio), subtotal: Math.round(sub),
          productos: productosInfo, menuInsumos }];
      }

      return [{
        tipo,
        id:               itemSel.value,
        nombre:           opt ? opt.textContent.trim() : '',
        curso:            cursoSel?.value || 'Principal',
        cantidad:         cant,
        bocadosUnitarios: px,
        bocados:          cant * px,
        precioUnitario:   Math.round(precio),
        subtotal:         Math.round(sub)
      }];
    }).filter(it => it && it.id);
  },

  _collectInsumosFromItemsSvc(containerSelector) {
    const COST_TIPOS = ['ingrediente', 'material', 'subproducto'];
    return Array.from(document.querySelectorAll(`${containerSelector} .item-row`)).map(row => {
      const tipo = row.querySelector('.ir-tipo')?.value || 'producto';
      if (!COST_TIPOS.includes(tipo)) return null;
      const itemSel = row.querySelector('.ir-item');
      const opt     = itemSel?.options[itemSel?.selectedIndex];
      const cant    = parseFloat(row.querySelector('.ir-cant')?.value)   || 0;
      const costo   = parseFloat(row.querySelector('.ir-precio')?.value) || 0;
      return {
        id:            itemSel?.value || '',
        tipo,
        nombre:        opt ? opt.textContent.trim() : '',
        cantidad:      cant,
        unidad:        opt?.dataset.unidad || '',
        costoUnitario: costo,
        subtotal:      Math.round(cant * costo)
      };
    }).filter(ins => ins && ins.id);
  },

  // ── Modal: Detalle del servicio + pagos ──────────

  async _openDetail(svc) {
    App.openModal(`Servicio #${String(svc.numero || '').padStart(3, '0')}`, `
      <div class="loading-spinner"><div class="spinner-ring"></div></div>`, 'xxl');

    // Cargar dependencias si no están disponibles (acceso desde calendario o gastos)
    const needsLoad = !this.productos.length || !this.presupuestos.length;
    if (needsLoad) {
      try {
        const [prodSnap, presSnap, ingSnap, matSnap, subSnap] = await Promise.all([
          db.collection('admin_productos').get(),
          db.collection('admin_presupuestos').get(),
          db.collection('admin_ingredientes').get(),
          db.collection('admin_materiales').get(),
          db.collection('admin_subproductos').get()
        ]);
        if (!this.productos.length)    this.productos    = prodSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!this.presupuestos.length) this.presupuestos = presSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!this.ingredientes.length) this.ingredientes = ingSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!this.materiales.length)   this.materiales   = matSnap.docs.map(d => ({ id: d.id, ...d.data() }));
        if (!this.subproductos.length) this.subproductos = subSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { console.warn('_openDetail: error cargando dependencias', e); }
    }

    let pagos = [];
    try {
      const snap = await db.collection('admin_pagos')
        .where('servicioId', '==', svc.id).get();
      pagos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      pagos.sort((a, b) => (a.fecha || '').localeCompare(b.fecha || ''));
    } catch (e) { console.error('Error cargando pagos:', e); pagos = []; }

    const totalServicio = this._totalSvcConDescuento(svc);
    const totalPagado = pagos.reduce((a, p) => a + (p.monto || 0), 0);
    const saldo       = Math.max(0, totalServicio - totalPagado);
    const estadoInfo  = this.ESTADOS[svc.estado || 'pendiente'] || { label: svc.estado, css: 'badge-muted' };
    const presOrigen  = svc.presupuestoId ? this.presupuestos.find(p => p.id === svc.presupuestoId) : null;

    document.getElementById('modalBody').innerHTML = `
      <div class="pres-meta-grid">
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Cliente</span>
          <span class="pres-meta-val">${this._esc(svc.cliente?.nombre || '—')}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Teléfono</span>
          <span class="pres-meta-val">${this._esc(svc.cliente?.telefono || '—')}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Tipo de evento</span>
          <span class="pres-meta-val">${this._esc(svc.tipoEvento || '—')}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Fecha del evento</span>
          <span class="pres-meta-val">${this._formatDate(svc.fechaEvento)}${svc.horaEvento ? `<span style="font-size:.78rem;font-weight:400;color:var(--text-muted);margin-left:6px">${this._esc(svc.horaEvento)}hs</span>` : ''}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Fecha de creación</span>
          <span class="pres-meta-val">${this._formatDate(svc.fecha)}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Personas</span>
          <span class="pres-meta-val">${svc.personas || '—'}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Niños</span>
          <span class="pres-meta-val">${svc.ninos ?? presOrigen?.ninos ?? 0}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Sin TACC</span>
          <span class="pres-meta-val">${svc.sinTacc ?? presOrigen?.sinTacc ?? 0}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Vegetarianos</span>
          <span class="pres-meta-val">${svc.vegetarianos ?? presOrigen?.vegetarianos ?? 0}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Tipo de pedido</span>
          <span class="pres-meta-val">${this._esc(svc.tipoPedido || '—')}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Sabor</span>
          <span class="pres-meta-val">${this._esc(svc.sabor || '—')}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Estado</span>
          <span class="pres-meta-val"><span class="badge ${estadoInfo.css}">${estadoInfo.label}</span></span>
        </div>
      </div>

      ${(() => {
        // Usar svc.items directamente; fallback a presupuesto para registros viejos sin items propios
        const svcItems = (svc.items || []).filter(it => it.id);
        const pres = svc.presupuestoId ? this.presupuestos.find(p => p.id === svc.presupuestoId) : null;
        const items = svcItems.length > 0 ? svcItems : (pres?.items || []);
        if (items.length === 0) return '';
        const menuItems  = items.filter(it => it.tipo === 'menu');
        const otherItems = items.filter(it => it.tipo !== 'menu');
        const sorted = [...otherItems].sort((a, b) => {
          const oa = this.CURSO_ORDER.indexOf(a.curso || 'Otro');
          const ob = this.CURSO_ORDER.indexOf(b.curso || 'Otro');
          return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
        });
        const grupos = {};
        sorted.forEach(it => { const c = it.curso || 'Otro'; if (!grupos[c]) grupos[c] = []; grupos[c].push(it); });
        const totalBocados = items.reduce((s, it) => s + (it.bocados ?? it.cantidad ?? 0), 0);
        const bocadosPx = svc.personas > 0 ? (totalBocados / svc.personas).toFixed(1) : '—';
        const totalGeneral = totalServicio || items.reduce((s, it) => s + (it.subtotal || 0), 0);
        const CURSOS_ORDEN = ['Entrada', 'Principal', 'Postre', 'Bebida', 'Otro'];
        const renderMenu = (it) => {
          const prods = (it.productos || []);
          const grouped = {};
          prods.forEach(mp => {
            const c = mp.curso || 'Principal';
            if (!grouped[c]) grouped[c] = [];
            grouped[c].push(mp);
          });
          const cursosPresentes = CURSOS_ORDEN.filter(c => grouped[c]?.length);
          const otrosCursos = Object.keys(grouped).filter(c => !CURSOS_ORDEN.includes(c));
          const todosCursos = [...cursosPresentes, ...otrosCursos];
          const subRows = todosCursos.map(curso => {
            const rows = grouped[curso].map(mp => `
              <tr>
                <td style="padding:3px 6px 3px 42px;color:var(--text-muted);font-size:.81rem">└─ ${this._esc(mp.nombre)} <span style="font-size:.74rem">(${mp.personas} porc.)</span></td>
                <td></td><td></td><td></td>
              </tr>`).join('');
            return `
              <tr><td colspan="4" style="padding:4px 6px 2px 26px;font-size:.75rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--bordo);opacity:.8">${this._esc(curso)}</td></tr>
              ${rows}`;
          }).join('');
          const precioUnit = it.precioUnitario > 0 ? it.precioUnitario : (it.subtotal > 0 ? Math.round(it.subtotal / (it.cantidad || 1)) : 0);
          const subtotalDisplay = it.subtotal > 0 ? it.subtotal : Math.round((it.cantidad || 1) * precioUnit);
          return `
            <tr style="background:rgba(212, 211, 211, 0.07)">
              <td style="font-weight:700;color:var(--bordo)"> ${this._esc(it.nombre || '—')}</td>
              <td style="text-align:center">${it.bocados ?? it.cantidad}</td>
              <td style="text-align:right;color:var(--text-muted)">$${Math.round(precioUnit).toLocaleString('es-AR')}</td>
              <td style="text-align:right;font-weight:600">$${Math.round(subtotalDisplay).toLocaleString('es-AR')}</td>
            </tr>
            ${subRows}`;
        };
        return `
        <div class="detail-section" style="margin-top:48px">
          <div class="detail-section-title">Detalle del menú
            <span style="font-size:1rem;font-weight:500;color:white;margin-left:8px;font-family:'Montserrat',sans-serif;">
              ${totalBocados} bocados · ${bocadosPx}/persona
            </span>
          </div>
          <table class="pres-items-table">
            <thead><tr>
              <th style="text-align:left"></th>
              <th style="text-align:center;width:60px">Cant.</th>
              <th style="text-align:right;width:110px">P. unitario</th>
              <th style="text-align:right;width:110px">Subtotal</th>
            </tr></thead>
            <tbody>
              ${menuItems.map(it => renderMenu(it)).join('')}
              ${this.CURSO_ORDER.map(c => {
                const its = grupos[c] || [];
                if (!its.length) return '';
                return `<tr class="pres-curso-row"><td colspan="4">${c}</td></tr>
                ${its.map(it => {
                  const precioUnit = it.precioUnitario > 0
                    ? it.precioUnitario
                    : (it.subtotal > 0 ? Math.round(it.subtotal / (it.cantidad || 1)) : 0);
                  const subtotalDisplay = it.subtotal > 0
                    ? it.subtotal
                    : Math.round((it.cantidad || 1) * precioUnit);
                  return `<tr>
                    <td>${this._esc(it.nombre || '—')}</td>
                    <td style="text-align:center">${it.bocados ?? it.cantidad}</td>
                    <td style="text-align:right;color:var(--text-muted)">$${Math.round(precioUnit).toLocaleString('es-AR')}</td>
                    <td style="text-align:right;font-weight:600">$${Math.round(subtotalDisplay).toLocaleString('es-AR')}</td>
                  </tr>`;
                }).join('')}`;
              }).join('')}
            </tbody>
            <tfoot>
              ${svc.descuento > 0 ? `
              <tr style="opacity:.7">
                <td colspan="3" style="text-align:right;font-size:.82rem">Subtotal</td>
                <td style="text-align:right;font-size:.82rem">$${Math.round(svc.subtotalBruto || 0).toLocaleString('es-AR')}</td>
              </tr>
              <tr style="opacity:.7">
                <td colspan="3" style="text-align:right;font-size:.82rem;color:var(--bordo)">Descuento ${svc.descuento}%</td>
                <td style="text-align:right;font-size:.82rem;color:var(--bordo)">-$${Math.round((svc.subtotalBruto || 0) * svc.descuento / 100).toLocaleString('es-AR')}</td>
              </tr>` : ''}
              <tr class="pres-table-total">
                <td colspan="3">Total general</td>
                <td style="text-align:right">$${Math.round(totalGeneral).toLocaleString('es-AR')}</td>
              </tr>
            </tfoot>
          </table>
        </div>`; 
      })()}

      <div class="detail-section section-pagos" style="margin-top:48px">
        <div class="detail-section-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>Pagos registrados</span>
          <button class="btn-primary" style="padding:5px 14px;font-size:.98rem" id="btnAddPagoDetail">Agregar pago</button>
        </div>
        ${pagos.length === 0
          ? '<p style="color:var(--text-muted);font-size:.85rem;padding:10px 0">No hay pagos registrados.</p>'
          : `<table class="pres-items-table">
              <thead>
                <tr>
                  <th>Fecha</th>
                  <th>Medio de pago</th>
                  <th>Notas</th>
                  <th style="text-align:right">Monto</th>
                  <th style="width:36px"></th>
                </tr>
              </thead>
              <tbody>
                ${pagos.map(p => `
                  <tr>
                    <td>${this._formatDate(p.fecha)}</td>
                    <td><span class="unit-tag">${this._esc(p.medioPago || '—')}</span></td>
                    <td style="color:var(--text-muted);font-size:.8rem">${p.notas ? this._esc(p.notas) : '—'}</td>
                    <td style="text-align:right;font-weight:600">$${Math.round(p.monto).toLocaleString('es-AR')}</td>
                    <td><button class="btn-icon btn-delete" data-pagoid="${p.id}" data-svcid="${svc.id}" data-svctotal="${totalServicio}" style="padding:4px 6px;font-size:.7rem">🗑️</button></td>
                  </tr>`).join('')}
              </tbody>
            </table>`}
      </div>

      <div class="pres-kpi-bar section-pagos">
        <div class="pres-kpi ${totalPagado > 0 ? 'pos' : ''}">
          <span class="pres-kpi-label">Total cobrado</span>
          <span class="pres-kpi-val" style="color:${totalPagado > 0 ? 'var(--success)' : 'inherit'}">$${Math.round(totalPagado).toLocaleString('es-AR')}</span>
        </div>
        <div class="pres-kpi ${saldo > 0 ? 'mid' : 'pos'}">
          <span class="pres-kpi-label">Saldo pendiente</span>
          <span class="pres-kpi-val" style="color:${saldo > 0 ? 'var(--warning)' : 'var(--success)'}">$${Math.round(saldo).toLocaleString('es-AR')}</span>
        </div>
        <div class="pres-kpi pres-kpi-main">
          <span class="pres-kpi-label">Total del servicio</span>
          <span class="pres-kpi-val">$${Math.round(totalServicio).toLocaleString('es-AR')}</span>
        </div>
      </div>

      ${svc.notas ? `
      <div class="detail-section" style="margin-top:16px">
        <div class="detail-section-title">Notas</div>
        <p style="font-size:.85rem;color:var(--text-muted);margin:0">${this._esc(svc.notas)}</p>
      </div>` : ''}

      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:14px;border-top:1px solid var(--border);margin-top:16px;flex-wrap:wrap">
        <button class="btn-secondary" id="btnPrintSvcDetail">🖨️ Imprimir PDF</button>
        <button class="btn-secondary" id="btnEditSvcDetail">Editar servicio</button>
        <button class="btn-danger"    id="btnDeleteSvcDetail">Eliminar</button>
        <button class="btn-secondary" onclick="App.closeModal()">Cerrar</button>
      </div>`;

    document.getElementById('btnPrintSvcDetail').addEventListener('click', () => this._printSvc(svc));
    document.getElementById('btnEditSvcDetail').addEventListener('click', () => {
      App.closeModalForce();
      this._openModal(svc);
    });

    document.getElementById('btnDeleteSvcDetail').addEventListener('click', async () => {
      App.closeModalForce();
      await this._delete(svc.id);
    });

    document.getElementById('btnAddPagoDetail').addEventListener('click', () =>
      this._openAddPagoModal(svc.id, totalServicio, svc.numero || 0, () => this._openDetail(svc))
    );

    document.querySelectorAll('#modalBody .btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este pago?')) return;
        await db.collection('admin_pagos').doc(btn.dataset.pagoid).delete();
        await this._updatePaymentStatus(btn.dataset.svcid, parseFloat(btn.dataset.svctotal) || 0);
        App.toast('Pago eliminado', 'success');
        await this._load();
        this._openDetail(this.servicios.find(s => s.id === btn.dataset.svcid) || svc);
      });
    });
  },

  // ── Modal: Agregar pago ──────────────────────────

  _openAddPagoModal(servicioId, totalServicio, servicioNumero, onSaved) {
    const today = new Date().toISOString().slice(0, 10);
    App.openModal(`Registrar pago — Servicio #${String(servicioNumero).padStart(3,'0')}`, `
      <form id="fPago" class="admin-form">
        <div class="form-row">
          <div class="field-group">
            <label>Fecha del pago *</label>
            <input id="pFecha" type="date" value="${today}" required>
          </div>
          <div class="field-group">
            <label>Monto ($) *</label>
            <input id="pMonto" type="number" min="0" step="1" placeholder="0" required>
          </div>
        </div>
        <div class="field-group">
          <label>Medio de pago</label>
          <select id="pMedio">
            <option value="Efectivo">Efectivo</option>
            <option value="Transferencia">Transferencia</option>
            <option value="Tarjeta débito">Tarjeta débito</option>
            <option value="Tarjeta crédito">Tarjeta crédito</option>
            <option value="Cheque">Cheque</option>
            <option value="MercadoPago">MercadoPago</option>
          </select>
        </div>
        <div class="field-group">
          <label>Notas</label>
          <input id="pNotas" type="text" placeholder="Ej: Seña del evento…">
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="btnCancelPago">Cancelar</button>
          <button type="submit" class="btn-primary">Registrar pago</button>
        </div>
      </form>`, 'md');

    document.getElementById('btnCancelPago').addEventListener('click', () => {
      App.closeModal();
      if (onSaved) onSaved();
    });

    document.getElementById('fPago').addEventListener('submit', async (e) => {
      e.preventDefault();
      const monto = Math.round(parseFloat(document.getElementById('pMonto').value) || 0);
      if (!monto) { App.toast('Ingresá el monto', 'warning'); return; }
      try {
        await db.collection('admin_pagos').add({
          servicioId,
          servicioNumero,
          fecha:     document.getElementById('pFecha').value,
          monto,
          medioPago: document.getElementById('pMedio').value,
          notas:     document.getElementById('pNotas').value.trim(),
          creadoEn:  firebase.firestore.FieldValue.serverTimestamp()
        });
        await this._updatePaymentStatus(servicioId, totalServicio);
        App.toast('Pago registrado', 'success');
        await this._load();
        App.closeModalForce();
        if (onSaved) onSaved();
      } catch (err) { App.toast('Error al registrar pago', 'error'); }
    });
  },

  // ── Actualizar estado de pago del servicio ───────

  async _updatePaymentStatus(servicioId, totalServicio) {
    try {
      const snap = await db.collection('admin_pagos')
        .where('servicioId', '==', servicioId).get();
      const totalPagado = snap.docs.reduce((a, d) => a + (d.data().monto || 0), 0);
      let estadoPago = 'sin_pago';
      if (totalPagado >= totalServicio && totalServicio > 0) estadoPago = 'completo';
      else if (totalPagado > 0) estadoPago = 'parcial';
      await db.collection('admin_servicios').doc(servicioId).update({ estadoPago, montoPagado: totalPagado });

      // Actualizar cache del calendario en memoria y redibujar
      if (typeof Calendar !== 'undefined' && Calendar.events) {
        const ev = Calendar.events.find(e => e.id === servicioId);
        if (ev) {
          ev.estadoPago = estadoPago;
          if (ev.data) { ev.data.estadoPago = estadoPago; ev.data.montoPagado = totalPagado; }
          Calendar._draw();
        }
      }
    } catch (e) { console.error('Error actualizando estado de pago', e); }
  },

  async _delete(id) {
    const s = this.servicios.find(x => x.id === id);
    if (!confirm(`¿Eliminar el servicio #${String(s?.numero || '').padStart(3, '0')}? Esta acción no se puede deshacer.`)) return;
    try {
      await db.collection('admin_servicios').doc(id).delete();
      // Eliminar gasto vinculado si existe
      const gSnap = await db.collection('admin_gastos').where('servicioId', '==', id).get();
      await Promise.all(gSnap.docs.map(d => d.ref.delete()));
      App.toast('Servicio eliminado', 'success');
      await this._load();
      this._renderList();
    } catch (e) { App.toast('Error al eliminar', 'error'); }
  },

  // ── Sync gasto automático de servicio ──────────

  async _syncGasto(servicioId, data) {
    try {
      const costo = data.costo ?? (data.insumos || []).reduce((a, ins) => a + (ins.subtotal || 0), 0);
      const snap  = await db.collection('admin_gastos').where('servicioId', '==', servicioId).get();
      if (costo > 0) {
        const num  = String(data.numero || '').padStart(3, '0');
        // Usar la fecha actual como fecha del gasto (día en que se registra/actualiza),
        // no la fecha del evento futuro, para que sea coherente con los cobros.
        const hoy = new Date().toISOString().slice(0, 10);
        const gasto = {
          servicioId,
          tipo:       'variable',
          categoria:  'Costo de servicio',
          descripcion: `Servicio #${num} (${data.cliente?.nombre || ''})`,
          monto:      Math.round(costo),
          fecha:      hoy,
          mes:        hoy.slice(0, 7),
          auto:       true,
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (snap.empty) {
          await db.collection('admin_gastos').add(gasto);
        } else {
          await snap.docs[0].ref.update(gasto);
        }
      } else if (!snap.empty) {
        // Si costo es 0, eliminar gasto vinculado
        await Promise.all(snap.docs.map(d => d.ref.delete()));
      }
    } catch (e) { console.error('Error sincronizando gasto del servicio', e); }
  },

  _printSvc(svc) {
    const totalServicio = this._totalSvcConDescuento(svc);
    const presOrigen = svc.presupuestoId ? this.presupuestos.find(p => p.id === svc.presupuestoId) : null;
    const dietasPdf = [
      { label: 'Niños', value: svc.ninos ?? presOrigen?.ninos },
      { label: 'Sin TACC', value: svc.sinTacc ?? presOrigen?.sinTacc },
      { label: 'Vegetarianos', value: svc.vegetarianos ?? presOrigen?.vegetarianos }
    ].filter(x => Number(x.value || 0) > 0);
    const pdfMenuItems  = (svc.items || []).filter(it => it.tipo === 'menu');
    const pdfOtherItems = (svc.items || []).filter(it => it.tipo !== 'menu');
    const pdfSorted = [...pdfOtherItems].sort((a, b) => {
      const oa = this.CURSO_ORDER.indexOf(a.curso || 'Otro');
      const ob = this.CURSO_ORDER.indexOf(b.curso || 'Otro');
      return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
    });
    const grupos = {};
    pdfSorted.forEach(it => { const c = it.curso || 'Otro'; if (!grupos[c]) grupos[c] = []; grupos[c].push(it); });
    const renderMenu = (it) => {
      const sub = (it.productos || []).map(mp => `<tr><td style="padding:4px 10px 4px 28px;color:#888;font-size:.78rem"> ─ ${this._esc(mp.nombre)} (${mp.personas} porc.)</td><td></td><td></td></tr>`).join('');
      const pu = it.precioUnitario > 0 ? it.precioUnitario : (it.subtotal > 0 ? Math.round(it.subtotal / (it.cantidad || 1)) : 0);
      const st = it.subtotal > 0 ? it.subtotal : Math.round((it.cantidad || 1) * pu);
      return `<tr style="background:#f4ede8"><td style="font-weight:700;color:#8B2E3A">Menú: ${this._esc(it.nombre||'—')}</td><td style="text-align:center">${it.bocados??it.cantidad}</td><td style="text-align:right;font-weight:700">$${Math.round(st).toLocaleString('es-AR')}</td></tr>${sub}`;
    };
    const renderGrupo = (titulo, items) => items.length === 0 ? '' : `<tr><td colspan="3" style="background:#f4ede8;font-weight:700;font-size:.75rem;text-transform:uppercase;letter-spacing:.06em;color:#8B2E3A;padding:6px 10px">${titulo}</td></tr>${items.map(it => {
      const pu = it.precioUnitario > 0 ? it.precioUnitario : (it.subtotal > 0 ? Math.round(it.subtotal / (it.cantidad || 1)) : 0);
      const st = it.subtotal > 0 ? it.subtotal : Math.round((it.cantidad || 1) * pu);
      return `<tr><td>${this._esc(it.nombre||'—')}</td><td style="text-align:center">${it.bocados??it.cantidad}</td><td style="text-align:right">$${Math.round(st).toLocaleString('es-AR')}</td></tr>`;
    }).join('')}`;
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"><title>&#8203;</title><style>@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&family=Montserrat:wght@400;600&display=swap');*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Montserrat',sans-serif;font-size:13px;color:#2C2C2C;padding:40px 50px}.pdf-header{text-align:center;margin-bottom:32px;border-bottom:2px solid #8B2E3A;padding-bottom:16px}.pdf-brand{font-family:'Cormorant Garamond',serif;font-size:2rem;color:#8B2E3A}.pdf-subtitle{color:#888;font-size:.8rem;margin-top:4px}.pdf-title{font-size:1.1rem;font-weight:700;margin-top:12px;text-transform:uppercase;letter-spacing:.08em}.pdf-meta{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:20px 0}.pdf-meta-item{font-size:.82rem}.pdf-meta-label{color:#888;font-size:.72rem;text-transform:uppercase;letter-spacing:.06em}table{width:100%;border-collapse:collapse;margin:20px 0}thead th{background:#8B2E3A;color:#fff;padding:8px 10px;text-align:left;font-size:.78rem;text-transform:uppercase}tbody td{padding:7px 10px;border-bottom:1px solid #eee}tbody tr:nth-child(even) td{background:#f9f5f3}.pdf-totals{margin-top:20px;text-align:right}.pdf-total-row{font-size:.9rem;margin:4px 0}.pdf-total-main{font-size:1.1rem;font-weight:700;color:#8B2E3A;margin-top:8px}.pdf-notas{margin-top:24px;padding:12px;background:#f9f5f3;border-left:3px solid #8B2E3A;font-size:.82rem}.pdf-conditions{margin-top:28px;padding:14px 16px;background:#f9f5f3;border-left:3px solid #8B2E3A;font-size:.8rem;line-height:1.6}.pdf-conditions-title{font-weight:700;text-transform:uppercase;color:#8B2E3A;font-size:.75rem;margin-bottom:6px}.pdf-contact{margin-top:20px;padding:14px 16px;border:1px solid #e0d0cc;border-radius:6px;font-size:.8rem;line-height:1.8}.pdf-contact-title{font-weight:700;text-transform:uppercase;color:#8B2E3A;font-size:.75rem;margin-bottom:6px}.pdf-footer{margin-top:32px;text-align:center;color:#aaa;font-size:.72rem;border-top:1px solid #eee;padding-top:12px}@media print{body{padding:20px}}</style></head><body>
  <div class="pdf-header"><div class="pdf-brand">Cocó Catering</div><div class="pdf-subtitle">Catering &amp; Eventos</div><div class="pdf-title">Servicio #${String(svc.numero||'').padStart(3,'0')}</div></div>
  <div class="pdf-meta">
    <div class="pdf-meta-item"><div class="pdf-meta-label">Cliente</div><div>${this._esc(svc.cliente?.nombre||'—')}</div></div>
    <div class="pdf-meta-item" style="text-align:right"><div class="pdf-meta-label">Teléfono</div><div>${this._esc(svc.cliente?.telefono||'—')}</div></div>
    <div class="pdf-meta-item"><div class="pdf-meta-label">Tipo de evento</div><div>${this._esc(svc.tipoEvento||'—')}</div></div>
    <div class="pdf-meta-item" style="text-align:right"><div class="pdf-meta-label">Fecha del evento</div><div>${this._formatDate(svc.fechaEvento||svc.fecha)}</div></div>
    <div class="pdf-meta-item"><div class="pdf-meta-label">Personas</div><div>${svc.personas||'—'}</div></div>
    ${dietasPdf.map((x, i) => `<div class="pdf-meta-item" style="${i % 2 ? 'text-align:right' : ''}"><div class="pdf-meta-label">${x.label}</div><div>${Number(x.value || 0)}</div></div>`).join('')}
    <div class="pdf-meta-item" style="text-align:right"><div class="pdf-meta-label">Sabor</div><div>${this._esc(svc.sabor||'—')}</div></div>
  </div>
  <table><thead><tr><th></th><th style="text-align:center">Cant. porciones</th><th style="text-align:right">Subtotal</th></tr></thead><tbody>
    ${pdfMenuItems.map(it => renderMenu(it)).join('')}
    ${this.CURSO_ORDER.map(c => renderGrupo(c, grupos[c] || [])).join('')}
  </tbody></table>
  <div class="pdf-totals">
    ${svc.descuento > 0 ? `
    <div class="pdf-total-row" style="color:#888">Subtotal: $${Math.round(svc.subtotalBruto || 0).toLocaleString('es-AR')}</div>
    <div class="pdf-total-row" style="color:#8B2E3A">Descuento (${svc.descuento}%): -$${Math.round((svc.subtotalBruto || 0) * svc.descuento / 100).toLocaleString('es-AR')}</div>
    ` : ''}
    <div class="pdf-total-row">Precio por persona: <strong>$${svc.personas > 0 ? Math.round(totalServicio / svc.personas).toLocaleString('es-AR') : '—'}</strong></div>
    <div class="pdf-total-main">Total: $${Math.round(totalServicio).toLocaleString('es-AR')}</div>
  </div>
  ${svc.notas?`<div class="pdf-notas"><strong>Notas:</strong> ${this._esc(svc.notas)}</div>`:''}
  <div class="pdf-conditions"><div class="pdf-conditions-title">Forma de pago</div>30% en concepto de seña y 70% una semana previa al evento.<br><br><strong>Importante:</strong> Una vez cerrado el número de invitados no se descuenta en caso de bajas. Sí podemos sumar hasta dos días antes de la fecha.</div>
  <div class="pdf-contact"><div class="pdf-contact-title">Datos de contacto</div>contacto@cococatering.com.ar<br>11.6931.8930<br>Centenario 1182, San Isidro</div>
  <div class="pdf-footer"> www.cococatering.com.ar</div>
</body></html>`;
    const win = window.open('', '_blank', 'width=800,height=900');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 600);
  },

  _formatDate(str) {
    if (!str) return '—';
    const [y, m, d] = str.split('-');
    return `${d}/${m}/${y}`;
  },

  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
