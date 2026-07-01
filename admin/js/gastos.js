// ================================================
// gastos.js — Gestión de gastos fijos y variables
// Colección: admin_gastos
// ================================================

const Gastos = {
  gastos: [],
  mesActual: null,
  customCats: { fijo: [], variable: [] },

  TIPOS: {
    fijo: {
      label: 'Gasto fijo',
      cats: ['Sueldo', 'Servicio básico', 'Honorario', 'Alquiler', 'Seguro', 'Otro fijo']
    },
    variable: {
      label: 'Gasto variable',
      cats: ['Costo de servicio', 'Insumo', 'Gasto operativo', 'Publicidad', 'Transporte', 'Otro variable']
    }
  },

  _allCats(tipo) {
    const base = this.TIPOS[tipo]?.cats || [];
    const custom = this.customCats[tipo] || [];
    return [...base, ...custom.filter(c => !base.includes(c))];
  },

  async render() {
    const hoy = new Date();
    this.mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}`;
    document.getElementById('mainContent').innerHTML =
      '<div class="loading-spinner"><div class="spinner-ring"></div></div>';
    await this._load(this.mesActual);
    this._renderPage();
  },

  async _load(mes) {
    this.mesActual = mes;
    try {
      // Cargar categorías personalizadas
      const cfgDoc = await db.collection('admin_config').doc('gastos_cats').get().catch(() => null);
      if (cfgDoc && cfgDoc.exists) {
        const d = cfgDoc.data();
        this.customCats.fijo     = d.fijo     || [];
        this.customCats.variable = d.variable || [];
      }
    } catch (_) {}
    try {
      // Cargar todos los gastos y filtrar en memoria
      const snap = await db.collection('admin_gastos').get();
      const todos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Fijos recurrentes: aparecen en todos los meses
      const fijosRec  = todos.filter(g => g.tipo === 'fijo' && g.recurrente === true);
      // Fijos viejos (sin recurrente): solo del mes actual
      const fijosViejo = todos.filter(g => g.tipo === 'fijo' && !g.recurrente && (g.mes || (g.fecha || '').slice(0,7)) === mes);
      // Variables: solo del mes actual
      const variables  = todos.filter(g => g.tipo === 'variable' && (g.mes || (g.fecha || '').slice(0,7)) === mes);
      this.gastos = [...fijosRec, ...fijosViejo, ...variables];
    } catch (e) { this.gastos = []; }
  },

  _renderPage() {
    const totalFijo = this.gastos.filter(g => g.tipo === 'fijo')
      .reduce((a, g) => a + (g.monto || 0), 0);
    const totalVar = this.gastos.filter(g => g.tipo === 'variable')
      .reduce((a, g) => a + (g.monto || 0), 0);
    const totalGen = totalFijo + totalVar;

    document.getElementById('mainContent').innerHTML = `
      <div class="section-wrapper">
        <div class="tab-header">
          <h3>GASTOS <span class="count-badge" id="gastoCount">${this.gastos.length}</span></h3>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            ${App.monthSelectHTML('gastoMes', this.mesActual)}
            <button class="btn-primary" id="btnAddGasto">Nuevo gasto</button>
          </div>
        </div>

        <div class="stats-grid" style="grid-template-columns:repeat(3,1fr)">
          <div class="stat-card info">
            <div class="stat-label">📌 Gastos fijos</div>
            <div class="stat-value">$${totalFijo.toLocaleString('es-AR')}</div>
            <div class="stat-sub">${this.gastos.filter(g => g.tipo === 'fijo').length} ítem${this.gastos.filter(g => g.tipo === 'fijo').length !== 1 ? 's' : ''}</div>
          </div>
          <div class="stat-card warning">
            <div class="stat-label">📦 Gastos variables</div>
            <div class="stat-value">$${totalVar.toLocaleString('es-AR')}</div>
            <div class="stat-sub">${this.gastos.filter(g => g.tipo === 'variable').length} ítem${this.gastos.filter(g => g.tipo === 'variable').length !== 1 ? 's' : ''}</div>
          </div>
          <div class="stat-card expense">
            <div class="stat-label">💸 Total egresos</div>
            <div class="stat-value">$${totalGen.toLocaleString('es-AR')}</div>
            <div class="stat-sub">${this.gastos.length} gasto${this.gastos.length !== 1 ? 's' : ''} registrado${this.gastos.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div class="table-wrapper">
          <table class="admin-table">
            <thead>
              <tr>
                <th>Fecha</th>
                <th>Tipo</th>
                <th>Categoría</th>
                <th>Descripción</th>
                <th>Monto</th>
                <th style="text-align:center">Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${this.gastos.length === 0
                ? '<tr><td colspan="7" class="empty-msg">No hay gastos en este período.</td></tr>'
                : this.gastos.map(g => {
                  const esFijo   = g.tipo === 'fijo';
                  const pagado   = esFijo && g.recurrente
                    ? !!(g.pagadoPorMes?.[this.mesActual])
                    : !!g.pagado;
                  const rowStyle = esFijo && pagado
                    ? 'opacity:.6;background:var(--bg)'
                    : esFijo && !pagado
                      ? 'border-left:3px solid var(--warning)'
                      : '';
                  return `
                  <tr class="${g.auto && g.servicioId ? 'gasto-auto-row' : (g.auto ? '' : 'gasto-edit-row')}" style="cursor:pointer;${rowStyle}" data-id="${g.id}" ${g.auto && g.servicioId ? `data-servicioid="${g.servicioId}"` : ''}>
                    <td>${this._formatDate(g.fecha)}</td>
                    <td>
                      <span class="badge ${g.tipo === 'fijo' ? 'badge-info' : 'badge-warning'}">${g.tipo === 'fijo' ? 'Fijo' : 'Variable'}</span>
                    </td>
                    <td>${this._esc(g.categoria || '—')}</td>
                    <td>
                      ${this._esc(g.descripcion || '—')}
                      ${g.auto && g.servicioId ? `<span style="font-size:.72rem;color:var(--bordo);margin-left:6px">🔗 Ver servicio</span>` : ''}
                    </td>
                    <td style="font-weight:700;color:${esFijo && pagado ? 'var(--text-muted)' : 'var(--bordo)'};${esFijo && pagado ? 'text-decoration:line-through' : ''}">$${Math.round(g.monto || 0).toLocaleString('es-AR')}</td>
                    <td style="text-align:center">
                      ${esFijo
                        ? `<button class="btn-pago-toggle" data-id="${g.id}" data-pagado="${pagado}" data-recurrente="${!!g.recurrente}"
                            style="border:none;border-radius:20px;padding:3px 12px;font-size:.75rem;font-weight:700;cursor:pointer;background:${pagado ? 'var(--success)' : 'var(--border)'};color:${pagado ? '#fff' : 'var(--text-muted)'}">
                            ${pagado ? '✓ Pagado' : 'Pendiente'}
                           </button>`
                        : '<span style="font-size:.75rem;color:var(--text-muted)">—</span>'}
                    </td>
                    <td class="actions-cell">
                      ${g.auto
                        ? '<span style="font-size:.75rem;color:var(--text-muted)">Desde servicio</span>'
                        : `<button class="btn-icon btn-delete" data-id="${g.id}" data-recurrente="${!!g.recurrente}">🗑️</button>
                           ${esFijo ? `<button class="btn-pago-toggle btn-pago-action" data-id="${g.id}" data-pagado="${pagado}" data-recurrente="${!!g.recurrente}"
                            style="border:none;border-radius:20px;padding:3px 12px;font-size:.75rem;font-weight:700;cursor:pointer;margin-left:6px;background:${pagado ? 'var(--success)' : 'var(--warning)'};color:#fff">
                            ${pagado ? '✓ Pagado' : 'Marcar pagado'}
                           </button>` : ''}`}
                    </td>
                  </tr>`;
                }).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('btnAddGasto').addEventListener('click', () => this._openModal());
    const onMesCh = async () => {
      const val = App.monthSelectValue('gastoMes');
      if (val) { await this._load(val); this._renderPage(); }
    };
    document.getElementById('gastoMes-mes').addEventListener('change', onMesCh);
    document.getElementById('gastoMes-anio').addEventListener('change', onMesCh);
    document.querySelectorAll('#mainContent .gasto-edit-row').forEach(tr => {
      tr.addEventListener('click', (e) => {
        if (e.target.closest('button')) return;
        const g = this.gastos.find(x => x.id === tr.dataset.id);
        if (g) this._openModal(g);
      });
    });
    document.querySelectorAll('#mainContent .btn-delete').forEach(btn => {
      btn.addEventListener('click', () => this._delete(btn.dataset.id, btn.dataset.recurrente === 'true'));
    });
    document.querySelectorAll('#mainContent .btn-pago-toggle').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._togglePagado(btn.dataset.id, btn.dataset.pagado === 'true', btn.dataset.recurrente === 'true');
      });
    });
    // Filas auto con servicio vinculado → abrir detalle del servicio
    document.querySelectorAll('#mainContent .gasto-auto-row[data-servicioid]').forEach(tr => {
      tr.addEventListener('click', async (e) => {
        if (e.target.closest('button')) return; // no interferir con botones internos
        const servicioId = tr.dataset.servicioid;
        try {
          const snap = await db.collection('admin_servicios').doc(servicioId).get();
          if (!snap.exists) { App.toast('Servicio no encontrado', 'warning'); return; }
          const svc = { id: snap.id, ...snap.data() };
          // Asegurar que Servicios tenga el servicio en cache para búsquedas internas
          if (Servicios && Servicios._openDetail) {
            if (!Servicios.servicios.some(s => s.id === svc.id)) Servicios.servicios.push(svc);
            Servicios._openDetail(svc);
          }
        } catch (e) { App.toast('Error al cargar el servicio', 'error'); }
      });
    });
  },

  async _togglePagado(id, estabaPagado, esRecurrente) {
    try {
      if (esRecurrente) {
        const update = {};
        update[`pagadoPorMes.${this.mesActual}`] = !estabaPagado;
        await db.collection('admin_gastos').doc(id).update(update);
        const g = this.gastos.find(x => x.id === id);
        if (g) {
          if (!g.pagadoPorMes) g.pagadoPorMes = {};
          g.pagadoPorMes[this.mesActual] = !estabaPagado;
        }
      } else {
        await db.collection('admin_gastos').doc(id).update({ pagado: !estabaPagado });
        const g = this.gastos.find(x => x.id === id);
        if (g) g.pagado = !estabaPagado;
      }
      this._renderPage();
    } catch (e) { App.toast('Error al actualizar', 'error'); }
  },

  async _delete(id, esRecurrente) {
    const msg = esRecurrente
      ? '¿Eliminar este gasto fijo recurrente? Dejará de aparecer en todos los meses.'
      : '¿Eliminar este gasto? Esta acción no se puede deshacer.';
    if (!confirm(msg)) return;
    try {
      await db.collection('admin_gastos').doc(id).delete();
      App.toast('Gasto eliminado', 'success');
      await this._load(this.mesActual);
      this._renderPage();
    } catch (e) { App.toast('Error al eliminar', 'error'); }
  },

  _openModal(item = null) {
    const isEdit  = !!item;
    const today   = new Date().toISOString().slice(0, 10);
    const tipoAct = item?.tipo || 'fijo';
    const esRec   = item ? !!item.recurrente : tipoAct === 'fijo';

    App.openModal(isEdit ? 'Editar gasto' : 'Nuevo gasto', `
      <form id="fGasto" class="admin-form">
        <div class="form-row">
          <div class="field-group" id="gFechaWrap" style="display:${tipoAct === 'fijo' ? 'none' : ''}">
            <label>Fecha *</label>
            <input id="gFecha" type="date" value="${item?.fecha || today}">
          </div>
          <div class="field-group">
            <label>Tipo *</label>
            <select id="gTipo" required>
              <option value="fijo"     ${tipoAct === 'fijo'     ? 'selected' : ''}>Gasto fijo (recurrente mensual)</option>
              <option value="variable" ${tipoAct === 'variable' ? 'selected' : ''}>Gasto variable</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Categoría</label>
            <select id="gCategoria">${this._catOptions(tipoAct, item?.categoria)}</select>
            <div style="display:flex;gap:6px;margin-top:6px">
              <input id="gNewCat" type="text" placeholder="Nueva categoría…"
                style="flex:1;padding:5px 8px;font-size:.82rem;border:1.5px solid var(--border);border-radius:6px">
              <button type="button" id="btnAddCat"
                style="padding:5px 12px;background:var(--bordo);color:#fff;border:none;border-radius:6px;font-size:.82rem;cursor:pointer;white-space:nowrap">
                + Agregar
              </button>
            </div>
          </div>
          <div class="field-group">
            <label>Monto ($) *</label>
            <input id="gMonto" type="number" min="0" step="1"
              value="${item?.monto || ''}" placeholder="0" required>
          </div>
        </div>
        <div class="field-group">
          <label>Descripción</label>
          <input id="gDesc" type="text" value="${this._esc(item?.descripcion || '')}"
            placeholder="Descripción del gasto…">
        </div>
        <div class="form-actions">
          <button type="button" class="btn-secondary" id="btnCancelGasto">Cancelar</button>
          <button type="submit" class="btn-primary">${isEdit ? 'Guardar cambios' : 'Registrar gasto'}</button>
        </div>
      </form>`, 'md');

    document.getElementById('gTipo').addEventListener('change', (e) => {
      const esFijo = e.target.value === 'fijo';
      document.getElementById('gCategoria').innerHTML = this._catOptions(e.target.value, null);
      document.getElementById('gFechaWrap').style.display = esFijo ? 'none' : '';
      document.getElementById('gFijoNote').style.display  = esFijo ? 'flex' : 'none';
    });

    document.getElementById('btnAddCat').addEventListener('click', async () => {
      const input  = document.getElementById('gNewCat');
      const nombre = input.value.trim();
      if (!nombre) return;
      const tipo   = document.getElementById('gTipo').value;
      if (!this.customCats[tipo]) this.customCats[tipo] = [];
      if (!this._allCats(tipo).includes(nombre)) {
        this.customCats[tipo].push(nombre);
        try {
          await db.collection('admin_config').doc('gastos_cats').set(
            { [tipo]: this.customCats[tipo] }, { merge: true }
          );
        } catch (_) {}
      }
      document.getElementById('gCategoria').innerHTML = this._catOptions(tipo, nombre);
      input.value = '';
      App.toast(`Categoría “${nombre}” agregada`, 'success');
    });

    document.getElementById('btnCancelGasto').addEventListener('click', () => App.closeModal());
    document.getElementById('fGasto').addEventListener('submit', async (e) => {
      e.preventDefault();
      const tipo  = document.getElementById('gTipo').value;
      const esFijo = tipo === 'fijo';
      const fecha = esFijo ? null : document.getElementById('gFecha').value;
      const data = {
        tipo,
        categoria:   document.getElementById('gCategoria').value,
        descripcion: document.getElementById('gDesc').value.trim(),
        monto:       Math.round(parseFloat(document.getElementById('gMonto').value) || 0)
      };
      if (esFijo) {
        data.recurrente = true;
      } else {
        if (!fecha) { App.toast('Completá la fecha', 'warning'); return; }
        data.fecha = fecha;
        data.mes   = fecha.slice(0, 7);
      }
      if (!data.monto) { App.toast('Ingresá un monto', 'warning'); return; }
      try {
        if (isEdit) {
          await db.collection('admin_gastos').doc(item.id).update(data);
        } else {
          data.creadoEn = firebase.firestore.FieldValue.serverTimestamp();
          await db.collection('admin_gastos').add(data);
        }
        App.closeModalForce();
        App.toast(isEdit ? 'Gasto actualizado' : 'Gasto registrado', 'success');
        await this._load(this.mesActual);
        this._renderPage();
      } catch (err) { App.toast('Error al guardar', 'error'); }
    });
  },

  _catOptions(tipo, selected) {
    const cats = this._allCats(tipo);
    return cats.map(c =>
      `<option value="${c}" ${selected === c ? 'selected' : ''}>${c}</option>`
    ).join('');
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
