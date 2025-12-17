// ===================================
// GESTIÓN DE STOCK LOCAL
// ===================================
// Este módulo maneja el stock de productos usando localStorage
// El stock inicial proviene de productos.json

class StockManager {
    constructor() {
        this.STORAGE_KEY = 'cocoStock';
        this.initializeStock();
    }

    // Inicializar stock desde productos.json si no existe en localStorage
    async initializeStock() {
        const existingStock = localStorage.getItem(this.STORAGE_KEY);
        
        if (!existingStock) {
            console.log('Inicializando stock desde productos.json...');
            try {
                const response = await fetch('productos.json');
                const data = await response.json();
                const stockMap = this.extractStockFromData(data);
                localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stockMap));
                console.log('Stock inicializado:', stockMap);
            } catch (error) {
                console.error('Error al inicializar stock:', error);
            }
        }
    }

    // Extraer stock de todas las categorías de productos
    extractStockFromData(data) {
        const stockMap = {};
        
        // Helper para agregar producto al mapa de stock
        const addToStockMap = (producto) => {
            if (producto.precio && producto.stock !== undefined) {
                const id = this.generateProductId(producto);
                stockMap[id] = producto.stock;
            }
        };

        // Procesar cada categoría
        if (data.boxSalados) {
            data.boxSalados.forEach(addToStockMap);
        }
        if (data.fingersFrios) {
            data.fingersFrios.forEach(addToStockMap);
        }
        if (data.fingersCalientes) {
            data.fingersCalientes.forEach(addToStockMap);
        }
        if (data.boxDulces) {
            data.boxDulces.forEach(addToStockMap);
        }
        if (data.shots) {
            data.shots.forEach(addToStockMap);
        }
        if (data.tortasClasicas) {
            data.tortasClasicas.forEach(addToStockMap);
        }
        if (data.combosDulces) {
            data.combosDulces.forEach(addToStockMap);
        }

        return stockMap;
    }

    // Generar ID único para cada producto
    generateProductId(producto) {
        // Para box-dulces que tienen categoría
        if (producto.categoria) {
            return `${producto.categoria}-${producto.nombre}`.toLowerCase().replace(/\s+/g, '-');
        }
        // Para el resto de productos
        return producto.nombre.toLowerCase().replace(/\s+/g, '-');
    }

    // Obtener stock actual de un producto
    getStock(productId) {
        const stockMap = this.getStockMap();
        return stockMap[productId] !== undefined ? stockMap[productId] : 100; // Default 100
    }

    // Obtener todo el mapa de stock
    getStockMap() {
        const stockJson = localStorage.getItem(this.STORAGE_KEY);
        return stockJson ? JSON.parse(stockJson) : {};
    }

    // Verificar si hay suficiente stock
    checkStock(productId, quantity) {
        const currentStock = this.getStock(productId);
        return currentStock >= quantity;
    }

    // Decrementar stock al realizar una compra
    decrementStock(productId, quantity) {
        const stockMap = this.getStockMap();
        const currentStock = stockMap[productId] || 100;
        
        if (currentStock >= quantity) {
            stockMap[productId] = currentStock - quantity;
            localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stockMap));
            console.log(`Stock decrementado: ${productId} - Nuevo stock: ${stockMap[productId]}`);
            return true;
        } else {
            console.warn(`Stock insuficiente para ${productId}. Disponible: ${currentStock}, Solicitado: ${quantity}`);
            return false;
        }
    }

    // Decrementar stock para múltiples productos (carrito completo)
    decrementCartStock(cartItems) {
        const results = [];
        const stockMap = this.getStockMap();
        
        // Primero verificar que hay stock suficiente para todos
        for (const item of cartItems) {
            const productId = item.id || this.generateProductIdFromName(item.name);
            const currentStock = stockMap[productId] || 100;
            
            if (currentStock < item.quantity) {
                return {
                    success: false,
                    message: `Stock insuficiente para ${item.name}. Disponible: ${currentStock}`,
                    failedProduct: item.name
                };
            }
        }
        
        // Si hay stock suficiente para todos, decrementar
        for (const item of cartItems) {
            const productId = item.id || this.generateProductIdFromName(item.name);
            const success = this.decrementStock(productId, item.quantity);
            results.push({ product: item.name, success });
        }
        
        return {
            success: true,
            message: 'Stock actualizado correctamente',
            details: results
        };
    }

    // Generar ID desde nombre de producto (para compatibilidad con carrito)
    generateProductIdFromName(name) {
        return name.toLowerCase()
            .replace(/\s+/g, '-')
            .replace(/[()]/g, '')
            .replace(/--+/g, '-');
    }

    // Incrementar stock (para cancelaciones o devoluciones)
    incrementStock(productId, quantity) {
        const stockMap = this.getStockMap();
        const currentStock = stockMap[productId] || 100;
        stockMap[productId] = currentStock + quantity;
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(stockMap));
        console.log(`Stock incrementado: ${productId} - Nuevo stock: ${stockMap[productId]}`);
    }

    // Resetear stock (solo para administración)
    resetStock() {
        localStorage.removeItem(this.STORAGE_KEY);
        this.initializeStock();
        console.log('Stock reseteado a valores iniciales');
    }

    // Obtener productos con stock bajo (menos de 10 unidades)
    getLowStockProducts() {
        const stockMap = this.getStockMap();
        const lowStock = [];
        
        for (const [productId, stock] of Object.entries(stockMap)) {
            if (stock < 10) {
                lowStock.push({ productId, stock });
            }
        }
        
        return lowStock;
    }

    // Obtener productos sin stock
    getOutOfStockProducts() {
        const stockMap = this.getStockMap();
        const outOfStock = [];
        
        for (const [productId, stock] of Object.entries(stockMap)) {
            if (stock === 0) {
                outOfStock.push(productId);
            }
        }
        
        return outOfStock;
    }
}

// Instancia global del gestor de stock
const stockManager = new StockManager();

// Exportar para uso en otros módulos
export { stockManager, StockManager };
