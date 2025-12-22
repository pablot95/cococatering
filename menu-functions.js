// Funciones del menú - versión sin módulos ES6 para compatibilidad con onclick
// Este archivo se carga ANTES de menu-script.js para que las funciones estén disponibles inmediatamente

// Actualizar cantidad con nuevo diseño
function updateQtyNew(button, change) {
    // Find sibling display relative to the button
    const parent = button.parentElement;
    // Try to find either new or old class name
    const qtyDisplay = parent.querySelector('.qty-display-new') || parent.querySelector('.qty-display');
    
    if (!qtyDisplay) {
        console.error('No se encontró qty-display');
        return;
    }
    
    let currentQty = parseInt(qtyDisplay.textContent) || 0;
    const newQty = currentQty + change;
    
    // No permitir valores negativos
    if (newQty < 0) return;
    
    currentQty = newQty;
    qtyDisplay.textContent = currentQty;

    // Update total counter
    if (typeof updateTotalCounter === 'function') {
        updateTotalCounter();
    }

    // Stop propagation
    if (typeof event !== 'undefined') {
        event.stopPropagation();
    }
}

// Función para actualizar el contador total de items
function updateTotalCounter() {
    const qtyDisplays = document.querySelectorAll('.qty-display, .qty-display-new');
    let total = 0;
    
    qtyDisplays.forEach(display => {
        const qty = parseInt(display.textContent) || 0;
        total += qty;
    });
    
    const counter = document.getElementById('total-items-counter');
    const button = document.getElementById('add-all-to-cart-btn');
    
    if (counter) {
        counter.textContent = total;
    }
    
    if (button) {
        if (total > 0) {
            button.classList.add('visible');
        } else {
            button.classList.remove('visible');
        }
    }
}

