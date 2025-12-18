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
        const menuScrollContainer = document.querySelector('.menu-scroll-container');
        
        if (!menuScrollContainer) {
            console.error('No se encontró .menu-scroll-container');
            return;
        }
        
        // Limpiar contenido existente
        menuScrollContainer.innerHTML = '';
        
        productos.forEach((box, index) => {
            // Extraer título y subtítulo del nombre
            const [titulo, subtitulo] = box.nombre.split(' - ');
            const boxId = `box-${index + 1}`;
            
            // Crear section completa
            const section = document.createElement('section');
            section.className = 'menu-section';
            
            section.innerHTML = `
                <h2 class="section-title">${titulo}</h2>
                
                <div class="box-container box-details" data-id="${boxId}" data-name="${box.nombre}" data-price="${box.precio}" data-stock="${box.stock}" data-image="images/salados.jpg">
                    ${box.descripcion ? `<p class="box-description" style="font-size: 1.1rem; color: #666; margin: 15px 0; text-align: center;">${box.descripcion}</p>` : ''}
                    
                    <div>
                        <ul class="product-list">
                            ${box.items.map((item, i) => `
                                <li class="product-item2" data-image="productos/producto-${i + 1}.jpg">
                                    <div class="product-info">
                                        <span class="product-name">${item}</span>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <div class="box-size-selector" style="justify-content: center;">
                        <div class="size-option" style="width: 100%; max-width: 220px; margin: 0 auto;" data-name="${box.nombre}" data-size="${boxId}" data-price="${box.precio}" data-units="${subtitulo || 'Standard'}">
                            <div class="size-details">
                                <span class="size-units2">${subtitulo || 'Standard'}</span>
                                <span class="size-price">$${box.precio.toLocaleString('es-AR')}</span>
                            </div>
                            <div class="stock-indicator" style="text-align: center; margin: 10px 0; font-size: 0.9rem;">
                                ${box.stock > 10 ? `<span style="color: #28a745;">✅ Stock disponible (${box.stock})</span>` 
                                : box.stock > 0 ? `<span style="color: #ffc107;">⚠️ Quedan ${box.stock}</span>` 
                                : '<span style="color: #dc3545;">❌ Agotado</span>'}
                            </div>
                            <div class="size-qty-controls">
                                <button class="qty-btn minus" onclick="updateQtyNew(this, -1)">-</button>
                                <span class="qty-display">0</span>
                                <button class="qty-btn plus" onclick="updateQtyNew(this, 1)">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            menuScrollContainer.appendChild(section);
        });
        
        console.log('✅ Box salados cargados desde Firebase');
        
    } catch (error) {
        console.error('Error cargando box salados:', error);
    }
}

