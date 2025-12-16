import { db, collection, getDocs } from './firebase-config.js';

// Función para cargar precios dinámicamente
export async function loadDynamicPrices() {
    console.log("Cargando precios desde Firebase...");

    // Mapeo de IDs de HTML a Colecciones de Firebase
    // Box Salados
    await updateBoxSalados();
    
    // Box Dulces
    await updateBoxDulces();
    
    // Shots
    await updateShots();
    
    // Fingers
    await updateFingers();

    // Tortas Clásicas
    await updateTortasClasicas();

    // Combos Dulces
    await updateCombosDulces();

    // Desayunos
    await updateDesayunos();

    // Eventos
    await updateEventos();
}

async function updateEventos() {
    const eventMappings = [
        { collection: 'EVENTOS_GOURMET', title: 'MENÚ GOURMET' },
        { collection: 'EVENTOS_CLASICO', title: 'MENÚ CLÁSICO' },
        { collection: 'EVENTOS_PICADA', title: 'MENÚ PICADA' },
        { collection: 'EVENTOS_PIZZA', title: 'MENÚ PIZZA' }
    ];

    for (const map of eventMappings) {
        try {
            const querySnapshot = await getDocs(collection(db, map.collection));
            if (querySnapshot.empty) continue;

            // Agrupar items por sección (PARTE FRÍA, PARTE CALIENTE, etc.)
            const itemsBySection = {};
            querySnapshot.forEach(doc => {
                const data = doc.data();
                if (!itemsBySection[data.section]) {
                    itemsBySection[data.section] = [];
                }
                itemsBySection[data.section].push(data.name);
            });

            // Encontrar la sección en el HTML
            const sections = document.querySelectorAll('.menu-section');
            let targetSection = null;
            
            for (const sec of sections) {
                const title = sec.querySelector('.section-title');
                if (title && title.textContent.trim() === map.title) {
                    targetSection = sec;
                    break;
                }
            }

            if (targetSection) {
                // Actualizar cada sub-sección (menu-item)
                const menuItems = targetSection.querySelectorAll('.menu-item');
                for (const menuItem of menuItems) {
                    const h3 = menuItem.querySelector('h3');
                    if (h3) {
                        const sectionName = h3.textContent.trim();
                        if (itemsBySection[sectionName]) {
                            updateProductList(menuItem, itemsBySection[sectionName]);
                        }
                    }
                }
            }

        } catch (e) {
            console.error(`Error actualizando eventos ${map.collection}:`, e);
        }
    }
}

async function updateBoxSalados() {
    const boxes = [
        { id: 'box-uno', collection: 'BOX UNO' },
        { id: 'box-dos', collection: 'BOX DOS' },
        { id: 'box-tres', collection: 'BOX TRES' }
    ];

    for (const box of boxes) {
        try {
            const querySnapshot = await getDocs(collection(db, box.collection));
            if (!querySnapshot.empty) {
                const data = querySnapshot.docs[0].data(); // Asumimos 1 doc por colección de box
                
                // Actualizar en el DOM
                const container = document.querySelector(`.box-container[data-id="${box.id}"]`);
                if (container) {
                    // Actualizar atributos data
                    container.dataset.price = data.price;
                    container.dataset.name = data.name;
                    
                    // Actualizar visualización
                    const priceElement = container.querySelector('.size-price, .box-price');
                    if (priceElement) priceElement.textContent = `$${data.price.toLocaleString('es-AR')}`;
                    
                    const labelElement = container.querySelector('.size-label');
                    if (labelElement) labelElement.textContent = data.name.split(' - ')[0]; // "BOX UNO"
                    
                    const unitsElement = container.querySelector('.size-units');
                    if (unitsElement) unitsElement.textContent = data.name.split(' - ')[1]; // "Todo Frío..."

                    // Actualizar lista de productos
                    if (data.items && Array.isArray(data.items)) {
                        updateProductList(container, data.items);
                    }
                }
            }
        } catch (e) {
            console.error(`Error actualizando ${box.collection}:`, e);
        }
    }
}

