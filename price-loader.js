// price-loader.js - Cargar precios y datos desde Firebase
import { getProducts, getCurrentCollection } from './firestore-service.js';

// Función principal para cargar precios dinámicamente
export async function loadDynamicPrices() {
    console.log("🔥 Cargando precios desde Firebase...");

    const currentPage = window.location.pathname.split('/').pop();
    
    // Mapeo de páginas a funciones de actualización
    const pageHandlers = {
        'box-salados.html': updateBoxSalados,
        'box-dulces.html': updateBoxDulces,
        'shots.html': updateShots,
        'fingers-frios.html': updateFingersFrios,
        'fingers-calientes.html': updateFingersCalientes,
        'tortas-clasicas.html': updateTortasClasicas,
        'tortas-decoradas.html': updateTortasDecoradas,
        'combos-dulces.html': updateCombosDulces,
        'desayunos.html': updateDesayunos,
        'eventos.html': updateEventos
    };

    const handler = pageHandlers[currentPage];
    
    if (handler) {
        await handler();
        console.log(`✅ Precios cargados para ${currentPage}`);
    } else {
        console.warn(`⚠️ No hay handler para ${currentPage}`);
    }
}

// ==================== EVENTOS ====================
async function updateEventos() {
    try {
        const productos = await getProducts('menuEventos');
        
        productos.forEach(menu => {
            const cardElement = document.querySelector(`[data-menu="${menu.nombre}"]`);
            if (!cardElement) return;
            
            // Actualizar título
            const titleElement = cardElement.querySelector('.eventos-card-title');
            if (titleElement) {
                titleElement.textContent = menu.nombre;
            }
            
            // Actualizar partes del menú
            if (menu.parteFria && Array.isArray(menu.parteFria)) {
                updateMenuSection(cardElement, '.parte-fria-list', menu.parteFria);
            }
            
            if (menu.parteCaliente && Array.isArray(menu.parteCaliente)) {
                updateMenuSection(cardElement, '.parte-caliente-list', menu.parteCaliente);
            }
            
            if (menu.postre && Array.isArray(menu.postre)) {
                updateMenuSection(cardElement, '.postre-list', menu.postre);
            }
        });
        
    } catch (error) {
        console.error('Error cargando menús de eventos:', error);
    }
}

