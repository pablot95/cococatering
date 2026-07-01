// ================================================
// presupuestos.js — Gestión de presupuestos
// Colección: admin_presupuestos
// ================================================

const Presupuestos = {
  presupuestos:  [],
  menus:         [],
  productos:     [],
  ingredientes:  [],
  materiales:    [],
  subproductos:  [],
  clientesVip:   [],

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
      const [pSnap, mSnap, prSnap, ingSnap, matSnap, subSnap, vipSnap] = await Promise.all([
        db.collection('admin_presupuestos').get().catch(() => ({ docs: [] })),
        db.collection('admin_menus').get().catch(() => ({ docs: [] })),
        db.collection('admin_productos').get().catch(() => ({ docs: [] })),
        db.collection('admin_ingredientes').get().catch(() => ({ docs: [] })),
        db.collection('admin_materiales').get().catch(() => ({ docs: [] })),
        db.collection('admin_subproductos').get().catch(() => ({ docs: [] })),
        db.collection('admin_clientes_vip').get().catch(() => ({ docs: [] }))
      ]);
      const byNombre = (a, b) => (a.nombre || '').localeCompare(b.nombre || '');
      const totalUpdates = [];
      this.presupuestos = pSnap.docs.map(d => {
        const pres = { id: d.id, ...d.data() };
        const totalFinal = this._totalConDescuento(pres);
        if (pres.subtotalBruto > 0 && pres.descuento > 0 && Math.round(Number(pres.totalGeneral || 0)) !== totalFinal) {
          totalUpdates.push(d.ref.update({ totalGeneral: totalFinal }).catch(e => console.warn('No se pudo normalizar total de presupuesto', d.id, e)));
        }
        return { ...pres, totalGeneral: totalFinal };
      });
      this.menus        = mSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      this.productos    = prSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      this.ingredientes = ingSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      this.materiales   = matSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      this.subproductos = subSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      this.clientesVip  = vipSnap.docs.map(d => ({ id: d.id, ...d.data() })).sort(byNombre);
      if (totalUpdates.length) await Promise.all(totalUpdates);
    } catch (e) {
      this.presupuestos = []; this.menus = []; this.productos = [];
      this.ingredientes = []; this.materiales = []; this.subproductos = []; this.clientesVip = [];
    }
  },

  _getFilteredItems(filter) {
    const hoy = new Date();
    if (filter.desde === undefined && filter.hasta === undefined) {
      filter = {
        ...filter,
        desde: new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().slice(0, 10),
        hasta: new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().slice(0, 10)
      };
    }
    let items = this.presupuestos.slice();
    if (filter.cliente) {
      const q = filter.cliente.toLowerCase();
      items = items.filter(p => (p.cliente?.nombre || '').toLowerCase().includes(q));
    }
    if (filter.tipo) items = items.filter(p => p.tipoEvento === filter.tipo);
    const campoFecha = filter.campoFecha === 'creacion' ? 'fecha' : 'fechaEvento';
    if (filter.desde) items = items.filter(p => (p[campoFecha] || p.fechaEvento || p.fecha || '') >= filter.desde);
    if (filter.hasta) items = items.filter(p => (p[campoFecha] || p.fechaEvento || p.fecha || '') <= filter.hasta);
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

  _renderRows(items) {
    const cont = document.getElementById('presRowsContainer');
    if (!cont) return;
    const header = `<div class="prod-list-header" style="grid-template-columns:60px 1fr 150px 150px 1fr 70px 80px 140px 90px 90px">
      <span>#</span><span>Cliente</span><span>Fecha Evento</span><span>Fecha Creación</span>
      <span>Tipo</span><span>Pers.</span><span>Sabor</span><span>Menú</span>
      <span class="col-precio">Total</span><span class="col-costo">Costo</span>
    </div>`;
    const rows = items.length === 0
      ? '<p class="empty-msg" style="padding:20px">No hay presupuestos que coincidan con los filtros.</p>'
      : items.map(p => {
          const costo = p.costo ?? p.costoInsumos ?? (p.insumos || []).reduce((s, ins) => s + (ins.subtotal || 0), 0);
          const menu = (p.items || []).find(it => it.tipo === 'menu');
          const totalDisplay = this._totalConDescuento(p);
          return `<div class="prod-row" data-id="${p.id}"
            style="grid-template-columns:60px 1fr 150px 150px 1fr 70px 80px 140px 90px 90px">
            <span><strong>#${String(p.numero || '').padStart(3,'0')}</strong></span>
            <span class="prod-nombre">${this._esc(p.cliente?.nombre || '—')}</span>
            <span style="font-size:.82rem">${this._formatDate(p.fechaEvento || p.fecha)}</span>
            <span style="font-size:.82rem;color:var(--text-muted)">${this._formatDate(p.fecha)}</span>
            <span>${this._esc(p.tipoEvento || '—')}</span>
            <span>${p.personas || '—'}</span>
            <span style="font-size:.8rem">${this._esc(p.sabor || '—')}</span>
            <span style="font-size:.8rem">${this._esc(menu?.nombre || '-')}</span>
            <span class="col-precio" style="font-weight:700">$${Math.round(totalDisplay).toLocaleString('es-AR')}</span>
            <span class="col-costo" style="color:var(--text-muted)">${costo ? '$' + Math.round(costo).toLocaleString('es-AR') : '—'}</span>
          </div>`;
        }).join('');
    cont.innerHTML = header + rows;
    const badge = document.getElementById('presCountBadge');
    if (badge) badge.textContent = items.length;
    cont.querySelectorAll('.prod-row').forEach(row => {
      row.addEventListener('click', () => {
        const p = this.presupuestos.find(x => x.id === row.dataset.id);
        if (p) this._openDetail(p);
      });
    });
  },

  _totalConDescuento(p = {}) {
    const subtotal = Number(p.subtotalBruto || 0);
    const descuento = Number(p.descuento || 0);
    if (subtotal > 0 && descuento > 0) return Math.round(subtotal * (1 - descuento / 100));
    return Math.round(p.totalGeneral || 0);
  },

  _renderList(filter = {}) {
    const { items, filter: f } = this._getFilteredItems(filter);
    const alreadyRendered = !!document.getElementById('presRowsContainer');

    if (!alreadyRendered) {
      document.getElementById('mainContent').innerHTML = `
        <div class="section-wrapper">
          <div class="tab-header">
            <h3>PRESUPUESTOS <span class="count-badge" id="presCountBadge">${items.length}</span></h3>
            <button class="btn-primary" id="btnAddPres">Nuevo presupuesto</button>
          </div>
          <div class="filter-bar">
            <input id="fCliente" type="text" placeholder="🔍 Buscar cliente…"
              value="${f.cliente || ''}" class="filter-input">
            <select id="fTipo" class="filter-select">
              <option value="">Todos los tipos</option>
              ${this.TIPOS_EVENTO.map(t => `<option value="${t}" ${f.tipo === t ? 'selected' : ''}>${t}</option>`).join('')}
            </select>
            <select id="fCampoFecha" class="filter-select">
              <option value="evento"   ${(f.campoFecha||'evento') === 'evento'   ? 'selected' : ''}>📅 Fecha evento</option>
              <option value="creacion" ${f.campoFecha === 'creacion' ? 'selected' : ''}>🗓️ Fecha creación</option>
            </select>
            <input id="fDesde" type="date" value="${f.desde || ''}" class="filter-input" title="Desde">
            <input id="fHasta" type="date" value="${f.hasta || ''}" class="filter-input" title="Hasta">
            <select id="fOrden" class="filter-select">
              <option value="evento_asc"   ${(f.orden||'evento_asc')==='evento_asc'   ? 'selected' : ''}>↑ Próximo evento</option>
              <option value="creacion_desc" ${f.orden==='creacion_desc' ? 'selected' : ''}>↓ Último creado</option>
            </select>
            <button class="btn-secondary" id="btnClearFilter" style="white-space:nowrap">✕ Limpiar</button>
          </div>
          <div class="prod-list" id="presRowsContainer"></div>
        </div>`;

      document.getElementById('btnAddPres').addEventListener('click', () => this._openModal());

      const applyFilter = () => {
        const { items: fi } = this._getFilteredItems({
          cliente:    document.getElementById('fCliente').value.trim(),
          tipo:       document.getElementById('fTipo').value,
          campoFecha: document.getElementById('fCampoFecha').value,
          desde:      document.getElementById('fDesde').value,
          hasta:      document.getElementById('fHasta').value,
          orden:      document.getElementById('fOrden').value
        });
        this._renderRows(fi);
      };
      document.getElementById('fCliente').addEventListener('input',    applyFilter);
      document.getElementById('fTipo').addEventListener('change',      applyFilter);
      document.getElementById('fCampoFecha').addEventListener('change', applyFilter);
      document.getElementById('fDesde').addEventListener('change',     applyFilter);
      document.getElementById('fHasta').addEventListener('change',     applyFilter);
      document.getElementById('fOrden').addEventListener('change',     applyFilter);
      document.getElementById('btnClearFilter').addEventListener('click', () => {
        document.getElementById('fCliente').value = '';
        document.getElementById('fTipo').value = '';
        document.getElementById('fDesde').value = '';
        document.getElementById('fHasta').value = '';
        applyFilter();
      });
    }

    this._renderRows(items);
  },

  // ── Detalle de presupuesto ───────────────────────

  _openDetail(p) {
    const totalBocados = (p.items || []).reduce((s, it) => s + (it.bocados ?? it.cantidad ?? 0), 0);
    const bocadosPx = p.personas > 0 ? (totalBocados / p.personas).toFixed(1) : '—';

    const menuItems   = (p.items || []).filter(it => it.tipo === 'menu');
    const otherItems  = (p.items || []).filter(it => it.tipo !== 'menu');

    const sortedOther = [...otherItems].sort((a, b) => {
      const oa = this.CURSO_ORDER.indexOf(a.curso || 'Otro');
      const ob = this.CURSO_ORDER.indexOf(b.curso || 'Otro');
      return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
    });

    // Agrupar por curso (solo ítems que no son menú)
    const grupos = {};
    sortedOther.forEach(it => {
      const c = it.curso || 'Otro';
      if (!grupos[c]) grupos[c] = [];
      grupos[c].push(it);
    });

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
        <tr style="background:rgba(234, 234, 234, 0.07)">
          <td style="font-weight:700;color:var(--bordo)"> ${this._esc(it.nombre || '—')}</td>
          <td style="text-align:center">${it.bocados ?? it.cantidad}</td>
          <td style="text-align:right;color:var(--text-muted)">$${Math.round(precioUnit).toLocaleString('es-AR')}</td>
          <td style="text-align:right;font-weight:600">$${Math.round(subtotalDisplay).toLocaleString('es-AR')}</td>
        </tr>
        ${subRows}`;
    };

    const renderGrupo = (titulo, items) => items.length === 0 ? '' : `
      <tr class="pres-curso-row"><td colspan="4">${titulo}</td></tr>
      ${items.map(it => {
        const precioUnit = it.precioUnitario > 0
          ? it.precioUnitario
          : (it.subtotal > 0 ? Math.round(it.subtotal / (it.cantidad || 1)) : 0);
        const subtotalDisplay = it.subtotal > 0
          ? it.subtotal
          : Math.round((it.cantidad || 1) * precioUnit);
        return `
        <tr>
          <td>${this._esc(it.nombre || '—')}</td>
          <td style="text-align:center">${it.bocados ?? it.cantidad}</td>
          <td style="text-align:right;color:var(--text-muted)">$${Math.round(precioUnit).toLocaleString('es-AR')}</td>
          <td style="text-align:right;font-weight:600">$${Math.round(subtotalDisplay).toLocaleString('es-AR')}</td>
        </tr>`;
      }).join('')}`;

    const renderCostoSection = () => {
      const prodCosts = (p.items || []).filter(it => it.tipo === 'producto').map(it => {
        const prod = this.productos.find(pr => pr.id === it.id);
        const costoUnit = prod?.precioCoste || 0;
        return { nombre: it.nombre, cantidad: it.cantidad, costoUnit, subtotal: Math.round((it.cantidad || 0) * costoUnit) };
      }).filter(c => c.subtotal > 0);
      const insumos = p.insumos || [];
      const totalCosto = p.costo ?? p.costoInsumos ?? 0;
      if (prodCosts.length === 0 && insumos.length === 0) return '';
      return `
      <div class="detail-section section-costos" style="margin-top:48px">
        <div class="detail-section-title">Desglose de costos</div>
        <table class="pres-items-table">
          <thead><tr>
            <th style="text-align:left"></th>
            <th style="text-align:center;width:60px">Cant.</th>
            <th style="text-align:right;width:110px">Costo unit.</th>
            <th style="text-align:right;width:110px">Costo total</th>
          </tr></thead>
          <tbody>
            ${prodCosts.length > 0 ? `
              <tr class="pres-curso-row"><td colspan="4">Productos</td></tr>
              ${prodCosts.map(c => `<tr>
                <td>${this._esc(c.nombre)}</td>
                <td style="text-align:center">${c.cantidad}</td>
                <td style="text-align:right;color:var(--text-muted)">$${Math.round(c.costoUnit).toLocaleString('es-AR')}</td>
                <td style="text-align:right;font-weight:600">$${c.subtotal.toLocaleString('es-AR')}</td>
              </tr>`).join('')}` : ''}
            ${insumos.length > 0 ? `
              <tr class="pres-curso-row"><td colspan="4">Ingredientes / Materiales / Subproductos</td></tr>
              ${insumos.map(ins => `<tr>
                <td>${this._esc(ins.nombre)}${ins.unidad ? ` <span class="unit-tag" style="font-size:.7rem">${this._esc(ins.unidad)}</span>` : ''}</td>
                <td style="text-align:center">${ins.cantidad}</td>
                <td style="text-align:right;color:var(--text-muted)">$${(ins.costoUnitario || 0).toLocaleString('es-AR')}</td>
                <td style="text-align:right;font-weight:600">$${Math.round(ins.subtotal || 0).toLocaleString('es-AR')}</td>
              </tr>`).join('')}` : ''}
          </tbody>
          <tfoot><tr class="pres-table-total">
            <td colspan="3">Costo total</td>
            <td style="text-align:right">$${Math.round(totalCosto).toLocaleString('es-AR')}</td>
          </tr></tfoot>
        </table>
      </div>`;
    };

    App.openModal(`Presupuesto #${String(p.numero || '').padStart(3,'0')}`, `
      <div class="pres-meta-grid">
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Cliente</span>
          <span class="pres-meta-val">${this._esc(p.cliente?.nombre || '—')}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Teléfono</span>
          <span class="pres-meta-val">${this._esc(p.cliente?.telefono || '—')}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Tipo de evento</span>
          <span class="pres-meta-val">${this._esc(p.tipoEvento || '—')}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Fecha del evento</span>
          <span class="pres-meta-val">${this._formatDate(p.fechaEvento || p.fecha)}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Fecha de creación</span>
          <span class="pres-meta-val">${this._formatDate(p.fecha)}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Personas</span>
          <span class="pres-meta-val">${p.personas || '—'}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Niños</span>
          <span class="pres-meta-val">${p.ninos || 0}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Sin TACC</span>
          <span class="pres-meta-val">${p.sinTacc || 0}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Vegetarianos</span>
          <span class="pres-meta-val">${p.vegetarianos || 0}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Tipo de pedido</span>
          <span class="pres-meta-val">${this._esc(p.tipoPedido || '—')}</span>
        </div>
        <div class="pres-meta-cell">
          <span class="pres-meta-label"> Sabor</span>
          <span class="pres-meta-val">${this._esc(p.sabor || '—')}</span>
        </div>
      </div>

      <div class="detail-section" style="margin-top:48px">
        <div class="detail-section-title">Detalle del menú           <span style="font-size: 1rem;font-weight:500;color:white;margin-left:8px;font-family: 'Montserrat', sans-serif;">
              ${totalBocados} bocados · ${bocadosPx}/persona
            </span>
            </div>
        <table class="pres-items-table">
          <thead>
            <tr>
              <th style="text-align:left"></th>
              <th style="text-align:center;width:60px">Cant.</th>
              <th style="text-align:right;width:110px">P. unitario</th>
              <th style="text-align:right;width:110px">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            ${menuItems.map(it => renderMenu(it)).join('')}
            ${this.CURSO_ORDER.map(c => renderGrupo(c, grupos[c] || [])).join('')}
          </tbody>
          <tfoot>
            ${p.descuento > 0 ? `
            <tr style="opacity:.7">
              <td colspan="3" style="text-align:right;font-size:.82rem">Subtotal</td>
              <td style="text-align:right;font-size:.82rem">$${Math.round(p.subtotalBruto || 0).toLocaleString('es-AR')}</td>
            </tr>
            <tr style="opacity:.7">
              <td colspan="3" style="text-align:right;font-size:.82rem;color:var(--bordo)">Descuento ${p.descuento}%</td>
              <td style="text-align:right;font-size:.82rem;color:var(--bordo)">-$${Math.round((p.subtotalBruto || 0) * p.descuento / 100).toLocaleString('es-AR')}</td>
            </tr>` : ''}
            <tr class="pres-table-total">
              <td colspan="3">Total general</td>
              <td style="text-align:right">$${Math.round(this._totalConDescuento(p)).toLocaleString('es-AR')}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      ${renderCostoSection()}

      <div class="pres-kpi-bar section-costos">
        <div class="pres-kpi">
          <span class="pres-kpi-label">Total bocados</span>
          <span class="pres-kpi-val">${totalBocados}</span>
          <span class="pres-kpi-sub">${bocadosPx} por persona</span>
        </div>
        <div class="pres-kpi mid">
          <span class="pres-kpi-label">Costo por persona</span>
          <span class="pres-kpi-val">$${Math.round(p.costoPorPersona || 0).toLocaleString('es-AR')}</span>
        </div>
        <div class="pres-kpi pres-kpi-main">
          <span class="pres-kpi-label">Total general</span>
          <span class="pres-kpi-val">$${Math.round(this._totalConDescuento(p)).toLocaleString('es-AR')}</span>
        </div>
      </div>

      ${p.notas ? `
      <div class="detail-section" style="margin-top:48px">
        <div class="detail-section-title">Notas</div>
        <p style="font-size:.85rem;color:var(--text-muted);margin:0">${this._esc(p.notas)}</p>
      </div>` : ''}

      <div style="display:flex;justify-content:flex-end;gap:8px;padding-top:14px;border-top:1px solid var(--border);margin-top:16px;flex-wrap:wrap">
        <button class="btn-secondary" id="btnPrintDetail"> PDF</button>
        <button class="btn-secondary" id="btnEditDetail">Editar</button>
        <button class="btn-danger"    id="btnDeleteDetail">Eliminar</button>
        <button class="btn-secondary" onclick="App.closeModal()">Cerrar</button>
      </div>`, 'xxl');

    document.getElementById('btnPrintDetail').addEventListener('click', () => this._printPDF(p));
    document.getElementById('btnEditDetail').addEventListener('click', () => {
      App.closeModalForce();
      this._openModal(p);
    });
    document.getElementById('btnDeleteDetail').addEventListener('click', async () => {
      App.closeModalForce();
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
            <input id="prNumero" type="number" value="${item?.numero ?? nextNum}" min="1" step="1" autocomplete="off">
          </div>
          <div class="field-group">
            <label>Fecha de creación</label>
            <input id="prFecha" type="date" value="${item?.fecha || today}">
          </div>
        </div>

        <div class="form-section-title">Cliente</div>
        ${this.clientesVip.length ? `
        <div class="form-row">
          <div class="field-group">
            <label>⭐ Cliente VIP</label>
            <div class="rel-add-wrap">
              <input class="rel-add-input" id="prVipSelector" type="text" placeholder="Buscar cliente VIP…" autocomplete="off">
              <div class="rel-add-dropdown" id="prVipSelector_drop"></div>
            </div>
          </div>
        </div>` : ''}
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
            <label class="vip-checkbox-label">
              <input type="checkbox" id="prClienteVip" ${item?.cliente?.esVip ? 'checked' : ''}>
              Guardar como Cliente VIP
            </label>
          </div>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Tipo de pedido</label>
            <select id="prTipoPedido">
              <option value="" ${!item?.tipoPedido ? 'selected' : ''}>— Sin especificar —</option>
              <option value="Pedido" ${item?.tipoPedido === 'Pedido' ? 'selected' : ''}>Pedido</option>
              <option value="Evento" ${item?.tipoPedido === 'Evento' ? 'selected' : ''}>Evento</option>
            </select>
          </div>
          <div class="field-group">
            <label>Sabor</label>
            <select id="prSabor">
              <option value="" ${!item?.sabor ? 'selected' : ''}>— Sin especificar —</option>
              <option value="Dulce"  ${item?.sabor === 'Dulce'  ? 'selected' : ''}>Dulce</option>
              <option value="Salado" ${item?.sabor === 'Salado' ? 'selected' : ''}>Salado</option>
              <option value="Mixto"  ${item?.sabor === 'Mixto'  ? 'selected' : ''}>Mixto</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field-group" id="grpPrTipoEvento">
            <label>Tipo de evento</label>
            <select id="prTipoEvento" ${item?.tipoPedido !== 'Evento' ? 'disabled' : ''}>
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
        <div class="form-row">
          <div class="field-group">
            <label>Personas *</label>
            <input id="prPersonas" type="number" min="1" step="1"
              value="${item?.personas || ''}" placeholder="0" required>
          </div>
          <div class="field-group">
            <label>Niños</label>
            <input id="prNinos" type="number" min="0" step="1" value="${item?.ninos || ''}" placeholder="0">
          </div>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Sin TACC</label>
            <input id="prSinTacc" type="number" min="0" step="1" value="${item?.sinTacc || ''}" placeholder="0">
          </div>
          <div class="field-group">
            <label>Vegetarianos</label>
            <input id="prVegetarianos" type="number" min="0" step="1" value="${item?.vegetarianos || ''}" placeholder="0">
          </div>
        </div>

        <div class="form-section-title" style="display:flex;justify-content:space-between;align-items:center">
          <span>Ítems del presupuesto</span>
          <button type="button" class="btn-primary" id="btnAddItem">Agregar ítem</button>
        </div>

        <div class="items-table">
          <div class="item-row item-header">
            <span>Tipo</span><span></span>
            <span>Cant.</span><span>P. unit.</span><span>Valor Total</span><span></span>
          </div>
          <div id="itemsContainer"></div>
        </div>

        <div id="prDetailPanel" class="detail-panel" style="display:none"></div>

        <div class="ptb-wrap" id="totalBox" style="display:flex;justify-content:flex-end">
          <div class="ptb-main" style="flex:0 0 58%">
            <div class="ptb-row">
              <span class="ptb-row-label">Subtotal</span>
              <span class="ptb-row-val" id="displaySubtotal">$0</span>
            </div>
            <div class="ptb-row ptb-row--discount">
              <span class="ptb-row-label">Descuento</span>
              <span class="ptb-discount-group">
                <span id="displayDescuentoMonto" class="ptb-discount-amount"></span>
                <input id="prDescuento" type="number" min="0" max="100" step="1"
                  value="${item?.descuento || ''}" placeholder="0" class="ptb-discount-input">
                <span class="ptb-pct">%</span>
              </span>
            </div>
            <div class="ptb-total-row">
              <span class="ptb-total-label">Total general</span>
              <span class="ptb-total-val" id="displayTotal">$0</span>
            </div>
          </div>
        </div>

        <div class="field-group" style="margin-top:12px">
          <label>Dirección de entrega</label>
          <input id="prDireccion" type="text" value="${this._esc(item?.direccionEntrega || '')}" placeholder="Ej: Av. Corrientes 1234, CABA">
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
    }
    // Cargar insumos existentes como filas en el mismo container usando su tipo real
    (item?.insumos || []).forEach(ins => this._addItemRow(container, ins));
    this._calcTotal();

    // ── VIP selector ──
    const vipInput = document.getElementById('prVipSelector');
    const vipDrop  = document.getElementById('prVipSelector_drop');
    if (vipInput && vipDrop) {
      const vips = this.clientesVip;
      const showVipDrop = (q) => {
        const matches = q.trim()
          ? vips.filter(v => v.nombre.toLowerCase().includes(q.toLowerCase()))
          : vips;
        if (!matches.length) { vipDrop.innerHTML = ''; vipDrop.classList.remove('open'); return; }
        vipDrop.innerHTML = matches.map(v =>
          `<div class="rel-drop-item" data-id="${v.id}">${v.nombre}${v.telefono ? ' — ' + v.telefono : ''}</div>`
        ).join('');
        vipDrop.classList.add('open');
        vipDrop.querySelectorAll('.rel-drop-item').forEach(opt => {
          opt.addEventListener('mousedown', e => {
            e.preventDefault();
            const vip = vips.find(x => x.id === opt.dataset.id);
            if (vip) {
              document.getElementById('prClienteNombre').value = vip.nombre;
              document.getElementById('prClienteTel').value    = vip.telefono || '';
            }
            vipInput.value = '';
            vipDrop.classList.remove('open');
          });
        });
      };
      vipInput.addEventListener('focus', () => showVipDrop(vipInput.value));
      vipInput.addEventListener('input', () => showVipDrop(vipInput.value));
      vipInput.addEventListener('blur',  () => setTimeout(() => vipDrop.classList.remove('open'), 150));
    }
    // ── fin VIP selector ──

    document.getElementById('btnAddItem').addEventListener('click', () => {
      this._addItemRow(container);
    });
    document.getElementById('prPersonas').addEventListener('input', () => this._calcTotal());
    document.getElementById('prDescuento').addEventListener('input', () => this._calcTotal());
    document.getElementById('btnCancelPres').addEventListener('click', () => App.closeModal());

    // Habilitar/deshabilitar tipo de evento según tipo de pedido
    const prTipoPedidoEl = document.getElementById('prTipoPedido');
    const prTipoEventoEl = document.getElementById('prTipoEvento');
    const _togglePrTipoEvento = () => {
      const esEvento = prTipoPedidoEl.value === 'Evento';
      prTipoEventoEl.disabled = !esEvento;
      document.getElementById('grpPrTipoEvento').style.opacity = esEvento ? '1' : '0.45';
    };
    prTipoPedidoEl.addEventListener('change', _togglePrTipoEvento);
    _togglePrTipoEvento();

    document.getElementById('fPres').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSavePres');
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        const items = this._collectItems();
        const insumos = this._collectInsumosFromItems('#itemsContainer');
        const personas     = parseInt(document.getElementById('prPersonas').value) || 0;
        const subtotalBruto = items.reduce((a, it) => a + it.subtotal, 0);
        const descuentoPct  = parseFloat(document.getElementById('prDescuento').value) || 0;
        const totalGeneral  = Math.round(subtotalBruto * (1 - descuentoPct / 100));
        const totalBocados  = items.reduce((a, it) => a + (it.bocados ?? it.cantidad ?? 0), 0);
        // Costo = costo de productos (precioCoste × cant) + costoUnitario × cant de ingredientes/materiales/subproductos
        const costoProductos = Array.from(document.querySelectorAll('#itemsContainer .item-row')).reduce((acc, r) => {
          const tipoR = r.querySelector('.ir-tipo')?.value;
          const cantR = parseFloat(r.querySelector('.ir-cant')?.value) || 0;
          if (tipoR === 'producto') {
            const prodId = r.querySelector('.ir-item')?.value;
            const prod = prodId ? this.productos.find(p => p.id === prodId) : null;
            const costoUnit = parseFloat(r.dataset.costo) || ((prod?.precioCoste || 0) / (prod?.personas || 1));
            return acc + cantR * costoUnit;
          } else if (tipoR === 'menu') {
            return acc + cantR * (parseFloat(r.dataset.costo) || 0);
          }
          return acc;
        }, 0);
        const costo = Math.round(costoProductos + insumos.reduce((a, ins) => a + (ins.subtotal || 0), 0));
        const costoPorPersona = personas > 0 ? Math.round(costo / personas) : 0;
        const data = {
          numero:          parseInt(document.getElementById('prNumero').value) || nextNum,
          fecha:           document.getElementById('prFecha').value,
          fechaEvento:     document.getElementById('prFechaEvento').value || null,
          tipoEvento:      document.getElementById('prTipoEvento').value,
          tipoPedido:      document.getElementById('prTipoPedido').value || null,
          sabor:           document.getElementById('prSabor').value || null,
          personas,
          ninos:           parseInt(document.getElementById('prNinos').value)        || 0,
          sinTacc:         parseInt(document.getElementById('prSinTacc').value)      || 0,
          vegetarianos:    parseInt(document.getElementById('prVegetarianos').value) || 0,
          totalBocados,
          items,
          subtotalBruto,
          totalGeneral,
          descuento: descuentoPct,
          costoPorPersona,
          insumos,
          costo,
          costoInsumos: costo, // compatibilidad hacia atrás
          notas:           document.getElementById('prNotas').value.trim(),
          direccionEntrega: document.getElementById('prDireccion').value.trim() || null,
          cliente: {
            nombre:   document.getElementById('prClienteNombre').value.trim(),
            telefono: document.getElementById('prClienteTel').value.trim(),
            esVip:    document.getElementById('prClienteVip')?.checked || false
          },
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!data.cliente.nombre) {
          App.toast('Ingresá el nombre del cliente', 'warning');
          btn.disabled = false; btn.textContent = isEdit ? 'Guardar cambios' : 'Crear presupuesto';
          return;
        }
        // Guardar/actualizar Cliente VIP si el checkbox está marcado
        if (document.getElementById('prClienteVip')?.checked) {
          const vipId = data.cliente.nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');
          await db.collection('admin_clientes_vip').doc(vipId).set(
            { nombre: data.cliente.nombre, telefono: data.cliente.telefono || '', telefonoNorm: (data.cliente.telefono || '').replace(/\D/g, '').slice(-8) },
            { merge: true }
          );
        }
        if (isEdit) {
          await db.collection('admin_presupuestos').doc(item.id).update(data);
        } else {
          data.fechaCreacion = firebase.firestore.FieldValue.serverTimestamp();
          await db.collection('admin_presupuestos').add(data);
        }
        App.closeModalForce();
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

  // ── Agregar fila de ítem (menú / producto / ingrediente / material / subproducto) ──

  _addItemRow(container, existing = null) {
    const row = document.createElement('div');
    row.className = 'item-row';

    const tipoVal = existing?.tipo || 'producto';
    const COST_TIPOS = ['ingrediente', 'material', 'subproducto'];
    const isCosto = COST_TIPOS.includes(tipoVal);

    // Helper: construye opciones para una fuente dada
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
    } else { // subproducto
      opts = (!noEmpty ? '<option value="" data-precio="0" data-px="0" data-costo="0">— Elegir ítem —</option>' : '') +
        this.subproductos.map(x =>
          `<option value="${x.id}" data-precio="${x.costoUnitario || 0}" data-px="0" data-costo="${x.costoUnitario || 0}" data-unidad="${this._esc(x.rendimientoUnidad || '')}" ${existing?.id === x.id ? 'selected' : ''}>${this._esc(x.nombre)}</option>`
        ).join('');
      cursoOpts = '';
    }

    const _pxUnit = (tipoVal === 'producto' && existing?.bocadosUnitarios > 1) ? existing.bocadosUnitarios : 1;
    const precioVal = isCosto ? (existing?.costoUnitario || 0) : Math.round((existing?.precioUnitario || 0) / _pxUnit);

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

    // Inicializar dataset
    (() => {
      if (isCosto) { row.dataset.px = 0; row.dataset.costo = 0; return; }
      const sel = row.querySelector('.ir-item');
      const opt = sel?.options[sel?.selectedIndex];
      const _ePxUnit = existing?.bocadosUnitarios || 1;
      row.dataset.costo = existing?.costoAjustado != null
        ? Math.round(existing.costoAjustado / (tipoVal === 'producto' ? _ePxUnit : 1))
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
      this._recalcRow(row);
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
          this._recalcRow(row);
          return;
        }
      }
      // Para producto: auto-completar cant con px del producto y usar px=1
      if (tipo === 'producto' && e.target.value) {
        row.querySelector('.ir-cant').value = opt?.dataset.px || 1;
        row.dataset.px = 1;
      } else if (tipo !== 'menu') {
        row.dataset.px = opt?.dataset.px || 1;
      }
      this._recalcRow(row);
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
      this._recalcRow(row);
    });

    row.querySelector('.ir-precio').addEventListener('input', () => this._recalcRow(row));
    row.querySelector('.ir-sub').addEventListener('input', () => {
      const total = parseFloat(row.querySelector('.ir-sub').value) || 0;
      const cant  = parseFloat(row.querySelector('.ir-cant').value) || 1;
      row.querySelector('.ir-precio').value = Math.round(total / cant);
      this._calcTotal();
    });
    row.querySelector('.ir-del').addEventListener('click', () => { row.remove(); this._calcTotal(); });

    container.appendChild(row);
    this._recalcRow(row);
  },

  _recalcRow(row) {
    const cant   = parseFloat(row.querySelector('.ir-cant').value)   || 0;
    const precio = parseFloat(row.querySelector('.ir-precio').value) || 0;
    row.querySelector('.ir-sub').value = Math.round(cant * precio);
    this._calcTotal();
  },

  _calcTotal() {
    const COST_TIPOS = ['ingrediente', 'material', 'subproducto'];
    const rows = document.querySelectorAll('#itemsContainer .item-row');
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
    const personas = parseInt(document.getElementById('prPersonas')?.value) || 0;
    const cpp      = personas > 0 ? Math.round(total / personas) : 0;
    const bocPx    = personas > 0 ? (bocados / personas).toFixed(1) : '—';

    // ── Detail panel ──
    const panel = document.getElementById('prDetailPanel');
    if (panel) {
      if (detailRows.length === 0) {
        panel.style.display = 'none';
      } else {
        panel.style.display = '';
        const fmt = v => '$' + Math.round(v).toLocaleString('es-AR');
        const ganancia = total - costo;
        const costoPxTotal = bocados > 0 ? costo / bocados : 0;
        const pxPorPersona = personas > 0 ? bocados / personas : 0;
        const vtaPorPersona = personas > 0 ? total / personas : 0;
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
            <div class="dp-kpi-card">
              <span class="dp-kpi-label">Venta total</span>
              <span class="dp-kpi-val">${fmt(total)}</span>
            </div>
            <div class="dp-kpi-card">
              <span class="dp-kpi-label">Costo total</span>
              <span class="dp-kpi-val">${fmt(costo)}</span>
            </div>
            <div class="dp-kpi-card dp-kpi-card--${ganancia>=0?'success':'danger'}">
              <span class="dp-kpi-label">Ganancia</span>
              <span class="dp-kpi-val">${total>0?fmt(ganancia):'—'}</span>
            </div>
            <div class="dp-kpi-card">
              <span class="dp-kpi-label">Total bocados</span>
              <span class="dp-kpi-val">${bocados}</span>
            </div>
            <div class="dp-kpi-card">
              <span class="dp-kpi-label">$/persona</span>
              <span class="dp-kpi-val">${personas>0?fmt(total/personas):'—'}</span>
            </div>
          </div>`;
      }
    }
    // ── listeners Valor Total editables en detalle de menú ──
    if (panel) {
      panel.querySelectorAll('.dp-val-edit').forEach(inp => {
        inp.addEventListener('change', () => {
          const ri = +inp.dataset.row, mi = +inp.dataset.mp;
          const newTotal = parseFloat(inp.value) || 0;
          const allRows  = Array.from(document.querySelectorAll('#itemsContainer .item-row'));
          const targetRow = allRows[ri];
          if (!targetRow) return;
          const prods = JSON.parse(targetRow.dataset.menuProductos || '[]');
          if (prods[mi] != null) {
            const cant = prods[mi].personas || 1;
            prods[mi].customValorTotal    = newTotal;
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
            this._recalcRow(targetRow);
          }
        });
      });
    }
    // ── listeners inputs px editables en detalle de menú ──
    if (panel) {
      panel.querySelectorAll('.dp-px-edit').forEach(inp => {
        inp.addEventListener('change', () => {
          const ri = +inp.dataset.row;
          const mi = +inp.dataset.mp;
          const allRows = Array.from(document.querySelectorAll('#itemsContainer .item-row'));
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
            this._calcTotal();
          }
        });
      });
    }
    // ── fin detail panel ──

    const dTotal = document.getElementById('displayTotal');
    const dSub   = document.getElementById('displaySubtotal');
    const dCpp   = document.getElementById('displayCpp');
    const dBoc   = document.getElementById('displayBocados');
    const dCosto = document.getElementById('displayCostoInsumos');
    const dDescM = document.getElementById('displayDescuentoMonto');
    const descPct = parseFloat(document.getElementById('prDescuento')?.value) || 0;
    const descMonto = total * (descPct / 100);
    const totalConDesc = total - descMonto;
    const cppFinal = personas > 0 ? Math.round(totalConDesc / personas) : 0;
    if (dSub)   dSub.textContent   = `$${Math.round(total).toLocaleString('es-AR')}`;
    if (dDescM) dDescM.textContent = descMonto > 0 ? `-$${Math.round(descMonto).toLocaleString('es-AR')}` : '';
    if (dTotal) dTotal.textContent = `$${Math.round(totalConDesc).toLocaleString('es-AR')}`;
    if (dCpp)   dCpp.textContent   = `$${cppFinal.toLocaleString('es-AR')}`;
    if (dBoc)   dBoc.textContent   = bocPx;
    if (dCosto) dCosto.textContent = `$${Math.round(costo).toLocaleString('es-AR')}`;
  },

  _collectItems() {
    const COST_TIPOS = ['ingrediente', 'material', 'subproducto'];
    return Array.from(document.querySelectorAll('#itemsContainer .item-row')).flatMap(row => {
      const tipo = row.querySelector('.ir-tipo')?.value || 'producto';
      if (COST_TIPOS.includes(tipo)) return []; // solo costo, no van al PDF
      const itemSel  = row.querySelector('.ir-item');
      const cursoSel = row.querySelector('.ir-curso');
      const cant     = parseFloat(row.querySelector('.ir-cant').value)   || 0;
      const precio   = parseFloat(row.querySelector('.ir-precio').value) || 0;
      const sub      = parseFloat(row.querySelector('.ir-sub').value)    || Math.round(cant * precio);
      const opt      = itemSel?.options[itemSel?.selectedIndex];
      const menuId   = itemSel?.value || '';
      if (!menuId) return [];

      if (tipo === 'menu') {
        const menuProductos = JSON.parse(row.dataset.menuProductos || '[]');
        const px = parseFloat(row.dataset.px) || 1;
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
        return [{ tipo: 'menu', id: menuId, nombre: opt ? opt.textContent.trim() : '',
          cantidad: cant, bocadosUnitarios: px, bocados: cant * px,
          precioUnitario: Math.round(precio), subtotal: Math.round(sub),
          productos: productosInfo, menuInsumos }];
      }

      const px = parseFloat(row.dataset.px) || 1;
      return [{ tipo, id: menuId, nombre: opt ? opt.textContent.trim() : '',
        curso: cursoSel?.value || 'Principal', cantidad: cant, bocadosUnitarios: px,
        bocados: cant * px, precioUnitario: Math.round(precio),
        subtotal: Math.round(sub) }];
    });
  },

  _collectInsumosFromItems(containerSelector) {
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

  // ── Imprimir PDF ─────────────────────────────────

  _printPDF(p) {
    // Ordenar ítems: entrada → principal → postre → bebida → otro
    const pdfMenuItems  = (p.items || []).filter(it => it.tipo === 'menu');
    const pdfOtherItems = (p.items || []).filter(it => it.tipo !== 'menu');

    const pdfSorted = [...pdfOtherItems].sort((a, b) => {
      const oa = this.CURSO_ORDER.indexOf(a.curso || 'Otro');
      const ob = this.CURSO_ORDER.indexOf(b.curso || 'Otro');
      return (oa < 0 ? 99 : oa) - (ob < 0 ? 99 : ob);
    });

    // Agrupar por curso para el PDF
    const grupos = {};
    pdfSorted.forEach(it => {
      const c = it.curso || 'Otro';
      if (!grupos[c]) grupos[c] = [];
      grupos[c].push(it);
    });

    const renderPdfMenu = (it) => {
      const subRows = (it.productos || []).map(mp => `
        <tr>
          <td style="padding:4px 10px 4px 28px;color:#888;font-size:.78rem"> ─ ${this._esc(mp.nombre)} (${mp.personas} porc.)</td>
          <td></td><td></td>
        </tr>`).join('');
      const precioUnit = it.precioUnitario > 0 ? it.precioUnitario : (it.subtotal > 0 ? Math.round(it.subtotal / (it.cantidad || 1)) : 0);
      const subtotalDisplay = it.subtotal > 0 ? it.subtotal : Math.round((it.cantidad || 1) * precioUnit);
      return `
        <tr style="background:#f4ede8">
          <td style="font-weight:700;color:#8B2E3A">Menú: ${this._esc(it.nombre || '—')}</td>
          <td style="text-align:center">${it.bocados ?? it.cantidad}</td>
          <td style="text-align:right;font-weight:700">$${Math.round(subtotalDisplay).toLocaleString('es-AR')}</td>
        </tr>
        ${subRows}`;
    };

    const renderGrupo = (titulo, items) => items.length === 0 ? '' : `
      <tr><td colspan="3" style="background:#f4ede8;font-weight:700;font-size:.75rem;
        text-transform:uppercase;letter-spacing:.06em;color:#8B2E3A;padding:6px 10px">${titulo}</td></tr>
      ${items.map(it => {
        const precioUnit = it.precioUnitario > 0
          ? it.precioUnitario
          : (it.subtotal > 0 ? Math.round(it.subtotal / (it.cantidad || 1)) : 0);
        const subtotalDisplay = it.subtotal > 0
          ? it.subtotal
          : Math.round((it.cantidad || 1) * precioUnit);
        return `
        <tr>
          <td>${this._esc(it.nombre || '—')}</td>
          <td style="text-align:center">${it.bocados ?? it.cantidad}</td>
          <td style="text-align:right">$${Math.round(subtotalDisplay).toLocaleString('es-AR')}</td>
        </tr>`;
      }).join('')}`;

    const totalBocados = (p.items || []).reduce((s, it) => s + (it.cantidad || 0), 0);
    const dietasPdf = [
      { label: 'Niños', value: p.ninos },
      { label: 'Sin TACC', value: p.sinTacc },
      { label: 'Vegetarianos', value: p.vegetarianos }
    ].filter(x => Number(x.value || 0) > 0);

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>&#8203;</title>
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
    .pdf-conditions { margin-top:28px; padding:14px 16px; background:#f9f5f3; border-left:3px solid #8B2E3A; font-size:.8rem; line-height:1.6; }
    .pdf-conditions-title { font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#8B2E3A; font-size:.75rem; margin-bottom:6px; }
    .pdf-contact { margin-top:20px; padding:14px 16px; border:1px solid #e0d0cc; border-radius:6px; font-size:.8rem; line-height:1.8; }
    .pdf-contact-title { font-weight:700; text-transform:uppercase; letter-spacing:.05em; color:#8B2E3A; font-size:.75rem; margin-bottom:6px; }
    .pdf-footer { margin-top:32px; text-align:center; color:#aaa; font-size:.72rem; border-top:1px solid #eee; padding-top:12px; }
    @media print { body { padding:20px; } }
  </style>
</head>
<body>
  <div class="pdf-header">
    <div class="pdf-brand">Cocó Catering</div>
    <div class="pdf-subtitle">Catering &amp; Eventos</div>
    <div class="pdf-title">Presupuesto #${String(p.numero || '').padStart(3,'0')}</div>
  </div>
  <div class="pdf-meta">
    <div class="pdf-meta-item">
      <div class="pdf-meta-label">Cliente</div>
      <div>${this._esc(p.cliente?.nombre || '—')}</div>
    </div>
    <div class="pdf-meta-item" style="text-align:right">
      <div class="pdf-meta-label">Teléfono</div>
      <div>${this._esc(p.cliente?.telefono || '—')}</div>
    </div>
    <div class="pdf-meta-item">
      <div class="pdf-meta-label">Tipo de evento</div>
      <div>${this._esc(p.tipoEvento || '—')}</div>
    </div>
    <div class="pdf-meta-item" style="text-align:right">
      <div class="pdf-meta-label">Fecha del evento</div>
      <div>${this._formatDate(p.fechaEvento || p.fecha)}</div>
    </div>
    <div class="pdf-meta-item">
      <div class="pdf-meta-label">Personas</div>
      <div>${p.personas || '—'}</div>
    </div>
    ${dietasPdf.map((x, i) => `
    <div class="pdf-meta-item" style="${i % 2 ? 'text-align:right' : ''}">
      <div class="pdf-meta-label">${x.label}</div>
      <div>${Number(x.value || 0)}</div>
    </div>`).join('')}
  </div>
  <table>
    <thead><tr><th></th><th style="text-align:center">Cant. porciones</th><th style="text-align:right">Subtotal</th></tr></thead>
    <tbody>
      ${pdfMenuItems.map(it => renderPdfMenu(it)).join('')}
      ${this.CURSO_ORDER.map(c => renderGrupo(c, grupos[c] || [])).join('')}
    </tbody>
  </table>
  <div class="pdf-totals">
    ${p.descuento > 0 ? `
    <div class="pdf-total-row" style="color:#888">Subtotal: $${Math.round(p.subtotalBruto || 0).toLocaleString('es-AR')}</div>
    <div class="pdf-total-row" style="color:#8B2E3A">Descuento (${p.descuento}%): -$${Math.round((p.subtotalBruto || 0) * p.descuento / 100).toLocaleString('es-AR')}</div>
    ` : ''}
    <div class="pdf-total-row">Precio por persona: <strong>$${p.personas > 0 ? Math.round(this._totalConDescuento(p) / p.personas).toLocaleString('es-AR') : '—'}</strong></div>
    <div class="pdf-total-main">Total: $${Math.round(this._totalConDescuento(p)).toLocaleString('es-AR')}</div>
  </div>
  ${p.notas ? `<div class="pdf-notas"><strong>Notas:</strong> ${this._esc(p.notas)}</div>` : ''}

  <div class="pdf-conditions">
    <div class="pdf-conditions-title">Forma de pago</div>
    30% en concepto de seña y 70% una semana previa al evento.<br><br>
    <strong>Importante:</strong> Una vez cerrado el número de invitados no se descuenta en caso de bajas. Sí podemos sumar hasta dos días antes de la fecha.
  </div>

  <div class="pdf-contact">
    <div class="pdf-contact-title">Datos de contacto</div>
    contacto@cococatering.com.ar<br>
    11.6931.8930<br>
    Centenario 1182, San Isidro
  </div>

  <div class="pdf-footer">www.cococatering.com.ar</div>
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
