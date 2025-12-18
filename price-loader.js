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
            // Buscar contenedor por data-id (hardcodeado en HTML)
            const boxId = box.nombre.toLowerCase().includes('uno') ? 'box-uno' 
                        : box.nombre.toLowerCase().includes('dos') ? 'box-dos'
                        : box.nombre.toLowerCase().includes('tres') ? 'box-tres'
                        : null;
            
            if (!boxId) return;
            
            const container = document.querySelector(`.box-container[data-id="${boxId}"]`);
            
            if (container) {
                // Actualizar nombre completo
                container.dataset.name = box.nombre;
                
                // Actualizar precio
                if (box.precio) {
                    container.dataset.price = box.precio;
                    
                    // Actualizar texto del precio si existe
                    let priceElement = container.querySelector('.box-price, .size-price');
                    if (!priceElement) {
                        // Crear elemento de precio si no existe
                        const priceDiv = document.createElement('div');
                        priceDiv.className = 'box-price';
                        priceDiv.style.cssText = 'font-size: 1.5rem; font-weight: bold; color: #8B2E3A; margin: 20px 0;';
                        container.insertBefore(priceDiv, container.firstChild);
                        priceElement = priceDiv;
                    }
                    priceElement.textContent = `$${box.precio.toLocaleString('es-AR')}`;
                }
                
                // Actualizar título de la sección (BOX UNO, BOX DOS, etc.)
                const section = container.closest('.menu-section');
                if (section) {
                    const sectionTitle = section.querySelector('.section-title');
                    if (sectionTitle) {
                        // Extraer solo "BOX UNO" del nombre completo
                        const boxName = box.nombre.split(' - ')[0];
                        sectionTitle.textContent = boxName;
                    }
                }
                
                // Actualizar descripción (parte después del guión)
                if (box.descripcion) {
                    let descElement = container.querySelector('.box-description');
                    if (!descElement) {
                        descElement = document.createElement('p');
                        descElement.className = 'box-description';
                        descElement.style.cssText = 'font-size: 1.1rem; color: #666; margin: 10px 0;';
                        container.insertBefore(descElement, container.querySelector('.product-list'));
                    }
                    descElement.textContent = box.descripcion;
                }
                
                // Actualizar stock visible
                if (box.stock !== undefined) {
                    container.dataset.stock = box.stock;
                    
                    let stockElement = container.querySelector('.stock-indicator');
                    if (!stockElement) {
                        stockElement = document.createElement('div');
                        stockElement.className = 'stock-indicator';
                        stockElement.style.cssText = 'font-size: 0.9rem; color: #666; margin: 10px 0;';
                        container.appendChild(stockElement);
                    }
                    
                    if (box.stock > 10) {
                        stockElement.textContent = `✅ Stock disponible: ${box.stock} unidades`;
                        stockElement.style.color = '#28a745';
                    } else if (box.stock > 0) {
                        stockElement.textContent = `⚠️ Últimas ${box.stock} unidades`;
                        stockElement.style.color = '#ffc107';
                    } else {
                        stockElement.textContent = `❌ Sin stock`;
                        stockElement.style.color = '#dc3545';
                    }
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
                // Actualizar nombre
                element.dataset.name = box.nombre;
                const nameElement = element.querySelector('.size-label, .product-name');
                if (nameElement) nameElement.textContent = box.nombre;
                
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
                
                // Actualizar stock visible
                if (box.stock !== undefined) {
                    element.dataset.stock = box.stock;
                    addStockIndicator(element, box.stock);
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
                // Actualizar nombre
                container.dataset.name = shot.nombre;
                const nameElement = container.querySelector('.shots-name, h2');
                if (nameElement) nameElement.textContent = shot.nombre;
                
                // Actualizar precio
                if (shot.precio) {
                    container.dataset.price = shot.precio;
                    const priceSpan = container.querySelector('.shots-price, .product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${shot.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                // Actualizar unidad
                if (shot.unidad) {
                    container.dataset.units = shot.unidad;
                    const unitsSpan = container.querySelector('.shots-units');
                    if (unitsSpan) unitsSpan.textContent = shot.unidad;
                }
                
                // Actualizar stock
                if (shot.stock !== undefined) {
                    container.dataset.stock = shot.stock;
                    addStockIndicator(container, shot.stock);
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
                // Actualizar nombre
                const nameSpan = item.querySelector('.product-name');
                if (nameSpan) nameSpan.textContent = finger.nombre;
                
                // Actualizar precio
                if (finger.precio) {
                    item.dataset.price = finger.precio;
                    const priceSpan = item.querySelector('.product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${finger.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                // Actualizar unidad
                if (finger.unidad) {
                    const unitSpan = item.querySelector('.product-unit');
                    if (unitSpan) unitSpan.textContent = finger.unidad;
                }
                
                // Actualizar stock
                if (finger.stock !== undefined) {
                    item.dataset.stock = finger.stock;
                    addStockIndicator(item, finger.stock);
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
                // Actualizar nombre
                const nameSpan = item.querySelector('.product-name');
                if (nameSpan) nameSpan.textContent = finger.nombre;
                
                // Actualizar precio
                if (finger.precio) {
                    item.dataset.price = finger.precio;
                    const priceSpan = item.querySelector('.product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${finger.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                // Actualizar unidad
                if (finger.unidad) {
                    const unitSpan = item.querySelector('.product-unit');
                    if (unitSpan) unitSpan.textContent = finger.unidad;
                }
                
                // Actualizar stock
                if (finger.stock !== undefined) {
                    item.dataset.stock = finger.stock;
                    addStockIndicator(item, finger.stock);
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
                // Actualizar nombre
                const nameSpan = item.querySelector('.product-name');
                if (nameSpan) nameSpan.textContent = torta.nombre;
                
                // Actualizar precio
                if (torta.precio) {
                    item.dataset.price = torta.precio;
                    const priceSpan = item.querySelector('.product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${torta.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                // Actualizar stock
                if (torta.stock !== undefined) {
                    item.dataset.stock = torta.stock;
                    addStockIndicator(item, torta.stock);
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
                // Actualizar nombre
                container.dataset.name = combo.nombre;
                const nameElement = container.querySelector('.box-title, h2, h3');
                if (nameElement) nameElement.textContent = combo.nombre;
                
                // Actualizar precio
                if (combo.precio) {
                    container.dataset.price = combo.precio;
                    const priceSpan = container.querySelector('.box-price, .product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${combo.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                // Actualizar stock
                if (combo.stock !== undefined) {
                    container.dataset.stock = combo.stock;
                    addStockIndicator(container, combo.stock);
                }
                
                // Actualizar lista de items
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
                // Actualizar nombre
                container.dataset.name = desayuno.nombre;
                const nameElement = container.querySelector('.box-title, h2, h3');
                if (nameElement) nameElement.textContent = desayuno.nombre;
                
                // Actualizar precio
                if (desayuno.precio) {
                    container.dataset.price = desayuno.precio;
                    const priceSpan = container.querySelector('.box-price, .product-price');
                    if (priceSpan) {
                        priceSpan.textContent = `$${desayuno.precio.toLocaleString('es-AR')}`;
                    }
                }
                
                // Actualizar stock
                if (desayuno.stock !== undefined) {
                    container.dataset.stock = desayuno.stock;
                    addStockIndicator(container, desayuno.stock);
                }
                
                // Actualizar descripción
                if (desayuno.descripcion) {
                    let descElement = container.querySelector('.box-description');
                    if (!descElement) {
                        descElement = document.createElement('p');
                        descElement.className = 'box-description';
                        container.insertBefore(descElement, container.querySelector('.product-list'));
                    }
                    descElement.textContent = desayuno.descripcion;
                }
                
                // Actualizar lista de items
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
        li.className = 'product-item2';
        li.textContent = item;
        listElement.appendChild(li);
    });
}

/**
 * Agregar indicador de stock visual
 * @param {HTMLElement} element - Elemento padre
 * @param {number} stock - Cantidad en stock
 */
function addStockIndicator(element, stock) {
    let stockElement = element.querySelector('.stock-indicator');
    if (!stockElement) {
        stockElement = document.createElement('div');
        stockElement.className = 'stock-indicator';
        stockElement.style.cssText = 'font-size: 0.85rem; margin: 5px 0; font-weight: 500;';
        
        // Insertar después del precio si existe
        const priceElement = element.querySelector('.size-price, .box-price, .product-price');
        if (priceElement) {
            priceElement.parentNode.insertBefore(stockElement, priceElement.nextSibling);
        } else {
            element.appendChild(stockElement);
        }
    }
    
    if (stock > 10) {
        stockElement.textContent = `✅ Disponible (${stock})`;
        stockElement.style.color = '#28a745';
    } else if (stock > 0) {
        stockElement.textContent = `⚠️ Quedan ${stock}`;
        stockElement.style.color = '#ffc107';
    } else {
        stockElement.textContent = `❌ Agotado`;
        stockElement.style.color = '#dc3545';
    }
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
