// Mobile Menu Toggle Function
function toggleMobileMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileMenu = document.getElementById('mobileNavMenu');
    
    if (hamburger && mobileMenu) {
        hamburger.classList.toggle('active');
        mobileMenu.classList.toggle('active');
    }
}

// Mobile Dropdown Toggle Function
function toggleMobileDropdown(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const dropdownButton = event.currentTarget;
    const dropdown = dropdownButton.parentElement;
    
    // Cerrar otros dropdowns abiertos
    const allDropdowns = document.querySelectorAll('.mobile-dropdown');
    allDropdowns.forEach(d => {
        if (d !== dropdown) {
            d.classList.remove('active');
        }
    });
    
    // Toggle el dropdown actual
    dropdown.classList.toggle('active');
}

function initMobileMenu() {
    // Inicializar event listeners para dropdowns móviles
    const mobileDropdownToggles = document.querySelectorAll('.mobile-dropdown-toggle');
    mobileDropdownToggles.forEach(toggle => {
        toggle.removeEventListener('click', toggleMobileDropdown);
        toggle.addEventListener('click', toggleMobileDropdown);
    });

    // Close mobile menu when clicking a link
    const mobileNavLinks = document.querySelectorAll('.mobile-nav-menu a');
    mobileNavLinks.forEach(link => {
        link.addEventListener('click', function() {
            const hamburger = document.querySelector('.hamburger-menu');
            const mobileMenu = document.getElementById('mobileNavMenu');
            if (hamburger) hamburger.classList.remove('active');
            if (mobileMenu) mobileMenu.classList.remove('active');
            // Cerrar todos los dropdowns
            const allDropdowns = document.querySelectorAll('.mobile-dropdown');
            allDropdowns.forEach(d => d.classList.remove('active'));
        });
    });

    // Event listeners para mobile-nav-grid dropdowns (index.html)
    const mobileNavGridDropdowns = document.querySelectorAll('.mobile-nav-grid .nav-dropdown');
    
    mobileNavGridDropdowns.forEach(dropdown => {
        const toggle = dropdown.querySelector('.dropdown-toggle');
        
        if (toggle) {
            // Click en el botón para toggle el dropdown
            toggle.addEventListener('click', function(event) {
                event.preventDefault();
                event.stopPropagation();
                
                // Cerrar otros dropdowns del grid
                mobileNavGridDropdowns.forEach(d => {
                    if (d !== dropdown) {
                        d.classList.remove('active');
                    }
                });
                
                // Toggle el dropdown actual
                dropdown.classList.toggle('active');
            });
        }
    });

    // Close grid dropdowns when clicking a link inside them
    const mobileNavGridLinks = document.querySelectorAll('.mobile-nav-grid .nav-dropdown a');
    mobileNavGridLinks.forEach(link => {
        link.addEventListener('click', function() {
            const mobileNavGridDropdowns = document.querySelectorAll('.mobile-nav-grid .nav-dropdown');
            mobileNavGridDropdowns.forEach(d => d.classList.remove('active'));
        });
    });
}

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileMenu = document.getElementById('mobileNavMenu');
    
    if (mobileMenu && mobileMenu.classList.contains('active')) {
        if (hamburger && !hamburger.contains(event.target) && !mobileMenu.contains(event.target)) {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            // Cerrar todos los dropdowns
            const allDropdowns = document.querySelectorAll('.mobile-dropdown');
            allDropdowns.forEach(d => d.classList.remove('active'));
        }
    }

    // Cerrar dropdowns del grid al hacer click fuera
    const clickedInsideGrid = event.target.closest('.mobile-nav-grid');
    const mobileNavGridDropdowns = document.querySelectorAll('.mobile-nav-grid .nav-dropdown');
    
    if (!clickedInsideGrid) {
        mobileNavGridDropdowns.forEach(dropdown => {
            dropdown.classList.remove('active');
        });
    }
});

// Resetear estado del menú al volver a la página (bfcache)
window.addEventListener('pageshow', function(event) {
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileMenu = document.getElementById('mobileNavMenu');
    
    if (hamburger) hamburger.classList.remove('active');
    if (mobileMenu) mobileMenu.classList.remove('active');
    
    // Cerrar todos los dropdowns del menú hamburguesa
    const allDropdowns = document.querySelectorAll('.mobile-dropdown');
    allDropdowns.forEach(d => d.classList.remove('active'));

    // Cerrar dropdowns del grid (index.html)
    const mobileNavGridDropdowns = document.querySelectorAll('.mobile-nav-grid .nav-dropdown');
    mobileNavGridDropdowns.forEach(d => d.classList.remove('active'));
});

// Inicialización robusta
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMobileMenu);
} else {
    initMobileMenu();
}

// ===================================
// Protección contra inspección y copia
// ===================================
// Deshabilitar click derecho
/*
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

// Deshabilitar selección de texto
document.addEventListener('selectstart', (e) => {
    e.preventDefault();
    return false;
});

// Deshabilitar teclas de desarrollo (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
document.addEventListener('keydown', (e) => {
    if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || 
        (e.ctrlKey && e.key === 'U')
    ) {
        e.preventDefault();
        return false;
    }
});
*/

