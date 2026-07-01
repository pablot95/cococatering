// ================================================
// pagos.js — Gestión centralizada de pagos
// Colección: admin_pagos
// ================================================

const Pagos = {
  pagos:     [],
  servicios: [],
  mes:       null,
  filtroEstado: 'todos',

  MEDIOS: ['Efectivo', 'Transferencia', 'Tarjeta débito', 'Tarjeta crédito', 'Cheque', 'MercadoPago'],

  async render() {
    const hoy = new Date();
    this.mes  = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('mainContent').innerHTML =
      '<div class="loading-spinner"><div class="spinner-ring"></div></div>';
    await this._load();
    this._renderList();
  },

  async _load(mes, estadoFilter) {
    if (mes) this.mes = mes;
    if (estadoFilter !== undefined) this.filtroEstado = estadoFilter;
    try {
      const [pSnap, sSnap] = await Promise.all([
        db.collection('admin_pagos').get().catch(() => ({ docs: [] })),
        db.collection('admin_servicios').get().catch(() => ({ docs: [] }))
      ]);
      const totalUpdates = [];
      this.pagos     = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.pagos.sort((a, b) => (b.fecha || '').localeCompare(a.fecha || ''));
      this.servicios = sSnap.docs.map(d => {
        const servicio = this._normalizarServicio({ id: d.id, ...d.data() });
        if (servicio.subtotalBruto > 0 && servicio.descuento > 0 && Math.round(Number(d.data().total || 0)) !== servicio.total) {
          totalUpdates.push(d.ref.update({ total: servicio.total }).catch(e => console.warn('No se pudo normalizar total de servicio', d.id, e)));
        }
        return servicio;
      });
      this.servicios = this._dedupePedidosWeb(this.servicios);
      if (totalUpdates.length) await Promise.all(totalUpdates);
    } catch (e) { this.pagos = []; this.servicios = []; }
  },

  _totalServicioFinal(s = {}) {
    const subtotal = Number(s.subtotalBruto || 0);
    const descuento = Number(s.descuento || 0);
    if (subtotal > 0 && descuento > 0) return Math.round(subtotal * (1 - descuento / 100));
    return Math.round(Number(s.total || 0));
  },

  _normalizarServicio(s = {}) {
    return { ...s, total: this._totalServicioFinal(s) };
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

  _renderList() {
    // Filtrar pagos por mes
    let pagosFiltrados = this.mes
      ? this.pagos.filter(p => (p.fecha || '').startsWith(this.mes))
      : this.pagos;

    // Filtrar servicios por estadoPago
    if (this.filtroEstado !== 'todos') {
      const svcIds = this.servicios
        .filter(s => (s.estadoPago || 'sin_pago') === this.filtroEstado)
        .map(s => s.id);
      pagosFiltrados = pagosFiltrados.filter(p => svcIds.includes(p.servicioId));
    }

    // Agrupar por servicio
    const bySvc = {};
    pagosFiltrados.forEach(p => {
      if (!bySvc[p.servicioId]) bySvc[p.servicioId] = [];
      bySvc[p.servicioId].push(p);
    });

    // También incluir servicios del período sin pagos si filtro = sin_pago
    const svcEnPeriodo = this.filtroEstado === 'sin_pago'
      ? this.servicios.filter(s => (s.estadoPago || 'sin_pago') === 'sin_pago' && s.estado !== 'cancelado')
      : [];
    svcEnPeriodo.forEach(s => { if (!bySvc[s.id]) bySvc[s.id] = []; });

    const svcIds = Object.keys(bySvc);

    const totalMes = pagosFiltrados.reduce((a, p) => a + (p.monto || 0), 0);

    document.getElementById('mainContent').innerHTML = `
      <div class="section-wrapper">
        <div class="tab-header">
          <h3>PAGOS</h3>
          <button class="btn-primary" id="btnAddPagoSvc">Registrar pago</button>
        </div>

        <div class="filter-bar">
          <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
            <label style="font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Período</label>
            ${App.monthSelectHTML('pagosMes', this.mes)}
            <label style="font-size:.75rem;font-weight:700;color:var(--text-muted);text-transform:uppercase;letter-spacing:.06em">Estado</label>
            <select id="pagosEstado" class="filter-input-inline">
              <option value="todos"    ${this.filtroEstado === 'todos'    ? 'selected' : ''}>Todos</option>
              <option value="sin_pago" ${this.filtroEstado === 'sin_pago' ? 'selected' : ''}>Sin pago</option>
              <option value="parcial"  ${this.filtroEstado === 'parcial'  ? 'selected' : ''}>Parcial</option>
              <option value="completo" ${this.filtroEstado === 'completo' ? 'selected' : ''}>Completo</option>
            </select>
          </div>
          <div style="font-size:.9rem;font-weight:700;color:var(--success)">
            Total cobrado en período: $${totalMes.toLocaleString('es-AR')}
          </div>
        </div>

        <div id="pagosContainer">
          ${svcIds.length === 0
            ? '<p class="empty-msg" style="padding:20px 0">No hay pagos para el período seleccionado.</p>'
            : svcIds.map(svcId => {
                const svc       = this.servicios.find(s => s.id === svcId);
                const pagosRow  = bySvc[svcId] || [];
                const cobrado   = pagosRow.reduce((a, p) => a + (p.monto || 0), 0);
                const saldo     = Math.max(0, (svc?.total || 0) - cobrado);
                const ep        = svc?.estadoPago || 'sin_pago';
                const epMap     = { sin_pago: 'badge-error', parcial: 'badge-warning', completo: 'badge-success' };
                const epLabel   = { sin_pago: 'Sin pago', parcial: 'Parcial', completo: 'Completo' };
                return `
                  <div class="svc-pago-block ep-${ep.replace('_', '-')}">
                    <div class="svc-pago-header">
                      <div>
                        <strong>#${String(svc?.numero || '').padStart(3,'0')}</strong>
                        <span style="color:var(--text-muted);font-size:.82rem;margin-left:8px">
                          ${svc?.cliente?.nombre ? this._esc(svc.cliente.nombre) : '—'}
                        </span>
                        <span style="color:var(--text-muted);font-size:.78rem;margin-left:8px">
                          ${this._formatDate(svc?.fechaEvento)}
                        </span>
                      </div>
                      <div style="display:flex;gap:10px;align-items:center">
                        <span class="badge ${epMap[ep]}">${epLabel[ep]}</span>
                        <button class="btn-primary" style="padding:4px 12px;font-size:.75rem"
                          data-addsvcid="${svcId}"
                          data-svctotal="${svc?.total || 0}"
                          data-svcnum="${svc?.numero || 0}">+ Pago</button>
                      </div>
                    </div>

                    <div class="payment-totals" style="margin:8px 0">
                      <div class="pay-total-item">
                        <span class="pti-label">Total</span>
                        <span class="pti-val">$${Math.round(svc?.total || 0).toLocaleString('es-AR')}</span>
                      </div>
                      <div class="pay-total-item">
                        <span class="pti-label">Cobrado</span>
                        <span class="pti-val" style="color:var(--success)">$${cobrado.toLocaleString('es-AR')}</span>
                      </div>
                      <div class="pay-total-item">
                        <span class="pti-label">Saldo</span>
                        <span class="pti-val" style="color:${saldo > 0 ? 'var(--warning)' : 'var(--success)'}">$${saldo.toLocaleString('es-AR')}</span>
                      </div>
                    </div>

                    ${pagosRow.length === 0
                      ? '<p style="color:var(--text-muted);font-size:.8rem;padding:6px 0">Sin pagos registrados.</p>'
                      : pagosRow.map(pg => `
                          <div class="pago-row">
                            <div class="pago-row-left">
                              <span class="pago-date">${this._formatDate(pg.fecha)}</span>
                              <span class="medio-tag">${this._esc(pg.medioPago || '—')}</span>
                              ${pg.notas ? `<span style="font-size:.78rem;color:var(--text-muted)">${this._esc(pg.notas)}</span>` : ''}
                            </div>
                            <div style="display:flex;align-items:center;gap:8px">
                              <span class="pago-amount">$${Math.round(pg.monto).toLocaleString('es-AR')}</span>
                              <button class="btn-icon btn-delete" style="padding:4px 8px;font-size:.7rem"
                                data-pagoid="${pg.id}" data-svcid="${svcId}" data-svctotal="${svc?.total || 0}">🗑️</button>
                            </div>
                          </div>`).join('')}
                  </div>`;
              }).join('')}
        </div>
      </div>`;

    // Filtros
    const onMesChange = async () => {
      const val = App.monthSelectValue('pagosMes');
      if (val) { this.mes = val; this._renderList(); }
    };
    document.getElementById('pagosMes-mes').addEventListener('change', onMesChange);
    document.getElementById('pagosMes-anio').addEventListener('change', onMesChange);
    document.getElementById('pagosEstado').addEventListener('change', async (e) => {
      this.filtroEstado = e.target.value;
      this._renderList();
    });

    // Registrar pago genérico (elegir servicio)
    document.getElementById('btnAddPagoSvc').addEventListener('click', () =>
      this._openSelectSvcModal()
    );

    // Agregar pago por servicio en bloque
    document.querySelectorAll('[data-addsvcid]').forEach(btn => {
      btn.addEventListener('click', () => {
        const svcId  = btn.dataset.addsvcid;
        const total  = parseFloat(btn.dataset.svctotal) || 0;
        const num    = parseInt(btn.dataset.svcnum) || 0;
        this._openAddPagoModal(svcId, total, num, async () => {
          await this._load();
          this._renderList();
        });
      });
    });

    // Eliminar pago
    document.querySelectorAll('#pagosContainer .btn-delete').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este pago?')) return;
        await this._delete(btn.dataset.pagoid, btn.dataset.svcid, parseFloat(btn.dataset.svctotal) || 0);
      });
    });
  },

  _openSelectSvcModal() {
    const activos = this.servicios.filter(s => s.estado !== 'cancelado');
    App.openModal('Seleccionar servicio', `
      <div style="max-height:60vh;overflow-y:auto">
        ${activos.length === 0
          ? '<p style="color:var(--text-muted)">No hay servicios activos.</p>'
          : activos.map(s => `
              <div class="svc-select-row" data-svcid="${s.id}" data-svctotal="${s.total || 0}" data-svcnum="${s.numero || 0}"
                style="display:flex;justify-content:space-between;align-items:center;padding:10px 8px;border-bottom:1px solid var(--border);cursor:pointer;border-radius:6px;transition:background .15s">
                <div>
                  <strong>#${String(s.numero || '').padStart(3,'0')}</strong>
                  <span style="margin-left:8px;font-size:.85rem">${this._esc(s.cliente?.nombre || '—')}</span>
                  <span style="margin-left:8px;font-size:.78rem;color:var(--text-muted)">${this._formatDate(s.fechaEvento)}</span>
                </div>
                <span class="badge ${s.estadoPago === 'completo' ? 'badge-success' : s.estadoPago === 'parcial' ? 'badge-warning' : 'badge-error'}">${s.estadoPago === 'completo' ? 'Completo' : s.estadoPago === 'parcial' ? 'Parcial' : 'Sin pago'}</span>
              </div>`).join('')}
      </div>`, 'md');

    document.querySelectorAll('.svc-select-row').forEach(row => {
      row.addEventListener('click', () => {
        App.closeModalForce();
        this._openAddPagoModal(row.dataset.svcid, parseFloat(row.dataset.svctotal) || 0, parseInt(row.dataset.svcnum) || 0, async () => {
          await this._load();
          this._renderList();
        });
      });
      row.addEventListener('mouseenter', () => row.style.background = 'var(--bordo-light)');
      row.addEventListener('mouseleave', () => row.style.background = '');
    });
  },

  _openAddPagoModal(servicioId, totalServicio, servicioNumero, onSaved) {
    const today = new Date().toISOString().slice(0, 10);
    App.openModal(`Registrar pago — Servicio #${String(servicioNumero).padStart(3,'0')}`, `
      <form id="fPagoMain" class="admin-form">
        <div class="form-row">
          <div class="field-group">
            <label>Fecha del pago *</label>
            <input id="pgFecha" type="date" value="${today}" required>
          </div>
          <div class="field-group">
            <label>Monto ($) *</label>
            <input id="pgMonto" type="number" min="0" step="1" placeholder="0" required>
          </div>
        </div>
        <div class="field-group">
          <label>Medio de pago</label>
          <select id="pgMedio">
            ${this.MEDIOS.map(m => `<option value="${m}">${m}</option>`).join('')}
          </select>
        </div>
        <div class="field-group">
          <label>Notas</label>
          <input id="pgNotas" type="text" placeholder="Ej: Seña del evento…">
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="btnCancelPgMain">Cancelar</button>
          <button type="submit" class="btn-primary">Registrar pago</button>
        </div>
      </form>`, 'md');

    document.getElementById('btnCancelPgMain').addEventListener('click', () => App.closeModal());
    document.getElementById('fPagoMain').addEventListener('submit', async (e) => {
      e.preventDefault();
      const monto = Math.round(parseFloat(document.getElementById('pgMonto').value) || 0);
      if (!monto) { App.toast('Ingresá el monto', 'warning'); return; }
      try {
        await db.collection('admin_pagos').add({
          servicioId,
          servicioNumero,
          fecha:     document.getElementById('pgFecha').value,
          monto,
          medioPago: document.getElementById('pgMedio').value,
          notas:     document.getElementById('pgNotas').value.trim(),
          creadoEn:  firebase.firestore.FieldValue.serverTimestamp()
        });
        await this._updateServicePaymentStatus(servicioId, totalServicio);
        App.toast('Pago registrado', 'success');
        App.closeModalForce();
        if (onSaved) onSaved();
      } catch (err) { App.toast('Error al registrar', 'error'); }
    });
  },

  async _delete(pagoId, servicioId, totalServicio) {
    try {
      await db.collection('admin_pagos').doc(pagoId).delete();
      await this._updateServicePaymentStatus(servicioId, totalServicio);
      App.toast('Pago eliminado', 'success');
      await this._load();
      this._renderList();
    } catch (e) { App.toast('Error al eliminar', 'error'); }
  },

  async _updateServicePaymentStatus(servicioId, totalServicio) {
    try {
      const snap = await db.collection('admin_pagos').where('servicioId', '==', servicioId).get();
      const totalCobrado = snap.docs.reduce((a, d) => a + (d.data().monto || 0), 0);
      let estadoPago = 'sin_pago';
      if (totalCobrado >= totalServicio && totalServicio > 0) estadoPago = 'completo';
      else if (totalCobrado > 0) estadoPago = 'parcial';
      await db.collection('admin_servicios').doc(servicioId).update({ estadoPago, montoPagado: totalCobrado });
      // Actualizar cache local
      const svc = this.servicios.find(s => s.id === servicioId);
      if (svc) svc.estadoPago = estadoPago;
    } catch (e) { console.error('Error actualizando estado de pago', e); }
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