// ==================== BOX DULCES ====================
async function updateBoxDulces() {
    try {
        const productos = await getProducts('boxDulces');
        const menuScrollContainer = document.querySelector('.menu-scroll-container');
        
        if (!menuScrollContainer) {
            console.error('No se encontró .menu-scroll-container');
            return;
        }
        
        // Limpiar contenido existente
        menuScrollContainer.innerHTML = '';
        
        productos.forEach((box, index) => {
            const boxId = `box-dulce-${index + 1}`;
            
            const section = document.createElement('section');
            section.className = 'menu-section';
            
            section.innerHTML = `
                <h2 class="section-title">${box.nombre}</h2>
                
                <div class="box-container box-details" data-id="${boxId}" data-name="${box.nombre}" data-price="${box.precio}" data-stock="${box.stock}" data-image="images/dulces.jpg">
                    <div>
                        <ul class="product-list">
                            ${box.items.map((item, i) => `
                                <li class="product-item2">
                                    <div class="product-info">
                                        <span class="product-name">${item}</span>
                                    </div>
                                </li>
                            `).join('')}
                        </ul>
                    </div>

                    <div class="box-size-selector" style="justify-content: center;">
                        <div class="size-option" style="width: 100%; max-width: 220px; margin: 0 auto;" data-name="${box.nombre}" data-size="${boxId}" data-price="${box.precio}" data-units="${box.unidades} unidades">
                            <div class="size-details">
                                <span class="size-units">${box.unidades} unidades</span>
                                <span class="size-price">$${box.precio.toLocaleString('es-AR')}</span>
                            </div>
                            <div class="stock-indicator" style="text-align: center; margin: 10px 0; font-size: 0.9rem;">
                                ${box.stock > 10 ? `<span style="color: #28a745;">✅ Stock disponible (${box.stock})</span>` 
                                : box.stock > 0 ? `<span style="color: #ffc107;">⚠️ Quedan ${box.stock}</span>` 
                                : '<span style="color: #dc3545;">❌ Agotado</span>'}
                            </div>
                            <div class="size-qty-controls">
                                <button class="qty-btn minus" onclick="updateQtyNew(this, -1)">-</button>
                                <span class="qty-display">0</span>
                                <button class="qty-btn plus" onclick="updateQtyNew(this, 1)">+</button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            
            menuScrollContainer.appendChild(section);
        });
        
        console.log('✅ Box dulces cargados desde Firebase');
        
    } catch (error) {
        console.error('Error cargando box dulces:', error);
    }
}

// ==================== SHOTS ====================
async function updateShots() {
    try {
        const productos = await getProducts('shots');
        
        if (productos.length > 0) {
            const shot = productos[0];
            const menuScrollContainer = document.querySelector('.menu-scroll-container');
            
            if (menuScrollContainer) {
                menuScrollContainer.innerHTML = `
                    <div class="shots-info" data-id="shots-1" data-name="${shot.nombre}" data-price="${shot.precio}" data-stock="${shot.stock}">
                        <h2>${shot.nombre}</h2>
                        <p class="shots-description">${shot.descripcion || ''}</p>
                        <div class="shots-details">
                            <span class="shots-price">$${shot.precio.toLocaleString('es-AR')}</span>
                            <span class="shots-unit">${shot.unidad}</span>
                        </div>
                        <div class="stock-indicator" style="text-align: center; margin: 15px 0; font-size: 1rem;">
                            ${shot.stock > 10 ? `<span style="color: #28a745;">✅ Stock disponible (${shot.stock})</span>` 
                            : shot.stock > 0 ? `<span style="color: #ffc107;">⚠️ Quedan ${shot.stock}</span>` 
                            : '<span style="color: #dc3545;">❌ Agotado</span>'}
                        </div>
                        ${shot.sabores && Array.isArray(shot.sabores) ? `
                            <div class="shots-sabores">
                                <h3>Sabores disponibles:</h3>
                                <ul>
                                    ${shot.sabores.map(sabor => `<li>${sabor}</li>`).join('')}
                                </ul>
                            </div>
                        ` : ''}
                        <div class="product-controls" style="margin-top: 20px;">
                            <button class="qty-btn minus" onclick="updateQty(this, -1)">-</button>
                            <span class="qty-display">0</span>
                            <button class="qty-btn plus" onclick="updateQty(this, 1)">+</button>
                        </div>
                    </div>
                `;
                
                console.log('✅ Shots cargados desde Firebase');
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
        const menuScrollContainer = document.querySelector('.menu-scroll-container');
        
        if (!menuScrollContainer) {
            console.error('No se encontró .menu-scroll-container');
            return;
        }
        
        // Limpiar contenido existente
        menuScrollContainer.innerHTML = '';
        
        productos.forEach((finger, index) => {
            const item = document.createElement('div');
            item.className = 'product-cart-item';
            item.dataset.id = `finger-frio-${index + 1}`;
            item.dataset.name = finger.nombre;
            item.dataset.price = finger.precio;
            item.dataset.stock = finger.stock;
            item.dataset.image = `productos/finger-${index + 1}.jpg`;
            
            item.innerHTML = `
                <div class="product-info">
                    <span class="product-name">${finger.nombre}</span>
                    <div class="product-details">
                        <span class="product-unit">${finger.unidad}</span>
                        <span class="product-price">$${finger.precio.toLocaleString('es-AR')}</span>
                    </div>
                    <div class="stock-indicator" style="text-align: center; margin: 5px 0; font-size: 0.85rem;">
                        ${finger.stock > 10 ? `<span style="color: #28a745;">✅ Disponible (${finger.stock})</span>` 
                        : finger.stock > 0 ? `<span style="color: #ffc107;">⚠️ Quedan ${finger.stock}</span>` 
                        : '<span style="color: #dc3545;">❌ Agotado</span>'}
                    </div>
                </div>
                <div class="product-controls">
                    <button class="qty-btn minus" onclick="updateQty(this, -1)">-</button>
                    <span class="qty-display">0</span>
                    <button class="qty-btn plus" onclick="updateQty(this, 1)">+</button>
                </div>
            `;
            
            menuScrollContainer.appendChild(item);
        });
        
        console.log('✅ Fingers fríos cargados desde Firebase');
        
    } catch (error) {
        console.error('Error cargando fingers fríos:', error);
    }
}

// ==================== FINGERS CALIENTES ====================
async function updateFingersCalientes() {
    try {
        const productos = await getProducts('fingersCalientes');
        const menuScrollContainer = document.querySelector('.menu-scroll-container');
        
        if (!menuScrollContainer) {
            console.error('No se encontró .menu-scroll-container');
            return;
        }
        
        // Limpiar contenido existente
        menuScrollContainer.innerHTML = '';
        
        productos.forEach((finger, index) => {
            const item = document.createElement('div');
            item.className = 'product-cart-item';
            item.dataset.id = `finger-caliente-${index + 1}`;
            item.dataset.name = finger.nombre;
            item.dataset.price = finger.precio;
            item.dataset.stock = finger.stock;
            item.dataset.image = `productos/finger-${index + 1}.jpg`;
            
            item.innerHTML = `
                <div class="product-info">
                    <span class="product-name">${finger.nombre}</span>
                    <div class="product-details">
                        <span class="product-unit">${finger.unidad}</span>
                        <span class="product-price">$${finger.precio.toLocaleString('es-AR')}</span>
                    </div>
                    <div class="stock-indicator" style="text-align: center; margin: 5px 0; font-size: 0.85rem;">
                        ${finger.stock > 10 ? `<span style="color: #28a745;">✅ Disponible (${finger.stock})</span>` 
                        : finger.stock > 0 ? `<span style="color: #ffc107;">⚠️ Quedan ${finger.stock}</span>` 
                        : '<span style="color: #dc3545;">❌ Agotado</span>'}
                    </div>
                </div>
                <div class="product-controls">
                    <button class="qty-btn minus" onclick="updateQty(this, -1)">-</button>
                    <span class="qty-display">0</span>
                    <button class="qty-btn plus" onclick="updateQty(this, 1)">+</button>
                </div>
            `;
            
            menuScrollContainer.appendChild(item);
        });
        
        console.log('✅ Fingers calientes cargados desde Firebase');
        
    } catch (error) {
        console.error('Error cargando fingers calientes:', error);
    }
}

// ==================== TORTAS CLASICAS ====================
async function updateTortasClasicas() {
    try {
        const productos = await getProducts('tortasClasicas');
        const menuScrollContainer = document.querySelector('.menu-scroll-container');
        
        if (!menuScrollContainer) {
            console.error('No se encontró .menu-scroll-container');
            return;
        }
        
        // Limpiar contenido existente
        menuScrollContainer.innerHTML = '';
        
        productos.forEach((torta, index) => {
            const item = document.createElement('div');
            item.className = 'product-cart-item';
            item.dataset.id = `torta-${index + 1}`;
            item.dataset.name = torta.nombre;
            item.dataset.price = torta.precio;
            item.dataset.stock = torta.stock;
            item.dataset.image = `productos/torta-${index + 1}.jpg`;
            
            item.innerHTML = `
                <div class="product-info">
                    <span class="product-name">${torta.nombre}</span>
                    <div class="product-details">
                        <span class="product-price">$${torta.precio.toLocaleString('es-AR')}</span>
                    </div>
                    <div class="stock-indicator" style="text-align: center; margin: 5px 0; font-size: 0.85rem;">
                        ${torta.stock > 10 ? `<span style="color: #28a745;">✅ Disponible (${torta.stock})</span>` 
                        : torta.stock > 0 ? `<span style="color: #ffc107;">⚠️ Quedan ${torta.stock}</span>` 
                        : '<span style="color: #dc3545;">❌ Agotado</span>'}
                    </div>
                </div>
                <div class="product-controls">
                    <button class="qty-btn minus" onclick="updateQty(this, -1)">-</button>
                    <span class="qty-display">0</span>
                    <button class="qty-btn plus" onclick="updateQty(this, 1)">+</button>
                </div>
            `;
            
            menuScrollContainer.appendChild(item);
        });
        
        console.log('✅ Tortas clásicas cargadas desde Firebase');
        
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
        const menuScrollContainer = document.querySelector('.menu-scroll-container');
        
        if (!menuScrollContainer) {
            console.error('No se encontró .menu-scroll-container');
            return;
        }
        
        // Limpiar contenido existente
        menuScrollContainer.innerHTML = '';
        
        productos.forEach((combo, index) => {
            const comboElement = document.createElement('div');
            comboElement.className = 'combo-item product-cart-item';
            comboElement.dataset.id = `combo-${index + 1}`;
            comboElement.dataset.name = combo.nombre;
            comboElement.dataset.price = combo.precio;
            comboElement.dataset.stock = combo.stock;
            comboElement.dataset.image = `productos/combo-${index + 1}.jpg`;
            
            comboElement.innerHTML = `
                <div class="product-info">
                    <span class="product-name">${combo.nombre}</span>
                    <div class="product-details">
                        <span class="product-price">$${combo.precio.toLocaleString('es-AR')}</span>
                    </div>
                    <ul class="combo-items" style="list-style: disc; padding-left: 20px; margin: 10px 0; font-size: 0.9rem; color: #666;">
                        ${combo.items.map(item => `<li>${item}</li>`).join('')}
                    </ul>
                    <div class="stock-indicator" style="text-align: center; margin: 10px 0; font-size: 0.85rem;">
                        ${combo.stock > 10 ? `<span style="color: #28a745;">✅ Disponible (${combo.stock})</span>` 
                        : combo.stock > 0 ? `<span style="color: #ffc107;">⚠️ Quedan ${combo.stock}</span>` 
                        : '<span style="color: #dc3545;">❌ Agotado</span>'}
                    </div>
                </div>
                <div class="product-controls">
                    <button class="qty-btn minus" onclick="updateQty(this, -1)">-</button>
                    <span class="qty-display">0</span>
                    <button class="qty-btn plus" onclick="updateQty(this, 1)">+</button>
                </div>
            `;
            
            menuScrollContainer.appendChild(comboElement);
        });
        
        console.log('✅ Combos dulces cargados desde Firebase');
        
    } catch (error) {
        console.error('Error cargando combos dulces:', error);
    }
}

// ==================== DESAYUNOS ====================
async function updateDesayunos() {
    try {
        const productos = await getProducts('desayunos');
        const menuScrollContainer = document.querySelector('.menu-scroll-container');
        
        if (!menuScrollContainer) {
            console.error('No se encontró .menu-scroll-container');
            return;
        }
        
        // Limpiar contenido existente
        menuScrollContainer.innerHTML = '';
        
        productos.forEach((desayuno, index) => {
            const desayunoElement = document.createElement('div');
            desayunoElement.className = 'desayuno-item product-cart-item';
            desayunoElement.dataset.id = `desayuno-${index + 1}`;
            desayunoElement.dataset.name = desayuno.nombre;
            desayunoElement.dataset.price = desayuno.precio;
            desayunoElement.dataset.stock = desayuno.stock;
            desayunoElement.dataset.image = `productos/desayuno-${index + 1}.jpg`;
            
            desayunoElement.innerHTML = `
                <div class="product-info">
                    <span class="product-name">${desayuno.nombre}</span>
                    <div class="product-details">
                        <span class="product-price">$${desayuno.precio.toLocaleString('es-AR')}</span>
                    </div>
                    ${desayuno.descripcion ? `<p class="desayuno-description" style="color: #666; margin: 8px 0; font-size: 0.9rem;">${desayuno.descripcion}</p>` : ''}
                    ${desayuno.sabores && Array.isArray(desayuno.sabores) ? `
                        <ul class="desayuno-items" style="list-style: disc; padding-left: 20px; margin: 10px 0; font-size: 0.9rem; color: #666;">
                            ${desayuno.sabores.map(item => `<li>${item}</li>`).join('')}
                        </ul>
                    ` : ''}
                    <div class="stock-indicator" style="text-align: center; margin: 10px 0; font-size: 0.85rem;">
                        ${desayuno.stock > 10 ? `<span style="color: #28a745;">✅ Disponible (${desayuno.stock})</span>` 
                        : desayuno.stock > 0 ? `<span style="color: #ffc107;">⚠️ Quedan ${desayuno.stock}</span>` 
                        : '<span style="color: #dc3545;">❌ Agotado</span>'}
                    </div>
                </div>
                <div class="product-controls">
                    <button class="qty-btn minus" onclick="updateQty(this, -1)">-</button>
                    <span class="qty-display">0</span>
                    <button class="qty-btn plus" onclick="updateQty(this, 1)">+</button>
                </div>
            `;
            
            menuScrollContainer.appendChild(desayunoElement);
        });
        
        console.log('✅ Desayunos cargados desde Firebase');
        
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
