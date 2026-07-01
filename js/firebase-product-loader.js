// Firebase Product Loader - Carga dinámica de productos desde Firebase
import { db } from './firebase-config.js';

// Normaliza paths de imagen: quita prefijo legacy web/ y resuelve relativos
function _normImg(path, base) {
    if (!path) return '';
    if (path.startsWith('http') || path.startsWith('//')) return path;
    // Quitar prefijo /web/ o web/ (legacy — el sitio ya no está dentro de /web/)
    path = path.replace(/^\/web\//, '/').replace(/^web\//, '');
    if (path.startsWith('/')) return path;
    // Si ya tiene la carpeta productos/ en el path, no duplicar
    if (path.startsWith('productos/')) return '../' + path;
    return base + path;
}

/**
 * Cargar un producto individual desde Firebase
 * @param {string} collectionName - Nombre de la colección en Firebase
 * @param {string} dataId - data-id del elemento HTML
 * @param {string} docId - ID del documento en Firebase (opcional, se genera desde dataId si no se provee)
 */
async function cargarProducto(collectionName, dataId, docId = null) {
    try {
        const elemento = document.querySelector(`[data-id="${dataId}"]`);
        if (!elemento) {
            console.warn(`No se encontró elemento con data-id="${dataId}"`);
            return;
        }

        // Si se provee docId directamente, usarlo
        if (docId) {
            const doc = await db.collection(collectionName).doc(docId).get();
            if (doc.exists) {
                const producto = doc.data();
                console.log(`✅ ${producto.nombre} cargado`);
                actualizarElementoHTML(elemento, producto);
                return;
            }
        }

        // Si no, buscar por data-name del HTML
        const dataName = elemento.getAttribute('data-name');
        if (!dataName || dataName === '-') {
            console.warn(`❌ ${dataId}: No tiene data-name válido para buscar`);
            return;
        }

        // Buscar en toda la colección por nombre que contenga las palabras clave
        console.log(`🔍 Buscando en ${collectionName} por nombre similar a: "${dataName}"`);
        
        const snapshot = await db.collection(collectionName).get();
        let productoEncontrado = null;
        
        // Buscar producto que coincida
        snapshot.forEach(doc => {
            const producto = doc.data();
            const nombreCompleto = producto.unidad ? `${producto.nombre} – ${producto.unidad}` : producto.nombre;
            
            // Comparar nombres (insensible a mayúsculas y espacios extras)
            const nombreNormalizado = nombreCompleto.toLowerCase().trim();
            const busquedaNormalizada = dataName.toLowerCase().trim();
            
            if (nombreNormalizado === busquedaNormalizada) {
                productoEncontrado = producto;
                console.log(`✅ ${producto.nombre} encontrado`);
            }
        });

        if (productoEncontrado) {
            actualizarElementoHTML(elemento, productoEncontrado);
        } else {
            console.warn(`❌ No se encontró producto con nombre: "${dataName}"`);
        }

    } catch (error) {
        console.error(`Error cargando producto ${dataId}:`, error);
    }
}

/**
 * Actualizar elemento HTML con datos del producto
 */
function actualizarElementoHTML(elemento, producto) {
    // Construir nombre completo
    let nombreCompleto = producto.nombre;
    
    // Si tiene categoría (ej: Box Dulces), anteponerla
    if (producto.categoria) {
        nombreCompleto = `${producto.categoria} - ${producto.nombre}`;
    }
    
    if (producto.unidad) {
        nombreCompleto += ` – ${producto.unidad}`;
    }

    // Actualizar atributos data-
    elemento.setAttribute('data-name', nombreCompleto);
    
    if (producto.precio) {
        elemento.setAttribute('data-price', producto.precio);
    }

    // Si el producto tiene imagen definida en Firebase, usarla para data-image
    if (producto.imagen) {
        elemento.setAttribute('data-image', _normImg(producto.imagen, '../productos/'));
    } else if (producto.fotoUrl) {
        elemento.setAttribute('data-image', _normImg(producto.fotoUrl, '../productos/'));
    }

    // ── Mapa de título de sección → clase CSS (para eventos) ─────────
    const SECTION_CLASS = {
        'Parte Fría': '.parte-fria',
        'Parte Caliente': '.parte-caliente',
        'Postre': '.postre',
        'Entrada': '.entrada',
        'Empanadas': '.empanadas',
        'Canastitas': '.canastitas',
        'Pizzas': '.pizzas'
    };

    // Actualizar elementos visuales
    const spanNombre = elemento.querySelector('.product-name');
    const spanPrecio = elemento.querySelector('.product-price');
    const boxTitle = elemento.querySelector('.box-title');
    const boxPrice = elemento.querySelector('.box-price');
    const shotsLabel = elemento.querySelector('.shots-label');
    const shotsPrice = elemento.querySelector('.shots-price');
    const sizePrice = elemento.querySelector('.size-price');
    const sizeUnits = elemento.querySelector('.size-units');

    // Para productos normales (fingers, etc) - SOLO si no es un Box/Combo con items
    // Si tiene items, el nombre del producto (Box X) no debe ir en .product-name (que es para los items)
    // Tampoco si es un menú de eventos (que tiene partes)
    const esMenuEventos = producto.parteFria || producto.parteCaliente || producto.entrada || producto.empanadas;
    
    if (spanNombre && !producto.items && !producto.sabores && !esMenuEventos) {
        spanNombre.textContent = nombreCompleto;
    }

    if (spanPrecio && producto.precio) {
        spanPrecio.textContent = `$${producto.precio.toLocaleString('es-AR')}`;
    }

    // Para boxes
    if (boxTitle) {
        boxTitle.textContent = nombreCompleto;
    }

    if (boxPrice && producto.precio) {
        boxPrice.textContent = `$${producto.precio.toLocaleString('es-AR')}`;
    }

    // Para precios en selectores de tamaño (Box Salados/Dulces)
    if (sizePrice && producto.precio) {
        sizePrice.textContent = `$${producto.precio.toLocaleString('es-AR')}`;
    }

    // Actualizar unidades desde el campo "unidad" de Firebase (ej: "Caja Chica - 23 U")
    if (sizeUnits && producto.unidad) {
        const matchUnits = /(\d+)/.exec(producto.unidad);
        if (matchUnits) {
            sizeUnits.textContent = `${matchUnits[1]} unidades`;
            elemento.setAttribute('data-units', matchUnits[1]);
        }
    }
    
    // Actualizar data-price en size-option si existe dentro del elemento
    const sizeOption = elemento.querySelector('.size-option');
    if (sizeOption) {
        if (producto.precio) sizeOption.setAttribute('data-price', producto.precio);
        sizeOption.setAttribute('data-name', nombreCompleto);
    }

    // Para shots
    if (shotsLabel) {
        shotsLabel.textContent = producto.nombre;
    }

    if (shotsPrice && producto.precio) {
        shotsPrice.textContent = `$${producto.precio.toLocaleString('es-AR')}`;
        
        // Actualizar data-price en el contenedor .shots-info
        const shotsInfo = elemento.querySelector('.shots-info');
        if (shotsInfo) {
            shotsInfo.setAttribute('data-price', producto.precio);
        }
    }

    // Para boxes/shots - actualizar items si existen (nueva estructura: [{nombre, imagen}])
    if (producto.items && Array.isArray(producto.items)) {
        let container = elemento;

        // Si el elemento es una opción de tamaño (Box Dulces), buscar el contenedor padre
        if (elemento.classList.contains('size-option')) {
            const parentBox = elemento.closest('.box-details');
            if (parentBox) container = parentBox;
        }

        const existingItems = container.querySelectorAll('.product-list .product-item2, .product-list .product-item');
        if (existingItems.length > 0) {
            producto.items.forEach((item, index) => {
                const el = existingItems[index];
                if (!el) return;
                const nameEl = el.querySelector('.product-name');
                if (nameEl && item.nombre) {
                    nameEl.textContent = item.nombre;
                }
                if (item.imagen) el.setAttribute('data-image', _normImg(item.imagen, '../productos/'));
            });
        } else {
            const itemsList = container.querySelector('.items-list');
            if (itemsList) {
                itemsList.innerHTML = producto.items.map(item =>
                    `<li>${typeof item === 'string' ? item : item.nombre}</li>`
                ).join('');
            }
        }
    }

    // Para Eventos - nueva estructura sections[]
    if (producto.sections && Array.isArray(producto.sections)) {
        producto.sections.forEach(section => {
            const cls = SECTION_CLASS[section.titulo];
            if (!cls) return;
            const list = elemento.querySelector(cls);
            if (!list) return;
            const existingItems = list.querySelectorAll('.product-item');
            (section.items || []).forEach((item, index) => {
                const el = existingItems[index];
                if (!el) return;
                const nameEl = el.querySelector('.product-name');
                if (nameEl && item.nombre) nameEl.textContent = item.nombre;
                if (item.imagen) el.setAttribute('data-image', _normImg(item.imagen, '../productos/'));
            });
        });
    }
}

/**
 * Cargar todos los productos de una página
 @param {string} collectionName -
  @param {Array} dataIds -
 */
async function cargarTodosLosProductos(collectionName, dataIds) {
    try {
        console.log(`📦 Cargando ${dataIds.length} productos de ${collectionName}...`);
        

        const snapshot = await db.collection(collectionName).get();
        const productosFirebase = {};
        
        snapshot.forEach(doc => {
            productosFirebase[doc.id] = doc.data();
        });
        
        console.log(`🔥 Obtenidos ${snapshot.size} productos de Firebase`);
        

        let actualizados = 0;
        for (const dataId of dataIds) {
            const elemento = document.querySelector(`[data-id="${dataId}"]`);
            if (!elemento) {
                console.warn(`⚠️ No se encontró elemento con data-id="${dataId}"`);
                continue;
            }
            
            const docId = obtenerFirebaseId(dataId);
            let producto = productosFirebase[docId];
            
            if (!producto) {
                const dataIdUpper = dataId.toUpperCase().replace(/-/g, '_');
                const palabrasDataId = dataIdUpper.split('_').filter(p => p.length > 0);
                
                for (const [id, prod] of Object.entries(productosFirebase)) {
                    const palabrasFirebase = id.split('_').filter(p => p.length > 0);
                    
                    const todasPresentes = palabrasDataId.every(palabra => 
                        palabrasFirebase.some(fb => fb.includes(palabra) || palabra.includes(fb))
                    );
                    
                    if (todasPresentes) {
                        producto = prod;
                        break;
                    }
                }
            }
            
            if (producto) {
                actualizarElementoHTML(elemento, producto);
                actualizados++;
            } else {
                console.warn(`❌ No se encontró producto para: ${dataId}`);
            }
        }
        
        console.log(`✅ ${actualizados}/${dataIds.length} productos actualizados`);

        document.dispatchEvent(new CustomEvent('productsLoaded'));
        
    } catch (error) {
        console.error(`Error cargando productos de ${collectionName}:`, error);
    }
}


function obtenerFirebaseId(dataId) {
    return dataId;
}


export { cargarProducto, cargarTodosLosProductos, obtenerFirebaseId };




