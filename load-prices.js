// Cargar precios desde productos.json
async function cargarPrecios() {
    try {
        const response = await fetch('productos.json');
        const productos = await response.json();
        console.log('Precios cargados desde productos.json');
        
        // Box Salados
        if (productos.boxSalados) actualizarBoxSalados(productos.boxSalados);
        
        // Box Dulces
        if (productos.boxDulces) actualizarBoxDulces(productos.boxDulces);
        
        // Shots
        if (productos.shots) actualizarShots(productos.shots);
        
        // Fingers Fríos
        if (productos.fingersFrios) actualizarFingersFrios(productos.fingersFrios);
        
        // Fingers Calientes
        if (productos.fingersCalientes) actualizarFingersCalientes(productos.fingersCalientes);
        
        // Tortas Clásicas
        if (productos.tortasClasicas) actualizarTortasClasicas(productos.tortasClasicas);
        
        // Combos Dulces
        if (productos.combosDulces) actualizarCombosDulces(productos.combosDulces);
        
        console.log('Precios actualizados correctamente');
    } catch (error) {
        console.error('Error al cargar precios:', error);
    }
}

function actualizarBoxSalados(datos) {
    const ids = ['box-uno', 'box-dos', 'box-tres'];
    
    datos.forEach((box, index) => {
        if (box.precio) {
            const elemento = document.querySelector(`.box-container[data-id="${ids[index]}"]`);
            if (elemento) {
                elemento.dataset.price = box.precio;
                elemento.dataset.name = box.nombre;
                const precio = elemento.querySelector('.size-price, .box-price');
                if (precio) precio.textContent = `$${box.precio.toLocaleString('es-AR')}`;
            }
        }
    });
}

function actualizarBoxDulces(datos) {
    datos.forEach(box => {
        const categoria = box.categoria.toLowerCase().replace(/\s+/g, '-');
        const size = box.nombre.toLowerCase().includes('chica') ? 'chica' : 'grande';
        
        let selector = `[data-size="${size}"]`;
        if (categoria.includes('pattiserie')) {
            selector = `[onclick*="pattiserie"]${selector}`;
        } else if (categoria.includes('alfajor')) {
            selector = `[onclick*="alfajorcitos"]${selector}`;
        } else if (categoria.includes('cuadraditos')) {
            selector = `[onclick*="cuadraditos"]${selector}`;
        } else if (categoria.includes('mix')) {
            selector = `[onclick*="mix"]${selector}`;
        }
        
        const elemento = document.querySelector(selector);
        if (elemento && box.precio) {
            elemento.dataset.price = box.precio;
            const precio = elemento.querySelector('.size-price');
            if (precio) precio.textContent = `$${box.precio.toLocaleString('es-AR')}`;
            
            if (box.unidades) {
                elemento.dataset.units = box.unidades;
                const unidades = elemento.querySelector('.size-units');
                if (unidades) unidades.textContent = `${box.unidades} unidades`;
            }
        }
    });
}

function actualizarShots(datos) {
    if (datos[0]) {
        const shot = datos[0];
        const shots = document.querySelector('.shots-info');
        if (shots && shot.precio) {
            shots.dataset.price = shot.precio;
            shots.dataset.name = shot.nombre;
            const precio = shots.querySelector('.shots-price');
            if (precio) precio.textContent = `$${shot.precio.toLocaleString('es-AR')}`;
        }
    }
}

function actualizarFingersFrios(datos) {
    datos.forEach(finger => {
        // Crear ID a partir del nombre (convertir a kebab-case)
        const id = finger.nombre.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '');
        
        const elemento = document.querySelector(`[data-id*="${id.substring(0, 15)}"]`);
        if (elemento && finger.precio) {
            elemento.dataset.price = finger.precio;
            elemento.dataset.name = `${finger.nombre} – ${finger.unidad}`;
            const precio = elemento.querySelector('.product-price');
            if (precio) precio.textContent = `$${finger.precio.toLocaleString('es-AR')}`;
            const nombre = elemento.querySelector('.product-name');
            if (nombre) nombre.textContent = `${finger.nombre} – ${finger.unidad}`;
        }
    });
}

function actualizarFingersCalientes(datos) {
    datos.forEach(finger => {
        // Crear ID a partir del nombre (convertir a kebab-case)
        const id = finger.nombre.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quitar acentos
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '');
        
        const elemento = document.querySelector(`[data-id*="${id.substring(0, 15)}"]`);
        if (elemento && finger.precio) {
            elemento.dataset.price = finger.precio;
            elemento.dataset.name = `${finger.nombre} – ${finger.unidad}`;
            const precio = elemento.querySelector('.product-price');
            if (precio) precio.textContent = `$${finger.precio.toLocaleString('es-AR')}`;
            const nombre = elemento.querySelector('.product-name');
            if (nombre) nombre.textContent = `${finger.nombre} – ${finger.unidad}`;
        }
    });
}

function actualizarTortasClasicas(datos) {
    datos.forEach(torta => {
        // Crear ID a partir del nombre
        const id = torta.nombre.toLowerCase()
            .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
            .replace(/\s+/g, '-')
            .replace(/[^\w-]/g, '');
        
        const elemento = document.querySelector(`[data-id*="${id.substring(0, 15)}"]`);
        if (elemento) {
            if (torta.precio) {
                elemento.dataset.price = torta.precio;
                const precio = elemento.querySelector('.product-price');
                if (precio) precio.textContent = `$${torta.precio.toLocaleString('es-AR')}`;
            }
            elemento.dataset.name = torta.nombre;
            const nombre = elemento.querySelector('.product-name');
            if (nombre) nombre.textContent = torta.nombre;
        }
    });
}

function actualizarCombosDulces(datos) {
    const ids = ['combo-1', 'combo-2', 'combo-3'];
    
    datos.forEach((combo, index) => {
        if (combo.precio) {
            const elemento = document.querySelector(`.box-container[data-id="${ids[index]}"]`);
            if (elemento) {
                elemento.dataset.price = combo.precio;
                elemento.dataset.name = combo.nombre;
                const precio = elemento.querySelector('.box-price, .size-price');
                if (precio) precio.textContent = `$${combo.precio.toLocaleString('es-AR')}`;
            }
        }
    });
}

// Cargar precios cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', cargarPrecios);
