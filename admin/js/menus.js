// ================================================
// menus.js — CRUD de Menús
// Los menús se componen de productos del admin (no subproductos)
// ================================================

const Menus = {
  menus:         [],
  productos:     [],

  async render() {
    const content = document.getElementById('mainContent');
    content.innerHTML = `
      <div class="section-wrapper">
        <div class="tab-header">
          <h3>Menús <span class="count-badge" id="menuCount">—</span></h3>
          <button class="btn-primary" id="btnAddMenu">+ Nuevo menú</button>
        </div>
        <div id="menusList" class="menus-list">
          <div class="loading-spinner"><div class="spinner-ring"></div></div>
        </div>
      </div>`;

    document.getElementById('btnAddMenu').addEventListener('click', () => this._openModal());
    await this._load();
    this._renderList();
  },

  async _load() {
    try {
      const [mSnap, pSnap] = await Promise.all([
        db.collection('admin_menus').orderBy('nombre').get().catch(() => ({ docs: [] })),
        db.collection('admin_productos').orderBy('nombre').get().catch(() => ({ docs: [] }))
      ]);
      this.menus     = mSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      this.productos = pSnap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      this.menus = []; this.productos = [];
    }
  },

  _calcMenuCost(menu) {
    let total = 0;
    (menu.productos || []).forEach(mp => {
      const prod = this.productos.find(p => p.id === mp.id);
      if (prod?.precioCoste) total += prod.precioCoste * (mp.cantidad || 1);
    });
    return total;
  },

  _renderList() {
    document.getElementById('menuCount').textContent = this.menus.length;
    const list = document.getElementById('menusList');

    if (this.menus.length === 0) {
      list.innerHTML = `<p class="empty-msg">No hay menús creados aún. Creá el primero combinando tus productos.</p>`;
      return;
    }

    list.innerHTML = `
      <div class="prod-list">
        <div class="prod-list-header">
          <span>Nombre</span>
          <span>Precio costo</span>
          <span>Precio venta</span>
          <span>Margen</span>
          <span>Productos</span>
        </div>
        ${this.menus.map(m => {
          const costo  = m.precioCoste || this._calcMenuCost(m);
          const venta  = m.precioVenta || m.precio || 0;
          const margen = (venta > 0 && costo > 0) ? Math.round(((venta - costo) / venta) * 100) : null;
          const nProds = (m.productos || []).reduce((s, p) => s + (p.cantidad || 1), 0);
          return `
            <div class="prod-row" data-id="${m.id}">
              <span class="prod-nombre">${this._esc(m.nombre)}</span>
              <span class="prod-costo">${costo > 0 ? '$' + Math.round(costo).toLocaleString('es-AR') : '—'}</span>
              <span class="prod-precio">${venta > 0 ? '$' + Math.round(venta).toLocaleString('es-AR') : '—'}</span>
              <span>${margen !== null ? `<span class="marg-tag ${margen >= 40 ? 'pos' : margen >= 0 ? 'mid' : 'neg'}">${margen}%</span>` : '—'}</span>
              <span class="prod-comp"><span class="comp-tag">📋 ${nProds} unid.</span></span>
            </div>`;
        }).join('')}
      </div>`;

    list.querySelectorAll('.prod-row').forEach(row => {
      row.addEventListener('click', () => {
        const menu = this.menus.find(m => m.id === row.dataset.id);
        if (menu) this._openModal(menu);
      });
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
    const isEdit    = !!item;
    const selProds  = item?.productos || [];
    const productos = this.productos;
    const costoActual = item ? (item.precioCoste || this._calcMenuCost(item)) : 0;

    App.openModal(isEdit ? `Editar menú: ${item.nombre}` : 'Nuevo menú', `
      <form id="fMenu" class="admin-form">
        <div class="field-group">
          <label>Nombre del menú *</label>
          <input id="mNombre" type="text" value="${this._esc(item?.nombre || '')}"
            placeholder="Ej: Menú corporativo básico" required>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Precio de costo ($)</label>
            <input id="mCostoCalc" type="text"
              value="${costoActual > 0 ? '$' + Math.round(costoActual).toLocaleString('es-AR') : ''}"
              readonly placeholder="Se calcula al agregar productos"
              style="background:var(--bg);color:var(--text-muted);cursor:default">
          </div>
          <div class="field-group">
            <label>Precio de venta ($)</label>
            <input id="mPrecioVenta" type="text" inputmode="decimal"
              value="${item?.precioVenta || item?.precio || ''}" placeholder="0">
          </div>
        </div>
        <div id="mMargenDisplay" style="display:none;padding:8px 12px;background:var(--bordo-light);
          border-radius:8px;font-size:.82rem;margin-bottom:12px">
          Margen estimado: <strong id="mMargenText">—</strong>
        </div>
        <div class="field-group">
          <label>Descripción</label>
          <textarea id="mDesc" rows="2"
            placeholder="Descripción del menú…">${this._esc(item?.descripcion || '')}</textarea>
        </div>
        <div class="field-group">
          <label>Productos incluidos</label>
          <div id="mProdList" class="relations-list">
            ${selProds.map((p, i) => this._prodRow(i, p, productos)).join('')}
          </div>
          <button type="button" class="btn-add-relation" id="btnMAddProd">+ Agregar producto</button>
        </div>
        <div class="form-actions" style="flex-wrap:wrap;gap:8px">
          ${isEdit ? `<button type="button" class="btn-danger" id="btnDeleteMenu" style="margin-right:auto">🗑️ Eliminar</button>` : ''}
          <button type="button" class="btn-secondary" id="btnCancelMenu">Cancelar</button>
          <button type="submit" class="btn-primary" id="btnSaveMenu">${isEdit ? 'Guardar cambios' : 'Crear menú'}</button>
        </div>
      </form>`, 'lg');

    // Cálculo de margen en tiempo real
    const calcMargen = () => {
      let costTotal = 0;
      document.querySelectorAll('#mProdList .relation-row').forEach(row => {
        const selId = row.querySelector('.rel-select').value;
        const qty   = parseFloat(row.querySelector('.rel-qty').value) || 0;
        const prod  = productos.find(p => p.id === selId);
        if (prod?.precioCoste) costTotal += prod.precioCoste * qty;
      });
      document.getElementById('mCostoCalc').value = costTotal > 0
        ? '$' + Math.round(costTotal).toLocaleString('es-AR') : '';
      const ventaStr = String(document.getElementById('mPrecioVenta').value).replace(/\./g,'').replace(',','.');
      const venta = parseFloat(ventaStr) || 0;
      const margenEl = document.getElementById('mMargenDisplay');
      if (costTotal > 0 && venta > 0) {
        const m = Math.round(((venta - costTotal) / venta) * 100);
        const ganancia = Math.round(venta - costTotal);
        document.getElementById('mMargenText').textContent =
          `${m}% (ganancia: $${ganancia.toLocaleString('es-AR')})`;
        document.getElementById('mMargenText').style.color =
          m >= 40 ? 'var(--success)' : m >= 0 ? 'var(--warning)' : 'var(--error)';
        margenEl.style.display = 'block';
      } else {
        margenEl.style.display = 'none';
      }
    };

    // Recalcular al cambiar precio de venta o cantidades
    document.getElementById('mPrecioVenta').addEventListener('input', calcMargen);
    document.getElementById('mProdList').addEventListener('change', calcMargen);
    document.getElementById('mProdList').addEventListener('input', calcMargen);
    calcMargen(); // inicial

    document.getElementById('btnCancelMenu').addEventListener('click', () => App.closeModal());
    if (item) document.getElementById('btnDeleteMenu')?.addEventListener('click', async () => {
      App.closeModal();
      await this._delete(item.id);
    });

    document.getElementById('btnMAddProd').addEventListener('click', () => {
      const list = document.getElementById('mProdList');
      list.insertAdjacentHTML('beforeend', this._prodRow(list.children.length, null, productos));
      this._bindRemove();
      calcMargen();
    });
    this._bindRemove();

    document.getElementById('fMenu').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSaveMenu');
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        const prodsData = [];
        document.querySelectorAll('#mProdList .relation-row').forEach(row => {
          const sel = row.querySelector('.rel-select');
          const qty = Math.round(parseFloat(row.querySelector('.rel-qty').value) || 0);
          if (sel.value && qty > 0) {
            const pData = productos.find(p => p.id === sel.value);
            prodsData.push({
              id:       sel.value,
              nombre:   pData?.nombre || sel.options[sel.selectedIndex].textContent.trim(),
              precio:   pData?.precioVenta || pData?.precio || 0,
              cantidad: qty
            });
          }
        });

        const ventaStr = String(document.getElementById('mPrecioVenta').value).replace(/\./g,'').replace(',','.');
        const precioVenta = Math.round(parseFloat(ventaStr) || 0);

        let precioCoste = 0;
        prodsData.forEach(mp => {
          const prod = productos.find(p => p.id === mp.id);
          if (prod?.precioCoste) precioCoste += prod.precioCoste * mp.cantidad;
        });

        const data = {
          nombre:       document.getElementById('mNombre').value.trim(),
          precioVenta,
          precio:       precioVenta,
          precioCoste:  Math.round(precioCoste),
          descripcion:  document.getElementById('mDesc').value.trim(),
          productos:    prodsData,
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

        App.closeModal();
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

  _prodRow(idx, existing, items) {
    return `
      <div class="relation-row">
        <select class="rel-select">
          <option value="">Seleccionar producto…</option>
          ${items.map(p => `
            <option value="${p.id}" data-costo="${p.precioCoste || 0}"
              ${existing?.id === p.id ? 'selected' : ''}>
              ${this._esc(p.nombre)}${(p.precioVenta || p.precio) ? ' ($' + Number(p.precioVenta || p.precio).toLocaleString('es-AR') + ')' : ''}
            </option>`).join('')}
        </select>
        <input class="rel-qty" type="number" placeholder="Cant." min="1" step="1"
          value="${existing?.cantidad || 1}">
        <button type="button" class="btn-remove-relation" title="Quitar">✕</button>
      </div>`;
  },

  _bindRemove() {
    document.querySelectorAll('#mProdList .btn-remove-relation').forEach(btn => {
      btn.onclick = () => btn.closest('.relation-row').remove();
    });
  },

  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
