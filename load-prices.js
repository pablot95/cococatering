// Cargar precios desde localStorage o productos.json
async function cargarPrecios() {
    try {
        let productos;
        
        // Primero intentar cargar desde localStorage
        const stored = localStorage.getItem('productosData');
        if (stored) {
            productos = JSON.parse(stored);
            console.log('Precios cargados desde localStorage');
        } else {
            // Si no hay datos guardados, cargar desde JSON
            const response = await fetch('productos.json');
            productos = await response.json();
            console.log('Precios cargados desde productos.json');
        }
        
        // Box Salados
        actualizarBoxSalados(productos.boxSalados);
        
        // Box Dulces
        actualizarBoxDulces(productos.boxDulces);
        
        // Shots
        actualizarShots(productos.shots);
        
        // Fingers Fríos
        actualizarFingersFrios(productos.fingersFrios);
        
        // Fingers Calientes
        actualizarFingersCalientes(productos.fingersCalientes);
        
        // Tortas Clásicas
        actualizarTortasClasicas(productos.tortasClasicas);
        
        // Combos Dulces
        actualizarCombosDulces(productos.combosDulces);
        
        // Desayunos
        actualizarDesayunos(productos.desayunos);
        
        console.log('Precios cargados correctamente');
    } catch (error) {
        console.error('Error al cargar precios:', error);
    }
}

function actualizarBoxSalados(datos) {
    // Box Uno
    if (datos.boxUno) {
        const boxUno = document.querySelector('.box-container[data-id="box-uno"]');
        if (boxUno) {
            boxUno.dataset.price = datos.boxUno.precio;
            const precio = boxUno.querySelector('.size-price');
            if (precio) precio.textContent = `$${datos.boxUno.precio.toLocaleString('es-AR')}`;
        }
    }
    
    // Box Dos
    if (datos.boxDos) {
        const boxDos = document.querySelector('.box-container[data-id="box-dos"]');
        if (boxDos) {
            boxDos.dataset.price = datos.boxDos.precio;
            const precio = boxDos.querySelector('.size-price');
            if (precio) precio.textContent = `$${datos.boxDos.precio.toLocaleString('es-AR')}`;
        }
    }
    
    // Box Tres
    if (datos.boxTres) {
        const boxTres = document.querySelector('.box-container[data-id="box-tres"]');
        if (boxTres) {
            boxTres.dataset.price = datos.boxTres.precio;
            const precio = boxTres.querySelector('.size-price');
            if (precio) precio.textContent = `$${datos.boxTres.precio.toLocaleString('es-AR')}`;
        }
    }
}

function actualizarBoxDulces(datos) {
    const mapeo = {
        'pattiserieChica': { selector: '[onclick*="pattiserie"][data-size="chica"]' },
        'pattiserieGrande': { selector: '[onclick*="pattiserie"][data-size="grande"]' },
        'alfajorcitosChica': { selector: '[onclick*="alfajorcitos"][data-size="chica"]' },
        'alfajorcitosGrande': { selector: '[onclick*="alfajorcitos"][data-size="grande"]' },
        'cuadraditosChica': { selector: '[onclick*="cuadraditos"][data-size="chica"]' },
        'cuadraditosGrande': { selector: '[onclick*="cuadraditos"][data-size="grande"]' },
        'mixChica': { selector: '[onclick*="mix"][data-size="chica"]' },
        'mixGrande': { selector: '[onclick*="mix"][data-size="grande"]' }
    };
    
    for (const [key, config] of Object.entries(mapeo)) {
        if (datos[key]) {
            const elemento = document.querySelector(config.selector);
            if (elemento) {
                elemento.dataset.price = datos[key].precio;
                const precio = elemento.querySelector('.size-price');
                if (precio) precio.textContent = `$${datos[key].precio.toLocaleString('es-AR')}`;
                
                if (datos[key].unidades) {
                    elemento.dataset.units = datos[key].unidades;
                    const unidades = elemento.querySelector('.size-units');
                    if (unidades) unidades.textContent = `${datos[key].unidades} unidades`;
                }
            }
        }
    }
}

function actualizarShots(datos) {
    if (datos.docena) {
        const shots = document.querySelector('.shots-info');
        if (shots) {
            shots.dataset.price = datos.docena.precio;
            const precio = shots.querySelector('.shots-price');
            if (precio) precio.textContent = `$${datos.docena.precio.toLocaleString('es-AR')}`;
            
            if (datos.docena.unidades) {
                shots.dataset.units = datos.docena.unidades;
                const unidades = shots.querySelector('.shots-units');
                if (unidades) unidades.textContent = `${datos.docena.unidades} unidades`;
            }
        }
    }
}

