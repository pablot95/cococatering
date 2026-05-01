// ================================================
// gastos.js — Gestión de gastos fijos y variables
// Colección: admin_gastos
// ================================================

const Gastos = {
  gastos: [],
  mesActual: null,

  TIPOS: {
    fijo: {
      label: 'Gasto fijo',
      cats: ['Sueldo', 'Servicio básico', 'Honorario', 'Alquiler', 'Seguro', 'Otro fijo']
    },
    variable: {
      label: 'Gasto variable',
      cats: ['Materia prima', 'Insumo', 'Gasto operativo', 'Publicidad', 'Transporte', 'Otro variable']
    }
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
      const snap = await db.collection('admin_gastos')
        .where('mes', '==', mes)
        .orderBy('fecha', 'desc')
        .get();
      this.gastos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (e) {
      // Si no hay índice, cargamos todo y filtramos
      try {
        const snap = await db.collection('admin_gastos').orderBy('fecha', 'desc').get();
        this.gastos = snap.docs
          .map(d => ({ id: d.id, ...d.data() }))
          .filter(g => (g.mes || g.fecha?.slice(0, 7)) === mes);
      } catch (err) { this.gastos = []; }
    }
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
          <h3>Gastos <span class="count-badge" id="gastoCount">${this.gastos.length}</span></h3>
          <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
            <input type="month" id="gastoMes" value="${this.mesActual}" class="filter-input-inline">
            <button class="btn-primary" id="btnAddGasto">+ Nuevo gasto</button>
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
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${this.gastos.length === 0
                ? '<tr><td colspan="6" class="empty-msg">No hay gastos en este período.</td></tr>'
                : this.gastos.map(g => `
                  <tr>
                    <td>${this._formatDate(g.fecha)}</td>
                    <td><span class="badge ${g.tipo === 'fijo' ? 'badge-info' : 'badge-warning'}">${g.tipo === 'fijo' ? 'Fijo' : 'Variable'}</span></td>
                    <td>${this._esc(g.categoria || '—')}</td>
                    <td>${this._esc(g.descripcion || '—')}</td>
                    <td style="font-weight:700;color:var(--bordo)">$${Math.round(g.monto || 0).toLocaleString('es-AR')}</td>
                    <td class="actions-cell">
                      <button class="btn-icon btn-edit"   data-id="${g.id}">✏️ Editar</button>
                      <button class="btn-icon btn-delete" data-id="${g.id}">🗑️</button>
                    </td>
                  </tr>`).join('')}
            </tbody>
          </table>
        </div>
      </div>`;

    document.getElementById('btnAddGasto').addEventListener('click', () => this._openModal());
    document.getElementById('gastoMes').addEventListener('change', async (e) => {
      await this._load(e.target.value);
      this._renderPage();
    });
    document.querySelectorAll('#mainContent .btn-edit').forEach(btn => {
      btn.addEventListener('click', () => {
        const g = this.gastos.find(x => x.id === btn.dataset.id);
        if (g) this._openModal(g);
      });
    });
    document.querySelectorAll('#mainContent .btn-delete').forEach(btn => {
      btn.addEventListener('click', () => this._delete(btn.dataset.id));
    });
  },

  async _delete(id) {
    if (!confirm('¿Eliminar este gasto? Esta acción no se puede deshacer.')) return;
    try {
      await db.collection('admin_gastos').doc(id).delete();
      App.toast('Gasto eliminado', 'success');
      await this._load(this.mesActual);
      this._renderPage();
    } catch (e) { App.toast('Error al eliminar', 'error'); }
  },

  _openModal(item = null) {
    const isEdit = !!item;
    const today  = new Date().toISOString().slice(0, 10);
    const tipoAct = item?.tipo || 'fijo';

    App.openModal(isEdit ? 'Editar gasto' : 'Nuevo gasto', `
      <form id="fGasto" class="admin-form">
        <div class="form-row">
          <div class="field-group">
            <label>Fecha *</label>
            <input id="gFecha" type="date" value="${item?.fecha || today}" required>
          </div>
          <div class="field-group">
            <label>Tipo *</label>
            <select id="gTipo" required>
              <option value="fijo"     ${tipoAct === 'fijo'     ? 'selected' : ''}>Gasto fijo</option>
              <option value="variable" ${tipoAct === 'variable' ? 'selected' : ''}>Gasto variable</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Categoría</label>
            <select id="gCategoria">${this._catOptions(tipoAct, item?.categoria)}</select>
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
      document.getElementById('gCategoria').innerHTML = this._catOptions(e.target.value, null);
    });
    document.getElementById('btnCancelGasto').addEventListener('click', () => App.closeModal());
    document.getElementById('fGasto').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fecha = document.getElementById('gFecha').value;
      const data = {
        fecha,
        mes:         fecha.slice(0, 7),
        tipo:        document.getElementById('gTipo').value,
        categoria:   document.getElementById('gCategoria').value,
        descripcion: document.getElementById('gDesc').value.trim(),
        monto:       Math.round(parseFloat(document.getElementById('gMonto').value) || 0)
      };
      if (!data.fecha || !data.monto) { App.toast('Completá los campos obligatorios', 'warning'); return; }
      try {
        if (isEdit) {
          await db.collection('admin_gastos').doc(item.id).update(data);
        } else {
          data.creadoEn = firebase.firestore.FieldValue.serverTimestamp();
          await db.collection('admin_gastos').add(data);
        }
        App.closeModal();
        App.toast(isEdit ? 'Gasto actualizado' : 'Gasto registrado', 'success');
        await this._load(this.mesActual);
        this._renderPage();
      } catch (err) { App.toast('Error al guardar', 'error'); }
    });
  },

  _catOptions(tipo, selected) {
    const cats = this.TIPOS[tipo]?.cats || [];
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
