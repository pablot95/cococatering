// Script para cambiar imagen del hero al hacer hover en los items del menú y productos
document.addEventListener('DOMContentLoaded', function() {
    const productItems = document.querySelectorAll('.product-item');
    const boxContainers = document.querySelectorAll('.box-container');
    const heroImage = document.getElementById('menuHeroImage');

    // Hover para product items
    productItems.forEach(item => {
        const productName = item.querySelector('.product-name');
        if (productName) {
            productName.addEventListener('mouseenter', function() {
                const imageUrl = item.getAttribute('data-image');
                if (imageUrl && heroImage) {
                    heroImage.style.opacity = '0';
                    setTimeout(() => {
                        heroImage.src = imageUrl;
                        heroImage.style.opacity = '1';
                    }, 1);
                }
            });
        }
    });

    // Hover para box containers
    boxContainers.forEach(box => {
        box.addEventListener('mouseenter', function() {
            const imageUrl = box.getAttribute('data-image');
            if (imageUrl && heroImage) {
                heroImage.style.opacity = '0';
                setTimeout(() => {
                    heroImage.src = imageUrl;
                    heroImage.style.opacity = '1';
                }, 1);
            }
        });
    });

    // Actualizar contador total al cargar y cuando cambian cantidades
    updateTotalCounter();
    
    // Observar cambios en todos los contadores
    const qtyDisplays = document.querySelectorAll('.qty-display');
    qtyDisplays.forEach(display => {
        const observer = new MutationObserver(updateTotalCounter);
        observer.observe(display, { childList: true, characterData: true, subtree: true });
    });
});

// Actualizar cantidad del producto
function updateProductQty(button, change) {
    const productItem = button.closest('.product-item');
    const boxContainer = button.closest('.box-container');
    
    let qtyDisplay;
    if (productItem) {
        qtyDisplay = productItem.querySelector('.qty-display');
    } else if (boxContainer) {
        qtyDisplay = boxContainer.querySelector('.qty-display');
    }
    
    if (!qtyDisplay) return;
    
    let currentQty = parseInt(qtyDisplay.textContent);
    currentQty = Math.max(0, currentQty + change);
    qtyDisplay.textContent = currentQty;
    
    // Actualizar contador total
    updateTotalCounter();
}

// Agregar box al carrito
function addBoxToCart(button) {
    const boxContainer = button.closest('.box-container');
    const qtyDisplay = boxContainer.querySelector('.qty-display');
    const quantity = parseInt(qtyDisplay.textContent);
    
    if (quantity === 0) {
        alert('Por favor selecciona la cantidad del box');
        return;
    }
    
    const product = {
        id: boxContainer.dataset.id,
        name: boxContainer.dataset.name,
        price: parseInt(boxContainer.dataset.price),
        image: boxContainer.dataset.image,
        quantity: quantity
    };
    
    // Agregar al carrito
    if (typeof addToCart === 'function') {
        for (let i = 0; i < quantity; i++) {
            const singleProduct = {...product, quantity: 1};
            addToCart(singleProduct);
        }
        
        // Resetear cantidad
        qtyDisplay.textContent = '0';
        
        // Actualizar contador
        updateTotalCounter();
        
        // Mensaje de confirmación
        showCartNotification(`${quantity} ${quantity === 1 ? 'box agregado' : 'boxes agregados'} al carrito`);
    } else {
        console.error('Función addToCart no encontrada');
    }
}

// Actualizar contador total de items
function updateTotalCounter() {
    const qtyDisplays = document.querySelectorAll('.qty-display');
    let total = 0;
    
    qtyDisplays.forEach(display => {
        total += parseInt(display.textContent) || 0;
    });
    
    const counterElement = document.getElementById('total-items-counter');
    const addAllButton = document.getElementById('add-all-to-cart-btn');
    
    if (counterElement) {
        counterElement.textContent = total;
    }
    
    // Mostrar/ocultar botón según si hay items
    if (addAllButton) {
        if (total > 0) {
            addAllButton.classList.add('visible');
        } else {
            addAllButton.classList.remove('visible');
        }
    }
}

// Agregar todos los productos con cantidad > 0 al carrito
function addAllToCart() {
    const productItems = document.querySelectorAll('.product-item');
    let totalAdded = 0;
    const productsToAdd = [];
    
    productItems.forEach(item => {
        const qtyDisplay = item.querySelector('.qty-display');
        const quantity = parseInt(qtyDisplay.textContent);
        
        if (quantity > 0) {
            const product = {
                id: item.dataset.id,
                name: item.dataset.name,
                price: parseInt(item.dataset.price),
                image: item.dataset.image,
                quantity: quantity
            };
            
            productsToAdd.push(product);
            totalAdded += quantity;
        }
    });
    
    if (productsToAdd.length === 0) {
        alert('Por favor selecciona al menos un producto');
        return;
    }
    
    // Agregar todos los productos al carrito
    if (typeof addToCart === 'function') {
        productsToAdd.forEach(product => {
            for (let i = 0; i < product.quantity; i++) {
                const singleProduct = {...product, quantity: 1};
                addToCart(singleProduct);
            }
        });
        
        // Resetear todas las cantidades
        productItems.forEach(item => {
            const qtyDisplay = item.querySelector('.qty-display');
            qtyDisplay.textContent = '0';
        });
        
        // Actualizar contador
        updateTotalCounter();
        
        // Mensaje de confirmación
        showCartNotification(`${totalAdded} productos agregados al carrito`);
    } else {
        console.error('Función addToCart no encontrada');
    }
}

// Mostrar notificación visual
function showCartNotification(message) {
    const notification = document.createElement('div');
    notification.className = 'cart-notification';
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 2000);
}