function actualizarFingersFrios(datos) {
    const mapeo = {
        'masitasQueso': 'masitas-queso',
        'pinchosBocconcinos': 'pinchos-bocconcinos',
        'ensaladitasCesar': 'ensaladitas-cesar',
        'pecetitos': 'pecetitos',
        'papasRosty': 'papas-rosty',
        'picaditasIndividuales': 'picaditas-individuales',
        'figacitaJyQ': 'figacita-jyq',
        'criollitoJyQ': 'criollito-jyq',
        'criollitoCapresse': 'criollito-capresse',
        'sconCrudoRucula': 'scon-crudo-rucula',
        'tartaletaAtun': 'tartaleta-atun',
        'degustacionQueso': 'degustacion-queso',
        'dipQuesoAzul': 'dip-queso-azul',
        'lomoMorron': 'lomo-morron',
        'verduritasAsadasFrio': 'verduritas-asadas-frio'
    };
    
    for (const [key, id] of Object.entries(mapeo)) {
        if (datos[key]) {
            const elemento = document.querySelector(`[data-id="${id}"]`);
            if (elemento) {
                elemento.dataset.price = datos[key].precio;
                const precio = elemento.querySelector('.product-price');
                if (precio) precio.textContent = `$${datos[key].precio.toLocaleString('es-AR')}`;
            }
        }
    }
}

function actualizarFingersCalientes(datos) {
    const mapeo = {
        'empanadaJyQ': 'empanada-jyq',
        'empanadaCarne': 'empanada-carne',
        'empanadaPollo': 'empanada-pollo',
        'empanadaVerdura': 'empanada-verdura',
        'canastitaChoclo': 'canastita-choclo',
        'canastitaEspinaca': 'canastita-espinaca',
        'canastitaJyQ': 'canastita-jyq',
        'rollMasaPhilo': 'roll-masa-philo',
        'triangulitoQuesoAzul': 'triangulito-queso-azul',
        'triangulitoMasaPhilo': 'triangulito-masa-philo',
        'quicheChampignones': 'quiche-champignones',
        'pinchoPolloYPanceta': 'pincho-pollo-panceta',
        'pinchoCrispy': 'pincho-crispy',
        'pinchoTernera': 'pincho-ternera',
        'figacitaBondiola': 'figacita-bondiola',
        'figacitaRoastBeef': 'figacita-roast-beef',
        'taquitoBondiola': 'taquito-bondiola',
        'hamburguesitas': 'hamburguesitas',
        'cazuelaRavioles': 'cazuela-ravioles',
        'verduritasAsadasCaliente': 'verduritas-asadas-caliente'
    };
    
    for (const [key, id] of Object.entries(mapeo)) {
        if (datos[key]) {
            const elemento = document.querySelector(`[data-id="${id}"]`);
            if (elemento) {
                elemento.dataset.price = datos[key].precio;
                const precio = elemento.querySelector('.product-price');
                if (precio) precio.textContent = `$${datos[key].precio.toLocaleString('es-AR')}`;
            }
        }
    }
}

function actualizarTortasClasicas(datos) {
    const mapeo = {
        'brownie': 'brownie',
        'carrotCake': 'carrot-cake',
        'redVelvet': 'red-velvet',
        'chocotorta': 'chocotorta',
        'tortaNuez': 'torta-nuez',
        'matilda': 'matilda',
        'sableAlmendras': 'sable-almendras',
        'oreoTentacion': 'oreo-tentacion',
        'cheesecake': 'cheesecake',
        'lemonPie': 'lemon-pie',
        'keyLimePie': 'key-lime-pie'
    };
    
    for (const [key, id] of Object.entries(mapeo)) {
        if (datos[key]) {
            const elemento = document.querySelector(`[data-id="${id}"]`);
            if (elemento) {
                elemento.dataset.price = datos[key].precio;
                const precio = elemento.querySelector('.product-price');
                if (precio) precio.textContent = `$${datos[key].precio.toLocaleString('es-AR')}`;
            }
        }
    }
}

function actualizarCombosDulces(datos) {
    const mapeo = {
        'combo1': 'combo-1',
        'combo2': 'combo-2',
        'combo3': 'combo-3'
    };
    
    for (const [key, id] of Object.entries(mapeo)) {
        if (datos[key]) {
            const elemento = document.querySelector(`.box-container[data-id="${id}"]`);
            if (elemento) {
                elemento.dataset.price = datos[key].precio;
                const precio = elemento.querySelector('.box-price');
                if (precio) precio.textContent = `$${datos[key].precio.toLocaleString('es-AR')}`;
            }
        }
    }
}

function actualizarDesayunos(datos) {
    if (datos.desayunoDomicilio) {
        const desayuno = document.querySelector('.box-container[data-id="desayuno-domicilio"]');
        if (desayuno) {
            desayuno.dataset.price = datos.desayunoDomicilio.precio;
            const precio = desayuno.querySelector('.box-price');
            if (precio) precio.textContent = `$${datos.desayunoDomicilio.precio.toLocaleString('es-AR')}`;
        }
    }
}

// Cargar precios cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', cargarPrecios);
