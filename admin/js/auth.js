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

  _onLogin(user) {
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('adminApp').classList.remove('hidden');
    // Mostrar email en topbar y menú móvil
    document.getElementById('topbarUser').textContent  = user.email;
    const userEmailEl = document.getElementById('userEmail');
    if (userEmailEl) userEmailEl.textContent = user.email;
    // Guardar usuario actual en App
    App.setUser(user);
    // Inicializar la app
    App.init();
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
  }
};

// Inicializar auth al cargar la página
Auth.init();
