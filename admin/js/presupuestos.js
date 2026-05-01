// ================================================
// presupuestos.js — Gestión de presupuestos
// Colección: admin_presupuestos
// ================================================

const Presupuestos = {
  presupuestos: [],
  menus:        [],
  productos:    [],

  TIPOS_EVENTO: [
    'Cumpleaños', 'Casamiento', 'Corporativo', 'Baby shower',
    'Comunión', 'Bautismo', 'Cumpleaños de 15', 'Graduación', 'Reunión', 'Otro'
  ],

  CURSOS: ['Entrada', 'Principal', 'Postre', 'Bebida', 'Otro'],
  CURSO_ORDER: ['Entrada', 'Principal', 'Postre', 'Bebida', 'Otro'],

  async render() {
    document.getElementById('mainContent').innerHTML =
      '<div class="loading-spinner"><div class="spinner-ring"></div></div>';
    await this._load();
    this._renderList();
  },

  async _load() {
    try {
      const [pSnap, mSnap, prSnap] = await Promise.all([
        db.collection('admin_presupuestos').get().catch(() => ({ docs: [] })),
        db.collection('admin_menus').orderBy('nombre').get().catch(() => ({ docs: [] })),
        db.collection('admin_productos').orderBy('nombre').get().catch(() => ({ docs: [] }))
      ]);
      this.presupuestos = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenar por fechaEvento asc (próximos primero), luego por numero desc
      this.presupuestos.sort((a, b) => {
        const fa = a.fechaEvento || a.fecha || '';
        const fb = b.fechaEvento || b.fecha || '';
        if (fa && fb) return fa < fb ? -1 : fa > fb ? 1 : 0;
        return (b.numero || 0) - (a.numero || 0);
      });
      this.menus     = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.productos = prSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      this.presupuestos = []; this.menus = []; this.productos = [];
    }
  },

  _renderList(filter = {}) {
    let items = this.presupuestos.slice();

    // Aplicar filtros
    if (filter.cliente) {
      const q = filter.cliente.toLowerCase();
      items = items.filter(p => (p.cliente?.nombre || '').toLowerCase().includes(q));
    }
    if (filter.tipo) {
      items = items.filter(p => p.tipoEvento === filter.tipo);
    }
    if (filter.desde) {
      items = items.filter(p => (p.fechaEvento || p.fecha || '') >= filter.desde);
    }
    if (filter.hasta) {
      items = items.filter(p => (p.fechaEvento || p.fecha || '') <= filter.hasta);
    }

    document.getElementById('mainContent').innerHTML = `
      <div class="section-wrapper">
        <div class="tab-header">
          <h3>Presupuestos <span class="count-badge">${items.length}</span></h3>
          <button class="btn-primary" id="btnAddPres">+ Nuevo presupuesto</button>
        </div>

        <!-- Filtros -->
        <div class="filter-bar">
          <input id="fCliente" type="text" placeholder="🔍 Buscar cliente…"
            value="${filter.cliente || ''}" class="filter-input">
          <select id="fTipo" class="filter-select">
            <option value="">Todos los tipos</option>
            ${this.TIPOS_EVENTO.map(t => `<option value="${t}" ${filter.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
          </select>
          <input id="fDesde" type="date" value="${filter.desde || ''}" class="filter-input" title="Fecha evento desde">
          <input id="fHasta" type="date" value="${filter.hasta || ''}" class="filter-input" title="Fecha evento hasta">
          <button class="btn-secondary" id="btnClearFilter" style="white-space:nowrap">✕ Limpiar</button>
        </div>

        <div class="prod-list">
          <div class="prod-list-header" style="grid-template-columns:60px 1fr 1fr 1fr 80px 100px 100px 80px">
            <span>#</span><span>Cliente</span><span>Fecha evento</span>
            <span>Tipo</span><span>Pers.</span><span>Bocados/px</span>
            <span>Total</span><span>C/px</span>
          </div>
          ${items.length === 0
            ? '<p class="empty-msg" style="padding:20px">No hay presupuestos que coincidan con los filtros.</p>'
            : items.map(p => {
                const totalBocados = (p.items || []).reduce((s, it) => s + (it.cantidad || 0), 0);
                const bocadosPx = p.personas > 0 ? (totalBocados / p.personas).toFixed(1) : '—';
                return `
                  <div class="prod-row" data-id="${p.id}"
                    style="grid-template-columns:60px 1fr 1fr 1fr 80px 100px 100px 80px">
                    <span><strong>#${String(p.numero || '').padStart(3,'0')}</strong></span>
                    <span class="prod-nombre">${this._esc(p.cliente?.nombre || '—')}</span>
                    <span>${this._formatDate(p.fechaEvento || p.fecha)}</span>
                    <span>${this._esc(p.tipoEvento || '—')}</span>
                    <span>${p.personas || '—'}</span>
                    <span>${bocadosPx}</span>
                    <span style="font-weight:700">$${Math.round(p.totalGeneral || 0).toLocaleString('es-AR')}</span>
                    <span>$${Math.round(p.costoPorPersona || 0).toLocaleString('es-AR')}</span>
                  </div>`;
              }).join('')}
        </div>
      </div>`;

    document.getElementById('btnAddPres').addEventListener('click', () => this._openModal());

    // Filtros
    const applyFilter = () => {
      this._renderList({
        cliente: document.getElementById('fCliente').value.trim(),
        tipo:    document.getElementById('fTipo').value,
        desde:   document.getElementById('fDesde').value,
        hasta:   document.getElementById('fHasta').value
      });
    };
    document.getElementById('fCliente').addEventListener('input',  applyFilter);
    document.getElementById('fTipo').addEventListener('change',    applyFilter);
    document.getElementById('fDesde').addEventListener('change',   applyFilter);
    document.getElementById('fHasta').addEventListener('change',   applyFilter);
    document.getElementById('btnClearFilter').addEventListener('click', () => this._renderList());

    // Click en fila → detalle
    document.querySelectorAll('#mainContent .prod-row').forEach(row => {
      row.addEventListener('click', () => {
        const p = this.presupuestos.find(x => x.id === row.dataset.id);
        if (p) this._openDetail(p);
      });
    });
  },

  // ── Detalle de presupuesto ───────────────────────

  _openDetail(p) {
    const totalBocados = (p.items || []).reduce((s, it) => s + (it.cantidad || 0), 0);
    const bocadosPx = p.personas > 0 ? (totalBocados / p.personas).toFixed(1) : '—';

    const sortedItems = [...(p.items || [])].sort((a, b) => {
      const oa = this.CURSO_ORDER.indexOf(a.curso || 'Otro');
      const ob = this.CURSO_ORDER.indexOf(b.curso || 'Otro');
      return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
    });

    App.openModal(`Presupuesto #${String(p.numero || '').padStart(3,'0')}`, `
      <div class="detail-section">
        <div class="detail-section-title">Datos del evento</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
          <div class="detail-row"><span class="dlabel">Cliente</span><span class="dvalue">${this._esc(p.cliente?.nombre || '—')}</span></div>
          <div class="detail-row"><span class="dlabel">Teléfono</span><span class="dvalue">${this._esc(p.cliente?.telefono || '—')}</span></div>
          <div class="detail-row"><span class="dlabel">Tipo</span><span class="dvalue">${this._esc(p.tipoEvento || '—')}</span></div>
          <div class="detail-row"><span class="dlabel">Fecha evento</span><span class="dvalue">${this._formatDate(p.fechaEvento)}</span></div>
          <div class="detail-row"><span class="dlabel">Personas</span><span class="dvalue">${p.personas || '—'}</span></div>
          <div class="detail-row"><span class="dlabel">Bocados/px</span><span class="dvalue"><strong>${bocadosPx}</strong></span></div>
        </div>
      </div>

      <div class="detail-section">
        <div class="detail-section-title">Ítems del presupuesto</div>
        <div class="table-wrapper">
          <table class="admin-table" style="font-size:.83rem">
            <thead><tr><th>Curso</th><th>Ítem</th><th>Cant.</th><th>P. unit.</th><th>Subtotal</th></tr></thead>
            <tbody>
              ${sortedItems.map(it => `
                <tr>
                  <td><span class="unit-tag">${it.curso || '—'}</span></td>
                  <td>${this._esc(it.nombre || '—')}</td>
                  <td>${it.cantidad}</td>
                  <td>$${Math.round(it.precioUnitario || 0).toLocaleString('es-AR')}</td>
                  <td style="font-weight:600">$${Math.round(it.subtotal || 0).toLocaleString('es-AR')}</td>
                </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>

      <div class="payment-summary">
        <div class="payment-totals">
          <div class="pay-total-item">
            <span class="pti-label">Total</span>
            <span class="pti-val">$${Math.round(p.totalGeneral || 0).toLocaleString('es-AR')}</span>
          </div>
          <div class="pay-total-item">
            <span class="pti-label">Costo/persona</span>
            <span class="pti-val">$${Math.round(p.costoPorPersona || 0).toLocaleString('es-AR')}</span>
          </div>
          <div class="pay-total-item">
            <span class="pti-label">Total bocados</span>
            <span class="pti-val">${totalBocados} (${bocadosPx}/px)</span>
          </div>
        </div>
      </div>

      ${p.notas ? `<div class="detail-section"><div class="detail-section-title">Notas</div>
        <p style="font-size:.85rem;color:var(--text-muted)">${this._esc(p.notas)}</p></div>` : ''}

      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:10px;border-top:1px solid var(--border);flex-wrap:wrap">
        <button class="btn-secondary" id="btnPrintDetail">🖨️ PDF</button>
        <button class="btn-secondary" id="btnEditDetail">✏️ Editar</button>
        <button class="btn-danger"   id="btnDeleteDetail">🗑️ Eliminar</button>
        <button class="btn-secondary" onclick="App.closeModal()">Cerrar</button>
      </div>`, 'xl');

    document.getElementById('btnPrintDetail').addEventListener('click', () => this._printPDF(p));
    document.getElementById('btnEditDetail').addEventListener('click', () => {
      App.closeModal();
      this._openModal(p);
    });
    document.getElementById('btnDeleteDetail').addEventListener('click', async () => {
      App.closeModal();
      await this._delete(p.id);
    });
  },

  // ── Modal: Crear / Editar presupuesto ────────────

  _openModal(item = null) {
    const isEdit = !!item;
    const nextNum = this.presupuestos.length > 0
      ? Math.max(...this.presupuestos.map(p => p.numero || 0)) + 1 : 1;
    const today = new Date().toISOString().slice(0, 10);

    App.openModal(isEdit ? `Editar presupuesto #${String(item.numero || '').padStart(3,'0')}` : 'Nuevo presupuesto', `
      <form id="fPres" class="admin-form">
        <div class="form-row">
          <div class="field-group">
            <label>N° presupuesto</label>
            <input id="prNumero" type="number" value="${item?.numero ?? nextNum}" min="1" step="1">
          </div>
          <div class="field-group">
            <label>Fecha del presupuesto</label>
            <input id="prFecha" type="date" value="${item?.fecha || today}">
          </div>
        </div>

        <div class="form-section-title">Cliente</div>
        <div class="form-row">
          <div class="field-group">
            <label>Nombre *</label>
            <input id="prClienteNombre" type="text" value="${this._esc(item?.cliente?.nombre || '')}"
              placeholder="Nombre del cliente" required>
          </div>
          <div class="field-group">
            <label>Teléfono</label>
            <input id="prClienteTel" type="tel" value="${this._esc(item?.cliente?.telefono || '')}"
              placeholder="Ej: 11 5555-0000">
          </div>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Tipo de evento</label>
            <select id="prTipoEvento">
              ${this.TIPOS_EVENTO.map(t =>
                `<option value="${t}" ${item?.tipoEvento === t ? 'selected' : ''}>${t}</option>`
              ).join('')}
            </select>
          </div>
          <div class="field-group">
            <label>Fecha del evento</label>
            <input id="prFechaEvento" type="date" value="${item?.fechaEvento || ''}">
          </div>
        </div>
        <div class="field-group">
          <label>Personas *</label>
          <input id="prPersonas" type="number" min="1" step="1"
            value="${item?.personas || ''}" placeholder="0" required>
        </div>

        <div class="form-section-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>Ítems del presupuesto</span>
          <button type="button" class="btn-primary" id="btnAddItem">+ Agregar ítem</button>
        </div>

        <div class="items-table">
          <div class="item-row item-header">
            <span>Tipo</span><span>Ítem</span><span>Curso</span>
            <span>Cant.</span><span>P. unitario</span><span>Subtotal</span><span></span>
          </div>
          <div id="itemsContainer"></div>
        </div>

        <div class="presupuesto-total-box" id="totalBox">
          <div class="total-line total-sub">
            <span class="total-label">Bocados/persona</span>
            <span class="total-val" id="displayBocados">—</span>
          </div>
          <div class="total-line">
            <span class="total-label">Total general</span>
            <span class="total-val" id="displayTotal">$0</span>
          </div>
          <div class="total-line total-sub">
            <span class="total-label">Costo por persona</span>
            <span class="total-val" id="displayCpp">$0</span>
          </div>
        </div>

        <div class="field-group" style="margin-top:12px">
          <label>Notas</label>
          <textarea id="prNotas" rows="2" placeholder="Observaciones, condiciones, validez…">${this._esc(item?.notas || '')}</textarea>
        </div>

        <div class="form-actions">
          <button type="button" class="btn-secondary" id="btnCancelPres">Cancelar</button>
          <button type="submit" class="btn-primary" id="btnSavePres">${isEdit ? 'Guardar cambios' : 'Crear presupuesto'}</button>
        </div>
      </form>`, 'xl');

    // Poblar ítems existentes
    const container = document.getElementById('itemsContainer');
    if (item?.items?.length) {
      item.items.forEach(it => this._addItemRow(container, it));
    } else {
      this._addItemRow(container);
    }
    this._calcTotal();

    document.getElementById('btnAddItem').addEventListener('click', () => {
      this._addItemRow(container);
    });
    document.getElementById('prPersonas').addEventListener('input', () => this._calcTotal());
    document.getElementById('btnCancelPres').addEventListener('click', () => App.closeModal());

    document.getElementById('fPres').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSavePres');
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        const items = this._collectItems();
        const personas = parseInt(document.getElementById('prPersonas').value) || 0;
        const totalGeneral = items.reduce((a, it) => a + it.subtotal, 0);
        const costoPorPersona = personas > 0 ? Math.round(totalGeneral / personas) : 0;
        const totalBocados = items.reduce((a, it) => a + it.cantidad, 0);
        const data = {
          numero:          parseInt(document.getElementById('prNumero').value) || nextNum,
          fecha:           document.getElementById('prFecha').value,
          fechaEvento:     document.getElementById('prFechaEvento').value || null,
          tipoEvento:      document.getElementById('prTipoEvento').value,
          personas,
          totalBocados,
          items,
          totalGeneral,
          costoPorPersona,
          notas:           document.getElementById('prNotas').value.trim(),
          cliente: {
            nombre:   document.getElementById('prClienteNombre').value.trim(),
            telefono: document.getElementById('prClienteTel').value.trim()
          },
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!data.cliente.nombre) {
          App.toast('Ingresá el nombre del cliente', 'warning');
          btn.disabled = false; btn.textContent = isEdit ? 'Guardar cambios' : 'Crear presupuesto';
          return;
        }
        if (isEdit) {
          await db.collection('admin_presupuestos').doc(item.id).update(data);
        } else {
          data.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
          await db.collection('admin_presupuestos').add(data);
        }
        App.closeModal();
        App.toast(isEdit ? 'Presupuesto actualizado' : 'Presupuesto creado', 'success');
        await this._load();
        this._renderList();
      } catch (err) {
        console.error(err);
        App.toast('Error al guardar', 'error');
        btn.disabled = false; btn.textContent = isEdit ? 'Guardar cambios' : 'Crear presupuesto';
      }
    });
  },

  // ── Agregar fila de ítem ─────────────────────────

  _addItemRow(container, existing = null) {
    const row = document.createElement('div');
    row.className = 'item-row';

    const tipoVal = existing?.tipo || 'producto';
    const opts = tipoVal === 'menu'
      ? this.menus.map(m => `<option value="${m.id}" data-precio="${m.precioVenta || m.precio || 0}" ${existing?.id === m.id ? 'selected' : ''}>${this._esc(m.nombre)}</option>`).join('')
      : this.productos.map(p => `<option value="${p.id}" data-precio="${p.precio || 0}" ${existing?.id === p.id ? 'selected' : ''}>${this._esc(p.nombre)}</option>`).join('');

    const cursoVal = existing?.curso || 'Principal';

    row.innerHTML = `
      <select class="ir-tipo">
        <option value="producto" ${tipoVal === 'producto' ? 'selected' : ''}>Producto</option>
        <option value="menu"     ${tipoVal === 'menu'     ? 'selected' : ''}>Menú</option>
      </select>
      <select class="ir-item">${opts}</select>
      <select class="ir-curso">
        ${this.CURSOS.map(c => `<option value="${c}" ${cursoVal === c ? 'selected' : ''}>${c}</option>`).join('')}
      </select>
      <input class="ir-cant" type="number" min="1" step="1" value="${existing?.cantidad || 1}">
      <input class="ir-precio" type="text" value="${existing?.precioUnitario || 0}" readonly
        style="background:var(--bg);color:var(--text-muted);cursor:default" title="El precio se toma del producto">
      <input class="ir-sub" type="text" readonly value="${existing?.subtotal || 0}"
        style="background:var(--bg);color:var(--text-muted);font-weight:600">
      <button type="button" class="ir-del" title="Eliminar">✕</button>`;

    // Cambiar tipo → repoblar select de ítems
    row.querySelector('.ir-tipo').addEventListener('change', (e) => {
      const sel = row.querySelector('.ir-item');
      const t   = e.target.value;
      const src = t === 'menu' ? this.menus : this.productos;
      sel.innerHTML = src.map(x =>
        `<option value="${x.id}" data-precio="${x.precioVenta || x.precio || 0}">${this._esc(x.nombre)}</option>`
      ).join('');
      const first = sel.options[0];
      row.querySelector('.ir-precio').value = first?.dataset.precio || 0;
      this._recalcRow(row);
    });

    // Cambiar ítem → auto-fill precio
    row.querySelector('.ir-item').addEventListener('change', (e) => {
      const opt = e.target.options[e.target.selectedIndex];
      row.querySelector('.ir-precio').value = opt?.dataset.precio || 0;
      this._recalcRow(row);
    });

    row.querySelector('.ir-cant').addEventListener('input', () => this._recalcRow(row));
    row.querySelector('.ir-del').addEventListener('click',  () => { row.remove(); this._calcTotal(); });

    container.appendChild(row);
    this._recalcRow(row);
  },

  _recalcRow(row) {
    const cant   = parseFloat(row.querySelector('.ir-cant').value)   || 0;
    const precio = parseFloat(row.querySelector('.ir-precio').value) || 0;
    row.querySelector('.ir-sub').value = `$${Math.round(cant * precio).toLocaleString('es-AR')}`;
    this._calcTotal();
  },

  _calcTotal() {
    const rows     = document.querySelectorAll('#itemsContainer .item-row');
    let total   = 0;
    let bocados = 0;
    rows.forEach(r => {
      const cant   = parseFloat(r.querySelector('.ir-cant')?.value)   || 0;
      const precio = parseFloat(r.querySelector('.ir-precio')?.value) || 0;
      total   += cant * precio;
      bocados += cant;
    });
    const personas = parseInt(document.getElementById('prPersonas')?.value) || 0;
    const cpp      = personas > 0 ? Math.round(total / personas) : 0;
    const bocPx    = personas > 0 ? (bocados / personas).toFixed(1) : '—';
    const dTotal   = document.getElementById('displayTotal');
    const dCpp     = document.getElementById('displayCpp');
    const dBoc     = document.getElementById('displayBocados');
    if (dTotal) dTotal.textContent = `$${Math.round(total).toLocaleString('es-AR')}`;
    if (dCpp)   dCpp.textContent   = `$${cpp.toLocaleString('es-AR')}`;
    if (dBoc)   dBoc.textContent   = bocPx;
  },

  _collectItems() {
    return Array.from(document.querySelectorAll('#itemsContainer .item-row')).map(row => {
      const tipoSel  = row.querySelector('.ir-tipo');
      const itemSel  = row.querySelector('.ir-item');
      const cursoSel = row.querySelector('.ir-curso');
      const cant     = parseFloat(row.querySelector('.ir-cant').value)   || 0;
      const precio   = parseFloat(row.querySelector('.ir-precio').value) || 0;
      const opt      = itemSel?.options[itemSel?.selectedIndex];
      return {
        tipo:           tipoSel?.value || 'producto',
        id:             itemSel?.value || '',
        nombre:         opt ? opt.textContent.trim() : '',
        curso:          cursoSel?.value || 'Principal',
        cantidad:       cant,
        precioUnitario: Math.round(precio),
        subtotal:       Math.round(cant * precio)
      };
    }).filter(it => it.id);
  },

  // ── Imprimir PDF ─────────────────────────────────

  _printPDF(p) {
    // Ordenar ítems: entrada → principal → postre → bebida → otro
    const sortedItems = [...(p.items || [])].sort((a, b) => {
      const oa = this.CURSO_ORDER.indexOf(a.curso || 'Otro');
      const ob = this.CURSO_ORDER.indexOf(b.curso || 'Otro');
      return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
    });

    // Agrupar por curso para el PDF
    const grupos = {};
    sortedItems.forEach(it => {
      const c = it.curso || 'Otro';
      if (!grupos[c]) grupos[c] = [];
      grupos[c].push(it);
    });

    const renderGrupo = (titulo, items) => items.length === 0 ? '' : `
      <tr><td colspan="4" style="background:#f4ede8;font-weight:700;font-size:.75rem;
        text-transform:uppercase;letter-spacing:.06em;color:#8B2E3A;padding:6px 10px">${titulo}</td></tr>
      ${items.map(it => `
        <tr>
          <td>${this._esc(it.nombre || '—')}</td>
          <td style="text-align:center">${it.cantidad}</td>
          <td style="text-align:right">$${Math.round(it.precioUnitario || 0).toLocaleString('es-AR')}</td>
          <td style="text-align:right">$${Math.round(it.subtotal || 0).toLocaleString('es-AR')}</td>
        </tr>`).join('')}`;

    const totalBocados = (p.items || []).reduce((s, it) => s + (it.cantidad || 0), 0);
    const bocadosPx = p.personas > 0 ? (totalBocados / p.personas).toFixed(1) : '—';

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Presupuesto #${String(p.numero || '').padStart(3,'0')}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;700&family=Montserrat:wght@400;600&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Montserrat',sans-serif; font-size:13px; color:#2C2C2C; padding:40px 50px; }
    .pdf-header { text-align:center; margin-bottom:32px; border-bottom:2px solid #8B2E3A; padding-bottom:16px; }
    .pdf-brand { font-family:'Cormorant Garamond',serif; font-size:2rem; color:#8B2E3A; letter-spacing:.04em; }
    .pdf-subtitle { color:#888; font-size:.8rem; margin-top:4px; }
    .pdf-title { font-size:1.1rem; font-weight:700; margin-top:12px; text-transform:uppercase; letter-spacing:.08em; }
    .pdf-meta { display:grid; grid-template-columns:1fr 1fr; gap:8px; margin:20px 0; }
    .pdf-meta-item { font-size:.82rem; }
    .pdf-meta-label { color:#888; font-size:.72rem; text-transform:uppercase; letter-spacing:.06em; }
    table { width:100%; border-collapse:collapse; margin:20px 0; }
    thead th { background:#8B2E3A; color:#fff; padding:8px 10px; text-align:left; font-size:.78rem; text-transform:uppercase; letter-spacing:.04em; }
    tbody td { padding:7px 10px; border-bottom:1px solid #eee; }
    tbody tr:nth-child(even) td { background:#f9f5f3; }
    .pdf-totals { margin-top:20px; text-align:right; }
    .pdf-total-row { font-size:.9rem; margin:4px 0; }
    .pdf-total-main { font-size:1.1rem; font-weight:700; color:#8B2E3A; margin-top:8px; }
    .pdf-notas { margin-top:24px; padding:12px; background:#f9f5f3; border-left:3px solid #8B2E3A; font-size:.82rem; }
    .pdf-footer { margin-top:40px; text-align:center; color:#aaa; font-size:.72rem; border-top:1px solid #eee; padding-top:12px; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="pdf-header">
    <div class="pdf-brand">Cocó Catering</div>
    <div class="pdf-subtitle">Catering & Eventos</div>
    <div class="pdf-title">Presupuesto #${String(p.numero || '').padStart(3,'0')}</div>
  </div>
  <div class="pdf-meta">
    <div class="pdf-meta-item">
      <div class="pdf-meta-label">Cliente</div>
      <div>${this._esc(p.cliente?.nombre || '—')}</div>
    </div>
    <div class="pdf-meta-item">
      <div class="pdf-meta-label">Teléfono</div>
      <div>${this._esc(p.cliente?.telefono || '—')}</div>
    </div>
    <div class="pdf-meta-item">
      <div class="pdf-meta-label">Tipo de evento</div>
      <div>${this._esc(p.tipoEvento || '—')}</div>
    </div>
    <div class="pdf-meta-item">
      <div class="pdf-meta-label">Fecha del evento</div>
      <div>${this._formatDate(p.fechaEvento || p.fecha)}</div>
    </div>
    <div class="pdf-meta-item">
      <div class="pdf-meta-label">Personas</div>
      <div>${p.personas || '—'}</div>
    </div>
    <div class="pdf-meta-item">
      <div class="pdf-meta-label">Bocados por persona</div>
      <div>${bocadosPx}</div>
    </div>
  </div>
  <table>
    <thead><tr><th>Ítem</th><th style="text-align:center">Cant.</th><th style="text-align:right">P. unitario</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>
      ${this.CURSO_ORDER.map(c => renderGrupo(c, grupos[c] || [])).join('')}
    </tbody>
  </table>
  <div class="pdf-totals">
    <div class="pdf-total-row">Bocados por persona: <strong>${bocadosPx}</strong></div>
    <div class="pdf-total-row">Costo por persona: <strong>$${Math.round(p.costoPorPersona || 0).toLocaleString('es-AR')}</strong></div>
    <div class="pdf-total-main">Total: $${Math.round(p.totalGeneral || 0).toLocaleString('es-AR')}</div>
  </div>
  ${p.notas ? `<div class="pdf-notas"><strong>Notas:</strong> ${this._esc(p.notas)}</div>` : ''}
  <div class="pdf-footer">Cocó Catering · cococatering.com.ar · Este presupuesto tiene validez de 15 días</div>
</body>
</html>`;

    const win = window.open('', '_blank', 'width=800,height=900');
    win.document.write(html);
    win.document.close();
    setTimeout(() => { win.focus(); win.print(); }, 600);
  },

  async _delete(id) {
    const p = this.presupuestos.find(x => x.id === id);
    if (!confirm(`¿Eliminar presupuesto #${String(p?.numero || '').padStart(3, '0')}?`)) return;
    try {
      await db.collection('admin_presupuestos').doc(id).delete();
      App.toast('Presupuesto eliminado', 'success');
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
