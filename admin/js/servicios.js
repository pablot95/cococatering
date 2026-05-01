// ================================================
// servicios.js — Gestión de servicios / eventos
// Colección: admin_servicios
// ================================================

const Servicios = {
  servicios:    [],
  menus:        [],
  presupuestos: [],

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

  async render() {
    document.getElementById('mainContent').innerHTML =
      '<div class="loading-spinner"><div class="spinner-ring"></div></div>';
    await this._load();
    this._renderList();
  },

  async _load() {
    try {
      const [sSnap, mSnap, pSnap] = await Promise.all([
        db.collection('admin_servicios').orderBy('fechaEvento', 'asc').get().catch(() => ({ docs: [] })),
        db.collection('admin_menus').orderBy('nombre').get().catch(() => ({ docs: [] })),
        db.collection('admin_presupuestos').get().catch(() => ({ docs: [] }))
      ]);
      this.servicios    = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.menus        = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.presupuestos = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Presupuestos ordenados por fechaEvento
      this.presupuestos.sort((a, b) => {
        const fa = a.fechaEvento || a.fecha || '';
        const fb = b.fechaEvento || b.fecha || '';
        return fa < fb ? 1 : fa > fb ? -1 : 0;
      });
    } catch (e) {
      this.servicios = []; this.menus = []; this.presupuestos = [];
    }
  },

  _renderList(filter = {}) {
    let items = this.servicios.slice();

    // Aplicar filtros
    if (filter.cliente) {
      const q = filter.cliente.toLowerCase();
      items = items.filter(s => (s.cliente?.nombre || '').toLowerCase().includes(q));
    }
    if (filter.estado) items = items.filter(s => (s.estado || 'pendiente') === filter.estado);
    if (filter.estadoPago) items = items.filter(s => (s.estadoPago || 'sin_pago') === filter.estadoPago);
    if (filter.desde) items = items.filter(s => (s.fechaEvento || '') >= filter.desde);
    if (filter.hasta) items = items.filter(s => (s.fechaEvento || '') <= filter.hasta);

    const sinPago = items.filter(s => (s.estadoPago || 'sin_pago') === 'sin_pago' && s.estado !== 'cancelado').length;
    const parcial = items.filter(s => s.estadoPago === 'parcial').length;

    document.getElementById('mainContent').innerHTML = `
      <div class="section-wrapper">
        <div class="tab-header">
          <h3>Servicios <span class="count-badge">${items.length}</span></h3>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            ${sinPago ? `<span class="badge badge-error">${sinPago} sin pago</span>` : ''}
            ${parcial ? `<span class="badge badge-warning">${parcial} pago parcial</span>` : ''}
            <button class="btn-secondary" id="btnSvcFromPres">📋 Desde presupuesto</button>
            <button class="btn-primary" id="btnAddSvc">+ Nuevo servicio</button>
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
          <select id="fSvcPago" class="filter-select">
            <option value="">Todos los pagos</option>
            ${Object.entries(this.ESTADOS_PAGO).map(([k,v]) =>
              `<option value="${k}" ${filter.estadoPago === k ? 'selected' : ''}>${v.label}</option>`
            ).join('')}
          </select>
          <input id="fSvcDesde" type="date" value="${filter.desde || ''}" class="filter-input">
          <input id="fSvcHasta" type="date" value="${filter.hasta || ''}" class="filter-input">
          <button class="btn-secondary" id="btnSvcClearFilter">✕</button>
        </div>

        <div class="prod-list">
          <div class="prod-list-header" style="grid-template-columns:60px 1fr 1fr 1fr 70px 100px 80px 80px">
            <span>#</span><span>Cliente</span><span>Fecha</span>
            <span>Tipo</span><span>Pers.</span><span>Menú</span>
            <span>Total</span><span>Pago</span>
          </div>
          ${items.length === 0
            ? '<p class="empty-msg" style="padding:20px">No hay servicios que coincidan.</p>'
            : items.map(s => {
                const ep  = s.estadoPago || 'sin_pago';
                const est = s.estado || 'pendiente';
                const sinPagoRow = s.estado !== 'cancelado' && ep === 'sin_pago';
                return `
                  <div class="prod-row ${sinPagoRow ? 'row-sin-pago' : ''}" data-id="${s.id}"
                    style="grid-template-columns:60px 1fr 1fr 1fr 70px 100px 80px 80px">
                    <span><strong>#${String(s.numero || '').padStart(3,'0')}</strong></span>
                    <span class="prod-nombre">${this._esc(s.cliente?.nombre || '—')}</span>
                    <span>${this._formatDate(s.fechaEvento)}</span>
                    <span>${this._esc(s.tipoEvento || '—')}</span>
                    <span>${s.personas || '—'}</span>
                    <span style="font-size:.78rem">${this._esc(s.menuNombre || '—')}</span>
                    <span style="font-weight:700">$${Math.round(s.total || 0).toLocaleString('es-AR')}</span>
                    <span><span class="badge ${this.ESTADOS_PAGO[ep]?.css || 'badge-muted'}" style="font-size:.7rem">
                      ${this.ESTADOS_PAGO[ep]?.label || ep}
                    </span></span>
                  </div>`;
              }).join('')}
        </div>
      </div>`;

    document.getElementById('btnAddSvc').addEventListener('click', () => this._openModal());
    document.getElementById('btnSvcFromPres').addEventListener('click', () => this._openFromPresupuesto());

    // Filtros
    const applyFilter = () => {
      this._renderList({
        cliente:    document.getElementById('fSvcCliente').value.trim(),
        estado:     document.getElementById('fSvcEstado').value,
        estadoPago: document.getElementById('fSvcPago').value,
        desde:      document.getElementById('fSvcDesde').value,
        hasta:      document.getElementById('fSvcHasta').value
      });
    };
    document.getElementById('fSvcCliente').addEventListener('input',  applyFilter);
    document.getElementById('fSvcEstado').addEventListener('change',  applyFilter);
    document.getElementById('fSvcPago').addEventListener('change',    applyFilter);
    document.getElementById('fSvcDesde').addEventListener('change',   applyFilter);
    document.getElementById('fSvcHasta').addEventListener('change',   applyFilter);
    document.getElementById('btnSvcClearFilter').addEventListener('click', () => this._renderList());

    // Click en fila → detalle
    document.querySelectorAll('#mainContent .prod-row').forEach(row => {
      row.addEventListener('click', () => {
        const s = this.servicios.find(x => x.id === row.dataset.id);
        if (s) this._openDetail(s);
      });
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
      App.closeModal();
      if (pres) this._openModal(null, pres);
    });
  },

  // ── Modal: Detalle del servicio + pagos ──────────

  // ── Modal: Crear / Editar servicio ──────────────
  // pres: presupuesto de referencia para pre-llenar el formulario

  _openModal(item = null, pres = null) {
    const isEdit = !!item;
    const nextNum = this.servicios.length > 0
      ? Math.max(...this.servicios.map(s => s.numero || 0)) + 1 : 1;

    // Pre-llenar datos desde presupuesto si existe
    const clienteNombre = item?.cliente?.nombre || pres?.cliente?.nombre || '';
    const clienteTel    = item?.cliente?.telefono || pres?.cliente?.telefono || '';
    const tipoEvento    = item?.tipoEvento || pres?.tipoEvento || this.TIPOS_EVENTO[0];
    const fechaEvento   = item?.fechaEvento || pres?.fechaEvento || '';
    const personas      = item?.personas || pres?.personas || '';
    const presId        = item?.presupuestoId || pres?.id || '';
    const totalFromPres = pres?.totalGeneral || 0;

    App.openModal(isEdit ? `Editar servicio #${String(item.numero || '').padStart(3,'0')}` : 'Nuevo servicio', `
      <form id="fSvc" class="admin-form">
        ${pres ? `<div style="background:var(--bordo-light);border-radius:8px;padding:8px 12px;margin-bottom:12px;font-size:.82rem;color:var(--bordo)">
          📋 Creando desde presupuesto <strong>#${String(pres.numero || '').padStart(3,'0')}</strong>
        </div>` : ''}

        <div class="form-row">
          <div class="field-group">
            <label>N° de servicio</label>
            <input id="sNumero" type="number" value="${item?.numero ?? nextNum}" min="1" step="1">
          </div>
          <div class="field-group">
            <label>Estado</label>
            <select id="sEstado">
              ${Object.entries(this.ESTADOS).map(([k, v]) =>
                `<option value="${k}" ${(item?.estado || 'pendiente') === k ? 'selected' : ''}>${v.label}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--bordo);margin:4px 0 10px">
          Datos del cliente
        </div>
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
        <div class="field-group">
          <label>Email</label>
          <input id="sClienteEmail" type="email" value="${this._esc(item?.cliente?.email || '')}"
            placeholder="email@ejemplo.com">
        </div>

        <div style="font-size:.78rem;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:var(--bordo);margin:8px 0 10px">
          Detalles del evento
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Fecha del evento *</label>
            <input id="sFechaEvento" type="date" value="${fechaEvento}" required>
          </div>
          <div class="field-group">
            <label>Hora</label>
            <input id="sHora" type="time" value="${item?.horaEvento || ''}">
          </div>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Tipo de evento</label>
            <select id="sTipoEvento">
              ${this.TIPOS_EVENTO.map(t =>
                `<option value="${t}" ${tipoEvento === t ? 'selected' : ''}>${t}</option>`
              ).join('')}
            </select>
          </div>
          <div class="field-group">
            <label>Cantidad de personas</label>
            <input id="sPersonas" type="number" min="1" step="1"
              value="${personas}" placeholder="0">
          </div>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Menú asociado</label>
            <select id="sMenu">
              <option value="">Sin menú</option>
              ${this.menus.map(m =>
                `<option value="${m.id}" data-nombre="${this._esc(m.nombre)}"
                  ${item?.menuId === m.id ? 'selected' : ''}>${this._esc(m.nombre)}</option>`
              ).join('')}
            </select>
          </div>
          <div class="field-group">
            <label>Presupuesto vinculado</label>
            <select id="sPresupuesto">
              <option value="">Sin presupuesto</option>
              ${this.presupuestos.map(p =>
                `<option value="${p.id}"
                  ${presId === p.id ? 'selected' : ''}>
                  #${String(p.numero || '').padStart(3,'0')} — ${this._esc(p.cliente?.nombre || '')}
                </option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Total del servicio ($)</label>
            <input id="sTotal" type="number" min="0" step="1"
              value="${item?.total || totalFromPres || ''}" placeholder="0">
          </div>
          <div class="field-group">
            <label>Estado de pago</label>
            <select id="sEstadoPago">
              ${Object.entries(this.ESTADOS_PAGO).map(([k, v]) =>
                `<option value="${k}" ${(item?.estadoPago || 'sin_pago') === k ? 'selected' : ''}>${v.label}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="field-group">
          <label>Notas</label>
          <textarea id="sNotas" rows="2" placeholder="Notas adicionales…">${this._esc(item?.notas || '')}</textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" id="btnCancelSvc">Cancelar</button>
          <button type="submit" class="btn-primary" id="btnSaveSvc">${isEdit ? 'Guardar cambios' : 'Crear servicio'}</button>
        </div>
      </form>`, 'xl');

    document.getElementById('btnCancelSvc').addEventListener('click', () => App.closeModal());
    document.getElementById('fSvc').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSaveSvc');
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        const menuSel = document.getElementById('sMenu');
        const menuNombre = menuSel.value
          ? menuSel.options[menuSel.selectedIndex].dataset.nombre || ''
          : '';
        const data = {
          numero:       parseInt(document.getElementById('sNumero').value) || nextNum,
          estado:       document.getElementById('sEstado').value,
          estadoPago:   document.getElementById('sEstadoPago').value,
          fechaEvento:  document.getElementById('sFechaEvento').value,
          horaEvento:   document.getElementById('sHora').value || null,
          tipoEvento:   document.getElementById('sTipoEvento').value,
          personas:     parseInt(document.getElementById('sPersonas').value) || 0,
          menuId:       document.getElementById('sMenu').value || null,
          menuNombre:   menuNombre,
          presupuestoId: document.getElementById('sPresupuesto').value || null,
          total:        Math.round(parseFloat(document.getElementById('sTotal').value) || 0),
          notas:        document.getElementById('sNotas').value.trim(),
          cliente: {
            nombre:   document.getElementById('sClienteNombre').value.trim(),
            telefono: document.getElementById('sClienteTel').value.trim(),
            email:    document.getElementById('sClienteEmail').value.trim()
          },
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!data.cliente.nombre || !data.fechaEvento) {
          App.toast('Completá nombre del cliente y fecha del evento', 'warning');
          btn.disabled = false; btn.textContent = isEdit ? 'Guardar cambios' : 'Crear servicio';
          return;
        }
        if (isEdit) {
          await db.collection('admin_servicios').doc(item.id).update(data);
        } else {
          data.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
          await db.collection('admin_servicios').add(data);
        }
        App.closeModal();
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

  // ── Modal: Detalle del servicio + pagos ──────────

  async _openDetail(svc) {
    App.openModal(`Servicio #${String(svc.numero || '').padStart(3, '0')}`, `
      <div class="loading-spinner"><div class="spinner-ring"></div></div>`, 'xl');

    let pagos = [];
    try {
      const snap = await db.collection('admin_pagos')
        .where('servicioId', '==', svc.id).orderBy('fecha', 'asc').get();
      pagos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) { pagos = []; }

    const totalPagado  = pagos.reduce((a, p) => a + (p.monto || 0), 0);
    const saldo        = Math.max(0, (svc.total || 0) - totalPagado);
    const ep           = svc.estadoPago || 'sin_pago';

    document.getElementById('modalBody').innerHTML = `
      <!-- Info del evento -->
      <div class="detail-section">
        <div class="detail-section-title">Datos del evento</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
          <div class="detail-row"><span class="dlabel">Fecha</span><span class="dvalue">${this._formatDate(svc.fechaEvento)}</span></div>
          <div class="detail-row"><span class="dlabel">Hora</span><span class="dvalue">${svc.horaEvento || '—'}</span></div>
          <div class="detail-row"><span class="dlabel">Tipo</span><span class="dvalue">${this._esc(svc.tipoEvento || '—')}</span></div>
          <div class="detail-row"><span class="dlabel">Personas</span><span class="dvalue">${svc.personas || '—'}</span></div>
          <div class="detail-row"><span class="dlabel">Menú</span><span class="dvalue">${this._esc(svc.menuNombre || '—')}</span></div>
          <div class="detail-row"><span class="dlabel">Estado</span><span class="dvalue">
            <span class="badge ${this.ESTADOS[svc.estado || 'pendiente']?.css || 'badge-muted'}">
              ${this.ESTADOS[svc.estado || 'pendiente']?.label || svc.estado}
            </span>
          </span></div>
        </div>
      </div>

      <!-- Info del cliente -->
      <div class="detail-section">
        <div class="detail-section-title">Cliente</div>
        <div class="detail-row"><span class="dlabel">Nombre</span><span class="dvalue">${this._esc(svc.cliente?.nombre || '—')}</span></div>
        <div class="detail-row"><span class="dlabel">Teléfono</span><span class="dvalue">${this._esc(svc.cliente?.telefono || '—')}</span></div>
        <div class="detail-row"><span class="dlabel">Email</span><span class="dvalue">${this._esc(svc.cliente?.email || '—')}</span></div>
      </div>

      <!-- Resumen financiero -->
      <div class="payment-summary">
        <div class="payment-totals">
          <div class="pay-total-item">
            <span class="pti-label">Total</span>
            <span class="pti-val">$${Math.round(svc.total || 0).toLocaleString('es-AR')}</span>
          </div>
          <div class="pay-total-item">
            <span class="pti-label">Cobrado</span>
            <span class="pti-val" style="color:var(--success)">$${totalPagado.toLocaleString('es-AR')}</span>
          </div>
          <div class="pay-total-item">
            <span class="pti-label">Saldo</span>
            <span class="pti-val" style="color:${saldo > 0 ? 'var(--warning)' : 'var(--success)'}">$${saldo.toLocaleString('es-AR')}</span>
          </div>
        </div>
      </div>

      <!-- Pagos -->
      <div class="detail-section">
        <div class="detail-section-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>Pagos registrados</span>
          <button class="btn-primary" style="padding:5px 14px;font-size:.78rem" id="btnAddPagoDetail">+ Agregar pago</button>
        </div>
        <div id="pagosList">
          ${pagos.length === 0
            ? '<p style="color:var(--text-muted);font-size:.85rem;padding:10px 0">No hay pagos registrados.</p>'
            : pagos.map(p => `
                <div class="pago-row">
                  <div class="pago-row-left">
                    <span class="pago-date">${this._formatDate(p.fecha)}</span>
                    <span class="medio-tag">${this._esc(p.medioPago || '—')}</span>
                    ${p.notas ? `<span style="font-size:.78rem;color:var(--text-muted)">${this._esc(p.notas)}</span>` : ''}
                  </div>
                  <div style="display:flex;align-items:center;gap:8px">
                    <span class="pago-amount">$${Math.round(p.monto).toLocaleString('es-AR')}</span>
                    <button class="btn-icon btn-delete" data-pagoid="${p.id}" data-svcid="${svc.id}" data-svctotal="${svc.total || 0}" style="padding:4px 8px;font-size:.7rem">🗑️</button>
                  </div>
                </div>`).join('')}
        </div>
      </div>

      ${svc.notas ? `<div class="detail-section">
        <div class="detail-section-title">Notas</div>
        <p style="font-size:.86rem;color:var(--text-muted)">${this._esc(svc.notas)}</p>
      </div>` : ''}

      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:10px;border-top:1px solid var(--border);margin-top:8px">
        <button class="btn-secondary" id="btnEditSvcDetail">✏️ Editar servicio</button>
        <button class="btn-danger"    id="btnDeleteSvcDetail">🗑️ Eliminar</button>
        <button class="btn-secondary" onclick="App.closeModal()">Cerrar</button>
      </div>`;

    // Botón editar dentro del detalle
    document.getElementById('btnEditSvcDetail').addEventListener('click', () => {
      App.closeModal();
      this._openModal(svc);
    });

    // Botón eliminar dentro del detalle
    document.getElementById('btnDeleteSvcDetail').addEventListener('click', async () => {
      App.closeModal();
      await this._delete(svc.id);
    });

    // Agregar pago
    document.getElementById('btnAddPagoDetail').addEventListener('click', () =>
      this._openAddPagoModal(svc.id, svc.total || 0, svc.numero || 0, () => this._openDetail(svc))
    );

    // Eliminar pago
    document.querySelectorAll('#pagosList .btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este pago?')) return;
        await db.collection('admin_pagos').doc(btn.dataset.pagoid).delete();
        await this._updatePaymentStatus(btn.dataset.svcid, parseFloat(btn.dataset.svctotal) || 0);
        App.toast('Pago eliminado', 'success');
        const updated = this.servicios.find(s => s.id === btn.dataset.svcid);
        if (updated) {
          await this._load();
          this._openDetail(this.servicios.find(s => s.id === btn.dataset.svcid) || svc);
        }
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
        App.closeModal();
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
      await db.collection('admin_servicios').doc(servicioId).update({ estadoPago });
    } catch (e) { console.error('Error actualizando estado de pago', e); }
  },

  async _delete(id) {
    const s = this.servicios.find(x => x.id === id);
    if (!confirm(`¿Eliminar el servicio #${String(s?.numero || '').padStart(3, '0')}? Esta acción no se puede deshacer.`)) return;
    try {
      await db.collection('admin_servicios').doc(id).delete();
      App.toast('Servicio eliminado', 'success');
      await this._load();
      this._renderList();
    } catch (e) { App.toast('Error al eliminar', 'error'); }
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
