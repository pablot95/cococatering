// ================================================
// auth.js — Autenticación con Firebase Auth
// ================================================

const Auth = {
  init() {
    // Listener de cambio de estado de autenticación
    auth.onAuthStateChanged(user => {
      if (user) {
        this._onLogin(user);
      } else {
        this._onLogout();
      }
    });

    // Formulario de login
    document.getElementById('loginForm').addEventListener('submit', (e) => {
      e.preventDefault();
      this._doLogin();
    });

    // Botón logout
    document.getElementById('btnLogout').addEventListener('click', () => this._doLogout());

    // Recuperar contraseña
    document.getElementById('btnForgotPass').addEventListener('click', () => this._doForgotPassword());
  },

  async _doLogin() {
    const email   = document.getElementById('loginEmail').value.trim();
    const pass    = document.getElementById('loginPass').value;
    const errorEl = document.getElementById('loginError');
    const btn     = document.getElementById('btnLogin');
    const btnText = document.getElementById('btnLoginText');

    if (!email || !pass) return;

    btn.disabled    = true;
    btnText.textContent = '…';
    errorEl.classList.add('hidden');

    try {
      await auth.signInWithEmailAndPassword(email, pass);
      // onAuthStateChanged manejará el resto
    } catch (err) {
      let msg = 'Error al iniciar sesión. Intentá de nuevo.';
      switch (err.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
        case 'auth/invalid-email':
          msg = 'Correo o contraseña incorrectos.';
          break;
        case 'auth/too-many-requests':
          msg = 'Demasiados intentos fallidos. Esperá un momento.';
          break;
        case 'auth/user-disabled':
          msg = 'Esta cuenta fue deshabilitada.';
          break;
        case 'auth/network-request-failed':
          msg = 'Error de conexión. Verificá tu internet.';
          break;
      }
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
    } finally {
      btn.disabled    = false;
      btnText.textContent = 'Ingresar';
    }
  },

  async _onLogin(user) {
    document.getElementById('loginScreen').classList.add('hidden');
    // Mostrar email en topbar y menú móvil
    document.getElementById('topbarUser').textContent  = user.email;
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) userEmailEl.textContent = user.email;
    // Cargar datos del usuario desde Firestore (para leer el rol)
    try {
      const snap = await db.collection('admin_usuarios').where('email', '==', user.email).limit(1).get();
      const doc  = snap.empty ? null : snap.docs[0].data();
      App.setUser(user, doc);
    } catch (e) {
      console.warn('No se pudo cargar el rol del usuario:', e);
      App.setUser(user, null);
    }
    // Inicializar la app (aplica rol-limitado ANTES de mostrar el panel)
    App.init();
    document.getElementById('adminApp').classList.remove('hidden');
  },

  _onLogout() {
    document.getElementById('loginScreen').classList.remove('hidden');
    document.getElementById('adminApp').classList.add('hidden');
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPass').value  = '';
  },

  async _doLogout() {
    if (confirm('¿Querés cerrar sesión?')) {
      await auth.signOut();
    }
  },

  async _doForgotPassword() {
    const email = document.getElementById('loginEmail').value.trim();
    const errorEl = document.getElementById('loginError');

    // Si no hay email escrito, pedirlo
    if (!email) {
      errorEl.textContent = 'Ingresá tu correo electrónico primero.';
      errorEl.classList.remove('hidden');
      errorEl.style.color = 'var(--warning, #b07d2a)';
      document.getElementById('loginEmail').focus();
      return;
    }

    const btn = document.getElementById('btnForgotPass');
    btn.disabled = true;
    btn.textContent = 'Enviando…';
    errorEl.classList.add('hidden');

    try {
      await auth.sendPasswordResetEmail(email);
      errorEl.style.color = 'var(--success, #2a7d4f)';
      errorEl.textContent = `Se envió un correo de recuperación a ${email}.`;
      errorEl.classList.remove('hidden');
    } catch (err) {
      let msg = 'No se pudo enviar el correo. Intentá de nuevo.';
      if (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-email') {
        msg = 'No hay ninguna cuenta con ese correo.';
      } else if (err.code === 'auth/network-request-failed') {
        msg = 'Error de conexión. Verificá tu internet.';
      }
      errorEl.style.color = 'var(--error, #b02a2a)';
      errorEl.textContent = msg;
      errorEl.classList.remove('hidden');
    } finally {
      btn.disabled = false;
      btn.textContent = '¿Olvidaste tu contraseña?';
    }
  }
};

// Inicializar auth al cargar la página
Auth.init();
