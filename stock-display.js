// ===================================
// MOSTRAR INDICADORES DE STOCK
// ===================================
import { stockManager } from './stock-manager.js';

// Inicializar indicadores de stock cuando la página carga
async function initStockDisplay() {
    await stockManager.initializeStock();
    updateStockIndicators();
}

// Actualizar indicadores visuales de stock
function updateStockIndicators() {
    // 1. Product items (Fingers Fríos, Fingers Calientes, etc.)
    const productItems = document.querySelectorAll('.product-item, .product-cart-item');
    productItems.forEach(item => {
        const productName = item.dataset.name;
        if (productName) {
            const productId = stockManager.generateProductIdFromName(productName);
            const stock = stockManager.getStock(productId);
            addStockIndicator(item, stock, productName);
        }
    });

    // 2. Size options (Box Dulces, Box Salados)
    const sizeOptions = document.querySelectorAll('.size-option');
    sizeOptions.forEach(option => {
        const productName = option.dataset.name;
        if (productName) {
            const productId = stockManager.generateProductIdFromName(productName);
            const stock = stockManager.getStock(productId);
            addStockIndicator(option, stock, productName);
        }
    });

    // 3. Box containers (para box-salados)
    const boxContainers = document.querySelectorAll('.box-container[data-name]');
    boxContainers.forEach(container => {
        const productName = container.dataset.name;
        if (productName) {
            const productId = stockManager.generateProductIdFromName(productName);
            const stock = stockManager.getStock(productId);
            // Buscar el size-option dentro del container
            const sizeOption = container.querySelector('.size-option');
            if (sizeOption) {
                addStockIndicator(sizeOption, stock, productName);
            }
        }
    });

    // 4. Shots
    const shotsInfos = document.querySelectorAll('.shots-info');
    shotsInfos.forEach(info => {
        const productId = 'docena-de-shots';
        const stock = stockManager.getStock(productId);
        addStockIndicator(info, stock, 'Docena de Shots');
    });
}

// Agregar indicador visual de stock a un elemento
function addStockIndicator(element, stock, productName) {
    // Remover indicador previo si existe
    const existingIndicator = element.querySelector('.stock-indicator');
    if (existingIndicator) {
        existingIndicator.remove();
    }

    // Crear nuevo indicador
    const indicator = document.createElement('div');
    indicator.className = 'stock-indicator';
    
    if (stock === 0) {
        // Sin stock
        indicator.classList.add('out-of-stock');
        indicator.innerHTML = '<span class="stock-badge">AGOTADO</span>';
        
        // Deshabilitar botones de cantidad
        const qtyControls = element.querySelectorAll('.qty-btn');
        qtyControls.forEach(btn => {
            btn.disabled = true;
            btn.style.opacity = '0.3';
            btn.style.cursor = 'not-allowed';
        });
    } else if (stock < 10) {
        // Stock bajo
        indicator.classList.add('low-stock');
        indicator.innerHTML = `<span class="stock-badge warning">Quedan ${stock}</span>`;
    } else {
        // Stock normal - no mostrar nada
        return;
    }

    // Agregar el indicador al elemento
    // Buscar el mejor lugar para insertar el indicador
    const priceElement = element.querySelector('.product-price, .size-price, .box-price, .shots-price');
    if (priceElement) {
        priceElement.parentNode.insertBefore(indicator, priceElement.nextSibling);
    } else {
        element.appendChild(indicator);
    }
}

// Estilos CSS para los indicadores (se inyectan dinámicamente)
function injectStockStyles() {
    if (document.getElementById('stock-indicator-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'stock-indicator-styles';
    style.textContent = `
        .stock-indicator {
            margin-top: 5px;
            text-align: center;
        }
        
        .stock-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 0.75rem;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .stock-indicator.out-of-stock .stock-badge {
            background: #ff4444;
            color: white;
        }
        
        .stock-indicator.low-stock .stock-badge {
            background: #ffa726;
            color: white;
        }
        
        .stock-indicator.low-stock .stock-badge.warning {
            animation: pulse-warning 2s infinite;
        }
        
        @keyframes pulse-warning {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }
    `;
    document.head.appendChild(style);
}

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    injectStockStyles();
    initStockDisplay();
});

// Exportar funciones para uso externo
export { initStockDisplay, updateStockIndicators };
