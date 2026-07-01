// ================================================
// productos.js — CRUD de Productos, Subproductos,
//               Ingredientes, Materiales, Categorías
// ================================================

const Productos = {
  currentTab: 'ingredientes',

  // Cache local de las colecciones
  cache: {
    categorias:   [],
    ingredientes: [],
    materiales:   [],
    subproductos: [],
    productos:    []
  },

  TABS: [
    { key: 'ingredientes', label: 'Ingredientes'  },
    { key: 'materiales',   label: 'Materiales'    },
    { key: 'categorias',   label: 'Categorías'   },
    { key: 'subproductos', label: 'Subproductos'  },
    { key: 'productos',    label: 'Productos'     },
    { key: 'envio',        label: 'Envío'         }
  ],

  COLL: {
    categorias:   'admin_categorias',
    ingredientes: 'admin_ingredientes',
    materiales:   'admin_materiales',
    subproductos: 'admin_subproductos',
    productos:    'admin_productos'
  },

  UNIDADES_ING: ['g','ml','unidad'],
  UNIDADES_MAT: ['unidad','caja','paquete','rollo','metro','bolsa','kg','g'],

  _filters: {
    productos:    { q: '', sort: 'nombre-asc', cat: '' },
    subproductos: { q: '', sort: 'nombre-asc' },
    ingredientes: { q: '', sort: 'nombre-asc' },
    materiales:   { q: '', sort: 'nombre-asc' },
    categorias:   { q: '', sort: 'nombre-asc' },
  },

  _norm: s => String(s || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase(),

  // ── Render ──────────────────────────────────────

  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="section-wrapper">
        <div class="subtabs">
          ${this.TABS.map(t =>
            `<button class="subtab${t.key === this.currentTab ? ' active' : ''}" data-tab="${t.key}">${t.label}</button>`
          ).join('')}
        </div>
        <div id="subtabContent">
          <div class="loading-spinner"><div class="spinner-ring"></div></div>
        </div>
      </div>`;

    document.querySelectorAll('.subtab').forEach(btn => {
      btn.addEventListener('click', () => {
        this.currentTab = btn.dataset.tab;
        document.querySelectorAll('.subtab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this._renderTab();
      });
    });

    await this._loadAll();
    this._renderTab();
  },

  async _loadAll() {
    const load = async (coll) => {
      try {
        const snap = await db.collection(coll).orderBy('nombre').get();
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      } catch (e) { return []; }
    };
    const [cats, ings, mats, subs, prods] = await Promise.all([
      load(this.COLL.categorias),
      load(this.COLL.ingredientes),
      load(this.COLL.materiales),
      load(this.COLL.subproductos),
      load(this.COLL.productos)
    ]);
    this.cache.categorias   = cats;
    this.cache.ingredientes = ings;
    this.cache.materiales   = mats;
    this.cache.subproductos = subs;
    this.cache.productos    = prods;
  },

  _renderTab() {
    const c = document.getElementById('subtabContent');
    switch (this.currentTab) {
      case 'categorias':   this._renderCategorias(c);   break;
      case 'ingredientes': this._renderIngredientes(c); break;
      case 'materiales':   this._renderMateriales(c);   break;
      case 'subproductos': this._renderSubproductos(c); break;
      case 'productos':    this._renderProductos(c);    break;
      case 'envio':        this._renderEnvio(c);        break;
    }
  },

  // ── Categorías ──────────────────────────────────

  _renderCategorias(c) {
    const f = this._filters.categorias;
    c.innerHTML = `
      <div class="tab-content-inner">
        <div class="tab-header">
          <h3>CATEGORÍAS <span class="count-badge" id="catCount">${this.cache.categorias.length}</span></h3>
          <div style="display:flex;gap:8px;flex-wrap:wrap;">
            <button class="btn-primary" id="btnAddCat">Nueva categoría</button>
          </div>
        </div>
        <div class="filter-bar">
          <input id="qCat" type="text" placeholder="Buscar" class="filter-input" value="${this._esc(f.q)}">
          <select id="sortCat" class="filter-select">
            <option value="nombre-asc"  ${f.sort==='nombre-asc' ?'selected':''}>Nombre A→Z</option>
            <option value="nombre-desc" ${f.sort==='nombre-desc'?'selected':''}>Nombre Z→A</option>
          </select>
        </div>
        <div id="catList" class="items-grid"></div>
      </div>`;
    document.getElementById('btnAddCat').addEventListener('click', () => this._modalCategoria());
    document.getElementById('qCat').addEventListener('input', e => { this._filters.categorias.q = e.target.value; this._fillCategoriasList(); });
    document.getElementById('sortCat').addEventListener('change', e => { this._filters.categorias.sort = e.target.value; this._fillCategoriasList(); });
    this._fillCategoriasList();
  },

  _fillCategoriasList() {
    const { q, sort } = this._filters.categorias;
    let items = this.cache.categorias.slice();
    if (q.trim()) { const qn = this._norm(q); items = items.filter(i => this._norm(i.nombre).includes(qn)); }
    items.sort((a, b) => sort === 'nombre-desc'
      ? this._norm(b.nombre).localeCompare(this._norm(a.nombre))
      : this._norm(a.nombre).localeCompare(this._norm(b.nombre)));
    const el = document.getElementById('catList');
    if (!el) return;
    document.getElementById('catCount').textContent = items.length;
    el.innerHTML = items.length === 0
      ? '<p class="empty-msg">Sin resultados.</p>'
      : items.map(cat => `
          <div class="item-card" data-id="${cat.id}" data-type="categorias" style="cursor:pointer">
            <span class="item-name">${this._esc(cat.nombre)}</span>
            <div class="item-card-actions">
              <button class="btn-icon btn-delete" data-id="${cat.id}" data-type="categorias" title="Eliminar">🗑️</button>
            </div>
          </div>`).join('');
    this._bindActions(el);
    el.querySelectorAll('.item-card[data-type="categorias"]').forEach(card => {
      card.addEventListener('click', e => {
        if (e.target.closest('.btn-delete')) return;
        const item = this.cache.categorias.find(i => i.id === card.dataset.id);
        if (item) this._modalCategoria(item);
      });
    });
  },

  // ── Ingredientes ────────────────────────────────

  _renderIngredientes(c) {
    const f = this._filters.ingredientes;
    c.innerHTML = `
      <div class="tab-content-inner">
        <div class="tab-header">
          <h3>INGREDIENTES <span class="count-badge" id="ingCount">${this.cache.ingredientes.length}</span></h3>
          <button class="btn-primary" id="btnAddIng">Nuevo ingrediente</button>
        </div>
        <div class="filter-bar">
          <input id="qIng" type="text" placeholder="Buscar" class="filter-input" value="${this._esc(f.q)}">
          <select id="sortIng" class="filter-select">
            <option value="nombre-asc"  ${f.sort==='nombre-asc' ?'selected':''}>Nombre A→Z</option>
            <option value="nombre-desc" ${f.sort==='nombre-desc'?'selected':''}>Nombre Z→A</option>
            <option value="costo-asc"   ${f.sort==='costo-asc'  ?'selected':''}>Costo ↑</option>
            <option value="costo-desc"  ${f.sort==='costo-desc' ?'selected':''}>Costo ↓</option>
          </select>
        </div>
        <div class="table-wrapper">
          <table class="admin-table">
            <thead><tr><th>Nombre</th><th>Envase</th><th>Precio envase</th><th>Costo por unidad</th><th>Acciones</th></tr></thead>
            <tbody id="ingList"></tbody>
          </table>
        </div>
      </div>`;
    document.getElementById('btnAddIng').addEventListener('click', () => this._modalIngrediente());
    document.getElementById('qIng').addEventListener('input', e => { this._filters.ingredientes.q = e.target.value; this._fillIngredientesList(); });
    document.getElementById('sortIng').addEventListener('change', e => { this._filters.ingredientes.sort = e.target.value; this._fillIngredientesList(); });
    this._fillIngredientesList();
  },

  _fillIngredientesList() {
    const { q, sort } = this._filters.ingredientes;
    let items = this.cache.ingredientes.slice();
    if (q.trim()) { const qn = this._norm(q); items = items.filter(i => this._norm(i.nombre).includes(qn)); }
    const [field, dir] = sort.split('-');
    const asc = dir === 'asc';
    items.sort((a, b) => field === 'costo'
      ? asc ? (a.costoUnitario||0) - (b.costoUnitario||0) : (b.costoUnitario||0) - (a.costoUnitario||0)
      : asc ? this._norm(a.nombre).localeCompare(this._norm(b.nombre)) : this._norm(b.nombre).localeCompare(this._norm(a.nombre)));
    const tbody = document.getElementById('ingList');
    if (!tbody) return;
    document.getElementById('ingCount').textContent = items.length;
    tbody.innerHTML = items.length === 0
      ? '<tr><td colspan="4" class="empty-msg">Sin resultados.</td></tr>'
      : items.map(i => {
          const envase = i.cantidadEnvase ? `${i.cantidadEnvase} ${i.unidad}` : '—';
          const precio = i.precioEnvase   ? '$' + Number(i.precioEnvase).toLocaleString('es-AR') : '—';
          const base   = i.unidadBase || i.unidad || 'u';
          const cxu    = i.costoUnitario  ? '$' + Number(i.costoUnitario).toFixed(6).replace(/\.?0+$/, '') + '/' + base : '—';
          return `
          <tr data-id="${i.id}" style="cursor:pointer">
            <td>${this._esc(i.nombre)}</td>
            <td>${envase}</td>
            <td>${precio}</td>
            <td class="col-costo" style="font-size:.85rem;color:#666">${cxu}</td>
            <td class="actions-cell">
              <button class="btn-icon btn-delete" data-id="${i.id}" data-type="ingredientes">🗑️</button>
            </td>
          </tr>`;
        }).join('');
    this._bindActions(tbody);
    tbody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', e => {
        if (e.target.closest('.btn-delete,.btn-edit')) return;
        const item = this.cache.ingredientes.find(i => i.id === tr.dataset.id);
        if (item) this._modalIngrediente(item);
      });
    });
  },

  // ── Materiales ──────────────────────────────────

  _renderMateriales(c) {
    const f = this._filters.materiales;
    c.innerHTML = `
      <div class="tab-content-inner">
        <div class="tab-header">
          <h3>MATERIALES <span class="count-badge" id="matCount">${this.cache.materiales.length}</span></h3>
          <button class="btn-primary" id="btnAddMat">Nuevo material</button>
        </div>
        <div class="filter-bar">
          <input id="qMat" type="text" placeholder="Buscar" class="filter-input" value="${this._esc(f.q)}">
          <select id="sortMat" class="filter-select">
            <option value="nombre-asc"  ${f.sort==='nombre-asc' ?'selected':''}>Nombre A→Z</option>
            <option value="nombre-desc" ${f.sort==='nombre-desc'?'selected':''}>Nombre Z→A</option>
            <option value="costo-asc"   ${f.sort==='costo-asc'  ?'selected':''}>Costo ↑</option>
            <option value="costo-desc"  ${f.sort==='costo-desc' ?'selected':''}>Costo ↓</option>
          </select>
        </div>
        <div class="table-wrapper">
          <table class="admin-table">
            <thead><tr><th>Nombre</th><th>Unidad</th><th class="col-costo">Costo unitario</th><th>Acciones</th></tr></thead>
            <tbody id="matList"></tbody>
          </table>
        </div>
      </div>`;
    document.getElementById('btnAddMat').addEventListener('click', () => this._modalMaterial());
    document.getElementById('qMat').addEventListener('input', e => { this._filters.materiales.q = e.target.value; this._fillMaterialesList(); });
    document.getElementById('sortMat').addEventListener('change', e => { this._filters.materiales.sort = e.target.value; this._fillMaterialesList(); });
    this._fillMaterialesList();
  },

  _fillMaterialesList() {
    const { q, sort } = this._filters.materiales;
    let items = this.cache.materiales.slice();
    if (q.trim()) { const qn = this._norm(q); items = items.filter(m => this._norm(m.nombre).includes(qn)); }
    const [field, dir] = sort.split('-');
    const asc = dir === 'asc';
    items.sort((a, b) => field === 'costo'
      ? asc ? (a.costoUnitario||0) - (b.costoUnitario||0) : (b.costoUnitario||0) - (a.costoUnitario||0)
      : asc ? this._norm(a.nombre).localeCompare(this._norm(b.nombre)) : this._norm(b.nombre).localeCompare(this._norm(a.nombre)));
    const tbody = document.getElementById('matList');
    if (!tbody) return;
    document.getElementById('matCount').textContent = items.length;
    tbody.innerHTML = items.length === 0
      ? '<tr><td colspan="4" class="empty-msg">Sin resultados.</td></tr>'
      : items.map(m => `
          <tr data-id="${m.id}" style="cursor:pointer">
            <td>${this._esc(m.nombre)}</td>
            <td><span class="unit-tag">${m.unidad || '—'}</span></td>
            <td class="col-costo">${m.costoUnitario ? '$' + Number(m.costoUnitario).toLocaleString('es-AR') : '—'}</td>
            <td class="actions-cell">
              <button class="btn-icon btn-delete" data-id="${m.id}" data-type="materiales">🗑️</button>
            </td>
          </tr>`).join('');
    this._bindActions(tbody);
    tbody.querySelectorAll('tr[data-id]').forEach(tr => {
      tr.addEventListener('click', e => {
        if (e.target.closest('.btn-delete,.btn-edit')) return;
        const item = this.cache.materiales.find(m => m.id === tr.dataset.id);
        if (item) this._modalMaterial(item);
      });
    });
  },

  // ── Subproductos ────────────────────────────────

  _renderSubproductos(c) {
    const f = this._filters.subproductos;
    const lim = typeof App !== 'undefined' && App.isLimitado;
    const COLS = lim ? '2fr 100px' : '2fr 100px 120px 120px';
    c.innerHTML = `
      <div class="tab-content-inner">
        <div class="tab-header">
          <h3>SUBPRODUCTOS <span class="count-badge" id="subCount">${this.cache.subproductos.length}</span></h3>
          <button class="btn-primary" id="btnAddSub">Nuevo subproducto</button>
        </div>
        <div class="filter-bar">
          <input id="qSub" type="text" placeholder="Buscar" class="filter-input" value="${this._esc(f.q)}">
          <select id="sortSub" class="filter-select">
            <option value="nombre-asc"      ${f.sort==='nombre-asc'     ?'selected':''}>Nombre A→Z</option>
            <option value="nombre-desc"     ${f.sort==='nombre-desc'    ?'selected':''}>Nombre Z→A</option>
            <option value="costoTotal-desc" ${f.sort==='costoTotal-desc'?'selected':''}>Costo total ↓</option>
            <option value="costoTotal-asc"  ${f.sort==='costoTotal-asc' ?'selected':''}>Costo total ↑</option>
            <option value="costoU-desc"     ${f.sort==='costoU-desc'    ?'selected':''}>Costo/u ↓</option>
            <option value="costoU-asc"      ${f.sort==='costoU-asc'     ?'selected':''}>Costo/u ↑</option>
          </select>
        </div>
        <div class="prod-list">
          <div class="prod-list-header" style="grid-template-columns:${COLS}">
            <span>Nombre</span><span>Rendimiento</span>${lim ? '' : '<span>Costo total</span><span>Costo/u</span>'}
          </div>
          <div id="subList"></div>
        </div>
      </div>`;
    document.getElementById('btnAddSub').addEventListener('click', () => this._modalSubproducto());
    document.getElementById('qSub').addEventListener('input', e => { this._filters.subproductos.q = e.target.value; this._fillSubproductosList(); });
    document.getElementById('sortSub').addEventListener('change', e => { this._filters.subproductos.sort = e.target.value; this._fillSubproductosList(); });
    this._fillSubproductosList();
  },

  _fillSubproductosList() {
    const { q, sort } = this._filters.subproductos;
    const lim = typeof App !== 'undefined' && App.isLimitado;
    const COLS = lim ? '2fr 100px' : '2fr 100px 120px 120px';
    let items = this.cache.subproductos.slice().map(s => {
      const costoTotal = this._calcSubCost(s);
      const costoU = s.rendimientoCantidad && costoTotal > 0 ? costoTotal / s.rendimientoCantidad : 0;
      return { ...s, _costoTotal: costoTotal, _costoU: costoU };
    });
    if (q.trim()) { const qn = this._norm(q); items = items.filter(s => this._norm(s.nombre).includes(qn)); }
    const [field, dir] = sort.split('-');
    const asc = dir === 'asc';
    items.sort((a, b) => {
      if (field === 'costoTotal') return asc ? a._costoTotal - b._costoTotal : b._costoTotal - a._costoTotal;
      if (field === 'costoU')     return asc ? a._costoU - b._costoU : b._costoU - a._costoU;
      return asc ? this._norm(a.nombre).localeCompare(this._norm(b.nombre)) : this._norm(b.nombre).localeCompare(this._norm(a.nombre));
    });
    const cont = document.getElementById('subList');
    if (!cont) return;
    document.getElementById('subCount').textContent = items.length;
    cont.innerHTML = items.length === 0
      ? '<p class="empty-msg">Sin resultados.</p>'
      : items.map(s => {
          const costoLabel = s._costoTotal > 0 ? '$' + Math.round(s._costoTotal).toLocaleString('es-AR') : '—';
          const costoPorULabel = s._costoU > 0 ? `$${s._costoU.toFixed(2)}<span class="px-sub">por ${s.rendimientoUnidad || 'u'}</span>` : '—';
          const finSub = lim ? '' : `<span class="prod-costo">${costoLabel}</span>
              <span class="prod-costo">${costoPorULabel}</span>`;
          return `
            <div class="prod-row" data-id="${s.id}" style="grid-template-columns:${COLS}">
              <span class="prod-nombre">${this._esc(s.nombre)}</span>
              <span style="color:var(--text-muted);font-size:.82rem">${s.rendimientoCantidad ? s.rendimientoCantidad + ' ' + (s.rendimientoUnidad || '') : '—'}</span>
              ${finSub}
            </div>`;
        }).join('');
    cont.querySelectorAll('.prod-row').forEach(row => {
      row.addEventListener('click', () => {
        const sub = this.cache.subproductos.find(s => s.id === row.dataset.id);
        if (!sub) return;
        this._detailSubproducto(sub);
      });
    });
  },

  // ── Productos ───────────────────────────────────

  _renderProductos(c) {
    const f = this._filters.productos;
    const COLS = '64px 2fr 1fr 1fr 1fr 1fr 1fr';
    c.innerHTML = `
      <div class="tab-content-inner">
        <div class="tab-header">
          <h3>PRODUCTOS <span class="count-badge" id="prodCount">${this.cache.productos.length}</span></h3>
          <button class="btn-primary" id="btnAddProd">Nuevo producto</button>
        </div>
        <div class="filter-bar">
          <input id="qProd" type="text" placeholder="Buscar" class="filter-input" value="${this._esc(f.q)}">
          <select id="sortProd" class="filter-select">
            <option value="nombre-asc"    ${f.sort==='nombre-asc'   ?'selected':''}>Nombre A→Z</option>
            <option value="nombre-desc"   ${f.sort==='nombre-desc'  ?'selected':''}>Nombre Z→A</option>
            <option value="venta-desc"    ${f.sort==='venta-desc'   ?'selected':''}>Venta/px ↓</option>
            <option value="venta-asc"     ${f.sort==='venta-asc'    ?'selected':''}>Venta/px ↑</option>
            <option value="costo-desc"    ${f.sort==='costo-desc'   ?'selected':''}>Costo/px ↓</option>
            <option value="costo-asc"     ${f.sort==='costo-asc'    ?'selected':''}>Costo/px ↑</option>
            <option value="ganancia-desc" ${f.sort==='ganancia-desc'?'selected':''}>Ganancia/px ↓</option>
            <option value="ganancia-asc"  ${f.sort==='ganancia-asc' ?'selected':''}>Ganancia/px ↑</option>
            <option value="margen-desc"   ${f.sort==='margen-desc'  ?'selected':''}>% Ganancia ↓</option>
            <option value="margen-asc"    ${f.sort==='margen-asc'   ?'selected':''}>% Ganancia ↑</option>
          </select>
        </div>
        <div class="cat-filter-bar" id="catFilterBar">
          <button class="cat-filter-btn${f.cat === '' ? ' active' : ''}" data-cat="">Todas</button>
          ${this.cache.categorias.map(cat =>
            `<button class="cat-filter-btn${f.cat === cat.id ? ' active' : ''}" data-cat="${cat.id}">${this._esc(cat.nombre)}</button>`
          ).join('')}
        </div>
        <div class="prod-list">
          <div class="prod-list-header" style="grid-template-columns:${COLS}">
            <span></span><span>Nombre</span><span style="text-align:center">PX</span>
            <span class="col-costo" style="text-align:center">Costo/px</span>
            <span class="col-precio" style="text-align:center">Venta/px</span>
            <span class="col-ganancia" style="text-align:center">Ganancia/px</span>
            <span style="text-align:center">% Gan.</span>
          </div>
          <div id="prodList"></div>
        </div>
      </div>`;
    document.getElementById('btnAddProd').addEventListener('click', () => this._modalProducto());
    document.getElementById('qProd').addEventListener('input', e => { this._filters.productos.q = e.target.value; this._fillProductosList(); });
    document.getElementById('sortProd').addEventListener('change', e => { this._filters.productos.sort = e.target.value; this._fillProductosList(); });
    document.getElementById('catFilterBar').addEventListener('click', e => {
      const btn = e.target.closest('.cat-filter-btn');
      if (!btn) return;
      this._filters.productos.cat = btn.dataset.cat;
      document.querySelectorAll('.cat-filter-btn').forEach(b => b.classList.toggle('active', b === btn));
      this._fillProductosList();
    });
    this._fillProductosList();
  },

  _fillProductosList() {
    const { q, sort, cat } = this._filters.productos;
    let items = this.cache.productos.slice().map(p => {
      const { total: costEst } = this._calcProductCost(p);
      const precio = p.precio || 0;
      const ganancia = precio > 0 && costEst > 0 ? precio - costEst : null;
      const margen = ganancia !== null ? Math.round((ganancia / costEst) * 100) : null;
      return { ...p, _costEst: costEst, _ganancia: ganancia, _margen: margen };
    });
    if (q.trim()) { const qn = this._norm(q); items = items.filter(p => this._norm(p.nombre).includes(qn)); }
    if (cat) {
      items = items.filter(p => {
        const ids = p.categoriasIds?.length ? p.categoriasIds : (p.categoriaId ? [p.categoriaId] : []);
        return ids.includes(cat);
      });
    }
    const [field, dir] = sort.split('-');
    const asc = dir === 'asc';
    const INF = asc ? Infinity : -Infinity;
    items.sort((a, b) => {
      if (field === 'nombre')   return asc ? this._norm(a.nombre).localeCompare(this._norm(b.nombre)) : this._norm(b.nombre).localeCompare(this._norm(a.nombre));
      if (field === 'venta')    return asc ? (a.precio||0)-(b.precio||0) : (b.precio||0)-(a.precio||0);
      if (field === 'costo')    return asc ? a._costEst-b._costEst : b._costEst-a._costEst;
      if (field === 'ganancia') return asc ? (a._ganancia??INF)-(b._ganancia??INF) : (b._ganancia??-INF)-(a._ganancia??-INF);
      if (field === 'margen')   return asc ? (a._margen??INF)-(b._margen??INF) : (b._margen??-INF)-(a._margen??-INF);
      return 0;
    });
    const cont = document.getElementById('prodList');
    if (!cont) return;
    document.getElementById('prodCount').textContent = items.length;
    const COLS = '64px 2fr 1fr 1fr 1fr 1fr 1fr';
    cont.innerHTML = items.length === 0
      ? '<p class="empty-msg">Sin resultados.</p>'
      : items.map(p => {
          const px = p.personas || null;
          const ventaPx  = px && p.precio   ? Math.round(p.precio / px)    : null;
          const costoPx  = px && p._costEst ? Math.round(p._costEst / px)  : null;
          const ganPx    = ventaPx !== null && costoPx !== null ? ventaPx - costoPx : null;
          const ventaLbl    = ventaPx  !== null ? '$' + ventaPx.toLocaleString('es-AR')  : (p.precio   ? '$' + Math.round(p.precio).toLocaleString('es-AR')   : '—');
          const costoLbl    = costoPx  !== null ? '$' + costoPx.toLocaleString('es-AR')  : (p._costEst ? '$' + Math.round(p._costEst).toLocaleString('es-AR') : '—');
          const ganLbl      = ganPx    !== null ? '$' + ganPx.toLocaleString('es-AR')    : '—';
          const margenClass = p._margen !== null ? (p._margen >= 40 ? 'pos' : p._margen >= 0 ? 'mid' : 'neg') : '';
          const margenLbl   = p._margen !== null ? `<span class="marg-tag ${margenClass}">${p._margen}%</span>` : '—';
          return `
            <div class="prod-row${p.fotoUrl ? ' has-foto' : ''}" data-id="${p.id}" style="grid-template-columns:${COLS}">
              ${p.fotoUrl
                ? `<img src="${this._esc(this._fotoSrc(p.fotoUrl))}" style="width:64px;height:64px;object-fit:cover;border-radius:4px;display:block" alt="">`
                : `<span style="width:100%;height:100%;border-radius:4px;display:block"></span>`}
              <span class="prod-nombre">${this._esc(p.nombre)}</span>
              <span class="prod-px-val">${px ?? '—'}</span>
              <span class="prod-costo prod-px-price">${costoLbl}</span>
              <span class="prod-precio prod-px-price">${ventaLbl}</span>
              <span class="prod-ganancia prod-px-price">${ganLbl}</span>
              <span style="text-align:center">${margenLbl}</span>
            </div>`;
        }).join('');
    cont.querySelectorAll('.prod-row').forEach(row => {
      row.addEventListener('click', () => {
        const prod = this.cache.productos.find(p => p.id === row.dataset.id);
        if (!prod) return;
        this._detailProducto(prod);
      });
    });
  },

  // ── Detalle producto: composición solo-lectura (rol limitado) ──

  _detailProducto(prod) {
    const catIds   = prod.categoriasIds?.length ? prod.categoriasIds : (prod.categoriaId ? [prod.categoriaId] : []);
    const catNames = catIds.map(id => this.cache.categorias.find(c => c.id === id)?.nombre).filter(Boolean);
    const pxBase   = prod.personas || null;
    const _uLabel  = u => (u || '').toLowerCase() === 'unidad' ? 'U' : (u || '');
    const _fmt     = n => Number.isInteger(n) ? n : parseFloat(n.toFixed(3)).toString();

    const hasComp = (prod.ingredientes?.length || prod.subproductos?.length || prod.materiales?.length);

    const calcSection = hasComp ? `
      <div class="calc-box" id="detailCalc">
        <div class="calc-box-header">
          <span class="calc-box-title">Calculadora de porciones</span>
          <div class="calc-box-inputs">
            <label class="calc-label">PX base: <strong>${pxBase ?? '—'}</strong></label>
            <label class="calc-label">PX deseadas
              <input id="calcPx" type="number" class="calc-input" min="1" step="1" placeholder="${pxBase ?? '1'}">
            </label>
          </div>
        </div>
        <div id="calcResult" class="calc-result-table"></div>
      </div>` : '';

    const composicion = hasComp ? `
      <div class="detail-section" style="margin-top:12px">
        <div class="detail-section-title">Composición base${pxBase ? ` (${pxBase} px)` : ''}</div>
        <table style="width:100%;border-collapse:collapse;font-size:.85rem">
          ${(prod.ingredientes?.length) ? `
            <tr><td colspan="2" class="comp-group-header">Ingredientes</td></tr>
            ${(prod.ingredientes).map(r => {
              const ing = this.cache.ingredientes.find(i => i.id === r.id);
              return `<tr><td class="comp-name">${this._esc(ing?.nombre || r.id)}</td><td class="comp-qty">${_fmt(r.cantidad)} ${_uLabel(ing?.unidad || '')}</td></tr>`;
            }).join('')}` : ''}
          ${(prod.subproductos?.length) ? `
            <tr><td colspan="2" class="comp-group-header">Subproductos</td></tr>
            ${(prod.subproductos).map(r => {
              const sub = this.cache.subproductos.find(s => s.id === r.id);
              return `<tr><td class="comp-name">${this._esc(sub?.nombre || r.id)}</td><td class="comp-qty">${_fmt(r.cantidad)} ${_uLabel(sub?.rendimientoUnidad || '')}</td></tr>`;
            }).join('')}` : ''}
          ${(prod.materiales?.length) ? `
            <tr><td colspan="2" class="comp-group-header">Materiales</td></tr>
            ${(prod.materiales).map(r => {
              const mat = this.cache.materiales.find(m => m.id === r.id);
              return `<tr><td class="comp-name">${this._esc(mat?.nombre || r.id)}</td><td class="comp-qty">${_fmt(r.cantidad)} ${_uLabel(mat?.unidad || '')}</td></tr>`;
            }).join('')}` : ''}
        </table>
      </div>` : '<p style="color:var(--text-muted);font-size:.85rem;margin-top:12px">Este producto no tiene composición cargada.</p>';

    App.openModal(this._esc(prod.nombre), `
      <div class="prod-detail-header">
        ${prod.fotoUrl ? `<img src="${this._esc(this._fotoSrc(prod.fotoUrl))}" class="prod-detail-foto" alt="">` : ''}
        <div class="prod-detail-meta">
          ${catNames.length ? catNames.map(n => `<span class="unit-tag">${this._esc(n)}</span>`).join(' ') : ''}
          ${pxBase ? `<span class="unit-tag" style="background:var(--bg-light);color:var(--text-muted)">👥 ${pxBase} porciones</span>` : ''}
          ${prod.descripcion ? `<p style="margin-top:6px;font-size:.84rem;color:var(--text-muted)">${this._esc(prod.descripcion)}</p>` : ''}
        </div>
      </div>
      ${calcSection}
      ${composicion}
      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid var(--border);margin-top:12px">
        ${!(typeof App !== 'undefined' && App.isLimitado) ? `<button class="btn-primary" id="detailEditBtn">Editar</button>` : ''}
        <button class="btn-secondary" onclick="App.closeModal()">Cerrar</button>
      </div>`, 'lg');

    if (!(typeof App !== 'undefined' && App.isLimitado)) {
      const editBtn = document.getElementById('detailEditBtn');
      if (editBtn) editBtn.addEventListener('click', () => { App.closeModal(); this._modalProducto(prod); });
    }
    if (hasComp && pxBase) this._bindCalcProducto(prod, pxBase);
  },

  _bindCalcProducto(prod, pxBase) {
    const input     = document.getElementById('calcPx');
    const resultDiv = document.getElementById('calcResult');
    if (!input || !resultDiv) return;
    const _uLabel = u => (u || '').toLowerCase() === 'unidad' ? 'U' : (u || '');
    const _fmt    = n => {
      const r = Math.round(n * 1000) / 1000;
      return Number.isInteger(r) ? r.toString() : parseFloat(r.toFixed(3)).toString();
    };

    const render = (pxDes) => {
      if (!pxDes || pxDes <= 0) { resultDiv.innerHTML = ''; return; }
      const factor = pxDes / pxBase;
      let html = '<table style="width:100%;border-collapse:collapse;font-size:.85rem">';
      if (prod.ingredientes?.length) {
        html += `<tr><td colspan="2" class="comp-group-header">Ingredientes</td></tr>`;
        prod.ingredientes.forEach(r => {
          const ing = this.cache.ingredientes.find(i => i.id === r.id);
          html += `<tr><td class="comp-name">${this._esc(ing?.nombre || r.id)}</td><td class="comp-qty comp-qty-calc">${_fmt(r.cantidad * factor)} ${_uLabel(ing?.unidad || '')}</td></tr>`;
        });
      }
      if (prod.subproductos?.length) {
        html += `<tr><td colspan="2" class="comp-group-header">Subproductos</td></tr>`;
        prod.subproductos.forEach(r => {
          const sub = this.cache.subproductos.find(s => s.id === r.id);
          html += `<tr><td class="comp-name">${this._esc(sub?.nombre || r.id)}</td><td class="comp-qty comp-qty-calc">${_fmt(r.cantidad * factor)} ${_uLabel(sub?.rendimientoUnidad || '')}</td></tr>`;
        });
      }
      if (prod.materiales?.length) {
        html += `<tr><td colspan="2" class="comp-group-header">Materiales</td></tr>`;
        prod.materiales.forEach(r => {
          const mat = this.cache.materiales.find(m => m.id === r.id);
          html += `<tr><td class="comp-name">${this._esc(mat?.nombre || r.id)}</td><td class="comp-qty comp-qty-calc">${_fmt(r.cantidad * factor)} ${_uLabel(mat?.unidad || '')}</td></tr>`;
        });
      }
      html += '</table>';
      resultDiv.innerHTML = html;
    };

    input.addEventListener('input', () => render(parseFloat(input.value)));
  },

  _detailSubproducto(sub) {
    const rendBase  = parseFloat(sub.rendimientoCantidad) || null;
    const rendUnit  = sub.rendimientoUnidad || '';
    const _uLabel   = u => (u || '').toLowerCase() === 'unidad' ? 'U' : (u || '');
    const _fmt      = n => Number.isInteger(n) ? n : parseFloat(n.toFixed(3)).toString();
    const hasComp   = (sub.ingredientes?.length || sub.materiales?.length);

    const calcSection = hasComp ? `
      <div class="calc-box" id="detailCalc">
        <div class="calc-box-header">
          <span class="calc-box-title">Calculadora de cantidad</span>
          <div class="calc-box-inputs">
            <label class="calc-label">Rendimiento base: <strong>${rendBase ?? '—'} ${_uLabel(rendUnit)}</strong></label>
            <label class="calc-label">Cantidad deseada
              <input id="calcQty" type="number" class="calc-input" min="0.001" step="any" placeholder="${rendBase ?? '1'}">
            </label>
          </div>
        </div>
        <div id="calcResult" class="calc-result-table"></div>
      </div>` : '';

    const composicion = hasComp ? `
      <div class="detail-section">
        <div class="detail-section-title">Composición base${rendBase ? ` (rinde ${rendBase} ${_uLabel(rendUnit)})` : ''}</div>
        <table style="width:100%;border-collapse:collapse;font-size:.85rem">
          ${(sub.ingredientes?.length) ? `
            <tr><td colspan="2" class="comp-group-header">Ingredientes</td></tr>
            ${(sub.ingredientes).map(r => {
              const ing = this.cache.ingredientes.find(i => i.id === r.id);
              return `<tr><td class="comp-name">${this._esc(ing?.nombre || r.id)}</td><td class="comp-qty">${_fmt(r.cantidad)} ${_uLabel(ing?.unidad || '')}</td></tr>`;
            }).join('')}` : ''}
          ${(sub.materiales?.length) ? `
            <tr><td colspan="2" class="comp-group-header">Materiales</td></tr>
            ${(sub.materiales).map(r => {
              const mat = this.cache.materiales.find(m => m.id === r.id);
              return `<tr><td class="comp-name">${this._esc(mat?.nombre || r.id)}</td><td class="comp-qty">${_fmt(r.cantidad)} ${_uLabel(mat?.unidad || '')}</td></tr>`;
            }).join('')}` : ''}
        </table>
      </div>` : '<p style="color:var(--text-muted);font-size:.85rem;margin-top:8px">Este subproducto no tiene composición cargada.</p>';

    App.openModal(this._esc(sub.nombre), `
      <div class="prod-detail-meta" style="margin-bottom:10px">
        ${rendBase ? `<span class="unit-tag" style="background:var(--bg-light);color:var(--text-muted)">Rinde: ${rendBase} ${_uLabel(rendUnit)}</span>` : ''}
        ${sub.descripcion ? `<p style="margin-top:6px;font-size:.84rem;color:var(--text-muted)">${this._esc(sub.descripcion)}</p>` : ''}
      </div>
      ${calcSection}
      ${composicion}
      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid var(--border);margin-top:12px">
        ${!(typeof App !== 'undefined' && App.isLimitado) ? `<button class="btn-primary" id="detailEditBtn">Editar</button>` : ''}
        <button class="btn-secondary" onclick="App.closeModal()">Cerrar</button>
      </div>`, 'md');

    if (!(typeof App !== 'undefined' && App.isLimitado)) {
      const editBtn = document.getElementById('detailEditBtn');
      if (editBtn) editBtn.addEventListener('click', () => { App.closeModal(); this._modalSubproducto(sub); });
    }
    if (hasComp && rendBase) this._bindCalcSubproducto(sub, rendBase);
  },

  _bindCalcSubproducto(sub, rendBase) {
    const input     = document.getElementById('calcQty');
    const resultDiv = document.getElementById('calcResult');
    if (!input || !resultDiv) return;
    const _uLabel = u => (u || '').toLowerCase() === 'unidad' ? 'U' : (u || '');
    const _fmt    = n => {
      const r = Math.round(n * 1000) / 1000;
      return Number.isInteger(r) ? r.toString() : parseFloat(r.toFixed(3)).toString();
    };

    const render = (qty) => {
      if (!qty || qty <= 0) { resultDiv.innerHTML = ''; return; }
      const factor = qty / rendBase;
      let html = '<table style="width:100%;border-collapse:collapse;font-size:.85rem">';
      if (sub.ingredientes?.length) {
        html += `<tr><td colspan="2" class="comp-group-header">Ingredientes</td></tr>`;
        sub.ingredientes.forEach(r => {
          const ing = this.cache.ingredientes.find(i => i.id === r.id);
          html += `<tr><td class="comp-name">${this._esc(ing?.nombre || r.id)}</td><td class="comp-qty comp-qty-calc">${_fmt(r.cantidad * factor)} ${_uLabel(ing?.unidad || '')}</td></tr>`;
        });
      }
      if (sub.materiales?.length) {
        html += `<tr><td colspan="2" class="comp-group-header">Materiales</td></tr>`;
        sub.materiales.forEach(r => {
          const mat = this.cache.materiales.find(m => m.id === r.id);
          html += `<tr><td class="comp-name">${this._esc(mat?.nombre || r.id)}</td><td class="comp-qty comp-qty-calc">${_fmt(r.cantidad * factor)} ${_uLabel(mat?.unidad || '')}</td></tr>`;
        });
      }
      html += '</table>';
      resultDiv.innerHTML = html;
    };

    input.addEventListener('input', () => render(parseFloat(input.value)));
  },

  // ── Acciones (edit/delete) ───────────────────────

  _bindActions(container) {
    container.querySelectorAll('.btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = this.cache[btn.dataset.type].find(i => i.id === btn.dataset.id);
        if (!item) return;
        switch (btn.dataset.type) {
          case 'categorias':   this._modalCategoria(item);   break;
          case 'ingredientes': this._modalIngrediente(item); break;
          case 'materiales':   this._modalMaterial(item);    break;
          case 'subproductos': this._modalSubproducto(item); break;
          case 'productos':    this._modalProducto(item);    break;
        }
      });
    });
    container.querySelectorAll('.btn-delete').forEach(btn => {
      btn.addEventListener('click', () => this._delete(btn.dataset.type, btn.dataset.id));
    });
  },

  async _delete(type, id) {
    const item = this.cache[type].find(i => i.id === id);
    if (!confirm(`¿Eliminar "${item?.nombre || 'este elemento'}"? Esta acción no se puede deshacer.`)) return;
    try {
      await db.collection(this.COLL[type]).doc(id).delete();
      App.toast('Eliminado correctamente', 'success');
      await this._loadAll();
      this._renderTab();
    } catch (e) {
      App.toast('Error al eliminar', 'error');
    }
  },

  async _save(type, id, data) {
    if (id) {
      await db.collection(this.COLL[type]).doc(id).update(data);
    } else {
      data.creadoEn = firebase.firestore.FieldValue.serverTimestamp();
      await db.collection(this.COLL[type]).add(data);
    }
    App.closeModalForce();
    App.toast(id ? 'Actualizado correctamente' : 'Creado correctamente', 'success');
    await this._loadAll();
    // Propagar cambios de costo en cascada si se editó un ítem de costo
    if (id && ['ingredientes', 'materiales', 'subproductos'].includes(type)) {
      await this._recalcDependencies(type, id);
    }
    this._renderTab();
  },

  // Recalcula en cascada costoUnitario de subproductos y precioCoste de productos
  // cuando cambia el costo de un ingrediente, material o subproducto
  async _recalcDependencies(type, changedId) {
    const batch = db.batch();
    let count = 0;

    // ── Paso 1: si cambió un ingrediente o material → recalcular subproductos afectados ──
    if (type === 'ingredientes' || type === 'materiales') {
      const relKey = type; // 'ingredientes' o 'materiales'
      for (const sp of this.cache.subproductos) {
        if (!(sp[relKey] || []).some(r => r.id === changedId)) continue;
        const costoTotal = this._calcSubCost(sp);
        const rend = sp.rendimientoCantidad || 1;
        const costoUnitario = rend > 0 ? Math.round((costoTotal / rend) * 100) / 100 : 0;
        batch.update(db.collection(this.COLL.subproductos).doc(sp.id), { costoUnitario });
        // Actualizar cache local para que _calcProductCost use el valor nuevo
        sp.costoUnitario = costoUnitario;
        count++;
      }
    }

    // ── Paso 2: recalcular productos afectados ──
    // Productos que tienen el ítem cambiado directamente (ingrediente o material)
    // O que contienen algún subproducto que fue afectado en el paso 1
    const affectedSubIds = type === 'subproductos'
      ? [changedId]
      : this.cache.subproductos.filter(sp => (sp[type] || []).some(r => r.id === changedId)).map(sp => sp.id);

    for (const p of this.cache.productos) {
      const tieneDirecto = type !== 'subproductos' && (p[type] || []).some(r => r.id === changedId);
      const tieneSub     = (p.subproductos || []).some(r => affectedSubIds.includes(r.id));
      if (!tieneDirecto && !tieneSub) continue;
      const { total: precioCoste } = this._calcProductCost(p);
      batch.update(db.collection(this.COLL.productos).doc(p.id), { precioCoste: Math.round(precioCoste) });
      count++;
    }

    if (count > 0) {
      await batch.commit();
      await this._loadAll(); // refrescar cache con los valores actualizados
      App.toast(`Se recalcularon costos de ${count} ítem(s) dependiente(s)`, 'info');
    }
  },


  // ── Modal: Categoría ────────────────────────────

  _modalCategoria(item = null) {
    const isEdit = !!item;
    App.openModal(isEdit ? 'Editar categoría' : 'Nueva categoría', `
      <form id="fCat" class="admin-form">
        <div class="field-group">
          <label>Nombre *</label>
          <input id="catNombre" type="text" value="${this._esc(item?.nombre || '')}"
            placeholder="" required>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="btnCancelCat">Cancelar</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Guardar cambios' : 'Crear'}</button>
        </div>
      </form>`, 'sm');

    document.getElementById('btnCancelCat').addEventListener('click', () => App.closeModal());
    document.getElementById('fCat').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nombre = document.getElementById('catNombre').value.trim();
      if (!nombre) return;
      try { await this._save('categorias', item?.id, { nombre }); }
      catch (e) { App.toast('Error al guardar', 'error'); }
    });
  },

  // ── Modal: Ingrediente ──────────────────────────

  _modalIngrediente(item = null) {
    const isEdit = !!item;

    // Costo unitario por la misma unidad ingresada
    const calcBase = (cant, precio, unidad) => {
      if (!cant || !precio) return null;
      const cxu = precio / cant;
      return { cxu, base: unidad };
    };

    const prevData  = item ? calcBase(item.cantidadEnvase, item.precioEnvase, item.unidad) : null;
    const cxuPreview = prevData
      ? '$' + prevData.cxu.toFixed(6).replace(/\.?0+$/, '') + ' por ' + prevData.base
      : '—';

    App.openModal(isEdit ? 'Editar ingrediente' : 'Nuevo ingrediente', `
      <form id="fIng" class="admin-form">
        <div class="field-group">
          <label>Nombre *</label>
          <input id="ingNombre" type="text" value="${this._esc(item?.nombre || '')}"
            placeholder="Ej: Aceite de girasol" required>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Cantidad del envase *</label>
            <input id="ingCantidad" type="number" min="0.001" step="any"
              value="${item?.cantidadEnvase ?? ''}" placeholder="Ej: 900" required>
          </div>
          <div class="field-group">
            <label>Unidad</label>
            <select id="ingUnidad">
              ${this.UNIDADES_ING.map(u =>
                `<option value="${u}" ${(item?.unidad || 'ml') === u ? 'selected' : ''}>${u}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="field-group">
          <label>Precio del envase ($) *</label>
          <input id="ingPrecio" type="number" min="0" step="0.01"
            value="${item?.precioEnvase ?? ''}" placeholder="Ej: 3600" required>
        </div>
        <div class="field-group" style="background:#f8f4f0;border-radius:8px;padding:10px 14px;">
          <label style="color:#666;font-size:.85rem">Costo calculado por unidad base</label>
          <div id="ingCostoPreview" style="font-size:1.05rem;font-weight:600;color:var(--bordo)">${cxuPreview}</div>
          <div id="ingBaseHint" style="font-size:.78rem;color:#999;margin-top:2px"></div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="btnCancelIng">Cancelar</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>`);

    // Preview en tiempo real
    const updatePreview = () => {
      const cant   = parseFloat(document.getElementById('ingCantidad').value) || 0;
      const precio = parseFloat(document.getElementById('ingPrecio').value)   || 0;
      const unidad = document.getElementById('ingUnidad').value;
      const prev   = document.getElementById('ingCostoPreview');
      const hint   = document.getElementById('ingBaseHint');
      if (!prev) return;
      const res = cant > 0 && precio > 0 ? calcBase(cant, precio, unidad) : null;
      if (res) {
        prev.textContent = '$' + res.cxu.toFixed(6).replace(/\.?0+$/, '') + ' por ' + res.base;
        hint.textContent = '';
      } else {
        prev.textContent = '—';
        hint.textContent = '';
      }
    };
    document.getElementById('ingCantidad').addEventListener('input', updatePreview);
    document.getElementById('ingPrecio').addEventListener('input',   updatePreview);
    document.getElementById('ingUnidad').addEventListener('change',  updatePreview);

    document.getElementById('btnCancelIng').addEventListener('click', () => App.closeModal());
    document.getElementById('fIng').addEventListener('submit', async (e) => {
      e.preventDefault();
      const cantidadEnvase = parseFloat(document.getElementById('ingCantidad').value) || 0;
      const precioEnvase   = parseFloat(document.getElementById('ingPrecio').value)   || 0;
      const unidad         = document.getElementById('ingUnidad').value;
      const res            = calcBase(cantidadEnvase, precioEnvase, unidad);
      const data = {
        nombre: document.getElementById('ingNombre').value.trim(),
        unidad,
        unidadBase: unidad,
        cantidadEnvase,
        precioEnvase,
        costoUnitario: res?.cxu ?? 0  // siempre por la unidad base (g o ml)
      };
      if (!data.nombre) return;
      try { await this._save('ingredientes', item?.id, data); }
      catch (e) { App.toast('Error al guardar', 'error'); }
    });
  },

  // ── Modal: Material ─────────────────────────────

  _modalMaterial(item = null) {
    const isEdit = !!item;
    App.openModal(isEdit ? 'Editar material' : 'Nuevo material', `
      <form id="fMat" class="admin-form">
        <div class="field-group">
          <label>Nombre *</label>
          <input id="matNombre" type="text" value="${this._esc(item?.nombre || '')}"
            placeholder="" required>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Unidad</label>
            <select id="matUnidad">
              ${this.UNIDADES_MAT.map(u =>
                `<option value="${u}" ${item?.unidad === u ? 'selected' : ''}>${u}</option>`
              ).join('')}
            </select>
          </div>
          <div class="field-group">
            <label>Costo unitario ($)</label>
            <input id="matCosto" type="number" min="0" step="0.01"
              value="${item?.costoUnitario ?? ''}" placeholder="0.00">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="btnCancelMat">Cancelar</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>`);

    document.getElementById('btnCancelMat').addEventListener('click', () => App.closeModal());
    document.getElementById('fMat').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        nombre:        document.getElementById('matNombre').value.trim(),
        unidad:        document.getElementById('matUnidad').value,
        costoUnitario: parseFloat(document.getElementById('matCosto').value) || 0
      };
      if (!data.nombre) return;
      try { await this._save('materiales', item?.id, data); }
      catch (e) { App.toast('Error al guardar', 'error'); }
    });
  },

  // ── Modal: Subproducto ──────────────────────────

  _modalSubproducto(item = null) {
    const isEdit = !!item;
    const selIngs = item?.ingredientes || [];
    const selMats = item?.materiales   || [];
    const UNIDADES_REND = ['g','kg','ml','l','unidad','porción'];

    App.openModal(isEdit ? 'Editar subproducto' : 'Nuevo subproducto', `
      <form id="fSub" class="admin-form">
        <div class="field-group">
          <label>Nombre *</label>
          <input id="subNombre" type="text" value="${this._esc(item?.nombre || '')}"
            placeholder="" required>
        </div>
        <div class="field-group">
          <label>Descripción</label>
          <textarea id="subDescripcion" rows="2" placeholder="">${this._esc(item?.descripcion || '')}</textarea>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Rendimiento (cant. que produce) *</label>
            <input id="subRendCant" type="number" min="0.001" step="any"
              value="${item?.rendimientoCantidad || ''}" placeholder="">
          </div>
          <div class="field-group">
            <label>Unidad de rendimiento</label>
            <select id="subRendUnidad">
              ${UNIDADES_REND.map(u =>
                `<option value="${u}" ${(item?.rendimientoUnidad || 'g') === u ? 'selected' : ''}>${u}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="field-group">
          <label>Ingredientes</label>
          <div class="rel-add-wrap">
            <input class="rel-add-input" id="selSubAddIng" type="text" placeholder="Buscar" autocomplete="off">
            <div class="rel-add-dropdown" id="selSubAddIng_drop"></div>
          </div>
          <div id="subIngList" class="relations-list">
            ${selIngs.map((r, i) => this._relRow('ing', i, r, this.cache.ingredientes)).join('')}
          </div>
        </div>
        <div class="field-group">
          <label>Materiales</label>
          <div class="rel-add-wrap">
            <input class="rel-add-input" id="selSubAddMat" type="text" placeholder="Buscar" autocomplete="off">
            <div class="rel-add-dropdown" id="selSubAddMat_drop"></div>
          </div>
          <div id="subMatList" class="relations-list">
            ${selMats.map((r, i) => this._relRow('mat', i, r, this.cache.materiales)).join('')}
          </div>
        </div>
        <div class="form-actions" style="flex-wrap:wrap;gap:8px">
          ${isEdit ? `<button type="button" class="btn-danger" id="btnDeleteSub" style="margin-right:auto">🗑️ Eliminar</button>` : ''}
          <button type="button" class="btn-secondary" id="btnCancelSub">Cancelar</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>`, 'lg');

    document.getElementById('btnCancelSub').addEventListener('click', () => App.closeModal());
    if (item) document.getElementById('btnDeleteSub')?.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer.`)) return;
      try {
        await db.collection(this.COLL.subproductos).doc(item.id).delete();
        App.closeModalForce();
        App.toast('Subproducto eliminado', 'success');
        await this._loadAll();
        this._renderTab();
      } catch(e) { App.toast('Error al eliminar', 'error'); }
    });
    this._bindRelAddInput('selSubAddIng', 'selSubAddIng_drop', 'subIngList', this.cache.ingredientes, 'ing');
    this._bindRelAddInput('selSubAddMat', 'selSubAddMat_drop', 'subMatList', this.cache.materiales, 'mat');
    this._bindRelRemove('subIngList');
    this._bindRelRemove('subMatList');



    document.getElementById('fSub').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        nombre:                document.getElementById('subNombre').value.trim(),
        descripcion:           document.getElementById('subDescripcion').value.trim(),
        rendimientoCantidad:   parseFloat(document.getElementById('subRendCant').value) || null,
        rendimientoUnidad:     document.getElementById('subRendUnidad').value,
        ingredientes:          this._collectRel('subIngList'),
        materiales:            this._collectRel('subMatList')
      };
      const costoTotal = this._calcSubCost(data);
      const rend = data.rendimientoCantidad || 1;
      data.costoUnitario = rend > 0 ? Math.round((costoTotal / rend) * 100) / 100 : 0;
      if (!data.nombre) return;
      try { await this._save('subproductos', item?.id, data); }
      catch (e) { App.toast('Error al guardar', 'error'); }
    });
  },

  // ── Modal: Producto ─────────────────────────────

  _modalProducto(item = null) {
    const isEdit = !!item;
    const selIngs = item?.ingredientes || [];
    const selSubs = item?.subproductos || [];
    const selMats = item?.materiales   || [];

    // (detailHtml eliminado — el resumen se renderiza en vivo al pie del form)

    App.openModal(isEdit ? `${this._esc(item.nombre)}` : 'Nuevo producto', `
      <form id="fProd" class="admin-form">

        <div class="field-group">
          <label>Vincular a producto web <span style="font-size:.78rem;font-weight:400;color:var(--text-muted)">(opcional — autocompleta nombre e imagen)</span></label>
          <select id="pWebVinculo" style="width:100%">
            <option value="">⏳ Cargando colecciones…</option>
          </select>
          <p id="pWebVinculoInfo" style="font-size:.78rem;color:var(--text-muted);margin-top:4px"></p>
        </div>

        <div class="form-row">
          <div class="field-group">
            <label>Nombre *</label>
            <input id="pNombre" type="text" value="${this._esc(item?.nombre || '')}"
              placeholder="" required>
          </div>
          <div class="field-group">
            <label>Categorías</label>
            <select id="pCatSelect">
              <option value="">Agregar categoría…</option>
              ${this.cache.categorias.map(cat =>
                `<option value="${cat.id}">${this._esc(cat.nombre)}</option>`
              ).join('')}
            </select>
            <div id="pCatTags" class="cat-tags-row"></div>
          </div>
        </div>

        <div class="field-group">
          <label>Descripción</label>
          <textarea id="pDesc" rows="2" placeholder="Descripción">${this._esc(item?.descripcion || '')}</textarea>
        </div>

        <div class="field-group">
          <label>Foto del producto (opcional)</label>
          ${item?.fotoUrl
            ? `<div class="current-foto" id="currentFotaWrap">
                 <img src="${this._esc(this._fotoSrc(item.fotoUrl))}" alt="Foto actual">
                 <button type="button" class="btn-remove-foto" id="btnRemFoto">Quitar foto</button>
               </div>`
            : ''}
          <input type="file" id="pFoto" accept="image/jpeg,image/png,image/webp" class="file-input">
          <label for="pFoto" class="file-label">📷 Elegir imagen</label>
          <div id="pFotoPreview" class="foto-preview"></div>
        </div>

        <div class="field-group">
          <label>Ingredientes</label>
          <div class="rel-add-wrap">
            <input class="rel-add-input" id="selAddIng" type="text" placeholder="Buscar" autocomplete="off">
            <div class="rel-add-dropdown" id="selAddIng_drop"></div>
          </div>
          <div id="pIngList" class="relations-list">
            ${selIngs.map((r, i) => this._relRow('ing', i, r, this.cache.ingredientes)).join('')}
          </div>
        </div>

        <div class="field-group">
          <label>Subproductos</label>
          <div class="rel-add-wrap">
            <input class="rel-add-input" id="selAddSub" type="text" placeholder="Buscar" autocomplete="off">
            <div class="rel-add-dropdown" id="selAddSub_drop"></div>
          </div>
          <div id="pSubList" class="relations-list">
            ${selSubs.map((r, i) => this._relRow('sub', i, r, this.cache.subproductos)).join('')}
          </div>
        </div>

        <div class="field-group">
          <label>Materiales</label>
          <div class="rel-add-wrap">
            <input class="rel-add-input" id="selAddMat" type="text" placeholder="Buscar" autocomplete="off">
            <div class="rel-add-dropdown" id="selAddMat_drop"></div>
          </div>
          <div id="pMatList" class="relations-list">
            ${selMats.map((r, i) => this._relRow('mat', i, r, this.cache.materiales)).join('')}
          </div>
        </div>

        <div class="form-row">
          <div class="field-group">
            <label>Porciones (px)</label>
            <input id="pPersonas" type="number" min="1" inputmode="numeric"
              value="${item?.personas || ''}" placeholder="">
          </div>
          <div class="field-group">
            <label>Precio de venta ($/px)</label>
            <input id="pPrecio" type="text" inputmode="decimal"
              value="${this._esc(String(item?.personas && (item?.precioVenta || item?.precio) ? Math.round((item.precioVenta || item.precio) / item.personas) : (item?.precioVenta || item?.precio || '')))}" placeholder="0">
          </div>
        </div>
        <div id="pCostSummary"></div>

        <div class="form-actions" style="flex-wrap:wrap;gap:8px">
          ${isEdit ? `<button type="button" class="btn-danger" id="btnDeleteProd" style="margin-right:auto">🗑️ Eliminar</button>` : ''}
          <button type="button" class="btn-secondary" id="btnCancelProd">Cancelar</button>
          <button type="submit" class="btn-primary" id="btnSaveProd">${isEdit ? 'Guardar cambios' : 'Crear producto'}</button>
        </div>
      </form>`, 'xl');

    // ── Multi-categorías: select + chips ──────────
    const selIds = new Set(item?.categoriasIds?.length ? item.categoriasIds : (item?.categoriaId ? [item.categoriaId] : []));
    const catMap  = Object.fromEntries(this.cache.categorias.map(c => [c.id, c.nombre]));
    const catTagsEl = document.getElementById('pCatTags');
    const catSelEl  = document.getElementById('pCatSelect');

    const renderCatTags = () => {
      catTagsEl.innerHTML = [...selIds].map(id =>
        `<span class="cat-tag-chip" data-id="${id}">${this._esc(catMap[id] || id)} <button type="button" class="cat-tag-remove" data-id="${id}">×</button></span>`
      ).join('');
      catTagsEl.querySelectorAll('.cat-tag-remove').forEach(btn =>
        btn.addEventListener('click', () => {
          selIds.delete(btn.dataset.id);
          const opt = catSelEl.querySelector(`option[value="${btn.dataset.id}"]`);
          if (opt) opt.disabled = false;
          renderCatTags();
        })
      );
    };

    // Marcar como disabled las ya seleccionadas y pintar chips iniciales
    selIds.forEach(id => {
      const opt = catSelEl.querySelector(`option[value="${id}"]`);
      if (opt) opt.disabled = true;
    });
    renderCatTags();

    catSelEl.addEventListener('change', () => {
      const val = catSelEl.value;
      if (!val) return;
      selIds.add(val);
      const opt = catSelEl.querySelector(`option[value="${val}"]`);
      if (opt) opt.disabled = true;
      catSelEl.value = '';
      renderCatTags();
    });

    // Preview foto
    document.getElementById('pFoto').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev => {
        document.getElementById('pFotoPreview').innerHTML =
          `<div style="position:relative;display:inline-block">
            <img src="${ev.target.result}" alt="Preview" style="max-width:120px;border-radius:6px">
            <button type="button" id="btnRemNewFoto"
              style="position:absolute;top:-6px;right:-6px;width:20px;height:20px;border-radius:50%;
                     background:#c0392b;color:#fff;border:none;cursor:pointer;font-size:12px;line-height:1;
                     display:flex;align-items:center;justify-content:center"
              title="Quitar imagen">&#x2715;</button>
          </div>`;
        document.getElementById('btnRemNewFoto').addEventListener('click', () => {
          document.getElementById('pFoto').value = '';
          document.getElementById('pFotoPreview').innerHTML = '';
        });
      };
      reader.readAsDataURL(file);
    });

    // Quitar foto existente
    document.getElementById('btnRemFoto')?.addEventListener('click', () => {
      document.getElementById('currentFotaWrap')?.remove();
      document.getElementById('pFoto')._removeExisting = true;
    });

    // Botones + en relaciones — selects inline
    this._bindRelAddInput('selAddIng', 'selAddIng_drop', 'pIngList', this.cache.ingredientes, 'ing');
    this._bindRelAddInput('selAddSub', 'selAddSub_drop', 'pSubList', this.cache.subproductos, 'sub');
    this._bindRelAddInput('selAddMat', 'selAddMat_drop', 'pMatList', this.cache.materiales, 'mat');
    this._bindRelRemove('pIngList');
    this._bindRelRemove('pSubList');
    this._bindRelRemove('pMatList');

    // ── Panel de costo en vivo ─────────────────────
    const updateSummary = () => {
      const tempProd = {
        ingredientes: this._collectRel('pIngList'),
        materiales:   this._collectRel('pMatList'),
        subproductos: this._collectRel('pSubList'),
      };
      const { total: costo, lines } = this._calcProductCost(tempProd);
      const precioPorPx = this._parsePrice(document.getElementById('pPrecio').value);
      const px      = parseInt(document.getElementById('pPersonas').value) || null;
      const precio  = px ? precioPorPx * px : precioPorPx;
      const ganancia = precio - costo;
      const margen  = costo > 0 ? Math.round((ganancia / costo) * 100) : null;
      const fmt     = v => v > 0 ? '$' + Math.round(v).toLocaleString('es-AR') : '—';
      const fmtPx   = v => px ? `<span class="cost-px">$${Math.round(v/px).toLocaleString('es-AR')}/px</span>` : '';
      const margenCls   = margen === null ? '' : margen >= 40 ? 'pos' : margen >= 0 ? 'mid' : 'neg';
      const margenColor = margen === null ? 'var(--text-muted)' : margen >= 40 ? 'var(--success)' : margen >= 0 ? 'var(--warning)' : 'var(--error)';

      document.getElementById('pCostSummary').innerHTML = `
        <div class="detail-kpi-row">
          <div class="detail-kpi detail-kpi-block kpi-costo">
            <span class="detail-kpi-label">Costo est.${px ? '/px' : ''}</span>
            <span class="detail-kpi-val">${px && costo > 0 ? fmtPx(costo) : fmt(costo)}${costo > 0 && px ? `<span class="cost-total"> (${fmt(costo)})</span>` : ''}</span>
          </div>
          <div class="detail-kpi detail-kpi-block kpi-precio">
            <span class="detail-kpi-label">Precio venta${px ? '/px' : ''}</span>
            <span class="detail-kpi-val" >${px && precio > 0 ? fmtPx(precio) : fmt(precio)}${precio > 0 && px ? `<span class="cost-total"> (${fmt(precio)})</span>` : ''}</span>
          </div>
          <div class="detail-kpi detail-kpi-block kpi-ganancia ${margenCls}">
            <span class="detail-kpi-label">Ganancia${px ? '/px' : ''}</span>
            <span class="detail-kpi-val">${precio > 0 && costo > 0 ? (px ? fmtPx(ganancia) : fmt(ganancia)) : '—'}${precio > 0 && costo > 0 && px ? `<span class="cost-total"> (${fmt(ganancia)})</span>` : ''}</span>
          </div>
          <div class="detail-kpi detail-kpi-block kpi-margen ${margenCls}">
            <span class="detail-kpi-label">% Ganancia</span>
            <span class="detail-kpi-val">${margen !== null ? margen + '%' : '—'}</span>
          </div>
        </div>`;
    };

    document.getElementById('pPrecio').addEventListener('input', updateSummary);
    document.getElementById('pPersonas').addEventListener('input', updateSummary);
    // Escuchar cambios de cantidad en las listas de relaciones
    document.getElementById('fProd').addEventListener('input', e => {
      if (e.target.closest('#pIngList, #pSubList, #pMatList')) updateSummary();
    });
    // Observar add/remove de filas
    const relObs = new MutationObserver(updateSummary);
    ['pIngList','pSubList','pMatList'].forEach(id => {
      const el = document.getElementById(id);
      if (el) relObs.observe(el, { childList: true });
    });
    updateSummary();

    document.getElementById('btnCancelProd').addEventListener('click', () => App.closeModal());
    if (item) document.getElementById('btnDeleteProd')?.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer.`)) return;
      try {
        await db.collection(this.COLL.productos).doc(item.id).delete();
        App.closeModalForce();
        App.toast('Producto eliminado', 'success');
        await this._loadAll();
        this._renderTab();
      } catch(e) { App.toast('Error al eliminar', 'error'); }
    });

    document.getElementById('fProd').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSaveProd');
      btn.disabled = true;
      btn.textContent = 'Guardando…';
      let saved = false;
      try {
        let fotoUrl = item?.fotoUrl || null;
        const fotoInput = document.getElementById('pFoto');
        const fotoFile  = fotoInput.files[0];
        if (fotoFile) {
          fotoUrl = await this._uploadFoto(fotoFile);
        } else if (fotoInput._webImageUrl) {
          fotoUrl = fotoInput._webImageUrl;  // imagen pre-cargada desde producto web
        } else if (fotoInput._removeExisting) {
          fotoUrl = null;
        }

        const data = {
          nombre:       document.getElementById('pNombre').value.trim(),
          categoriasIds: [...selIds],
          categoriaId:  null,
          personas:     parseInt(document.getElementById('pPersonas').value) || null,
          precio:       (() => { const _px = parseInt(document.getElementById('pPersonas').value) || null; const _ppx = this._parsePrice(document.getElementById('pPrecio').value); return _px ? _ppx * _px : _ppx; })(),
          descripcion:  document.getElementById('pDesc').value.trim(),
          fotoUrl,
          ingredientes: this._collectRel('pIngList'),
          subproductos: this._collectRel('pSubList'),
          materiales:   this._collectRel('pMatList'),
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        };
        const { total: _precioCoste } = this._calcProductCost(data);
        data.precioCoste = Math.round(_precioCoste);

        // Leer vinculo web ANTES de que _save cierre el modal
        const pWebVinculoSel = document.getElementById('pWebVinculo');
        const webVinculoVal  = pWebVinculoSel?.value || '';
        const precioPorPxWeb = this._parsePrice(document.getElementById('pPrecio').value);
        data.webVinculo = webVinculoVal
          ? { collection: webVinculoVal.split('/')[0], docId: webVinculoVal.split('/')[1] }
          : null;

        if (!data.nombre) { App.toast('El nombre es obligatorio', 'warning'); return; }

        await this._save('productos', item?.id, data);
        saved = true;

      } catch (err) {
        console.error(err);
        App.toast('Error al guardar: ' + (err.message || 'intente nuevamente'), 'error');
      } finally {
        if (!saved) {
          btn.disabled = false;
          btn.textContent = isEdit ? 'Guardar cambios' : 'Crear producto';
        }
      }
    });

    // Listener de vinculo web: auto-fill nombre, imagen e info
    document.getElementById('pWebVinculo').addEventListener('change', (e) => {
      const sel  = e.target;
      const opt  = sel.options[sel.selectedIndex];
      const info = document.getElementById('pWebVinculoInfo');

      if (!sel.value) {
        if (info) info.textContent = '';
        return;
      }

      // Auto-fill nombre (quitar sufijos tipo " - x12", " - 15px", " (x10)")
      const rawNombre = opt.dataset.nombre || '';
      const cleanNombre = rawNombre
        .replace(/\s*[\-\(]\s*x?\d+\s*(px|u|und)?\s*\)?\s*$/i, '')
        .trim();
      const pNombre = document.getElementById('pNombre');
      if (pNombre && !pNombre.value) pNombre.value = cleanNombre;

      // Pre-cargar imagen del producto web
      const imagenRaw = opt.dataset.imagen || '';
      if (imagenRaw) {
        const imgSrc = this._fotoSrc(imagenRaw);
        const preview = document.getElementById('pFotoPreview');
        if (preview) {
          preview.innerHTML = `<div style="position:relative;display:inline-block">
            <img src="${imgSrc}" style="max-width:120px;border-radius:6px" alt="">
            <span style="position:absolute;top:-6px;left:-6px;background:#888;color:#fff;
              font-size:10px;padding:1px 5px;border-radius:8px">web</span>
          </div>`;
        }
        // Guardar URL para usarla como fotoUrl si el usuario no sube otra
        const fotoInput = document.getElementById('pFoto');
        if (fotoInput) fotoInput._webImageUrl = imgSrc;
      }

      if (info) info.textContent = 'Producto vinculado. Para cambiar el precio en la web, usá Gestión → Productos web.';
    });
    this._loadWebVinculoSelect(item?.webVinculo);
  },


  // ── Colecciones web → selector de vinculación ───

  _WEB_COLLS: {
    fingersFrios:     'Fingers Fríos',
    fingersCalientes: 'Fingers Calientes',
    shots:            'Shots',
    tortasClasicas:   'Tortas Clásicas',
    tortasDecoradas:  'Tortas Decoradas',
  },

  _WEB_COLLS_MENU: {
    boxSalados:   'Box Salados',
    boxDulces:    'Box Dulces',
    combosDulces: 'Combos Dulces',
    menuEventos:  'Menú Eventos',
  },

  async _loadWebVinculoSelect(currentVinculo) {
    const sel = document.getElementById('pWebVinculo');
    if (!sel) return;
    try {
      const entries = await Promise.all(
        Object.entries(this._WEB_COLLS).map(async ([coll, label]) => {
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
          opt.dataset.imagen = d.imagen || '';
          // Resolver px: campo numérico px > campo unidad "x12" > null
          const _pxFromUnidad = d.unidad ? (d.unidad.match(/x(\d+)/i)?.[1] || null) : null;
          const _pxResolved   = d.px != null ? String(d.px) : (_pxFromUnidad || '');
          opt.dataset.px = _pxResolved;
          if (currentVinculo?.collection === coll && currentVinculo?.docId === d.docId) {
            opt.selected = true;
          }
          grp.appendChild(opt);
        });
        sel.appendChild(grp);
      });
      if (currentVinculo?.collection) {
        const info = document.getElementById('pWebVinculoInfo');
        if (info) info.textContent = 'Producto vinculado. Para cambiar el precio en la web, usá Gestión → Productos web.';
      }
    } catch (err) {
      console.error('Error cargando colecciones web:', err);
      sel.innerHTML = '<option value="">Error al cargar colecciones</option>';
    }
  },

  // ── Helpers ─────────────────────────────────────

  _relRow(type, idx, existing, items) {
    const selected = items.find(i => i.id === existing?.id);
    const _uLabel = u => (u || '').toLowerCase() === 'unidad' ? 'U' : (u || '');
    const initUnit = _uLabel(type === 'sub' ? (selected?.rendimientoUnidad || '') : (selected?.unidad || ''));
    const initCost = selected?.costoUnitario || 0;
    const initQty  = existing?.cantidad ?? 1;
    const initCostLabel = initCost > 0 ? '$' + Math.round(initCost * initQty).toLocaleString('es-AR') : '';
    const _updateRow = `(function(row){
      var sel=row.querySelector('.rel-select');
      var opt=sel.options[sel.selectedIndex];
      var u=opt&&opt.dataset.unit||'';
      var c=parseFloat(opt&&opt.dataset.cost||0)||0;
      var q=parseFloat(row.querySelector('.rel-qty').value)||0;
      row.querySelector('.rel-unit-label').textContent=u;
      row.querySelector('.rel-cost-label').textContent=c>0&&q>0?'$'+Math.round(c*q).toLocaleString('es-AR'):'';
    })(this.closest('.relation-row'))`;
    return `
      <div class="relation-row">
        <select class="rel-select" onchange="${_updateRow}">
          <option value="">Seleccionar…</option>
          ${items.map(i => {
            const raw = type === 'sub' ? (i.rendimientoUnidad || '') : (i.unidad || '');
            const u = raw.toLowerCase() === 'unidad' ? 'U' : raw;
            const c = i.costoUnitario || 0;
            return `<option value="${i.id}" data-unit="${u}" data-cost="${c}" ${existing?.id === i.id ? 'selected' : ''}>${this._esc(i.nombre)}</option>`;
          }).join('')}
        </select>
        <input class="rel-qty" type="number" placeholder="Cant." min="0.001" step="any"
          value="${initQty}" oninput="${_updateRow}">
        <span class="rel-unit-label">${initUnit}</span>
        <span class="rel-cost-label">${initCostLabel}</span>
        <button type="button" class="btn-remove-relation" title="Quitar">✕</button>
      </div>`;
  },

  _bindRelRemove(listId) {
    document.getElementById(listId)?.querySelectorAll('.btn-remove-relation').forEach(btn => {
      btn.onclick = () => btn.closest('.relation-row').remove();
    });
  },

  _bindRelAddInput(inputId, dropId, listId, items, typeKey) {
    const input = document.getElementById(inputId);
    const drop  = document.getElementById(dropId);
    if (!input || !drop) return;

    const getLabel = it => typeKey === 'sub'
      ? `${it.nombre}${it.rendimientoCantidad ? ' (por ' + it.rendimientoUnidad + ')' : ''}`
      : `${it.nombre}${it.unidad ? ' (' + it.unidad + ')' : ''}`;

    const _norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    const render = (q) => {
      const filtered = q
        ? items.filter(it => _norm(it.nombre).includes(_norm(q)))
        : items;
      if (filtered.length === 0) { drop.innerHTML = ''; drop.classList.remove('open'); return; }
      drop.innerHTML = filtered.map(it =>
        `<div class="rel-drop-item" data-id="${it.id}">${this._esc(getLabel(it))}</div>`
      ).join('');
      drop.classList.add('open');
      drop.querySelectorAll('.rel-drop-item').forEach(el => {
        el.addEventListener('mousedown', (e) => {
          e.preventDefault();
          const id = el.dataset.id;
          const l  = document.getElementById(listId);
          if (!l) return;
          const already = [...l.querySelectorAll('.rel-select')].some(s => s.value === id);
          if (already) {
            App.toast(`${items.find(i => i.id === id)?.nombre || 'El elemento'} ya está en la lista`, 'warning');
          } else {
            l.insertAdjacentHTML('beforeend', this._relRow(typeKey, l.children.length, { id, cantidad: 1 }, items));
            this._bindRelRemove(listId);
          }
          input.value = '';
          drop.innerHTML = '';
          drop.classList.remove('open');
        });
      });
    };

    input.addEventListener('input', () => render(input.value));
    input.addEventListener('focus', () => render(input.value));
    input.addEventListener('blur',  () => setTimeout(() => { drop.innerHTML = ''; drop.classList.remove('open'); }, 150));
  },

  _collectRel(listId) {
    const rows = document.querySelectorAll(`#${listId} .relation-row`);
    const out = [];
    rows.forEach(row => {
      const id  = row.querySelector('.rel-select').value;
      const qty = parseFloat(row.querySelector('.rel-qty').value) || 0;
      if (id && qty > 0) out.push({ id, cantidad: qty });
    });
    return out;
  },

  async _uploadFoto(file) {
    const formData = new FormData();
    formData.append('image', file);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 30000);
    try {
      const user = firebase.auth().currentUser;
      if (!user) throw new Error('Sesion de admin no iniciada');
      const token = await user.getIdToken();
      const res = await fetch('/upload-image.php', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timer);
      if (!res.ok) throw new Error(`Error HTTP ${res.status}`);
      const data = await res.json();
      if (!data.success) throw new Error(data.error || 'Error al subir imagen');
      return `/productos/${data.filename}`;
    } catch (err) {
      clearTimeout(timer);
      if (err.name === 'AbortError') throw new Error('Tiempo de espera agotado al subir la imagen (30 s)');
      throw err;
    }
  },

  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  },

  // Normaliza cualquier formato de fotoUrl a una URL usable:
  // /web/productos/filename → /productos/filename  (legacy, quita el web/)
  // /productos/filename → as-is
  // bare filename → /productos/filename
  // http... → as-is
  _fotoSrc(url) {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('//')) return url;
    // Quitar prefijo legacy /web/ o web/
    url = url.replace(/^\/web\//, '/').replace(/^web\//, '/');
    if (url.startsWith('/')) return url;
    return '/productos/' + url;
  },

  // Parsea precios en formato argentino: 1.500,50 → 1500.50
  _parsePrice(val) {
    if (val === '' || val === null || val === undefined) return 0;
    const str = String(val).trim().replace(/\s/g, '');
    if (!str) return 0;
    // Formato argentino: 1.500,50 (punto = miles, coma = decimal)
    if (/^\d{1,3}(\.\d{3})+(,\d+)?$/.test(str)) {
      return parseFloat(str.replace(/\./g, '').replace(',', '.')) || 0;
    }
    // Solo coma como decimal: 1500,50
    if (/^\d+(,\d+)?$/.test(str)) {
      return parseFloat(str.replace(',', '.')) || 0;
    }
    return parseFloat(str) || 0;
  },

  // ── Popup selector de ingredientes/materiales/subproductos ──
  // Abre un panel inline anclado al botón, sin cerrar el modal padre

  _openItemSelector(tipoLabel, targetListId, items, typeKey, anchorBtn) {
    // Remove any existing selector
    document.querySelectorAll('.inline-item-selector').forEach(el => el.remove());

    if (!items || items.length === 0) {
      App.toast(`No hay ${tipoLabel.toLowerCase()}s cargados`, 'warning');
      return;
    }

    const panel = document.createElement('div');
    panel.className = 'inline-item-selector';
    panel.innerHTML = `
      <div class="iis-header">
        <span class="iis-title">Seleccionar ${tipoLabel}</span>
        <button type="button" class="iis-close">✕</button>
      </div>
      <input class="iis-search" type="text" placeholder="Buscar" autocomplete="off">
      <div class="iis-list">
        ${items.map(it => `
          <div class="iis-item" data-id="${it.id}">
            <span class="iis-item-name">${this._esc(it.nombre || '—')}</span>
            ${it.unidad ? `<span class="iis-item-unit">${this._esc(it.unidad)}</span>` : ''}
          </div>`).join('')}
      </div>`;

    // Anchor to the button or field-group parent
    const anchor = anchorBtn || document.getElementById(targetListId)?.closest('.field-group');
    if (anchor) {
      anchor.style.position = 'relative';
      anchor.appendChild(panel);
    } else {
      document.getElementById('modalBody')?.appendChild(panel);
    }

    // Close on ✕
    panel.querySelector('.iis-close').addEventListener('click', () => panel.remove());

    // Search filter
    panel.querySelector('.iis-search').addEventListener('input', function() {
      const _norm = s => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
      const q = _norm(this.value);
      panel.querySelectorAll('.iis-item').forEach(el => {
        el.style.display = _norm(el.querySelector('.iis-item-name').textContent).includes(q) ? '' : 'none';
      });
    });

    // Select item
    const self = this;
    panel.querySelectorAll('.iis-item').forEach(el => {
      el.addEventListener('click', () => {
        const selectedId = el.dataset.id;
        const selectedItem = items.find(it => it.id === selectedId);
        if (!selectedItem) return;
        panel.remove();
        const l = document.getElementById(targetListId);
        if (!l) return;
        // Check if already in list
        const existing = l.querySelector(`.rel-row [value="${selectedId}"]`);
        if (existing) {
          App.toast(`${selectedItem.nombre} ya está en la lista`, 'warning');
          return;
        }
        l.insertAdjacentHTML('beforeend', self._relRow(typeKey, l.children.length, { id: selectedId, cantidad: 1 }, items));
        self._bindRelRemove(targetListId);
      });
    });

    // Auto focus search
    panel.querySelector('.iis-search').focus();
  },

  // ── Cálculo y visualización de costo ─────────────

  _calcSubCost(sub) {
    let total = 0;
    (sub.ingredientes || []).forEach(r => {
      const ing = this.cache.ingredientes.find(i => i.id === r.id);
      if (ing) total += (ing.costoUnitario || 0) * (r.cantidad || 0);
    });
    (sub.materiales || []).forEach(r => {
      const mat = this.cache.materiales.find(m => m.id === r.id);
      if (mat) total += (mat.costoUnitario || 0) * (r.cantidad || 0);
    });
    return total;
  },

  _calcProductCost(producto) {
    const lines = [];
    let total = 0;

    // Ingredientes directos
    (producto.ingredientes || []).forEach(rel => {
      const ing = this.cache.ingredientes.find(i => i.id === rel.id);
      if (!ing) return;
      const costo = (ing.costoUnitario || 0) * (rel.cantidad || 0);
      total += costo;
      lines.push({ label: `Ing: ${ing.nombre}`, cantidad: rel.cantidad, unit: ing.unidad || '', unitario: ing.costoUnitario || 0, subtotal: costo });
    });

    // Materiales directos
    (producto.materiales || []).forEach(rel => {
      const mat = this.cache.materiales.find(m => m.id === rel.id);
      if (!mat) return;
      const costo = (mat.costoUnitario || 0) * (rel.cantidad || 0);
      total += costo;
      lines.push({ label: `Mat: ${mat.nombre}`, cantidad: rel.cantidad, unit: mat.unidad || '', unitario: mat.costoUnitario || 0, subtotal: costo });
    });

    // Subproductos: costo por unidad de rendimiento × cantidad usada
    (producto.subproductos || []).forEach(rel => {
      const sp = this.cache.subproductos.find(s => s.id === rel.id);
      if (!sp) return;
      let spCostoTotal = 0;
      (sp.ingredientes || []).forEach(srel => {
        const ing = this.cache.ingredientes.find(i => i.id === srel.id);
        if (ing) spCostoTotal += (ing.costoUnitario || 0) * (srel.cantidad || 0);
      });
      (sp.materiales || []).forEach(srel => {
        const mat = this.cache.materiales.find(m => m.id === srel.id);
        if (mat) spCostoTotal += (mat.costoUnitario || 0) * (srel.cantidad || 0);
      });
      const rend = sp.rendimientoCantidad || 1;
      const costoPorUnidad = spCostoTotal / rend;
      const costo = costoPorUnidad * (rel.cantidad || 0);
      const unit = sp.rendimientoUnidad || 'u';
      total += costo;
      lines.push({ label: `Sub: ${sp.nombre} (${rend}${unit})`, cantidad: rel.cantidad, unit: unit, unitario: costoPorUnidad, subtotal: costo });
    });

    return { lines, total };
  },

  _showCostModal(producto) {
    const { lines, total } = this._calcProductCost(producto);
    const precio = producto.precio || 0;
    const margen = precio > 0 ? Math.round(((precio - total) / precio) * 100) : null;

    App.openModal(`Costo: ${producto.nombre}`, `
      <div class="cost-breakdown">
        ${lines.length === 0
          ? '<p style="color:var(--text-muted);font-size:.85rem">No hay ingredientes/materiales cargados para este producto.</p>'
          : lines.map(l => `
              <div class="cost-line">
                <span>${this._esc(l.label)}</span>
                <span>$${Math.round(l.subtotal).toLocaleString('es-AR')}</span>
              </div>`).join('')}
        <div class="cost-line total">
          <span>Costo total</span>
          <span>$${Math.round(total).toLocaleString('es-AR')}</span>
        </div>
        ${precio > 0 ? `
        <div class="cost-line" style="margin-top:8px;padding-top:6px;border-top:1px dashed var(--border)">
          <span style="color:var(--text-muted)">Precio de venta</span>
          <span>$${Math.round(precio).toLocaleString('es-AR')}</span>
        </div>
        <div class="cost-line" style="font-weight:700;color:${(precio - total) >= 0 ? 'var(--success)' : 'var(--error)'}">
          <span>Ganancia</span>
          <span>$${Math.round(precio - total).toLocaleString('es-AR')}${margen !== null ? ` (${margen}%)` : ''}</span>
        </div>` : ''}
      </div>
      <div style="display:flex;justify-content:flex-end;margin-top:14px">
        <button class="btn-secondary" onclick="App.closeModal()">Cerrar</button>
      </div>`, 'md');
  },

  // ── Envío ────────────────────────────────────────

  _ENVIO_DEFAULT: {
    'san-isidro':    { nombre: 'San Isidro',    costo: 6000,  freeMin: 500000 },
    'acasusso':      { nombre: 'Acasusso',       costo: 6000,  freeMin: 500000 },
    'martinez':      { nombre: 'Martínez',       costo: 6000,  freeMin: 500000 },
    'beccar':        { nombre: 'Beccar',          costo: 6000,  freeMin: 500000 },
    'villa-adelina': { nombre: 'Villa Adelina',  costo: 12000, freeMin: 900000 },
    'boulogne':      { nombre: 'Boulogne',        costo: 12000, freeMin: 900000 },
    'san-fernando':  { nombre: 'San Fernando',   costo: 12000, freeMin: 900000 },
    'olivos':        { nombre: 'Olivos',          costo: 12000, freeMin: 900000 },
    'vicente-lopez': { nombre: 'Vicente López',  costo: 12000, freeMin: 900000 },
    'tigre':         { nombre: 'Tigre',           costo: 12000, freeMin: 900000 },
    'nordelta':      { nombre: 'Nordelta',        costo: 20000, freeMin: 1000000 },
    'otra':          { nombre: 'Otra zona',       costo: 'consultar', freeMin: null }
  },

  async _renderEnvio(c) {
    c.innerHTML = `<div class="loading-spinner"><div class="spinner-ring"></div></div>`;

    let zonas = { ...this._ENVIO_DEFAULT };
    try {
      const doc = await db.collection('admin_config').doc('envio').get();
      if (doc.exists && doc.data().zonas) {
        zonas = doc.data().zonas;
      }
    } catch(e) { /* usa defaults */ }

    this._envioZonas = zonas;
    this._renderEnvioTabla(c);
  },

  _buildZonaRow(key, z) {
    const esConsultar = z.costo === 'consultar';
    return `
      <tr data-key="${key}">
        <td style="padding:8px">
          <input type="text" class="envio-nombre-input" data-key="${key}" value="${z.nombre || key}"
            style="width:140px;padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:14px">
        </td>
        <td style="padding:6px 8px">
          ${esConsultar
            ? `<label style="display:flex;align-items:center;gap:6px;cursor:pointer">
                 <input type="checkbox" class="envio-consultar-check" data-key="${key}" checked>
                 A consultar
               </label>`
            : `<div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap">
                 <div style="display:flex;align-items:center;gap:4px">
                   <span>$</span>
                   <input type="number" class="envio-costo-input" data-key="${key}" value="${z.costo}" min="0" step="100"
                     style="width:90px;padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:14px">
                 </div>
                 <label style="display:flex;align-items:center;gap:4px;font-size:13px;color:var(--text-muted);white-space:nowrap">
                   <input type="checkbox" class="envio-consultar-check" data-key="${key}"> A consultar
                 </label>
               </div>`}
        </td>
        <td style="padding:6px 8px">
          ${esConsultar
            ? `<span style="color:var(--text-muted)">—</span>`
            : `<div style="display:flex;align-items:center;gap:4px">
                 <span>$</span>
                 <input type="number" class="envio-freemin-input" data-key="${key}" value="${z.freeMin ?? ''}" min="0" step="1000"
                   style="width:110px;padding:6px 8px;border:1px solid var(--border);border-radius:8px;font-size:14px">
               </div>`}
        </td>
        <td style="padding:6px 8px;text-align:center">
          <button class="btn-icon envio-delete-btn" data-key="${key}" title="Eliminar localidad"
            style="background:var(--error);color:#fff;border:none;border-radius:8px;padding:6px 10px;cursor:pointer;font-size:14px">🗑️</button>
        </td>
      </tr>`;
  },

  _renderEnvioTabla(c) {
    const zonas = this._envioZonas;
    const rows = Object.entries(zonas)
      .sort(([,a],[,b]) => {
        const ca = a.costo === 'consultar' ? Infinity : Number(a.costo);
        const cb = b.costo === 'consultar' ? Infinity : Number(b.costo);
        return ca - cb;
      })
      .map(([key, z]) => this._buildZonaRow(key, z)).join('');

    c.innerHTML = `
      <div class="tab-content-inner">
        <div class="tab-header">
          <h3>PRECIOS DE ENVÍO</h3>
          <button class="btn-primary" id="btnAgregarLocalidad">+ Agregar localidad</button>
        </div>
        <p style="color:var(--text-muted);margin-bottom:20px;font-size:14px">
          Modificá el costo de envío y el mínimo para envío gratis por zona. Los cambios se aplican automáticamente en el carrito.
        </p>

        <!-- Formulario nueva localidad (oculto) -->
        <div id="nuevaLocalidadForm" style="display:none;background:var(--bg);border:1px solid var(--border);border-radius:12px;padding:16px;margin-bottom:20px">
          <h4 style="margin:0 0 12px;font-size:15px">Nueva localidad</h4>
          <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-end">
            <div style="display:flex;flex-direction:column;gap:4px">
              <label style="font-size:13px;color:var(--text-muted)">Nombre visible</label>
              <input type="text" id="nlNombre" placeholder="ej: San Isidro"
                style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:14px;width:160px">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label style="font-size:13px;color:var(--text-muted)">Costo de envío ($)</label>
              <input type="number" id="nlCosto" placeholder="ej: 8000" min="0" step="100"
                style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:14px;width:110px">
            </div>
            <div style="display:flex;flex-direction:column;gap:4px">
              <label style="font-size:13px;color:var(--text-muted)">Mínimo envío gratis ($)</label>
              <input type="number" id="nlFreeMin" placeholder="ej: 500000" min="0" step="1000"
                style="padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:14px;width:130px">
            </div>
            <div style="display:flex;gap:8px">
              <button class="btn-primary" id="btnConfirmarNuevaLocalidad">Agregar</button>
              <button class="btn-secondary" id="btnCancelarNuevaLocalidad">Cancelar</button>
            </div>
          </div>
        </div>

        <div style="overflow-x:auto">
          <table style="width:100%;border-collapse:collapse;font-size:14px">
            <thead>
              <tr style="background:var(--bg);border-bottom:2px solid var(--border)">
                <th style="text-align:left;padding:10px 8px;color:var(--text-muted);font-weight:600">Localidad</th>
                <th style="text-align:left;padding:10px 8px;color:var(--text-muted);font-weight:600">Costo de envío</th>
                <th style="text-align:left;padding:10px 8px;color:var(--text-muted);font-weight:600">Mínimo envío gratis</th>
                <th style="text-align:center;padding:10px 8px;color:var(--text-muted);font-weight:600">Eliminar</th>
              </tr>
            </thead>
            <tbody id="envioZonasBody">
              ${rows}
            </tbody>
          </table>
        </div>
        <div style="margin-top:24px;display:flex;align-items:center;gap:12px">
          <button class="btn-primary" id="btnGuardarEnvio">Guardar cambios</button>
          <span id="envioSaveMsg" style="font-size:14px;color:var(--success);display:none">✓ Guardado correctamente</span>
        </div>
      </div>`;

    // Botón agregar localidad
    document.getElementById('btnAgregarLocalidad').addEventListener('click', () => {
      document.getElementById('nuevaLocalidadForm').style.display = 'block';
    });
    document.getElementById('btnCancelarNuevaLocalidad').addEventListener('click', () => {
      document.getElementById('nuevaLocalidadForm').style.display = 'none';
    });
    document.getElementById('btnConfirmarNuevaLocalidad').addEventListener('click', () => {
      const nombre = document.getElementById('nlNombre').value.trim();
      const costo  = Number(document.getElementById('nlCosto').value) || 0;
      const freeMin = Number(document.getElementById('nlFreeMin').value) || 0;
      if (!nombre) { alert('Ingresá el nombre de la localidad'); return; }
      // Generar key desde el nombre
      const key = nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/\s+/g,'-').replace(/[^a-z0-9-]/g,'');
      if (this._envioZonas[key]) { alert('Ya existe una localidad con ese nombre'); return; }
      this._envioZonas[key] = { nombre, costo, freeMin };
      // Agregar fila a la tabla
      const tbody = document.getElementById('envioZonasBody');
      tbody.insertAdjacentHTML('beforeend', this._buildZonaRow(key, { nombre, costo, freeMin }));
      document.getElementById('nuevaLocalidadForm').style.display = 'none';
      document.getElementById('nlNombre').value = '';
      document.getElementById('nlCosto').value = '';
      document.getElementById('nlFreeMin').value = '';
      this._attachEnvioRowListeners();
    });

    document.getElementById('btnGuardarEnvio').addEventListener('click', () => this._saveEnvioConfig());
    this._attachEnvioRowListeners();
  },

  _attachEnvioRowListeners() {
    // Botones eliminar
    document.querySelectorAll('.envio-delete-btn').forEach(btn => {
      btn.onclick = () => {
        const key = btn.dataset.key;
        if (!confirm(`¿Eliminar la localidad "${this._envioZonas[key]?.nombre || key}"?`)) return;
        delete this._envioZonas[key];
        btn.closest('tr').remove();
      };
    });
    // Checkboxes "A consultar"
    document.querySelectorAll('.envio-consultar-check').forEach(chk => {
      chk.onchange = () => this._renderEnvioTabla(document.getElementById('subtabContent'));
    });
  },

  async _saveEnvioConfig() {
    const btn = document.getElementById('btnGuardarEnvio');
    const msg = document.getElementById('envioSaveMsg');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    // Leer valores actuales de los inputs
    document.querySelectorAll('.envio-nombre-input').forEach(input => {
      const key = input.dataset.key;
      if (this._envioZonas[key]) this._envioZonas[key].nombre = input.value.trim() || key;
    });
    document.querySelectorAll('.envio-costo-input').forEach(input => {
      const key = input.dataset.key;
      if (this._envioZonas[key]) this._envioZonas[key].costo = Number(input.value) || 0;
    });
    document.querySelectorAll('.envio-freemin-input').forEach(input => {
      const key = input.dataset.key;
      if (this._envioZonas[key]) this._envioZonas[key].freeMin = Number(input.value) || 0;
    });
    document.querySelectorAll('.envio-consultar-check').forEach(chk => {
      const key = chk.dataset.key;
      if (this._envioZonas[key]) {
        if (chk.checked) {
          this._envioZonas[key].costo = 'consultar';
          this._envioZonas[key].freeMin = null;
        }
      }
    });

    try {
      await db.collection('admin_config').doc('envio').set({ zonas: this._envioZonas });
      msg.style.display = 'inline';
      setTimeout(() => { msg.style.display = 'none'; }, 3000);
    } catch(e) {
      alert('Error al guardar: ' + e.message);
    }

    btn.disabled = false;
    btn.textContent = 'Guardar cambios';
  }
};
