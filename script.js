// ===================================
// Carrusel de Imágenes
// ===================================
let currentSlideIndex = 0;
const slides = document.querySelectorAll('.carousel-slide');
const indicators = document.querySelectorAll('.indicator');
let autoSlideInterval;

// Mostrar slide específico
function showSlide(index) {
    // Asegurar que el índice esté en rango
    if (index >= slides.length) {
        currentSlideIndex = 0;
    } else if (index < 0) {
        currentSlideIndex = slides.length - 1;
    } else {
        currentSlideIndex = index;
    }

    // Remover clase active de todos los slides e indicadores
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    // Agregar clase active al slide e indicador actual
    slides[currentSlideIndex].classList.add('active');
    indicators[currentSlideIndex].classList.add('active');
}

// Cambiar slide (prev/next)
function changeSlide(direction) {
    showSlide(currentSlideIndex + direction);
    resetAutoSlide();
}

// Ir a slide específico
function currentSlide(index) {
    showSlide(index);
    resetAutoSlide();
}

// Auto-avance del carrusel
function startAutoSlide() {
    autoSlideInterval = setInterval(() => {
        showSlide(currentSlideIndex + 1);
    }, 5000); // Cambia cada 5 segundos
}

// Reiniciar auto-avance
function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
}

// Iniciar carrusel al cargar
document.addEventListener('DOMContentLoaded', () => {
    showSlide(0);
    startAutoSlide();

    // Pausar auto-slide al hover sobre controles
    const controls = document.querySelectorAll('.carousel-control, .indicator');
    controls.forEach(control => {
        control.addEventListener('mouseenter', () => {
            clearInterval(autoSlideInterval);
        });
        control.addEventListener('mouseleave', () => {
            resetAutoSlide();
        });
    });

    // Soporte para swipe en móviles
    let touchStartX = 0;
    let touchEndX = 0;

    const carousel = document.querySelector('.hero-carousel');

    carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    carousel.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        if (touchEndX < touchStartX - 50) {
            // Swipe izquierda
            changeSlide(1);
        }
        if (touchEndX > touchStartX + 50) {
            // Swipe derecha
            changeSlide(-1);
        }
    }
});

// ===================================
// Animación de entrada para botones
// ===================================
const navButtons = document.querySelectorAll('.nav-btn');

navButtons.forEach((btn, index) => {
    btn.style.animation = `fadeInUp 0.6s ease ${0.1 * index + 0.5}s backwards`;
});

// ===================================
// Control de navegación con teclado
// ===================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        changeSlide(-1);
    } else if (e.key === 'ArrowRight') {
        changeSlide(1);
    }
});

// ===================================
// Efecto parallax suave en logo
// ===================================
window.addEventListener('scroll', () => {
    const logo = document.querySelector('.logo-header');
    const scrolled = window.pageYOffset;
    
    if (logo && scrolled < 100) {
        logo.style.transform = `translate(-50%, ${scrolled * 0.3}px)`;
    }
});

console.log('%c🍽️ Cocó Catering - Bienvenido! ', 'background: #8B2E3A; color: #FEFEFE; font-size: 16px; padding: 10px; border-radius: 5px;');

// ===================================
// Protección contra inspección y copia
// ===================================

// Deshabilitar click derecho
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

// Deshabilitar selección de texto
document.addEventListener('selectstart', (e) => {
    e.preventDefault();
    return false;
});


// Deshabilitar atajos de teclado para inspeccionar
document.addEventListener('keydown', (e) => {
    // F12
    if (e.key === 'F12') {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+Shift+I (Inspeccionar)
    if (e.ctrlKey && e.shiftKey && e.key === 'I') {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+Shift+J (Consola)
    if (e.ctrlKey && e.shiftKey && e.key === 'J') {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+Shift+C (Selector de elementos)
    if (e.ctrlKey && e.shiftKey && e.key === 'C') {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+U (Ver código fuente)
    if (e.ctrlKey && e.key === 'u') {
        e.preventDefault();
        return false;
    }
    
    // Ctrl+S (Guardar página)
    if (e.ctrlKey && e.key === 's') {
        e.preventDefault();
        return false;
    }
});

// Deshabilitar arrastrar imágenes
document.addEventListener('dragstart', (e) => {
    if (e.target.tagName === 'IMG') {
        e.preventDefault();
        return false;
    }
});

// ===================================
// Función para agregar productos al carrito
// ===================================
function addToCart(product) {
    console.log('Agregando producto al carrito:', product);
    
    // Obtener carrito actual del localStorage
    let cart = JSON.parse(localStorage.getItem('cart')) || [];
    
    // Buscar si el producto ya existe en el carrito
    const existingIndex = cart.findIndex(item => item.id === product.id && item.name === product.name);
    
    if (existingIndex !== -1) {
        // Si existe, aumentar la cantidad
        cart[existingIndex].quantity += product.quantity;
    } else {
        // Si no existe, agregarlo
        cart.push(product);
    }
    
    // Guardar en localStorage
    localStorage.setItem('cart', JSON.stringify(cart));
    
    // Actualizar contador del carrito
    updateCartCount();
    
    // Mostrar mensaje de confirmación
    showCartNotification(product.quantity);
    
    console.log('Carrito actualizado:', cart);
}

// Actualizar contador del carrito
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElement = document.querySelector('.cart-count');
    if (cartCountElement) {
        cartCountElement.textContent = totalItems;
        if (totalItems > 0) {
            cartCountElement.style.display = 'flex';
        }
    }
}

// Mostrar notificación al agregar al carrito
function showCartNotification(quantity) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.textContent = `✓ ${quantity} producto(s) agregado(s) al carrito`;
    notification.style.cssText = `
        position: fixed;
        bottom: 100px;
        right: 20px;
        background: #28a745;
        color: white;
        padding: 15px 25px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        animation: slideIn 0.3s ease;
        font-weight: 500;
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Inicializar contador del carrito al cargar la página
document.addEventListener('DOMContentLoaded', () => {
    updateCartCount();
});

// Exportar funciones al ámbito global
window.addToCart = addToCart;
window.updateCartCount = updateCartCount;
