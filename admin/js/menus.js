// ================================================
// menus.js — CRUD de Menús
// Los menús se componen de productos del admin (no subproductos)
// ================================================

const Menus = {
  menus:         [],
  productos:     [],
  ingredientes:  [],
  materiales:    [],
  subproductos:  [],
  _filter:       { q: '', sort: 'nombre-asc' },
  _norm: s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),

  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="section-wrapper">
        <div class="tab-header">
          <h3>MENÚS <span class="count-badge" id="menuCount">—</span></h3>
          <button class="btn-primary" id="btnAddMenu">Nuevo menú</button>
        </div>
        <div class="filter-bar">
          <input id="qMenu" type="text" placeholder="Buscar" class="filter-input" value="">
          <select id="sortMenu" class="filter-select">
            <option value="nombre-asc"    selected>Nombre A→Z</option>
            <option value="nombre-desc">Nombre Z→A</option>
            <option value="venta-desc">Venta ↓</option>
            <option value="venta-asc">Venta ↑</option>
            <option value="costo-desc">Costo ↓</option>
            <option value="costo-asc">Costo ↑</option>
            <option value="ganancia-desc">Ganancia ↓</option>
            <option value="ganancia-asc">Ganancia ↑</option>
            <option value="margen-desc">Margen % ↓</option>
            <option value="margen-asc">Margen % ↑</option>
          </select>
        </div>
        <div id="menusList" class="menus-list">
          <div class="loading-spinner"><div class="spinner-ring"></div></div>
        </div>
      </div>`;

    document.getElementById('btnAddMenu').addEventListener('click', () => this._openModal());
    document.getElementById('qMenu').addEventListener('input', e => { this._filter.q = e.target.value; this._fillMenusList(); });
    document.getElementById('sortMenu').addEventListener('change', e => { this._filter.sort = e.target.value; this._fillMenusList(); });
    await this._load();
    this._renderList();
  },

  async _load() {
    try {
      const [mSnap, pSnap, iSnap, matSnap, sSnap] = await Promise.all([
        db.collection('admin_menus').get().catch(() => ({ docs: [] })),
        db.collection('admin_productos').get().catch(() => ({ docs: [] })),
        db.collection('admin_ingredientes').get().catch(() => ({ docs: [] })),
        db.collection('admin_materiales').get().catch(() => ({ docs: [] })),
        db.collection('admin_subproductos').get().catch(() => ({ docs: [] }))
      ]);
      const byNombre = (a, b) => (a.nombre || '').localeCompare(b.nombre || '');
      this.menus        = mSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      this.ingredientes = iSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.materiales   = matSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.subproductos = sSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Enrich productos with computed precioCoste if not stored
      this.productos = pSnap.docs.map(d => {
        const p = { id: d.id, ...d.data() };
        if (!p.precioCoste) p.precioCoste = Math.round(this._calcProductCost(p));
        return p;
      }).sort(byNombre);
    } catch (e) {
      console.error(e);
      this.menus = []; this.productos = []; this.ingredientes = []; this.materiales = []; this.subproductos = [];
    }
  },

  // Calcula el costo de un producto a partir de sus relaciones
  _calcProductCost(producto) {
    let total = 0;
    (producto.ingredientes || []).forEach(rel => {
      const ing = this.ingredientes.find(i => i.id === rel.id);
      if (ing) total += (ing.costoUnitario || 0) * (rel.cantidad || 0);
    });
    (producto.materiales || []).forEach(rel => {
      const mat = this.materiales.find(m => m.id === rel.id);
      if (mat) total += (mat.costoUnitario || 0) * (rel.cantidad || 0);
    });
    (producto.subproductos || []).forEach(rel => {
      const sp = this.subproductos.find(s => s.id === rel.id);
      if (!sp) return;
      let spCost = 0;
      (sp.ingredientes || []).forEach(srel => {
        const ing = this.ingredientes.find(i => i.id === srel.id);
        if (ing) spCost += (ing.costoUnitario || 0) * (srel.cantidad || 0);
      });
      (sp.materiales || []).forEach(srel => {
        const mat = this.materiales.find(m => m.id === srel.id);
        if (mat) spCost += (mat.costoUnitario || 0) * (srel.cantidad || 0);
      });
      const rend = sp.rendimientoCantidad || 1;
      total += (spCost / rend) * (rel.cantidad || 0);
    });
    return total;
  },

  _calcSubcostPerUnit(sp) {
    let spCost = 0;
    (sp.ingredientes || []).forEach(rel => {
      const ing = this.ingredientes.find(i => i.id === rel.id);
      if (ing) spCost += (ing.costoUnitario || 0) * (rel.cantidad || 0);
    });
    (sp.materiales || []).forEach(rel => {
      const mat = this.materiales.find(m => m.id === rel.id);
      if (mat) spCost += (mat.costoUnitario || 0) * (rel.cantidad || 0);
    });
    return spCost / (sp.rendimientoCantidad || 1);
  },

  _calcMenuCost(menu) {
    let total = 0;
    (menu.productos || []).forEach(mp => {
      if (mp.costoAjustado) { total += mp.costoAjustado; return; }
      const prod = this.productos.find(p => p.id === mp.id);
      if (!prod?.precioCoste) return;
      const configPx = mp.configPx || prod.personas || 1;
      const px = mp.personas || mp.cantidad || configPx;
      total += prod.precioCoste * (px / configPx);
    });
    (menu.subproductos || []).forEach(ms => {
      if (ms.costoAjustado) { total += ms.costoAjustado; return; }
      const sp = this.subproductos.find(s => s.id === ms.id);
      if (sp) total += this._calcSubcostPerUnit(sp) * (ms.cantidad || 0);
    });
    (menu.materiales || []).forEach(mm => {
      if (mm.costoAjustado) { total += mm.costoAjustado; return; }
      const mat = this.materiales.find(m => m.id === mm.id);
      if (mat) total += (mat.costoUnitario || 0) * (mm.cantidad || 0);
    });
    return total;
  },

  _renderList() {
    document.getElementById('menuCount').textContent = this.menus.length;
    const lim = typeof App !== 'undefined' && App.isLimitado;
    const COLS = lim ? '2fr 120px' : '1fr 160px 160px 160px 160px 160px';
    document.getElementById('menusList').innerHTML = `
      <div class="prod-list">
        <div class="prod-list-header" style="grid-template-columns:${COLS}">
          <span>Nombre</span>
          ${lim ? '' : '<span>Precio costo</span><span>Precio venta</span><span>Ganancia $</span><span>Ganancia %</span>'}
          <span>Productos</span>
        </div>
        <div id="menusListBody"></div>
      </div>`;
    this._fillMenusList();
  },

  _fillMenusList() {
    const { q, sort } = this._filter;
    const lim = typeof App !== 'undefined' && App.isLimitado;
    const COLS = lim ? '2fr 120px' : '1fr 160px 160px 160px 160px 160px';
    let items = this.menus.slice().map(m => {
      const costo   = this._calcMenuCost(m);
      const venta   = m.precioVenta || m.precio || 0;
      const ganancia = (venta > 0 && costo > 0) ? Math.round(venta - costo) : null;
      const margen   = (venta > 0 && costo > 0) ? Math.round(((venta - costo) / costo) * 100) : null;
      return { ...m, _costo: costo, _venta: venta, _ganancia: ganancia, _margen: margen };
    });
    if (q.trim()) { const qn = this._norm(q); items = items.filter(m => this._norm(m.nombre).includes(qn)); }
    const [field, dir] = sort.split('-');
    const asc = dir === 'asc';
    const INF = asc ? Infinity : -Infinity;
    items.sort((a, b) => {
      if (field === 'nombre')   return asc ? this._norm(a.nombre).localeCompare(this._norm(b.nombre)) : this._norm(b.nombre).localeCompare(this._norm(a.nombre));
      if (field === 'venta')    return asc ? a._venta - b._venta : b._venta - a._venta;
      if (field === 'costo')    return asc ? a._costo - b._costo : b._costo - a._costo;
      if (field === 'ganancia') return asc ? (a._ganancia??INF)-(b._ganancia??INF) : (b._ganancia??-INF)-(a._ganancia??-INF);
      if (field === 'margen')   return asc ? (a._margen??INF)-(b._margen??INF) : (b._margen??-INF)-(a._margen??-INF);
      return 0;
    });
    const body = document.getElementById('menusListBody');
    if (!body) return;
    document.getElementById('menuCount').textContent = items.length;
    if (items.length === 0) {
      body.innerHTML = `<p class="empty-msg">${q.trim() ? 'Sin resultados.' : 'No hay menús creados aún. Creá el primero combinando tus productos.'}</p>`;
      return;
    }
    body.innerHTML = items.map(m => {
      const nProds = (m.productos || []).reduce((s, p) => s + (p.cantidad || 1), 0);
      const cls = m._margen !== null ? (m._margen>=40?'pos':m._margen>=0?'mid':'neg') : '';
      const gananciaTag = m._ganancia !== null
        ? `<span class=" ${cls}" style="color:black; font-weight:600;">$${m._ganancia.toLocaleString('es-AR')}</span>`
        : '—';
      const margenTag = m._margen !== null
        ? `<span class="marg-tag ${cls}">${m._margen}%</span>`
        : '—';
      const finCells = lim ? '' : `<span class="prod-costo" style="color:black; font-weight:600;">${m._costo > 0 ? '$' + Math.round(m._costo).toLocaleString('es-AR') : '—'}</span>
          <span class="prod-precio" style="color:black; font-weight:600;">${m._venta > 0 ? '$' + Math.round(m._venta).toLocaleString('es-AR') : '—'}</span>
          <span>${gananciaTag}</span>
          <span>${margenTag}</span>`;
      return `
        <div class="prod-row" data-id="${m.id}" style="grid-template-columns:${COLS}">
          <span class="prod-nombre">${this._esc(m.nombre)}</span>
          ${finCells}
          <span class="prod-comp"><span class="comp-tag"> ${nProds} unid.</span></span>
        </div>`;
    }).join('');
    body.querySelectorAll('.prod-row').forEach(row => {
      row.addEventListener('click', () => {
        const menu = this.menus.find(m => m.id === row.dataset.id);
        if (menu) this._detailMenu(menu);
      });
    });
  },

  _detailMenu(menu) {
    const costo  = this._calcMenuCost(menu);
    const venta  = menu.precioVenta || menu.precio || 0;
    const ganancia = venta > 0 && costo > 0 ? venta - costo : null;
    const margen = venta > 0 && costo > 0 ? Math.round(((venta - costo) / costo) * 100) : null;
    const margenCls = margen === null ? '' : margen >= 40 ? 'pos' : margen >= 0 ? 'mid' : 'neg';
    const margenColor = margen === null ? 'var(--text-muted)'
      : margen >= 40 ? 'var(--success)' : margen >= 0 ? 'var(--warning)' : 'var(--error)';

    const prodRows = (menu.productos || []).map(mp => {
      const prod = this.productos.find(p => p.id === mp.id);
      const nombre = mp.nombre || prod?.nombre || '—';
      const px = mp.personas || mp.cantidad || mp.configPx || 1;
      const costoFila = mp.costoAjustado || (() => {
        if (!prod?.precioCoste) return 0;
        const configPx = mp.configPx || prod.personas || 1;
        return prod.precioCoste * (px / configPx);
      })();
      const precioFila = mp.precio || prod?.precioVenta || prod?.precio || 0;
      return `
        <tr>
          <td style="padding:5px 6px">${this._esc(nombre)}</td>
          <td style="padding:5px 6px;text-align:center;color:var(--text-muted)">${px} px</td>
          <td class="col-precio" style="padding:5px 6px;text-align:right;white-space:nowrap">${precioFila > 0 ? '$' + Math.round(precioFila).toLocaleString('es-AR') : '—'}</td>
          <td class="col-costo" style="padding:5px 6px;text-align:right;font-weight:600;white-space:nowrap">${costoFila > 0 ? '$' + Math.round(costoFila).toLocaleString('es-AR') : '—'}</td>
        </tr>`;
    }).join('');

    const subRows = (menu.subproductos || []).map(ms => {
      const sp = this.subproductos.find(s => s.id === ms.id);
      const nombre = ms.nombre || sp?.nombre || '—';
      const qty = ms.cantidad || 0;
      const costoFila = ms.costoAjustado || (sp ? Math.round(this._calcSubcostPerUnit(sp) * qty) : 0);
      return `
        <tr>
          <td style="padding:5px 6px">${this._esc(nombre)}</td>
          <td style="padding:5px 6px;text-align:center;color:var(--text-muted)">${qty} u</td>
          <td class="col-costo" style="padding:5px 6px;text-align:right;font-weight:600;white-space:nowrap">${costoFila > 0 ? '$' + Math.round(costoFila).toLocaleString('es-AR') : '—'}</td>
        </tr>`;
    }).join('');

    const matRows = (menu.materiales || []).map(mm => {
      const mat = this.materiales.find(m => m.id === mm.id);
      const nombre = mm.nombre || mat?.nombre || '—';
      const qty = mm.cantidad || 0;
      const costoFila = mm.costoAjustado || Math.round((mat?.costoUnitario || 0) * qty);
      return `
        <tr>
          <td style="padding:5px 6px">${this._esc(nombre)}</td>
          <td style="padding:5px 6px;text-align:center;color:var(--text-muted)">${qty} u</td>
          <td class="col-costo" style="padding:5px 6px;text-align:right;font-weight:600;white-space:nowrap">${costoFila > 0 ? '$' + Math.round(costoFila).toLocaleString('es-AR') : '—'}</td>
        </tr>`;
    }).join('');

    App.openModal(this._esc(menu.nombre), `
      <div class="prod-detail-header">
        <div class="prod-detail-meta">
          ${menu.descripcion ? `<p style="margin-top:0;font-size:.84rem;color:var(--text-muted)">${this._esc(menu.descripcion)}</p>` : ''}
        </div>
      </div>

      <div class="detail-kpi-row">
        <div class="detail-kpi detail-kpi-block kpi-costo">
          <span class="detail-kpi-label">Costo estimado</span>
          <span class="detail-kpi-val">${costo > 0 ? '$' + Math.round(costo).toLocaleString('es-AR') : '—'}</span>
        </div>
        <div class="detail-kpi detail-kpi-block kpi-precio">
          <span class="detail-kpi-label">Precio venta</span>
          <span class="detail-kpi-val">${venta > 0 ? '$' + Math.round(venta).toLocaleString('es-AR') : '—'}</span>
        </div>
        <div class="detail-kpi detail-kpi-block kpi-ganancia ${margenCls}">
          <span class="detail-kpi-label">Ganancia</span>
          <span class="detail-kpi-val" style="color:${margenColor}">
            ${ganancia !== null ? '$' + Math.round(ganancia).toLocaleString('es-AR') : '—'}
          </span>
        </div>
        <div class="detail-kpi detail-kpi-block kpi-margen ${margenCls}">
          <span class="detail-kpi-label">% Ganancia</span>
          <span class="detail-kpi-val" style="color:${margenColor}">${margen !== null ? margen + '%' : '—'}</span>
        </div>
      </div>

      ${prodRows ? `
      <div class="detail-section" style="margin-top:10px">
        <div class="detail-section-title">Productos incluidos</div>
        <table style="width:100%;border-collapse:collapse;font-size:.82rem;margin-top:2 px">
          <thead>
            <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);font-size:.75rem">
              <th style="padding:4px 6px;text-align:left;font-weight:600">Producto</th>
              <th style="padding:4px 6px;text-align:center;font-weight:600">Personas</th>
              <th class="col-precio" style="padding:4px 6px;text-align:right;font-weight:600">Precio venta</th>
              <th class="col-costo" style="padding:4px 6px;text-align:right;font-weight:600">Costo</th>
            </tr>
          </thead>
          <tbody>${prodRows}</tbody>
        </table>
      </div>` : ''}

      ${subRows ? `
      <div class="detail-section" style="margin-top:6px">
        <div class="detail-section-title">Subproductos incluidos</div>
        <table style="width:100%;border-collapse:collapse;font-size:.82rem;margin-top:8px">
          <thead>
            <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);font-size:.75rem">
              <th style="padding:4px 6px;text-align:left;font-weight:600">Subproducto</th>
              <th style="padding:4px 6px;text-align:center;font-weight:600">Cantidad</th>
              <th class="col-costo" style="padding:4px 6px;text-align:right;font-weight:600">Costo</th>
            </tr>
          </thead>
          <tbody>${subRows}</tbody>
        </table>
      </div>` : ''}

      ${matRows ? `
      <div class="detail-section" style="margin-top:6px">
        <div class="detail-section-title">Materiales incluidos</div>
        <table style="width:100%;border-collapse:collapse;font-size:.82rem;margin-top:8px">
          <thead>
            <tr style="border-bottom:1px solid var(--border);color:var(--text-muted);font-size:.75rem">
              <th style="padding:4px 6px;text-align:left;font-weight:600">Material</th>
              <th style="padding:4px 6px;text-align:center;font-weight:600">Cantidad</th>
              <th class="col-costo" style="padding:4px 6px;text-align:right;font-weight:600">Costo</th>
            </tr>
          </thead>
          <tbody>${matRows}</tbody>
        </table>
      </div>` : ''}

      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid var(--border);margin-top:10px">
        <button class="btn-secondary" onclick="App.closeModal()">Cerrar</button>
        <button class="btn-primary" id="btnEditFromMenuDetail">Modificar</button>
      </div>`, 'menu');

    document.getElementById('btnEditFromMenuDetail').addEventListener('click', () => {
      App.closeModal();
      this._openModal(menu);
    });
  },

  async _delete(id) {
    const menu = this.menus.find(m => m.id === id);
    if (!confirm(`¿Eliminar el menú "${menu?.nombre || ''}"?`)) return;
    try {
      await db.collection('admin_menus').doc(id).delete();
      App.toast('Menú eliminado', 'success');
      await this._load();
      this._renderList();
    } catch (e) {
      App.toast('Error al eliminar el menú', 'error');
    }
  },

  _openModal(item = null) {
    const isEdit       = !!item;
    const selProds     = item?.productos    || [];
    const selSubs      = item?.subproductos || [];
    const selMats      = item?.materiales   || [];
    const selIngs      = item?.ingredientes || [];
    const productos    = this.productos;
    const subproductos = this.subproductos;
    const materiales   = this.materiales;
    const ingredientes = this.ingredientes;

    App.openModal(isEdit ? `Editar menú: ${item.nombre}` : 'Nuevo menú', `
      <form id="fMenu" class="admin-form">
        <div class="field-group">
          <label>Vincular a menú/box web</label>
          <select id="mWebVinculo" class="form-input" style="width:100%">
            <option value="">Cargando…</option>
          </select>
          <small id="mWebVinculoInfo" style="color:var(--text-muted);display:block;margin-top:3px"></small>
        </div>
        <div class="field-group">
          <label>Nombre del menú *</label>
          <input id="mNombre" type="text" value="${this._esc(item?.nombre || '')}"
            placeholder="" required>
        </div>
        <div class="field-group">
          <label>Venta ($)</label>
          <input id="mPrecioVenta" type="text" inputmode="decimal"
            value="${item?.precioVenta || item?.precio || ''}" placeholder="0">
        </div>
        <div class="field-group">
          <label>Descripción</label>
          <textarea id="mDesc" rows="2"
            placeholder="Descripción">${this._esc(item?.descripcion || '')}</textarea>
        </div>
        <div class="field-group">
          <label>Productos incluidos</label>
          <div class="rel-add-wrap">
            <input class="rel-add-input" id="menuAddProd" type="text" placeholder="Buscar" autocomplete="off">
            <div class="rel-add-dropdown" id="menuAddProd_drop"></div>
          </div>
          <div id="mProdList" class="relations-list">
            ${selProds.map((p, i) => this._prodRow(i, p, productos)).join('')}
          </div>
        </div>
        <div class="field-group">
          <label>Subproductos incluidos</label>
          <div class="rel-add-wrap">
            <input class="rel-add-input" id="menuAddSub" type="text" placeholder="Buscar" autocomplete="off">
            <div class="rel-add-dropdown" id="menuAddSub_drop"></div>
          </div>
          <div id="mSubList" class="relations-list">
            ${selSubs.map((s, i) => this._subRow(i, s, subproductos)).join('')}
          </div>
        </div>
        <div class="field-group">
          <label>Ingredientes incluidos</label>
          <div class="rel-add-wrap">
            <input class="rel-add-input" id="menuAddIng" type="text" placeholder="Buscar" autocomplete="off">
            <div class="rel-add-dropdown" id="menuAddIng_drop"></div>
          </div>
          <div id="mIngList" class="relations-list">
            ${selIngs.map((r, i) => this._ingRow(i, r, ingredientes)).join('')}
          </div>
        </div>
        <div class="field-group">
          <label>Materiales incluidos</label>
          <div class="rel-add-wrap">
            <input class="rel-add-input" id="menuAddMat" type="text" placeholder="Buscar" autocomplete="off">
            <div class="rel-add-dropdown" id="menuAddMat_drop"></div>
          </div>
          <div id="mMatList" class="relations-list">
            ${selMats.map((m, i) => this._matRow(i, m, materiales)).join('')}
          </div>
        </div>
        <div id="mCostSummary"></div>
        <div class="form-actions" style="flex-wrap:wrap;gap:8px">
          ${isEdit ? `<button type="button" class="btn-danger" id="btnDeleteMenu" style="margin-right:auto">🗑️ Eliminar</button>` : ''}
          <button type="button" class="btn-secondary" id="btnCancelMenu">Cancelar</button>
          <button type="submit" class="btn-primary" id="btnSaveMenu">${isEdit ? 'Guardar cambios' : 'Crear menú'}</button>
        </div>
      </form>`, 'menu');

    // Cargar selector web y auto-fill nombre
    this._loadWebMenuSelect(item?.webVinculo);
    document.getElementById('mWebVinculo').addEventListener('change', (e) => {
      const opt = e.target.options[e.target.selectedIndex];
      const mNombre = document.getElementById('mNombre');
      if (mNombre && !mNombre.value && opt.dataset.nombre) {
        mNombre.value = (opt.dataset.nombre || '')
          .replace(/\s*[\-\(]\s*x?\d+\s*(px|u|und)?\s*\)?\s*$/i, '').trim();
      }
      const info = document.getElementById('mWebVinculoInfo');
      if (info) info.textContent = e.target.value ? 'Al guardar se actualizará el precio en el menú de la web.' : '';
    });

    // Cálculo de margen en tiempo real
    const calcMargen = () => {
      let costTotal = 0;
      const prodLines = [];
      document.querySelectorAll('#mProdList .relation-row').forEach(row => {
        const sel   = row.querySelector('.rel-select');
        const selId = sel.value;
        const px    = parseFloat(row.querySelector('.rel-qty').value) || 0;
        const prod  = productos.find(p => p.id === selId);
        if (!prod?.precioCoste || !selId) return;
        const configPx = prod.personas || 1;
        const cFila = prod.precioCoste * (px / configPx);
        costTotal += cFila;
        prodLines.push({ label: prod.nombre, cantidad: px + ' px', subtotal: cFila });
      });
      document.querySelectorAll('#mSubList .relation-row').forEach(row => {
        const sel = row.querySelector('.rel-select');
        const qty = parseFloat(row.querySelector('.rel-qty').value) || 0;
        if (!sel.value || !qty) return;
        const sp = subproductos.find(s => s.id === sel.value);
        if (!sp) return;
        const cFila = this._calcSubcostPerUnit(sp) * qty;
        costTotal += cFila;
        prodLines.push({ label: sp.nombre, cantidad: qty + ' u', subtotal: cFila });
      });
      document.querySelectorAll('#mIngList .relation-row').forEach(row => {
        const sel = row.querySelector('.rel-select');
        const qty = parseFloat(row.querySelector('.rel-qty').value) || 0;
        if (!sel.value || !qty) return;
        const ing = ingredientes.find(i => i.id === sel.value);
        if (!ing) return;
        const cFila = (ing.costoUnitario || 0) * qty;
        costTotal += cFila;
        prodLines.push({ label: ing.nombre, cantidad: qty + ' ' + (ing.unidad || 'u'), subtotal: cFila });
      });
      document.querySelectorAll('#mMatList .relation-row').forEach(row => {
        const sel = row.querySelector('.rel-select');
        const qty = parseFloat(row.querySelector('.rel-qty').value) || 0;
        if (!sel.value || !qty) return;
        const mat = materiales.find(m => m.id === sel.value);
        if (!mat) return;
        const cFila = (mat.costoUnitario || 0) * qty;
        costTotal += cFila;
        prodLines.push({ label: mat.nombre, cantidad: qty + ' ' + (mat.unidad || 'u'), subtotal: cFila });
      });
      // Suma de precios de venta de los productos seleccionados
      let ventaProductosSuma = 0;
      document.querySelectorAll('#mProdList .relation-row').forEach(row => {
        const sel   = row.querySelector('.rel-select');
        const selId = sel.value;
        const px    = parseFloat(row.querySelector('.rel-qty').value) || 0;
        const prod  = productos.find(p => p.id === selId);
        if (!prod || !selId || !px) return;
        const configPx = prod.personas || 1;
        ventaProductosSuma += (prod.precioVenta || prod.precio || 0) * (px / configPx);
      });

      const ventaStr = String(document.getElementById('mPrecioVenta').value).replace(/\./g,'').replace(',','.');
      const venta    = parseFloat(ventaStr) || 0;
      const ganancia = venta - costTotal;
      const margen   = costTotal > 0 ? Math.round((ganancia / costTotal) * 100) : null;
      const fmt      = v => v > 0 ? '$' + Math.round(v).toLocaleString('es-AR') : '—';
      const margenCls   = margen === null ? '' : margen >= 40 ? 'pos' : margen >= 0 ? 'mid' : 'neg';
      const margenColor = margen === null ? 'var(--text-muted)' : margen >= 40 ? 'var(--success)' : margen >= 0 ? 'var(--warning)' : 'var(--error)';

      document.getElementById('mCostSummary').innerHTML = `
        <div class="detail-kpi-row">
          <div class="detail-kpi detail-kpi-block kpi-costo">
            <span class="detail-kpi-label">Costo estimado</span>
            <span class="detail-kpi-val">${costTotal > 0 ? fmt(costTotal) : '—'}</span>
          </div>
          <div class="detail-kpi detail-kpi-block kpi-precio">
            <span class="detail-kpi-label">Precio venta</span>
            <span class="detail-kpi-val">${fmt(venta)}</span>
          </div>
          <div class="detail-kpi detail-kpi-block kpi-ganancia ${margenCls}">
            <span class="detail-kpi-label">Ganancia</span>
            <span class="detail-kpi-val" style="color:${margenColor}">${venta > 0 && costTotal > 0 ? fmt(ganancia) : '—'}</span>
          </div>
          <div class="detail-kpi detail-kpi-block kpi-margen ${margenCls}">
            <span class="detail-kpi-label">% Ganancia</span>
            <span class="detail-kpi-val" style="color:${margenColor}">${margen !== null ? margen + '%' : '—'}</span>
          </div>
        </div>
        ${ventaProductosSuma > 0 ? `
        <p style="margin:6px 0 0;font-size:.8rem;color:var(--text-muted);text-align:right">
          Suma precio de venta de los productos seleccionados:
          <strong style="color:var(--negro)">${fmt(ventaProductosSuma)}</strong>
        </p>` : ''}`;
    };

    // Recalcular al cambiar precio de venta o cantidades
    document.getElementById('mPrecioVenta').addEventListener('input', calcMargen);
    document.getElementById('mProdList').addEventListener('change', calcMargen);
    document.getElementById('mProdList').addEventListener('input', calcMargen);
    document.getElementById('mSubList').addEventListener('change', calcMargen);
    document.getElementById('mSubList').addEventListener('input', calcMargen);
    document.getElementById('mIngList').addEventListener('change', calcMargen);
    document.getElementById('mIngList').addEventListener('input', calcMargen);
    document.getElementById('mMatList').addEventListener('change', calcMargen);
    document.getElementById('mMatList').addEventListener('input', calcMargen);
    calcMargen(); // inicial

    document.getElementById('btnCancelMenu').addEventListener('click', () => App.closeModal());
    if (item) document.getElementById('btnDeleteMenu')?.addEventListener('click', async () => {
      App.closeModalForce();
      await this._delete(item.id);
    });

    this._bindMenuAddInput('menuAddProd', 'menuAddProd_drop', productos, calcMargen, 'mProdList', (i, ex) => this._prodRow(i, ex, productos));
    this._bindMenuAddInput('menuAddSub',  'menuAddSub_drop',  subproductos, calcMargen, 'mSubList',  (i, ex) => this._subRow(i, ex, subproductos));
    this._bindMenuAddInput('menuAddIng',  'menuAddIng_drop',  ingredientes, calcMargen, 'mIngList',  (i, ex) => this._ingRow(i, ex, ingredientes));
    this._bindMenuAddInput('menuAddMat',  'menuAddMat_drop',  materiales,   calcMargen, 'mMatList',  (i, ex) => this._matRow(i, ex, materiales));
    this._bindRemove(calcMargen, 'mProdList');
    this._bindRemove(calcMargen, 'mSubList');
    this._bindRemove(calcMargen, 'mIngList');
    this._bindRemove(calcMargen, 'mMatList');
    this._bindProdRowSelectChange();

    document.getElementById('fMenu').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSaveMenu');
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        const prodsData = [];
        document.querySelectorAll('#mProdList .relation-row').forEach(row => {
          const sel      = row.querySelector('.rel-select');
          const cursoSel = row.querySelector('.rel-curso');
          const px       = Math.round(parseFloat(row.querySelector('.rel-qty').value) || 0);
          if (sel.value && px > 0) {
            const pData    = productos.find(p => p.id === sel.value);
            const configPx = pData?.personas || 1;
            const costoAjustado = pData?.precioCoste ? Math.round(pData.precioCoste * (px / configPx)) : 0;
            prodsData.push({
              id:          sel.value,
              nombre:      pData?.nombre || sel.options[sel.selectedIndex].textContent.trim(),
              precio:      pData?.precioVenta || pData?.precio || 0,
              personas:    px,
              configPx:    configPx,
              costoAjustado,
              curso:       cursoSel?.value || 'Principal'
            });
          }
        });

        const subsData = [];
        document.querySelectorAll('#mSubList .relation-row').forEach(row => {
          const sel = row.querySelector('.rel-select');
          const qty = parseFloat(row.querySelector('.rel-qty').value) || 0;
          if (sel.value && qty > 0) {
            const spData = subproductos.find(s => s.id === sel.value);
            const costU  = spData ? this._calcSubcostPerUnit(spData) : 0;
            subsData.push({ id: sel.value, nombre: spData?.nombre || '', cantidad: qty, costoAjustado: Math.round(costU * qty) });
          }
        });

        const ingsData = [];
        document.querySelectorAll('#mIngList .relation-row').forEach(row => {
          const sel = row.querySelector('.rel-select');
          const qty = parseFloat(row.querySelector('.rel-qty').value) || 0;
          if (sel.value && qty > 0) {
            const ingData = ingredientes.find(i => i.id === sel.value);
            ingsData.push({ id: sel.value, nombre: ingData?.nombre || '', cantidad: qty, costoAjustado: Math.round((ingData?.costoUnitario || 0) * qty) });
          }
        });

        const matsData = [];
        document.querySelectorAll('#mMatList .relation-row').forEach(row => {
          const sel = row.querySelector('.rel-select');
          const qty = parseFloat(row.querySelector('.rel-qty').value) || 0;
          if (sel.value && qty > 0) {
            const matData = materiales.find(m => m.id === sel.value);
            matsData.push({ id: sel.value, nombre: matData?.nombre || '', cantidad: qty, costoAjustado: Math.round((matData?.costoUnitario || 0) * qty) });
          }
        });

        const ventaStr = String(document.getElementById('mPrecioVenta').value).replace(/\./g,'').replace(',','.');
        const precioVenta = Math.round(parseFloat(ventaStr) || 0);

        let precioCoste = 0;
        prodsData.forEach(mp => { precioCoste += mp.costoAjustado || 0; });
        subsData.forEach(ms  => { precioCoste += ms.costoAjustado || 0; });
        ingsData.forEach(mi  => { precioCoste += mi.costoAjustado || 0; });
        matsData.forEach(mm  => { precioCoste += mm.costoAjustado || 0; });

        const mWebVinculoSel = document.getElementById('mWebVinculo');
        const webVinculoVal  = mWebVinculoSel?.value || '';

        const data = {
          nombre:        document.getElementById('mNombre').value.trim(),
          precioVenta,
          precio:        precioVenta,
          precioCoste:   Math.round(precioCoste),
          descripcion:   document.getElementById('mDesc').value.trim(),
          productos:     prodsData,
          subproductos:  subsData,
          ingredientes:  ingsData,
          materiales:    matsData,
          webVinculo:    webVinculoVal
            ? { collection: webVinculoVal.split('/')[0], docId: webVinculoVal.split('/')[1] }
            : null,
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!data.nombre) {
          App.toast('El nombre es obligatorio', 'warning');
          btn.disabled = false; btn.textContent = isEdit ? 'Guardar cambios' : 'Crear menú';
          return;
        }
        if (!isEdit) data.creadoEn = firebase.firestore.FieldValue.serverTimestamp();

        if (isEdit) {
          await db.collection('admin_menus').doc(item.id).update(data);
        } else {
          await db.collection('admin_menus').add(data);
        }

        // Propagar precio al menú/box web
        if (webVinculoVal && precioVenta > 0) {
          try {
            const [wColl, wDocId] = webVinculoVal.split('/');
            await db.collection(wColl).doc(wDocId).update({ precio: precioVenta });
          } catch (wErr) {
            console.error('Error al actualizar precio en web:', wErr);
            App.toast('Precio guardado en admin, pero hubo un error al actualizar la web', 'warning');
          }
        }

        App.closeModalForce();
        App.toast(isEdit ? 'Menú actualizado' : 'Menú creado', 'success');
        await this._load();
        this._renderList();
      } catch (err) {
        console.error(err);
        App.toast('Error al guardar el menú', 'error');
        btn.disabled = false; btn.textContent = isEdit ? 'Guardar cambios' : 'Crear menú';
      }
    });
  },

  _bindMenuAddInput(inputId, dropId, items, onAdd, listId = 'mProdList', rowFn = null) {
    const input = document.getElementById(inputId);
    const drop  = document.getElementById(dropId);
    if (!input || !drop) return;
    if (!rowFn) rowFn = (i, ex) => this._prodRow(i, ex, items);

    const render = (q) => {
      const _norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const filtered = q
        ? items.filter(p => _norm(p.nombre).includes(_norm(q)))
        : items;
      if (!filtered.length) { drop.innerHTML = ''; drop.classList.remove('open'); return; }
      drop.innerHTML = filtered.map(p =>
        `<div class="rel-drop-item" data-id="${p.id}">${this._esc(p.nombre)}</div>`
      ).join('');
      drop.classList.add('open');
      drop.querySelectorAll('.rel-drop-item').forEach(el => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const list = document.getElementById(listId);
          const already = [...list.querySelectorAll('.rel-select')].some(s => s.value === el.dataset.id);
          if (!already) {
            list.insertAdjacentHTML('beforeend', rowFn(list.children.length, { id: el.dataset.id }));
            this._bindRemove(onAdd, listId);
            if (listId === 'mProdList') this._bindProdRowSelectChange();
            if (onAdd) onAdd();
          }
          input.value = '';
          drop.innerHTML = '';
          drop.classList.remove('open');
          input.blur();
        });
      });
    };

    input.addEventListener('input', () => render(input.value));
    input.addEventListener('focus', () => render(input.value));
    input.addEventListener('blur',  () => setTimeout(() => { drop.innerHTML = ''; drop.classList.remove('open'); }, 150));
  },

  _prodRow(idx, existing, items) {
    const prod      = items.find(p => p.id === existing?.id);
    const configPx  = prod?.personas || null;
    const existingPx = existing?.personas ?? configPx ?? 1;
    const cursoVal  = existing?.curso || 'Principal';
    const CURSOS    = ['Entrada', 'Principal', 'Postre', 'Bebida', 'Otro'];
    const precio    = prod?.precioVenta || prod?.precio || 0;
    const pxLabel   = precio && configPx ? '$' + Math.round(precio / configPx).toLocaleString('es-AR') + '/px' : '';
    return `
      <div class="relation-row" style="display:grid;grid-template-columns:1fr auto 70px auto auto;gap:8px;align-items:center">
        <select class="rel-select" data-config-px="${configPx || ''}">
          <option value="">Seleccionar producto...</option>
          ${items.map(p => {
            const vta = p.precioVenta || p.precio || 0;
            return `<option value="${p.id}" ${p.id === existing?.id ? 'selected' : ''} data-costo="${p.precioCoste || 0}" data-px="${p.personas || ''}" data-precio="${vta}">${this._esc(p.nombre)}</option>`;
          }).join('')}
        </select>
        <select class="rel-curso" title="Curso" style="font-size:.82rem">
          ${CURSOS.map(c => `<option value="${c}" ${cursoVal === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
        <input class="rel-qty" type="number" placeholder="Px" min="0.5" step="0.5" value="${existingPx}">
        <span class="rel-px-hint" style="font-size:.8rem;color:var(--bordo);font-weight:600;white-space:nowrap;min-width:60px;text-align:right">${pxLabel}</span>
        <button type="button" class="btn-remove-relation" title="Quitar">&#x2715;</button>
      </div>`;
  },

  _subRow(idx, existing, items) {
    const existingQty  = existing?.cantidad ?? 1;
    const existingSub  = items.find(s => s.id === existing?.id);
    const existingUnit = existingSub?.rendimientoUnidad || '';
    const costU        = existingSub ? this._calcSubcostPerUnit(existingSub) : 0;
    const costLabel    = costU > 0 ? '$' + Math.round(costU).toLocaleString('es-AR') + '/' + (existingUnit || 'u') : '';
    return `
      <div class="relation-row" style="display:grid;grid-template-columns:2fr 80px auto auto;gap:8px;align-items:center">
        <select class="rel-select"
          onchange="(function(s){var opt=s.options[s.selectedIndex];var r=s.closest('.relation-row');r.querySelector('.rel-cost-hint').textContent=opt.dataset.cost||'';r.querySelector('.rel-unit-label').textContent=opt.dataset.unit||'';})( this)">
          <option value="">Seleccionar subproducto...</option>
          ${items.map(s => {
            const cU   = this._calcSubcostPerUnit(s);
            const unit = s.rendimientoUnidad || '';
            const lbl  = cU > 0 ? '$' + Math.round(cU).toLocaleString('es-AR') + '/' + (unit||'u') : '';
            return `<option value="${s.id}" data-unit="${unit}" data-cost="${lbl}" ${s.id === existing?.id ? 'selected' : ''}>${this._esc(s.nombre)}</option>`;
          }).join('')}
        </select>
        <input class="rel-qty" type="number" placeholder="Cant." min="0.01" step="0.01" value="${existingQty}">
        <span class="rel-cost-hint" style="font-size:.8rem;color:var(--bordo);font-weight:600;white-space:nowrap;min-width:60px;text-align:right">${costLabel}</span>
        <button type="button" class="btn-remove-relation" title="Quitar">&#x2715;</button>
      </div>`;
  },

  _ingRow(idx, existing, items) {
    const existingQty  = existing?.cantidad ?? 1;
    const existingIng  = items.find(i => i.id === existing?.id);
    const existingUnit = existingIng?.unidad || '';
    const costo        = existingIng?.costoUnitario || 0;
    const costLabel    = costo > 0 ? '$' + Number(costo).toLocaleString('es-AR') + '/' + (existingUnit || 'u') : '';
    return `
      <div class="relation-row" style="display:grid;grid-template-columns:2fr 80px auto auto;gap:8px;align-items:center">
        <select class="rel-select"
          onchange="(function(s){var opt=s.options[s.selectedIndex];var r=s.closest('.relation-row');r.querySelector('.rel-cost-hint').textContent=opt.dataset.cost||'';})( this)">
          <option value="">Seleccionar ingrediente...</option>
          ${items.map(i => {
            const unit = i.unidad || '';
            const lbl  = i.costoUnitario ? '$' + Number(i.costoUnitario).toLocaleString('es-AR') + '/' + (unit||'u') : '';
            return `<option value="${i.id}" data-unit="${unit}" data-cost="${lbl}" ${i.id === existing?.id ? 'selected' : ''}>${this._esc(i.nombre)}</option>`;
          }).join('')}
        </select>
        <input class="rel-qty" type="number" placeholder="Cant." min="0.001" step="0.001" value="${existingQty}">
        <span class="rel-cost-hint" style="font-size:.8rem;color:var(--bordo);font-weight:600;white-space:nowrap;min-width:60px;text-align:right">${costLabel}</span>
        <button type="button" class="btn-remove-relation" title="Quitar">&#x2715;</button>
      </div>`;
  },

  _matRow(idx, existing, items) {
    const existingQty  = existing?.cantidad ?? 1;
    const existingMat  = items.find(m => m.id === existing?.id);
    const existingUnit = existingMat?.unidad || '';
    const costo        = existingMat?.costoUnitario || 0;
    const costLabel    = costo > 0 ? '$' + Number(costo).toLocaleString('es-AR') + '/' + (existingUnit || 'u') : '';
    return `
      <div class="relation-row" style="display:grid;grid-template-columns:2fr 80px auto auto;gap:8px;align-items:center">
        <select class="rel-select"
          onchange="(function(s){var opt=s.options[s.selectedIndex];var r=s.closest('.relation-row');r.querySelector('.rel-cost-hint').textContent=opt.dataset.cost||'';})( this)">
          <option value="">Seleccionar material...</option>
          ${items.map(m => {
            const unit = m.unidad || '';
            const lbl  = m.costoUnitario ? '$' + Number(m.costoUnitario).toLocaleString('es-AR') + '/' + (unit||'u') : '';
            return `<option value="${m.id}" data-unit="${unit}" data-cost="${lbl}" ${m.id === existing?.id ? 'selected' : ''}>${this._esc(m.nombre)}</option>`;
          }).join('')}
        </select>
        <input class="rel-qty" type="number" placeholder="Cant." min="0.01" step="0.01" value="${existingQty}">
        <span class="rel-cost-hint" style="font-size:.8rem;color:var(--bordo);font-weight:600;white-space:nowrap;min-width:60px;text-align:right">${costLabel}</span>
        <button type="button" class="btn-remove-relation" title="Quitar">&#x2715;</button>
      </div>`;
  },

  _bindProdRowSelectChange() {
    document.querySelectorAll('#mProdList .rel-select').forEach(sel => {
      sel.addEventListener('change', function() {
        const opt    = sel.options[sel.selectedIndex];
        const px     = opt?.dataset.px || '';
        const precio = parseFloat(opt?.dataset.precio) || 0;
        const row    = sel.closest('.relation-row');
        const pxLbl  = precio && px ? '$' + Math.round(precio / parseFloat(px)).toLocaleString('es-AR') + '/px' : '';
        row.querySelector('.rel-px-hint').textContent = pxLbl;
        sel.dataset.configPx = px;
        if (px) row.querySelector('.rel-qty').value = px;
      });
    });
  },

  _bindRemove(onRemove, listId = 'mProdList') {
    document.querySelectorAll(`#${listId} .btn-remove-relation`).forEach(btn => {
      btn.onclick = () => { btn.closest('.relation-row').remove(); if (onRemove) onRemove(); };
    });
  },

  _WEB_COLLS_MENU: {
    boxSalados:   'Box Salados',
    boxDulces:    'Box Dulces',
    combosDulces: 'Combos Dulces',
    },

  async _loadWebMenuSelect(currentVinculo) {
    const sel = document.getElementById('mWebVinculo');
    if (!sel) return;
    try {
      const entries = await Promise.all(
        Object.entries(this._WEB_COLLS_MENU).map(async ([coll, label]) => {
          const snap = await db.collection(coll).get();
          const docs = [];
          snap.forEach(d => docs.push({ docId: d.id, ...d.data() }));
          return { coll, label, docs };
        })
      );
      sel.innerHTML = '<option value="">— Sin vinculación —</option>';
      entries.forEach(({ coll, label, docs }) => {
        if (!docs.length) return;
        const grp = document.createElement('optgroup');
        grp.label = label;
        docs.forEach(d => {
          const opt = document.createElement('option');
          opt.value = `${coll}/${d.docId}`;
          opt.textContent = d.nombre || d.docId;
          opt.dataset.nombre = d.nombre || '';
          if (currentVinculo?.collection === coll && currentVinculo?.docId === d.docId) {
            opt.selected = true;
          }
          grp.appendChild(opt);
        });
        sel.appendChild(grp);
      });
      if (currentVinculo?.collection) {
        const info = document.getElementById('mWebVinculoInfo');
        if (info) info.textContent = 'Al guardar se actualizará el precio en el menú de la web.';
      }
    } catch (err) {
      console.error('Error cargando colecciones web menú:', err);
      sel.innerHTML = '<option value="">Error al cargar</option>';
    }
  },

  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
