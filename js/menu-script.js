// Importar servicios de Firebase
// import { getStock, checkStock, getCurrentCollection } from './firestore-service.js';

// Script para cambiar imagen del hero al hacer hover en los items del menú y productos
document.addEventListener('DOMContentLoaded', function() {
    let heroImage = document.getElementById('menuHeroImage');
    const heroBgBlur = document.getElementById('menuHeroBgBlur');
    
    let currentImageUrl = heroImage ? heroImage.src : '';
    let imageTimeout = null;

    // Función para forzar repaint en iOS (Versión corregida: Opacity hack)
    function forceRepaint(el) {
        if (!el) return;

        el.style.opacity = '0.99';
        el.style.transform = 'translateZ(0)';
        requestAnimationFrame(() => {
            el.style.opacity = '';
            el.style.transform = '';
        });
    }

    // Función para actualizar imagen y fondo borroso
    function updateHeroImage(imageUrl) {
        if (!imageUrl || !heroImage) return;
        // Misma imagen: no hacer nada para evitar parpadeo
        if (imageUrl === currentImageUrl) return;

        currentImageUrl = imageUrl;

        // Fade out → cambiar src → fade in (sin reemplazar el nodo)
        heroImage.style.transition = 'opacity 0.2s ease';
        heroImage.style.opacity = '0';

        setTimeout(() => {
            heroImage.src = imageUrl;
            requestAnimationFrame(() => {
                heroImage.style.opacity = '1';
            });
        }, 200);

        // Actualizar fondo blur
        if (heroBgBlur) {
            heroBgBlur.style.backgroundImage = `url(${imageUrl})`;
        }
    }

    // Preload de imágenes para evitar parpadeos
    function preloadImages() {
        const items = document.querySelectorAll('[data-image]');
        items.forEach(item => {
            const img = new Image();
            img.src = item.dataset.image;
        });
    }

    // Inicializar el fondo borroso con la imagen inicial
    if (heroImage && heroBgBlur && heroImage.src) {
        heroBgBlur.style.backgroundImage = `url(${heroImage.src})`;
    }
    
    // Ejecutar preload
    preloadImages();

    // Función para manejar eventos de cambio de imagen (iOS-proof)
    // Reemplazo de delegación por listeners directos según solicitud
    function setupDirectEvents() {
        const items = document.querySelectorAll('[data-image]');
        
        items.forEach(item => {
            const change = (e) => {
                if (e.cancelable) e.preventDefault();

                const imageUrl = item.dataset.image;
                if (!imageUrl) return;

                updateHeroImage(imageUrl);
            };

            // Usamos pointerdown + click como recomendación moderna para iOS
            item.addEventListener('pointerdown', change);
            item.addEventListener('click', change);
        });
    }

    // Aplicar listeners directos
    setupDirectEvents();

    // Re-aplicar y pre-cargar cuando Firebase termine de asignar las imágenes
    document.addEventListener('productsLoaded', () => {
        preloadImages();
        setupDirectEvents();
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
    // Try to find display as sibling first (new structure)
    const parent = button.parentElement;
    let qtyDisplay = parent.querySelector('.qty-display');
    
    // Fallback to old logic if not found
    if (!qtyDisplay) {
        const productItem = button.closest('.product-item, .product-cart-item');
        const boxContainer = button.closest('.box-container');
        
        if (productItem) {
            qtyDisplay = productItem.querySelector('.qty-display');
        } else if (boxContainer) {
            qtyDisplay = boxContainer.querySelector('.qty-display');
        }
    }
    
    if (!qtyDisplay) return;
    
    let currentQty = parseInt(qtyDisplay.textContent);
    currentQty = Math.max(0, currentQty + change);
    qtyDisplay.textContent = currentQty;
    
    // Actualizar contador total
    updateTotalCounter();

    // Stop propagation to prevent triggering parent click events
    if (typeof event !== 'undefined') {
        event.stopPropagation();
    }
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
    const qtyDisplays = document.querySelectorAll('.qty-display, .qty-display-new');
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

// Helper to parse price string
function parsePrice(priceStr) {
    if (!priceStr) return 0;
    if (typeof priceStr === 'number') return priceStr;
    // Remove non-digits
    const clean = priceStr.toString().replace(/\D/g, '');
    return parseInt(clean) || 0;
}

// Agregar todos los productos con cantidad > 0 al carrito
async function addAllToCart() {
    let totalAdded = 0;
    const productsToAdd = [];
    
    // 1. Standard products (Fingers, etc.)
    const productItems = document.querySelectorAll('.product-item, .product-cart-item');
    productItems.forEach(item => {
        const qtyDisplay = item.querySelector('.qty-display');
        if (qtyDisplay) {
            const quantity = parseInt(qtyDisplay.textContent);
            
            if (quantity > 0) {
                // Si tiene compra mínima (ej. fingers/shots: min=12, step=6),
                // guardar precio por unidad y cantidad real seleccionada
                const minQty = parseInt(item.dataset.min || '0');
                const batchPrice = parsePrice(item.dataset.price);
                const pricePerUnit = (minQty > 0) ? Math.round(batchPrice / minQty) : batchPrice;
                const realQty = (minQty > 0) ? quantity : quantity;

                const stepQty = parseInt(item.dataset.step || '1');
                const product = {
                    id: item.dataset.id,
                    name: item.dataset.name,
                    price: batchPrice,
                    image: item.dataset.image,
                    quantity: realQty,
                    min: minQty > 0 ? minQty : 1,
                    step: stepQty,
                    _batch: minQty > 0
                };
                
                productsToAdd.push(product);
                totalAdded += quantity;
            }
        }
    });

    // 2. Box Size Options (Box Dulces y Box Salados)
    const sizeOptions = document.querySelectorAll('.size-option');
    sizeOptions.forEach(option => {
        // Try to find either new or old class name
        const qtyDisplay = option.querySelector('.qty-display-new') || option.querySelector('.qty-display');
        if (qtyDisplay) {
            const quantity = parseInt(qtyDisplay.textContent);
            if (quantity > 0) {
                const units = option.dataset.units;
                const price = parsePrice(option.dataset.price);
                const size = option.dataset.size;
                
                // Obtener nombre del producto
                let productName = '';
                let image = '../images/dulces.jpg';
                
                // Primero intentar obtener del data-name del option (box-dulces)
                if (option.dataset.name) {
                    productName = option.dataset.name;
                } else {
                    // Si no, buscar en el box-container padre (box-salados)
                    const boxContainer = option.closest('.box-container');
                    if (boxContainer && boxContainer.dataset.name) {
                        productName = boxContainer.dataset.name;
                        image = boxContainer.dataset.image || '../images/salados.jpg';
                    } else {
                        // Fallback: usar el section title
                        const section = option.closest('.menu-section');
                        const title = section ? section.querySelector('.section-title') : null;
                        productName = title ? title.textContent : 'Producto';
                    }
                }
                
                // Get image from section if not already set
                if (image === '../images/dulces.jpg') {
                    const section = option.closest('.menu-section');
                    const boxDetails = section ? section.querySelector('.box-details') : null;
                    if (boxDetails && boxDetails.dataset.image) {
                        image = boxDetails.dataset.image;
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

    // 3. Shots
    const shotsInfos = document.querySelectorAll('.shots-info');
    shotsInfos.forEach(info => {
        const qtyDisplay = info.querySelector('.qty-display');
        if (qtyDisplay) {
            const quantity = parseInt(qtyDisplay.textContent);
            if (quantity > 0) {
                const label = info.querySelector('.shots-label').textContent;
                const price = parsePrice(info.dataset.price);
                const units = info.dataset.units;
                
                const product = {
                    id: 'shots-docena',
                    name: `Shots - ${label} (${units}u)`,
                    price: price,
                    image: '../productos/shot-de-cheesecake.jpg', // Default image for shots
                    quantity: quantity
                };
                productsToAdd.push(product);
                totalAdded += quantity;
            }
        }
    });

    // 4. Box Containers (Desayunos, Combos)
    const boxContainers = document.querySelectorAll('.box-container');
    boxContainers.forEach(container => {
        // Skip if it has size options (handled in section 2)
        if (container.querySelector('.size-option')) return;
        
        const controls = container.querySelector('.box-controls');
        if (controls) {
            const qtyDisplay = controls.querySelector('.qty-display');
            if (qtyDisplay) {
                const quantity = parseInt(qtyDisplay.textContent);
                if (quantity > 0) {
                    const product = {
                        id: container.dataset.id,
                        name: container.dataset.name,
                        price: parsePrice(container.dataset.price),
                        image: container.dataset.image || '../images/dulces.jpg', // Default image
                        quantity: quantity
                    };
                    productsToAdd.push(product);
                    totalAdded += quantity;
                }
            }
        }
    });
    
    if (productsToAdd.length === 0) {
        alert('Por favor selecciona al menos un producto');
        return;
    }
    
    
    // Agregar todos los productos al carrito
    if (typeof addToCart === 'function') {
        productsToAdd.forEach(product => {
            addToCart(product);
        });
        
        // Resetear todas las cantidades
        // Standard items
        productItems.forEach(item => {
            const qtyDisplay = item.querySelector('.qty-display');
            if (qtyDisplay) qtyDisplay.textContent = '0';
        });
        // Box options
        sizeOptions.forEach(option => {
            const qtyDisplay = option.querySelector('.qty-display-new') || option.querySelector('.qty-display');
            if (qtyDisplay) qtyDisplay.textContent = '0';
        });
        // Shots
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

// ===================================
// NUEVAS FUNCIONES PARA BOX-DULCES Y SHOTS
// ===================================

// Seleccionar tamaño de box
function selectSize(element, productName) {
    const section = element.closest('.menu-section');
    const allOptions = section.querySelectorAll('.size-option');
    
    // Quitar selección de todos
    allOptions.forEach(opt => opt.classList.remove('selected'));
    
    // Agregar selección al clickeado
    element.classList.add('selected');
}

// Actualizar cantidad con nuevo diseño
async function updateQtyNew(button, change) {
    // Find sibling display relative to the button
    const parent = button.parentElement;
    // Try to find either new or old class name
    const qtyDisplay = parent.querySelector('.qty-display-new') || parent.querySelector('.qty-display');
    
    if (!qtyDisplay) return;
    
    // Leer compra mínima y paso desde el product-cart-item (ej. fingers/shots: min=12, step=6)
    const productItem = parent.closest('.product-cart-item, .product-item');
    const minQty  = parseInt(productItem?.dataset?.min  || '0');
    const stepQty = parseInt(productItem?.dataset?.step || '1');
    
    let currentQty = parseInt(qtyDisplay.textContent);
    let newQty;
    
    if (change > 0) {
        // Subir: si estaba en 0 y hay mínimo, saltar al mínimo directamente
        newQty = (currentQty === 0 && minQty > 0) ? minQty : currentQty + stepQty;
    } else {
        // Bajar: si ya está en el mínimo (o menos), volver a 0
        newQty = (minQty > 0 && currentQty <= minQty) ? 0 : Math.max(0, currentQty - stepQty);
    }
    
    qtyDisplay.textContent = newQty;

    // Update total counter
    updateTotalCounter();

    // Stop propagation
    if (typeof event !== 'undefined') {
        event.stopPropagation();
    }
}

// Agregar al carrito con nuevo diseño
function addToCartNew(button, productName) {
    const section = button.closest('.menu-section');
    const selectedSize = section.querySelector('.size-option.selected');
    const qtyDisplay = section.querySelector('.qty-display-new');
    const quantity = parseInt(qtyDisplay.textContent);
    
    if (!selectedSize) {
        alert('Por favor selecciona un tamaño');
        return;
    }
    
    if (quantity === 0) {
        alert('Por favor selecciona la cantidad');
        return;
    }
    
    const sizeLabel = selectedSize.querySelector('.size-label').textContent;
    const units = selectedSize.dataset.units;
    const price = parseInt(selectedSize.dataset.price);
    const size = selectedSize.dataset.size;
    const image = button.dataset.image;
    
    const product = {
        id: `${productName}-${size}`,
        name: `${productName} - ${sizeLabel} (${units}u)`,
        price: price,
        image: image,
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
        
        // Mensaje de confirmación
        showCartNotification(`${quantity} ${quantity === 1 ? 'producto agregado' : 'productos agregados'} al carrito`);
    } else {
        console.error('Función addToCart no encontrada');
    }
}


// ===================================
// EXPORTAR FUNCIONES AL ÁMBITO GLOBAL
// ===================================
// Necesario para que los eventos onclick funcionen con módulos ES6

// updateQtyNew maneja ambos casos (nuevo diseño y diseño estándar)
window.updateQty = updateQtyNew;  // Alias para compatibilidad con código antiguo
window.updateQtyNew = updateQtyNew;
window.addAllToCart = addAllToCart;
window.addToCartNew = addToCartNew;
window.selectSize = selectSize;

console.log('✅ Menu script cargado. Funciones exportadas al window:', {
    updateQty: typeof window.updateQty,
    updateQtyNew: typeof window.updateQtyNew,
    addAllToCart: typeof window.addAllToCart,
    addToCartNew: typeof window.addToCartNew,
    selectSize: typeof window.selectSize
});
