// Carrito de compras - Cocó Catering

// Obtener carrito del localStorage
function getCart() {
    const cart = localStorage.getItem('cocoCart');
    return cart ? JSON.parse(cart) : [];
}

// Guardar carrito en localStorage
function saveCart(cart) {
    localStorage.setItem('cocoCart', JSON.stringify(cart));
    updateCartCount();
}

// Agregar producto al carrito
function addToCart(product) {
    const cart = getCart();
    const existingItem = cart.find(item => item.id === product.id);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price || 0,
            image: product.image,
            quantity: 1
        });
    }
    
    saveCart(cart);
    showCartNotification('Producto agregado al carrito');
}

// Remover producto del carrito
function removeFromCart(productId) {
    let cart = getCart();
    cart = cart.filter(item => item.id !== productId);
    saveCart(cart);
    renderCart();
}

// Actualizar cantidad
function updateQuantity(productId, change) {
    const cart = getCart();
    const item = cart.find(item => item.id === productId);
    
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart(cart);
            renderCart();
        }
    }
}

// Actualizar contador del carrito
function updateCartCount() {
    const cart = getCart();
    const count = cart.reduce((total, item) => total + item.quantity, 0);
    const cartCountElements = document.querySelectorAll('.cart-count');
    cartCountElements.forEach(element => {
        element.textContent = count;
        element.style.display = count > 0 ? 'flex' : 'none';
    });
}

// Renderizar carrito
function renderCart() {
    const cart = getCart();
    const cartItemsContainer = document.getElementById('cartItems');
    const emptyCart = document.getElementById('emptyCart');
    
    if (cart.length === 0) {
        cartItemsContainer.classList.remove('has-items');
        emptyCart.style.display = 'block';
        updateSummary(0);
        return;
    }
    
    cartItemsContainer.classList.add('has-items');
    emptyCart.style.display = 'none';
    
    cartItemsContainer.innerHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image">
            <div class="cart-item-details">
                <h3>${item.name}</h3>
                <p class="item-price">$${item.price > 0 ? item.price.toLocaleString() : 'Consultar'}</p>
            </div>
            <div class="cart-item-actions">
                <div class="quantity-controls">
                    <button onclick="updateQuantity('${item.id}', -1)">−</button>
                    <span>${item.quantity}</span>
                    <button onclick="updateQuantity('${item.id}', 1)">+</button>
                </div>
                <button class="remove-item" onclick="removeFromCart('${item.id}')">Eliminar</button>
            </div>
        </div>
    `).join('');
    
    const subtotal = cart.reduce((total, item) => total + (item.price * item.quantity), 0);
    updateSummary(subtotal);
}

// Actualizar resumen
function updateSummary(subtotal) {
    const ENVIO_GRATIS_MIN = 180000;
    const costoEnvio = subtotal >= ENVIO_GRATIS_MIN ? 0 : 'A cargo del comprador';
    const total = subtotal >= ENVIO_GRATIS_MIN ? subtotal : subtotal;
    
    document.getElementById('subtotal').textContent = subtotal > 0 ? `$${subtotal.toLocaleString()}` : '$0';
    
    const envioElement = document.getElementById('envio');
    if (envioElement) {
        if (subtotal >= ENVIO_GRATIS_MIN) {
            envioElement.textContent = 'Gratis';
            envioElement.style.color = 'green';
        } else {
            envioElement.textContent = 'A cargo del comprador';
            envioElement.style.color = '#777';
        }
    }
    
    const envioMessageElement = document.getElementById('envioMessage');
    if (envioMessageElement) {
        if (subtotal > 0 && subtotal < ENVIO_GRATIS_MIN) {
            const falta = ENVIO_GRATIS_MIN - subtotal;
            envioMessageElement.textContent = `¡Agregá $${falta.toLocaleString()} más para envío gratis!`;
            envioMessageElement.style.color = 'var(--bordo)';
        } else if (subtotal >= ENVIO_GRATIS_MIN) {
            envioMessageElement.textContent = '¡Envío gratis! 🎉';
            envioMessageElement.style.color = 'green';
        } else {
            envioMessageElement.textContent = 'Envío gratis para compras mayores a $180.000';
            envioMessageElement.style.color = '#777';
        }
    }
    
    document.getElementById('total').textContent = subtotal > 0 ? `$${subtotal.toLocaleString()}` : '$0';
    
    // Habilitar/deshabilitar botón de continuar compra
    const continuarBtn = document.getElementById('continuarCompraBtn');
    if (continuarBtn) {
        continuarBtn.disabled = subtotal === 0;
    }
}

// Continuar a checkout
function continuarCompra() {
    const cart = getCart();
    if (cart.length === 0) {
        alert('Tu carrito está vacío');
        return;
    }
    window.location.href = 'checkout.html';
}

// Mostrar notificación
function showCartNotification(message) {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        background: var(--bordo);
        color: white;
        padding: 15px 25px;
        border-radius: 50px;
        box-shadow: 0 5px 15px rgba(0,0,0,0.3);
        z-index: 10000;
        font-family: 'Cormorant Garamond', serif;
        font-size: 1.1rem;
        animation: slideIn 0.3s ease;
    `;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOut 0.3s ease';
        setTimeout(() => notification.remove(), 300);
    }, 2000);
}

// Procesar checkout
document.addEventListener('DOMContentLoaded', function() {
    // Si estamos en la página del carrito
    if (window.location.pathname.includes('carrito.html')) {
        renderCart();
    }
    
    updateCartCount();
});

// Agregar estilos para animaciones
const style = document.createElement('style');
style.textContent = `
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