async function updateBoxDulces() {
    const collections = [
        'BOX PATTISERIE', 
        'BOX ALFAJORCITOS', 
        'BOX CUADRADITOS', 
        'BOX MIX'
    ];

    for (const colName of collections) {
        try {
            const querySnapshot = await getDocs(collection(db, colName));
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                // Buscar el elemento size-option correspondiente
                // Usamos data-units y el parentId implícito para encontrarlo
                // O mejor, buscamos por texto del label si es posible, o agregamos IDs más específicos en el futuro
                
                // Estrategia: Buscar por data-units y data-size (chica/grande)
                const size = data.name.toLowerCase().includes('chica') ? 'chica' : 'grande';
                
                // Mapeo de colección a parentId usado en HTML
                let parentId = '';
                if (colName.includes('PATTISERIE')) parentId = 'pattiserie';
                if (colName.includes('ALFAJORCITOS')) parentId = 'alfajorcitos';
                if (colName.includes('CUADRADITOS')) parentId = 'cuadraditos';
                if (colName.includes('MIX')) parentId = 'mix';

                const option = document.querySelector(`.size-option[onclick*="'${parentId}'"][data-size="${size}"]`);
                
                if (option) {
                    option.dataset.price = data.price;
                    option.dataset.units = data.units;
                    
                    const priceSpan = option.querySelector('.size-price');
                    if (priceSpan) priceSpan.textContent = `$${data.price.toLocaleString('es-AR')}`;
                    
                    const unitsSpan = option.querySelector('.size-units');
                    if (unitsSpan) unitsSpan.textContent = `${data.units} unidades`;

                    // Actualizar lista de productos (buscando el contenedor padre .box-details)
                    if (data.items && Array.isArray(data.items)) {
                        const boxDetails = option.closest('.box-details');
                        if (boxDetails) {
                            updateProductList(boxDetails, data.items);
                        }
                    }
                }
            });
        } catch (e) {
            console.error(`Error actualizando ${colName}:`, e);
        }
    }
}

async function updateShots() {
    try {
        const querySnapshot = await getDocs(collection(db, 'SHOTS'));
        if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            const container = document.querySelector('.shots-info');
            
            if (container) {
                container.dataset.price = data.price;
                container.dataset.units = data.units;
                
                const priceSpan = container.querySelector('.shots-price');
                if (priceSpan) priceSpan.textContent = `$${data.price.toLocaleString('es-AR')}`;
                
                const unitsSpan = container.querySelector('.shots-units');
                if (unitsSpan) unitsSpan.textContent = `${data.units} unidades`;
            }
        }
    } catch (e) {
        console.error("Error actualizando SHOTS:", e);
    }
}

async function updateFingers() {
    const collections = [
        { name: 'Fingers Fríos', selector: '.fingers-salados-page' }, 
        { name: 'Fingers Calientes', selector: '.fingers-salados-page' }
    ];

    for (const col of collections) {
        try {
            const querySnapshot = await getDocs(collection(db, col.name));
            querySnapshot.forEach((doc) => {
                const data = doc.data();
                const safeName = data.name.replace(/"/g, '\\"');
                const item = document.querySelector(`.product-cart-item[data-name="${safeName}"]`);
                
                if (item) {
                    item.dataset.price = data.price;
                    
                    const priceSpan = item.querySelector('.product-price');
                    if (priceSpan) priceSpan.textContent = `$${data.price.toLocaleString('es-AR')}`;
                }
            });
        } catch (e) {
            console.error(`Error actualizando ${col.name}:`, e);
        }
    }
}

async function updateTortasClasicas() {
    try {
        const querySnapshot = await getDocs(collection(db, 'Tortas Clásicas'));
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const safeName = data.name.replace(/"/g, '\\"');
            const item = document.querySelector(`.product-cart-item[data-name="${safeName}"]`);
            
            if (item) {
                item.dataset.price = data.price;
                
                const priceSpan = item.querySelector('.product-price');
                if (priceSpan) priceSpan.textContent = `$${data.price.toLocaleString('es-AR')}`;
            }
        });
    } catch (e) {
        console.error("Error actualizando Tortas Clásicas:", e);
    }
}

async function updateCombosDulces() {
    const combos = [
        { id: 'combo-1', name: 'COMBO 1' },
        { id: 'combo-2', name: 'COMBO 2' },
        { id: 'combo-3', name: 'COMBO 3' }
    ];

    try {
        const querySnapshot = await getDocs(collection(db, 'Combos Dulces'));
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const combo = combos.find(c => c.name === data.name);
            
            if (combo) {
                const container = document.querySelector(`.box-container[data-id="${combo.id}"]`);
                if (container) {
                    container.dataset.price = data.price;
                    
                    const priceSpan = container.querySelector('.box-price');
                    if (priceSpan) priceSpan.textContent = `$${data.price.toLocaleString('es-AR')}`;

                    // Actualizar lista de productos
                    if (data.items && Array.isArray(data.items)) {
                        updateProductList(container, data.items);
                    }
                }
            }
        });
    } catch (e) {
        console.error("Error actualizando Combos Dulces:", e);
    }
}

async function updateDesayunos() {
    try {
        const querySnapshot = await getDocs(collection(db, 'Desayunos'));
        if (!querySnapshot.empty) {
            const data = querySnapshot.docs[0].data();
            const container = document.querySelector('.box-container[data-id="desayuno-domicilio"]');
            
            if (container) {
                container.dataset.price = data.price;
                
                const priceSpan = container.querySelector('.box-price');
                if (priceSpan) priceSpan.textContent = `$${data.price.toLocaleString('es-AR')}`;
            }
        }
    } catch (e) {
        console.error("Error actualizando Desayunos:", e);
    }
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
