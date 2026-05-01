// ================================================
// productos.js — CRUD de Productos, Subproductos,
//               Ingredientes, Materiales, Categorías
// ================================================

const Productos = {
  currentTab: 'productos',

  // Cache local de las colecciones
  cache: {
    categorias:   [],
    ingredientes: [],
    materiales:   [],
    subproductos: [],
    productos:    []
  },

  TABS: [
    { key: 'productos',    label: 'Productos'     },
    { key: 'categorias',   label: 'Categorías'   },
    { key: 'subproductos', label: 'Subproductos'  },
    { key: 'ingredientes', label: 'Ingredientes'  },
    { key: 'materiales',   label: 'Materiales'    },

  ],

  COLL: {
    categorias:   'admin_categorias',
    ingredientes: 'admin_ingredientes',
    materiales:   'admin_materiales',
    subproductos: 'admin_subproductos',
    productos:    'admin_productos'
  },

  UNIDADES_ING: ['kg','g','l','ml','unidad','docena','paquete','sobre','caja','taza','cucharada'],
  UNIDADES_MAT: ['unidad','caja','paquete','rollo','metro','bolsa','kg','g'],

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
    }
  },

  // ── Categorías ──────────────────────────────────

  _renderCategorias(c) {
    const items = this.cache.categorias;
    c.innerHTML = `
      <div class="tab-content-inner">
        <div class="tab-header">
          <h3>Categorías <span class="count-badge">${items.length}</span></h3>
          <button class="btn-primary" id="btnAddCat">+ Nueva categoría</button>
        </div>
        <div class="items-grid">
          ${items.length === 0
            ? '<p class="empty-msg">No hay categorías. Creá la primera.</p>'
            : items.map(cat => `
                <div class="item-card">
                  <div class="item-card-body">
                    <span class="item-name">${this._esc(cat.nombre)}</span>
                  </div>
                  <div class="item-card-actions">
                    <button class="btn-icon btn-edit"   data-id="${cat.id}" data-type="categorias" title="Editar">✏️</button>
                    <button class="btn-icon btn-delete" data-id="${cat.id}" data-type="categorias" title="Eliminar">🗑️</button>
                  </div>
                </div>`).join('')}
        </div>
      </div>`;
    document.getElementById('btnAddCat').addEventListener('click', () => this._modalCategoria());
    this._bindActions(c);
  },

  // ── Ingredientes ────────────────────────────────

  _renderIngredientes(c) {
    const items = this.cache.ingredientes;
    c.innerHTML = `
      <div class="tab-content-inner">
        <div class="tab-header">
          <h3>Ingredientes <span class="count-badge">${items.length}</span></h3>
          <button class="btn-primary" id="btnAddIng">+ Nuevo ingrediente</button>
        </div>
        <div class="table-wrapper">
          <table class="admin-table">
            <thead><tr><th>Nombre</th><th>Unidad</th><th>Costo unitario</th><th>Acciones</th></tr></thead>
            <tbody>
              ${items.length === 0
                ? '<tr><td colspan="4" class="empty-msg">No hay ingredientes.</td></tr>'
                : items.map(i => `
                    <tr>
                      <td>${this._esc(i.nombre)}</td>
                      <td><span class="unit-tag">${i.unidad || '—'}</span></td>
                      <td>${i.costoUnitario ? '$' + Number(i.costoUnitario).toLocaleString('es-AR') : '—'}</td>
                      <td class="actions-cell">
                        <button class="btn-icon btn-edit"   data-id="${i.id}" data-type="ingredientes">✏️ Editar</button>
                        <button class="btn-icon btn-delete" data-id="${i.id}" data-type="ingredientes">🗑️</button>
                      </td>
                    </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    document.getElementById('btnAddIng').addEventListener('click', () => this._modalIngrediente());
    this._bindActions(c);
  },

  // ── Materiales ──────────────────────────────────

  _renderMateriales(c) {
    const items = this.cache.materiales;
    c.innerHTML = `
      <div class="tab-content-inner">
        <div class="tab-header">
          <h3>Materiales <span class="count-badge">${items.length}</span></h3>
          <button class="btn-primary" id="btnAddMat">+ Nuevo material</button>
        </div>
        <div class="table-wrapper">
          <table class="admin-table">
            <thead><tr><th>Nombre</th><th>Unidad</th><th>Costo unitario</th><th>Acciones</th></tr></thead>
            <tbody>
              ${items.length === 0
                ? '<tr><td colspan="4" class="empty-msg">No hay materiales.</td></tr>'
                : items.map(m => `
                    <tr>
                      <td>${this._esc(m.nombre)}</td>
                      <td><span class="unit-tag">${m.unidad || '—'}</span></td>
                      <td>${m.costoUnitario ? '$' + Number(m.costoUnitario).toLocaleString('es-AR') : '—'}</td>
                      <td class="actions-cell">
                        <button class="btn-icon btn-edit"   data-id="${m.id}" data-type="materiales">✏️ Editar</button>
                        <button class="btn-icon btn-delete" data-id="${m.id}" data-type="materiales">🗑️</button>
                      </td>
                    </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;
    document.getElementById('btnAddMat').addEventListener('click', () => this._modalMaterial());
    this._bindActions(c);
  },

  // ── Subproductos ────────────────────────────────

  _renderSubproductos(c) {
    const items = this.cache.subproductos;
    c.innerHTML = `
      <div class="tab-content-inner">
        <div class="tab-header">
          <h3>Subproductos <span class="count-badge">${items.length}</span></h3>
          <button class="btn-primary" id="btnAddSub">+ Nuevo subproducto</button>
        </div>
        <div class="items-grid items-grid-3">
          ${items.length === 0
            ? '<p class="empty-msg">No hay subproductos.</p>'
            : items.map(s => {
                const cat = this.cache.categorias.find(cat => cat.id === s.categoriaId);
                return `
                  <div class="item-card item-card-tall">
                    <div class="item-card-body">
                      <span class="item-name">${this._esc(s.nombre)}</span>
                      ${cat ? `<span class="item-cat">${this._esc(cat.nombre)}</span>` : ''}
                      ${s.ingredientes?.length ? `<span class="item-meta">🥚 ${s.ingredientes.length} ingrediente${s.ingredientes.length !== 1 ? 's' : ''}</span>` : ''}
                      ${s.materiales?.length   ? `<span class="item-meta">📦 ${s.materiales.length} material${s.materiales.length !== 1 ? 'es' : ''}</span>` : ''}
                    </div>
                    <div class="item-card-actions">
                      <button class="btn-icon btn-edit"   data-id="${s.id}" data-type="subproductos">✏️</button>
                      <button class="btn-icon btn-delete" data-id="${s.id}" data-type="subproductos">🗑️</button>
                    </div>
                  </div>`;
              }).join('')}
        </div>
      </div>`;
    document.getElementById('btnAddSub').addEventListener('click', () => this._modalSubproducto());
    this._bindActions(c);
  },

  // ── Productos ───────────────────────────────────

  _renderProductos(c) {
    const items = this.cache.productos;
    const COLS = '2fr 1fr 100px 100px 120px';
    c.innerHTML = `
      <div class="tab-content-inner">
        <div class="tab-header">
          <h3>Productos <span class="count-badge">${items.length}</span></h3>
          <button class="btn-primary" id="btnAddProd">+ Nuevo producto</button>
        </div>
        ${items.length === 0
          ? '<p class="empty-msg">No hay productos cargados aún.</p>'
          : `<div class="prod-list">
              <div class="prod-list-header" style="grid-template-columns:${COLS}">
                <span>Nombre</span>
                <span>Categoría</span>
                <span>Venta</span>
                <span>Costo est.</span>
                <span>Composición</span>
              </div>
              ${items.map(p => {
                const cat = this.cache.categorias.find(cat => cat.id === p.categoriaId);
                const { total: costEst } = this._calcProductCost(p);
                const precio = p.precio || 0;
                const margen = (precio > 0 && costEst > 0) ? Math.round(((precio - costEst) / precio) * 100) : null;
                return `
                  <div class="prod-row" data-id="${p.id}" style="grid-template-columns:${COLS}">
                    <span class="prod-nombre">${this._esc(p.nombre)}</span>
                    <span class="prod-cat" style="color:var(--text-muted);font-size:.8rem">${cat ? this._esc(cat.nombre) : '—'}</span>
                    <span class="prod-precio">${precio ? '$' + Math.round(precio).toLocaleString('es-AR') : '—'}</span>
                    <span class="prod-costo">${costEst > 0 ? '$' + Math.round(costEst).toLocaleString('es-AR') : '—'}${margen !== null ? ` <span class="marg-tag ${margen >= 40 ? 'pos' : margen >= 0 ? 'mid' : 'neg'}">${margen}%</span>` : ''}</span>
                    <span class="prod-comp">
                      ${p.ingredientes?.length ? `<span class="comp-tag">🥚 ${p.ingredientes.length}</span>` : ''}
                      ${p.subproductos?.length ? `<span class="comp-tag">🔧 ${p.subproductos.length}</span>` : ''}
                      ${p.materiales?.length   ? `<span class="comp-tag">📦 ${p.materiales.length}</span>` : ''}
                    </span>
                  </div>`;
              }).join('')}
            </div>`}
      </div>`;
    document.getElementById('btnAddProd').addEventListener('click', () => this._modalProducto());
    c.querySelectorAll('.prod-row').forEach(row => {
      row.addEventListener('click', () => {
        const prod = this.cache.productos.find(p => p.id === row.dataset.id);
        if (prod) this._detailProducto(prod);
      });
    });
  },

  // ── Detalle producto: costo, ganancia, botón modificar ──

  _detailProducto(prod) {
    const cat = this.cache.categorias.find(c => c.id === prod.categoriaId);
    const { total: costo, lines } = this._calcProductCost(prod);
    const precio = prod.precio || 0;
    const ganancia = precio - costo;
    const margen = precio > 0 ? Math.round((ganancia / precio) * 100) : null;

    const margenCls = margen === null ? '' : margen >= 40 ? 'pos' : margen >= 0 ? 'mid' : 'neg';
    const margenColor = margen === null ? 'var(--text-muted)'
      : margen >= 40 ? 'var(--success)' : margen >= 0 ? 'var(--warning)' : 'var(--error)';

    App.openModal(`${this._esc(prod.nombre)}`, `
      <div class="prod-detail-header">
        ${prod.fotoUrl ? `<img src="${this._esc(prod.fotoUrl)}" class="prod-detail-foto" alt="">` : ''}
        <div class="prod-detail-meta">
          ${cat ? `<span class="unit-tag">${this._esc(cat.nombre)}</span>` : ''}
          ${prod.descripcion ? `<p style="margin-top:6px;font-size:.84rem;color:var(--text-muted)">${this._esc(prod.descripcion)}</p>` : ''}
        </div>
      </div>

      <div class="detail-kpi-row">
        <div class="detail-kpi">
          <span class="detail-kpi-label">Precio venta</span>
          <span class="detail-kpi-val">${precio ? '$' + Math.round(precio).toLocaleString('es-AR') : '—'}</span>
        </div>
        <div class="detail-kpi">
          <span class="detail-kpi-label">Costo estimado</span>
          <span class="detail-kpi-val">${costo > 0 ? '$' + Math.round(costo).toLocaleString('es-AR') : '—'}</span>
        </div>
        <div class="detail-kpi ${margenCls}">
          <span class="detail-kpi-label">Ganancia</span>
          <span class="detail-kpi-val" style="color:${margenColor}">
            ${precio > 0 && costo > 0 ? '$' + Math.round(ganancia).toLocaleString('es-AR') : '—'}
            ${margen !== null ? `<small>(${margen}%)</small>` : ''}
          </span>
        </div>
      </div>

      ${lines.length > 0 ? `
      <div class="detail-section" style="margin-top:10px">
        <div class="detail-section-title">Composición de costo</div>
        <table style="width:100%;border-collapse:collapse;font-size:.82rem">
          ${lines.map(l => `
            <tr>
              <td style="padding:4px 6px;color:var(--text-muted)">${this._esc(l.label)}</td>
              <td style="padding:4px 0;text-align:right;white-space:nowrap">×${l.cantidad}</td>
              <td style="padding:4px 0 4px 8px;text-align:right;font-weight:600;white-space:nowrap">$${Math.round(l.subtotal).toLocaleString('es-AR')}</td>
            </tr>`).join('')}
          <tr style="border-top:1px solid var(--border)">
            <td colspan="2" style="padding:6px 0;font-weight:700;font-size:.83rem">Total costo</td>
            <td style="padding:6px 0 6px 8px;font-weight:700;text-align:right">$${Math.round(costo).toLocaleString('es-AR')}</td>
          </tr>
        </table>
      </div>` : ''}

      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:12px;border-top:1px solid var(--border);margin-top:10px">
        <button class="btn-secondary" onclick="App.closeModal()">Cerrar</button>
        <button class="btn-primary" id="btnEditFromDetail">✏️ Modificar</button>
      </div>`, 'lg');

    document.getElementById('btnEditFromDetail').addEventListener('click', () => {
      App.closeModal();
      this._modalProducto(prod);
    });
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
    App.closeModal();
    App.toast(id ? 'Actualizado correctamente' : 'Creado correctamente', 'success');
    await this._loadAll();
    this._renderTab();
  },

  // ── Modal: Categoría ────────────────────────────

  _modalCategoria(item = null) {
    const isEdit = !!item;
    App.openModal(isEdit ? 'Editar categoría' : 'Nueva categoría', `
      <form id="fCat" class="admin-form">
        <div class="field-group">
          <label>Nombre *</label>
          <input id="catNombre" type="text" value="${this._esc(item?.nombre || '')}"
            placeholder="Ej: Tortas" required>
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
    App.openModal(isEdit ? 'Editar ingrediente' : 'Nuevo ingrediente', `
      <form id="fIng" class="admin-form">
        <div class="field-group">
          <label>Nombre *</label>
          <input id="ingNombre" type="text" value="${this._esc(item?.nombre || '')}"
            placeholder="Ej: Harina 0000" required>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Unidad</label>
            <select id="ingUnidad">
              ${this.UNIDADES_ING.map(u =>
                `<option value="${u}" ${item?.unidad === u ? 'selected' : ''}>${u}</option>`
              ).join('')}
            </select>
          </div>
          <div class="field-group">
            <label>Costo unitario ($)</label>
            <input id="ingCosto" type="text" inputmode="decimal"
              value="${item?.costoUnitario || ''}" placeholder="0">
          </div>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="btnCancelIng">Cancelar</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>`);

    document.getElementById('btnCancelIng').addEventListener('click', () => App.closeModal());
    document.getElementById('fIng').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        nombre:        document.getElementById('ingNombre').value.trim(),
        unidad:        document.getElementById('ingUnidad').value,
        costoUnitario: this._parsePrice(document.getElementById('ingCosto').value)
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
            placeholder="Ej: Caja mediana" required>
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
            <input id="matCosto" type="text" inputmode="decimal"
              value="${item?.costoUnitario || ''}" placeholder="0">
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
        costoUnitario: this._parsePrice(document.getElementById('matCosto').value)
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

    App.openModal(isEdit ? 'Editar subproducto' : 'Nuevo subproducto', `
      <form id="fSub" class="admin-form">
        <div class="form-row">
          <div class="field-group">
            <label>Nombre *</label>
            <input id="subNombre" type="text" value="${this._esc(item?.nombre || '')}"
              placeholder="Ej: Bizcochuelo de vainilla" required>
          </div>
          <div class="field-group">
            <label>Categoría</label>
            <select id="subCat">
              <option value="">Sin categoría</option>
              ${this.cache.categorias.map(cat =>
                `<option value="${cat.id}" ${item?.categoriaId === cat.id ? 'selected' : ''}>${this._esc(cat.nombre)}</option>`
              ).join('')}
            </select>
          </div>
        </div>
        <div class="field-group">
          <label>Ingredientes</label>
          <div id="subIngList" class="relations-list">
            ${selIngs.map((r, i) => this._relRow('ing', i, r, this.cache.ingredientes)).join('')}
          </div>
          <button type="button" class="btn-add-relation" id="btnSubAddIng">+ Agregar ingrediente</button>
        </div>
        <div class="field-group">
          <label>Materiales</label>
          <div id="subMatList" class="relations-list">
            ${selMats.map((r, i) => this._relRow('mat', i, r, this.cache.materiales)).join('')}
          </div>
          <button type="button" class="btn-add-relation" id="btnSubAddMat">+ Agregar material</button>
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="btnCancelSub">Cancelar</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Guardar' : 'Crear'}</button>
        </div>
      </form>`, 'lg');

    document.getElementById('btnCancelSub').addEventListener('click', () => App.closeModal());
    document.getElementById('btnSubAddIng').addEventListener('click', (e) => {
      this._openItemSelector('Ingrediente', 'subIngList', this.cache.ingredientes, 'ing', e.target.closest('.field-group'));
    });
    document.getElementById('btnSubAddMat').addEventListener('click', (e) => {
      this._openItemSelector('Material', 'subMatList', this.cache.materiales, 'mat', e.target.closest('.field-group'));
    });
    this._bindRelRemove('subIngList');
    this._bindRelRemove('subMatList');

    document.getElementById('fSub').addEventListener('submit', async (e) => {
      e.preventDefault();
      const data = {
        nombre:      document.getElementById('subNombre').value.trim(),
        categoriaId: document.getElementById('subCat').value || null,
        ingredientes: this._collectRel('subIngList'),
        materiales:   this._collectRel('subMatList')
      };
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

    App.openModal(isEdit ? 'Editar producto' : 'Nuevo producto', `
      <form id="fProd" class="admin-form">
        <div class="form-row">
          <div class="field-group">
            <label>Nombre *</label>
            <input id="pNombre" type="text" value="${this._esc(item?.nombre || '')}"
              placeholder="Ej: Torta decorada chica" required>
          </div>
          <div class="field-group">
            <label>Categoría</label>
            <select id="pCat">
              <option value="">Sin categoría</option>
              ${this.cache.categorias.map(cat =>
                `<option value="${cat.id}" ${item?.categoriaId === cat.id ? 'selected' : ''}>${this._esc(cat.nombre)}</option>`
              ).join('')}
            </select>
          </div>
        </div>

        <div class="form-row">
          <div class="field-group">
            <label>Precio de venta ($)</label>
            <input id="pPrecio" type="text" inputmode="decimal"
              value="${this._esc(String(item?.precioVenta || item?.precio || ''))}" placeholder="0">
          </div>
        </div>

        <div class="field-group">
          <label>Descripción</label>
          <textarea id="pDesc" rows="2" placeholder="Descripción opcional…">${this._esc(item?.descripcion || '')}</textarea>
        </div>

        <div class="field-group">
          <label>Foto del producto (opcional)</label>
          ${item?.fotoUrl
            ? `<div class="current-foto" id="currentFotaWrap">
                 <img src="${this._esc(item.fotoUrl)}" alt="Foto actual">
                 <button type="button" class="btn-remove-foto" id="btnRemFoto">Quitar foto</button>
               </div>`
            : ''}
          <input type="file" id="pFoto" accept="image/jpeg,image/png,image/webp" class="file-input">
          <label for="pFoto" class="file-label">📷 Elegir imagen</label>
          <div id="pFotoPreview" class="foto-preview"></div>
        </div>

        <div class="field-group">
          <label>Ingredientes</label>
          <div id="pIngList" class="relations-list">
            ${selIngs.map((r, i) => this._relRow('ing', i, r, this.cache.ingredientes)).join('')}
          </div>
          <button type="button" class="btn-add-relation" id="btnPAddIng">+ Ingrediente</button>
        </div>

        <div class="field-group">
          <label>Subproductos</label>
          <div id="pSubList" class="relations-list">
            ${selSubs.map((r, i) => this._relRow('sub', i, r, this.cache.subproductos)).join('')}
          </div>
          <button type="button" class="btn-add-relation" id="btnPAddSub">+ Subproducto</button>
        </div>

        <div class="field-group">
          <label>Materiales</label>
          <div id="pMatList" class="relations-list">
            ${selMats.map((r, i) => this._relRow('mat', i, r, this.cache.materiales)).join('')}
          </div>
          <button type="button" class="btn-add-relation" id="btnPAddMat">+ Material</button>
        </div>

        <div class="form-actions" style="flex-wrap:wrap;gap:8px">
          ${isEdit ? `<button type="button" class="btn-danger" id="btnDeleteProd" style="margin-right:auto">🗑️ Eliminar</button>` : ''}
          <button type="button" class="btn-secondary" id="btnCostProd">💰 Ver costo</button>
          <button type="button" class="btn-secondary" id="btnCancelProd">Cancelar</button>
          <button type="submit" class="btn-primary" id="btnSaveProd">${isEdit ? 'Guardar cambios' : 'Crear producto'}</button>
        </div>
      </form>`, 'xl');

    // Preview foto
    document.getElementById('pFoto').addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = ev =>
        (document.getElementById('pFotoPreview').innerHTML =
          `<img src="${ev.target.result}" alt="Preview">`);
      reader.readAsDataURL(file);
    });

    // Quitar foto existente
    document.getElementById('btnRemFoto')?.addEventListener('click', () => {
      document.getElementById('currentFotaWrap')?.remove();
      document.getElementById('pFoto')._removeExisting = true;
    });

    // Botones + en relaciones — abren popup selector
    document.getElementById('btnPAddIng').addEventListener('click', (e) => {
      this._openItemSelector('Ingrediente', 'pIngList', this.cache.ingredientes, 'ing', e.target.closest('.field-group'));
    });
    document.getElementById('btnPAddSub').addEventListener('click', (e) => {
      this._openItemSelector('Subproducto', 'pSubList', this.cache.subproductos, 'sub', e.target.closest('.field-group'));
    });
    document.getElementById('btnPAddMat').addEventListener('click', (e) => {
      this._openItemSelector('Material', 'pMatList', this.cache.materiales, 'mat', e.target.closest('.field-group'));
    });
    this._bindRelRemove('pIngList');
    this._bindRelRemove('pSubList');
    this._bindRelRemove('pMatList');

    document.getElementById('btnCancelProd').addEventListener('click', () => App.closeModal());
    document.getElementById('btnCostProd').addEventListener('click', () => {
      // Calcular costo con los datos actuales del formulario
      const tempProd = {
        ingredientes: this._collectRel('pIngList'),
        materiales:   this._collectRel('pMatList'),
        subproductos: this._collectRel('pSubList'),
        precio: this._parsePrice(document.getElementById('pPrecio').value)
      };
      this._showCostModal({ ...tempProd, nombre: document.getElementById('pNombre').value || 'Producto' });
    });
    if (item) document.getElementById('btnDeleteProd')?.addEventListener('click', async () => {
      if (!confirm(`¿Eliminar "${item.nombre}"? Esta acción no se puede deshacer.`)) return;
      try {
        await db.collection(this.COLL.productos).doc(item.id).delete();
        App.closeModal();
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
      try {
        let fotoUrl = item?.fotoUrl || null;
        const fotoFile = document.getElementById('pFoto').files[0];
        if (fotoFile) {
          fotoUrl = await this._uploadFoto(fotoFile);
        } else if (document.getElementById('pFoto')._removeExisting) {
          fotoUrl = null;
        }

        const data = {
          nombre:       document.getElementById('pNombre').value.trim(),
          categoriaId:  document.getElementById('pCat').value || null,
          precio:       this._parsePrice(document.getElementById('pPrecio').value),
          descripcion:  document.getElementById('pDesc').value.trim(),
          fotoUrl,
          ingredientes: this._collectRel('pIngList'),
          subproductos: this._collectRel('pSubList'),
          materiales:   this._collectRel('pMatList'),
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!data.nombre) { App.toast('El nombre es obligatorio', 'warning'); return; }

        await this._save('productos', item?.id, data);
      } catch (err) {
        console.error(err);
        App.toast('Error al guardar el producto', 'error');
        btn.disabled = false;
        btn.textContent = isEdit ? 'Guardar cambios' : 'Crear producto';
      }
    });
  },

  // ── Helpers ─────────────────────────────────────

  _relRow(type, idx, existing, items) {
    return `
      <div class="relation-row">
        <select class="rel-select">
          <option value="">Seleccionar…</option>
          ${items.map(i =>
            `<option value="${i.id}" ${existing?.id === i.id ? 'selected' : ''}>
              ${this._esc(i.nombre)}${i.unidad ? ' (' + i.unidad + ')' : ''}
            </option>`
          ).join('')}
        </select>
        <input class="rel-qty" type="number" placeholder="Cant." min="0.001" step="any"
          value="${existing?.cantidad ?? 1}">
        <button type="button" class="btn-remove-relation" title="Quitar">✕</button>
      </div>`;
  },

  _bindRelRemove(listId) {
    document.getElementById(listId)?.querySelectorAll('.btn-remove-relation').forEach(btn => {
      btn.onclick = () => btn.closest('.relation-row').remove();
    });
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
    const ext      = file.name.split('.').pop().toLowerCase();
    const fileName = `admin_productos/${Date.now()}_${Math.random().toString(36).slice(2, 9)}.${ext}`;
    const ref      = storage.ref(fileName);
    const snap     = await ref.put(file);
    return await snap.ref.getDownloadURL();
  },

  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
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
      <input class="iis-search" type="text" placeholder="Buscar…" autocomplete="off">
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
      const q = this.value.toLowerCase();
      panel.querySelectorAll('.iis-item').forEach(el => {
        el.style.display = el.querySelector('.iis-item-name').textContent.toLowerCase().includes(q) ? '' : 'none';
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

  _calcProductCost(producto) {
    const lines = [];
    let total = 0;

    // Ingredientes directos
    (producto.ingredientes || []).forEach(rel => {
      const ing = this.cache.ingredientes.find(i => i.id === rel.id);
      if (!ing) return;
      const costo = (ing.costoUnitario || 0) * (rel.cantidad || 0);
      total += costo;
      lines.push({ label: `Ing: ${ing.nombre}`, cantidad: rel.cantidad, unitario: ing.costoUnitario || 0, subtotal: costo });
    });

    // Materiales directos
    (producto.materiales || []).forEach(rel => {
      const mat = this.cache.materiales.find(m => m.id === rel.id);
      if (!mat) return;
      const costo = (mat.costoUnitario || 0) * (rel.cantidad || 0);
      total += costo;
      lines.push({ label: `Mat: ${mat.nombre}`, cantidad: rel.cantidad, unitario: mat.costoUnitario || 0, subtotal: costo });
    });

    // Subproductos (descompone sus propios ingredientes)
    (producto.subproductos || []).forEach(rel => {
      const sp = this.cache.subproductos.find(s => s.id === rel.id);
      if (!sp) return;
      let spCosto = 0;
      (sp.ingredientes || []).forEach(srel => {
        const ing = this.cache.ingredientes.find(i => i.id === srel.id);
        if (ing) spCosto += (ing.costoUnitario || 0) * (srel.cantidad || 0);
      });
      const costo = spCosto * (rel.cantidad || 0);
      total += costo;
      lines.push({ label: `Sub: ${sp.nombre} ×${rel.cantidad}`, cantidad: rel.cantidad, unitario: spCosto, subtotal: costo });
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
  }
};
