// ================================================
// usuarios.js — Gestión de usuarios del panel admin
// Colección: admin_usuarios
// Solo cococateringsanisidro@gmail.com puede añadir/editar/eliminar
// ================================================

const Usuarios = {
  ADMIN_EMAIL: 'cococateringsanisidro@gmail.com',
  usuarios: [],

  get isAdmin() {
    return App.currentUser?.email === this.ADMIN_EMAIL;
  },

  async render() {
    document.getElementById('mainContent').innerHTML =
      '<div class="loading-spinner"><div class="spinner-ring"></div></div>';
    await this._load();
    this._renderList();
  },

  async _load() {
    try {
      let snap;
      if (this.isAdmin) {
        snap = await db.collection('admin_usuarios').get();
      } else {
        snap = await db.collection('admin_usuarios')
          .where('email', '==', App.currentUser.email)
          .get();
      }
      this.usuarios = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.email || '').localeCompare(b.email || ''));
    } catch (e) {
      console.error('Error cargando usuarios:', e);
      this.usuarios = [];
    }
  },

  _renderList() {
    const canEdit = this.isAdmin;
    document.getElementById('mainContent').innerHTML = `
      <div class="section-wrapper">
        <div class="tab-header">
          <h3>USUARIOS <span class="count-badge">${this.usuarios.length}</span></h3>
          ${canEdit
            ? `<button class="btn-primary" id="btnAddUser">+ Añadir usuario</button>`
            : '<span style="font-size:.8rem;color:var(--text-muted)">Solo la cuenta principal puede gestionar usuarios</span>'}
        </div>

        <div class="prod-list">
          <div class="prod-list-header" style="grid-template-columns:1fr 120px 120px 80px">
            <span>Email</span><span>Nombre</span><span>Rol</span><span>Estado</span>
          </div>
          ${this.usuarios.length === 0
            ? '<p class="empty-msg" style="padding:20px">No hay usuarios registrados.</p>'
            : this.usuarios.map(u => `
                <div class="prod-row ${canEdit ? '' : 'no-pointer'}" data-id="${u.id}"
                  style="grid-template-columns:1fr 120px 120px 80px">
                  <span class="prod-nombre">${this._esc(u.email || '—')}</span>
                  <span>${this._esc(u.nombre || '—')}</span>
                  <span><span class="badge ${u.rol === 'full' ? 'badge-info' : 'badge-muted'}">${u.rol === 'full' ? 'Full' : 'Limitado'}</span></span>
                  <span><span class="badge ${u.activo !== false ? 'badge-success' : 'badge-error'}">${u.activo !== false ? 'Activo' : 'Inactivo'}</span></span>
                </div>`).join('')}
        </div>
      </div>`;

    if (canEdit) {
      document.getElementById('btnAddUser')?.addEventListener('click', () => this._openModal());
      document.querySelectorAll('#mainContent .prod-row').forEach(row => {
        row.addEventListener('click', () => {
          const u = this.usuarios.find(x => x.id === row.dataset.id);
          if (u) this._openModal(u);
        });
      });
    }
  },

  _openModal(item = null) {
    const isEdit = !!item;
    App.openModal(isEdit ? 'Editar usuario' : 'Nuevo usuario', `
      <form id="fUser" class="admin-form">
        <div class="field-group">
          <label>Email *</label>
          <input id="uEmail" type="email" value="${this._esc(item?.email || '')}"
            placeholder="usuario@ejemplo.com" ${isEdit ? 'readonly style="background:var(--bg)"' : ''} required>
        </div>
        <div class="field-group">
          <label>Nombre</label>
          <input id="uNombre" type="text" value="${this._esc(item?.nombre || '')}"
            placeholder="Nombre del usuario">
        </div>
        <div class="form-row">
          <div class="field-group">
            <label>Rol</label>
            <select id="uRol">
              <option value="full"     ${(item?.rol || 'limitado') === 'full'     ? 'selected' : ''}>Full</option>
              <option value="limitado" ${(item?.rol || 'limitado') === 'limitado' ? 'selected' : ''}>Limitado</option>
            </select>
          </div>
          <div class="field-group">
            <label>Estado</label>
            <select id="uActivo">
              <option value="true"  ${item?.activo !== false ? 'selected' : ''}>Activo</option>
              <option value="false" ${item?.activo === false  ? 'selected' : ''}>Inactivo</option>
            </select>
          </div>
        </div>
        <div class="form-actions">
          ${isEdit && item?.email !== this.ADMIN_EMAIL
            ? `<button type="button" class="btn-danger" id="btnDelUser">🗑️ Eliminar</button>` : ''}
          <button type="button" class="btn-secondary" onclick="App.closeModal()">Cancelar</button>
          <button type="submit" class="btn-primary" id="btnSaveUser">${isEdit ? 'Guardar' : 'Crear usuario'}</button>
        </div>
      </form>`, 'sm');

    document.getElementById('btnDelUser')?.addEventListener('click', async () => {
      App.closeModalForce();
      await this._delete(item.id, item.email);
    });

    document.getElementById('fUser').addEventListener('submit', async (e) => {
      e.preventDefault();
      const btn = document.getElementById('btnSaveUser');
      btn.disabled = true; btn.textContent = 'Guardando…';
      try {
        const data = {
          email:  document.getElementById('uEmail').value.trim().toLowerCase(),
          nombre: document.getElementById('uNombre').value.trim(),
          rol:    document.getElementById('uRol').value,
          activo: document.getElementById('uActivo').value === 'true',
          actualizadoEn: firebase.firestore.FieldValue.serverTimestamp()
        };
        if (!data.email) {
          App.toast('Ingresá el email', 'warning');
          btn.disabled = false; btn.textContent = isEdit ? 'Guardar' : 'Crear usuario'; return;
        }
        if (isEdit) {
          await db.collection('admin_usuarios').doc(item.id).update(data);
          App.closeModalForce();
          App.toast('Usuario actualizado', 'success');
          await this._load();
          this._renderList();
        } else {
          // Crear cuenta en Firebase Auth con contraseña temporal aleatoria
          const tempPass = Math.random().toString(36).slice(2, 10) + Math.random().toString(36).slice(2, 6).toUpperCase() + '!1';
          data.creadoEn = firebase.firestore.FieldValue.serverTimestamp();
          // createUserWithEmailAndPassword cambia la sesión activa al nuevo usuario
          const cred = await auth.createUserWithEmailAndPassword(data.email, tempPass);
          await db.collection('admin_usuarios').add(data);
          // Cerrar sesión del nuevo usuario para volver al login
          await auth.signOut();
          App.toast('Usuario creado. Para ingresar, el usuario debe usar "Recuperar contraseña" con su email.', 'success');
        }
      } catch (err) {
        console.error(err);
        App.toast('Error al guardar', 'error');
        btn.disabled = false; btn.textContent = isEdit ? 'Guardar' : 'Crear usuario';
      }
    });
  },

  async _delete(id, email) {
    if (!confirm(`¿Eliminar usuario ${email}?`)) return;
    try {
      await db.collection('admin_usuarios').doc(id).delete();
      App.toast('Usuario eliminado', 'success');
      await this._load();
      this._renderList();
    } catch { App.toast('Error al eliminar', 'error'); }
  },

  _esc(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }
};