function updateMenuSection(cardElement, selector, items) {
    const listElement = cardElement.querySelector(selector);
    if (!listElement) return;
    
    listElement.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        listElement.appendChild(li);
    });
}
// ==================== BOX SALADOS ====================
async function updateBoxSalados() {
    try {
        const productos = await getProducts('boxSalados');
        
        productos.forEach(box => {
            // Buscar contenedor por data-name o data-id
            let container = document.querySelector(`.box-container[data-name="${box.nombre}"]`);
            
            if (!container) {
                // Fallback: buscar por ID derivado del nombre
                const idFromName = box.nombre.toLowerCase().replace(/\s+/g, '-');
                container = document.querySelector(`.box-container[data-id="${idFromName}"]`);
            }
            
            if (container) {
                // Actualizar precio
                if (box.precio) {
                    container.dataset.price = box.precio;
                    const priceElement = container.querySelector('.size-price, .box-price');
                    if (priceElement) {
                        priceElement.textContent = `$${box.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                // Actualizar nombre
                if (box.nombre) {
                    container.dataset.name = box.nombre;
                    const labelElement = container.querySelector('.size-label, .box-title');
                    if (labelElement) labelElement.textContent = box.nombre;
                }
                
                // Actualizar descripción
                if (box.descripcion) {
                    const descElement = container.querySelector('.size-units, .box-description');
                    if (descElement) descElement.textContent = box.descripcion;
                }
                
                // Actualizar stock
                if (box.stock !== undefined) {
                    container.dataset.stock = box.stock;
                }
                
                // Actualizar lista de items
                if (box.items && Array.isArray(box.items)) {
                    updateProductList(container, box.items);
                }
            }
        });
        
    } catch (error) {
        console.error('Error cargando box salados:', error);
    }
}

// ==================== BOX DULCES ====================
async function updateBoxDulces() {
    try {
        const productos = await getProducts('boxDulces');
        
        productos.forEach(box => {
            // Buscar por nombre del producto
            let element = document.querySelector(`[data-name="${box.nombre}"]`);
            
            if (!element) {
                // Fallback: buscar por ID derivado
                const idFromName = box.nombre.toLowerCase().replace(/\s+/g, '-');
                element = document.querySelector(`[data-id="${idFromName}"]`);
            }
            
            if (element) {
                // Actualizar precio
                if (box.precio) {
                    element.dataset.price = box.precio;
                    const priceSpan = element.querySelector('.size-price, .box-price, .product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${box.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                // Actualizar unidades
                if (box.unidades) {
                    element.dataset.units = box.unidades;
                    const unitsSpan = element.querySelector('.size-units');
                    if (unitsSpan) unitsSpan.textContent = `${box.unidades} unidades`;
                }
                
                // Actualizar stock
                if (box.stock !== undefined) {
                    element.dataset.stock = box.stock;
                }
                
                // Actualizar lista de items
                if (box.items && Array.isArray(box.items)) {
                    updateProductList(element, box.items);
                }
            }
        });
        
    } catch (error) {
        console.error('Error cargando box dulces:', error);
    }
}

// ==================== SHOTS ====================
async function updateShots() {
    try {
        const productos = await getProducts('shots');
        
        if (productos.length > 0) {
            const shot = productos[0]; // Asumimos un solo producto shots
            const container = document.querySelector('.shots-info');
            
            if (container) {
                if (shot.precio) {
                    container.dataset.price = shot.precio;
                    const priceSpan = container.querySelector('.shots-price, .product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${shot.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                if (shot.unidad) {
                    container.dataset.units = shot.unidad;
                    const unitsSpan = container.querySelector('.shots-units');
                    if (unitsSpan) unitsSpan.textContent = shot.unidad;
                }
                
                if (shot.stock !== undefined) {
                    container.dataset.stock = shot.stock;
                }
            }
        }
        
    } catch (error) {
        console.error('Error cargando shots:', error);
    }
}

// ==================== FINGERS FRIOS ====================
async function updateFingersFrios() {
    try {
        const productos = await getProducts('fingersFrios');
        
        productos.forEach(finger => {
            let item = document.querySelector(`.product-cart-item[data-name="${finger.nombre}"]`);
            
            if (item) {
                if (finger.precio) {
                    item.dataset.price = finger.precio;
                    const priceSpan = item.querySelector('.product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${finger.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                if (finger.unidad) {
                    const unitSpan = item.querySelector('.product-unit');
                    if (unitSpan) unitSpan.textContent = finger.unidad;
                }
                
                if (finger.stock !== undefined) {
                    item.dataset.stock = finger.stock;
                }
            }
        });
        
    } catch (error) {
        console.error('Error cargando fingers fríos:', error);
    }
}

// ==================== FINGERS CALIENTES ====================
async function updateFingersCalientes() {
    try {
        const productos = await getProducts('fingersCalientes');
        
        productos.forEach(finger => {
            let item = document.querySelector(`.product-cart-item[data-name="${finger.nombre}"]`);
            
            if (item) {
                if (finger.precio) {
                    item.dataset.price = finger.precio;
                    const priceSpan = item.querySelector('.product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${finger.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                if (finger.unidad) {
                    const unitSpan = item.querySelector('.product-unit');
                    if (unitSpan) unitSpan.textContent = finger.unidad;
                }
                
                if (finger.stock !== undefined) {
                    item.dataset.stock = finger.stock;
                }
            }
        });
        
    } catch (error) {
        console.error('Error cargando fingers calientes:', error);
    }
}

// ==================== TORTAS CLASICAS ====================
async function updateTortasClasicas() {
    try {
        const productos = await getProducts('tortasClasicas');
        
        productos.forEach(torta => {
            let item = document.querySelector(`.product-cart-item[data-name="${torta.nombre}"]`);
            
            if (item) {
                if (torta.precio) {
                    item.dataset.price = torta.precio;
                    const priceSpan = item.querySelector('.product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${torta.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                if (torta.stock !== undefined) {
                    item.dataset.stock = torta.stock;
                }
            }
        });
        
    } catch (error) {
        console.error('Error cargando tortas clásicas:', error);
    }
}

// ==================== TORTAS DECORADAS ====================
async function updateTortasDecoradas() {
    try {
        // Las tortas decoradas se manejan por formulario, no tienen precio fijo
        console.log('Tortas decoradas: precios personalizados');
    } catch (error) {
        console.error('Error en tortas decoradas:', error);
    }
}

// ==================== COMBOS DULCES ====================
async function updateCombosDulces() {
    try {
        const productos = await getProducts('combosDulces');
        
        productos.forEach(combo => {
            let container = document.querySelector(`.box-container[data-name="${combo.nombre}"]`);
            
            if (!container) {
                const idFromName = combo.nombre.toLowerCase().replace(/\s+/g, '-');
                container = document.querySelector(`.box-container[data-id="${idFromName}"]`);
            }
            
            if (container) {
                if (combo.precio) {
                    container.dataset.price = combo.precio;
                    const priceSpan = container.querySelector('.box-price, .product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${combo.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                if (combo.stock !== undefined) {
                    container.dataset.stock = combo.stock;
                }
                
                if (combo.items && Array.isArray(combo.items)) {
                    updateProductList(container, combo.items);
                }
            }
        });
        
    } catch (error) {
        console.error('Error cargando combos dulces:', error);
    }
}

// ==================== DESAYUNOS ====================
async function updateDesayunos() {
    try {
        const productos = await getProducts('desayunos');
        
        if (productos.length > 0) {
            const desayuno = productos[0];
            let container = document.querySelector('.box-container[data-id="desayuno-domicilio"]');
            
            if (!container) {
                container = document.querySelector('.box-container');
            }
            
            if (container) {
                if (desayuno.precio) {
                    container.dataset.price = desayuno.precio;
                    const priceSpan = container.querySelector('.box-price, .product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${desayuno.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                if (desayuno.stock !== undefined) {
                    container.dataset.stock = desayuno.stock;
                }
                
                if (desayuno.items && Array.isArray(desayuno.items)) {
                    updateProductList(container, desayuno.items);
                }
            }
        }
        
    } catch (error) {
        console.error('Error cargando desayunos:', error);
    }
}

// ==================== UTILIDADES ====================

/**
 * Actualizar lista de productos en el DOM
 * @param {HTMLElement} container - Contenedor padre
 * @param {Array} items - Array de strings con nombres de productos
 */
function updateProductList(container, items) {
    const listElement = container.querySelector('.product-list, ul');
    if (!listElement) return;
    
    listElement.innerHTML = '';
    items.forEach(item => {
        const li = document.createElement('li');
        li.textContent = item;
        listElement.appendChild(li);
    });
}

// Inicializar automáticamente al cargar
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadDynamicPrices);
} else {
    loadDynamicPrices();
}

// Iniciar carga cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', loadDynamicPrices);

// Función auxiliar para actualizar listas de productos
function updateProductList(container, items) {
    const list = container.querySelector('.product-list');
    if (!list) return;

    // Limpiar lista actual
    list.innerHTML = '';

    // Generar nuevos items
    items.forEach(itemText => {
        const li = document.createElement('li');
        li.className = 'product-item2';
        // Nota: Se pierden las imágenes específicas ya que no están en la DB actual.
        // Se mantiene la estructura para CSS.
        li.innerHTML = `
            <div class="product-info">
                <span class="product-name">${itemText}</span>
            </div>
        `;
        list.appendChild(li);
    });
}