// Agregar todos los productos con cantidad > 0 al carrito
function addAllToCart() {
    let totalAdded = 0;
    const productsToAdd = [];
    
    // 1. Standard products (Fingers, etc.)
    const productItems = document.querySelectorAll('.product-item, .product-cart-item');
    productItems.forEach(item => {
        const qtyDisplay = item.querySelector('.qty-display');
        if (qtyDisplay) {
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
        }
    });

    // 2. Box Size Options (Box Dulces y Box Salados)
    const sizeOptions = document.querySelectorAll('.size-option');
    sizeOptions.forEach(option => {
        const qtyDisplay = option.querySelector('.qty-display-new') || option.querySelector('.qty-display');
        if (qtyDisplay) {
            const quantity = parseInt(qtyDisplay.textContent);
            if (quantity > 0) {
                const units = option.dataset.units;
                const price = parseInt(option.dataset.price);
                const size = option.dataset.size;
                
                let productName = '';
                let image = 'images/dulces.jpg';
                
                if (option.dataset.name && option.dataset.name !== '-') {
                    productName = option.dataset.name;
                } else {
                    const boxContainer = option.closest('.box-container');
                    if (boxContainer && boxContainer.dataset.name && boxContainer.dataset.name !== '-') {
                        productName = boxContainer.dataset.name;
                        image = boxContainer.dataset.image || 'images/salados.jpg';
                    } else {
                        const section = option.closest('.menu-section');
                        const title = section ? section.querySelector('.section-title') : null;
                        productName = title ? title.textContent : 'Producto';
                    }
                }

                const product = {
                    id: option.dataset.id || `${size}`,
                    name: productName,
                    price: price,
                    image: image,
                    quantity: quantity
                };
                productsToAdd.push(product);
                totalAdded += quantity;
            }
        }
    });

    // 3. Shots y Desayunos (elementos con .box-container que tienen controles directos)
    const boxContainers = document.querySelectorAll('.box-container');
    boxContainers.forEach(container => {
        // Solo procesar si tiene controles directos (no size-options)
        const controls = container.querySelector('.box-controls');
        if (controls) {
            const qtyDisplay = controls.querySelector('.qty-display');
            if (qtyDisplay) {
                const quantity = parseInt(qtyDisplay.textContent);
                if (quantity > 0) {
                    const name = container.dataset.name;
                    const price = parseInt(container.dataset.price);
                    const id = container.dataset.id;
                    
                    const product = {
                        id: id,
                        name: name,
                        price: price,
                        image: 'images/dulces.jpg', // Imagen por defecto
                        quantity: quantity
                    };
                    productsToAdd.push(product);
                    totalAdded += quantity;
                }
            }
        }
    });

    // 4. Shots (específico)
    const shotsInfos = document.querySelectorAll('.shots-info');
    shotsInfos.forEach(info => {
        const qtyDisplay = info.querySelector('.qty-display');
        if (qtyDisplay) {
            const quantity = parseInt(qtyDisplay.textContent);
            if (quantity > 0) {
                const label = info.querySelector('.shots-label').textContent;
                const price = parseInt(info.dataset.price);
                const units = info.dataset.units;
                
                const product = {
                    id: 'shots-docena',
                    name: `Shots - ${label} (${units}u)`,
                    price: price,
                    image: 'productos/shot-de-cheesecake.jpg',
                    quantity: quantity
                };
                productsToAdd.push(product);
                totalAdded += quantity;
            }
        }
    });
    
    if (productsToAdd.length === 0) {
        alert('Por favor selecciona al menos un producto');
        return;
    }
    
    console.log('🛒 Productos a agregar:', productsToAdd);
    
    // Agregar todos los productos al carrito
    if (typeof addToCart === 'function') {
        productsToAdd.forEach(product => {
            console.log('  ➕ Agregando:', product.name, 'x', product.quantity);
            for (let i = 0; i < product.quantity; i++) {
                const singleProduct = {...product, quantity: 1};
                addToCart(singleProduct);
            }
        });
        
        // Verificar carrito después de agregar
        const cartAfter = JSON.parse(localStorage.getItem('cocoCart')) || [];
        console.log('✅ Carrito después de agregar:', cartAfter);
        
        // Resetear todas las cantidades
        productItems.forEach(item => {
            const qtyDisplay = item.querySelector('.qty-display');
            if (qtyDisplay) qtyDisplay.textContent = '0';
        });
        sizeOptions.forEach(option => {
            const qtyDisplay = option.querySelector('.qty-display-new') || option.querySelector('.qty-display');
            if (qtyDisplay) qtyDisplay.textContent = '0';
        });
        shotsInfos.forEach(info => {
            const qtyDisplay = info.querySelector('.qty-display');
            if (qtyDisplay) qtyDisplay.textContent = '0';
        });
        
        // Actualizar contador
        updateTotalCounter();
        
        // Mensaje de confirmación
        showCartNotification(`${totalAdded} productos agregados al carrito`);
    } else {
        console.error('Función addToCart no encontrada');
        alert('Error: Sistema de carrito no disponible');
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

// Seleccionar tamaño de box
function selectSize(element, productName) {
    const section = element.closest('.menu-section');
    const allOptions = section.querySelectorAll('.size-option');
    
    allOptions.forEach(opt => opt.classList.remove('selected'));
    element.classList.add('selected');
}

// Exportar al window inmediatamente
window.updateQtyNew = updateQtyNew;
window.updateQty = updateQtyNew; // Alias para compatibilidad
window.addAllToCart = addAllToCart;
window.updateTotalCounter = updateTotalCounter;
window.selectSize = selectSize;
window.showCartNotification = showCartNotification;

console.log('✅ menu-functions.js cargado - Funciones disponibles:', {
    updateQtyNew: typeof window.updateQtyNew,
    updateQty: typeof window.updateQty,
    addAllToCart: typeof window.addAllToCart
});

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

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    updateTotalCounter();
    console.log('✅ Total counter inicializado');
});
