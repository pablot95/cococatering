// ===================================
// Video Hero (Reemplazo de Carrusel)
// ===================================
document.addEventListener('DOMContentLoaded', () => {
    const video = document.getElementById('heroVideo');
    if (video) {
        // Asegurar reproducción automática
        video.play().catch(error => {
            console.log("Autoplay prevenido por el navegador:", error);
        });
    }
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
// Protección deshabilitada para debugging
// ===================================
// Función para agregar productos al carrito
// ===================================
function addToCart(product) {
    console.log('Agregando producto al carrito:', product);
    
    // Obtener carrito actual del localStorage - USAR 'cocoCart' para consistencia
    let cart = JSON.parse(localStorage.getItem('cocoCart')) || [];
    
    // Buscar si el producto ya existe en el carrito
    const existingIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingIndex !== -1) {
        // Si existe, aumentar la cantidad
        cart[existingIndex].quantity += (product.quantity || 1);
    } else {
        // Si no existe, agregarlo
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price || 0,
            image: product.image,
            quantity: product.quantity || 1
        });
    }
    
    // Guardar en localStorage - USAR 'cocoCart' para consistencia
    localStorage.setItem('cocoCart', JSON.stringify(cart));
    
    // Actualizar contador del carrito
    updateCartCount();
    
    // Mostrar mensaje de confirmación
    showCartNotification(product.quantity || 1);
    
    console.log('Carrito actualizado:', cart);
}

// Actualizar contador del carrito
function updateCartCount() {
    const cart = JSON.parse(localStorage.getItem('cocoCart')) || [];
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(element => {
        element.textContent = totalItems;
        element.style.display = totalItems > 0 ? 'flex' : 'none';
    });
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

// ===================================
// Protección contra inspección y copia
// ===================================
// Deshabilitar click derecho
document.addEventListener('contextmenu', (e) => {
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
