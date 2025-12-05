// Mobile Menu Toggle Function
function toggleMobileMenu() {
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileMenu = document.getElementById('mobileNavMenu');
    
    hamburger.classList.toggle('active');
    mobileMenu.classList.toggle('active');
}

// Mobile Dropdown Toggle Function
function toggleMobileDropdown(event) {
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

// Close mobile menu when clicking outside
document.addEventListener('click', function(event) {
    const hamburger = document.querySelector('.hamburger-menu');
    const mobileMenu = document.getElementById('mobileNavMenu');
    
    if (mobileMenu && mobileMenu.classList.contains('active')) {
        if (!hamburger.contains(event.target) && !mobileMenu.contains(event.target)) {
            hamburger.classList.remove('active');
            mobileMenu.classList.remove('active');
            // Cerrar todos los dropdowns
            const allDropdowns = document.querySelectorAll('.mobile-dropdown');
            allDropdowns.forEach(d => d.classList.remove('active'));
        }
    }
});

// Close mobile menu when clicking a link
const mobileNavLinks = document.querySelectorAll('.mobile-nav-menu a');
mobileNavLinks.forEach(link => {
    link.addEventListener('click', function() {
        const hamburger = document.querySelector('.hamburger-menu');
        const mobileMenu = document.getElementById('mobileNavMenu');
        hamburger.classList.remove('active');
        mobileMenu.classList.remove('active');
        // Cerrar todos los dropdowns
        const allDropdowns = document.querySelectorAll('.mobile-dropdown');
        allDropdowns.forEach(d => d.classList.remove('active'));
    });
});

// Inicializar event listeners para dropdowns móviles
document.addEventListener('DOMContentLoaded', function() {
    const mobileDropdownToggles = document.querySelectorAll('.mobile-dropdown-toggle');
    mobileDropdownToggles.forEach(toggle => {
        toggle.addEventListener('click', toggleMobileDropdown);
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

    // Cerrar dropdowns del grid al hacer click fuera
    document.addEventListener('click', function(event) {
        const clickedInsideGrid = event.target.closest('.mobile-nav-grid');
        
        if (!clickedInsideGrid) {
            mobileNavGridDropdowns.forEach(dropdown => {
                dropdown.classList.remove('active');
            });
        }
    });
});
