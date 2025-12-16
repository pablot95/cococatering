import { db, collection, getDocs, deleteDoc, doc, addDoc } from './firebase-config.js';

// Estructura de datos basada en el análisis de los archivos HTML
const productsData = {
    // BOX SALADOS (Precios por sección/box)
    "BOX UNO": [
        {
            name: "BOX UNO - Todo Frío (10-12 personas)",
            price: 165000,
            description: "15 Pinchos bocconcinos, 15 Sconcitos de queso con crudo y rúcula, 15 Pecetitos con tomate, 15 Papitas rosty, 15 Chipácitos con parmesano y morrones asados, 10 Dip de queso azul y nueces",
            items: [
                "15 Pinchos bocconcinos",
                "15 Sconcitos de queso con crudo y rúcula",
                "15 Pecetitos con tomate",
                "15 Papitas rosty",
                "15 Chipácitos con parmesano y morrones asados",
                "10 Dip de queso azul y nueces"
            ],
            type: "box"
        }
    ],
    "BOX DOS": [
        {
            name: "BOX DOS - Frío/Caliente (12-15 personas)",
            price: 175000,
            description: "15 Sconcitos de queso con Jamón crudo y rúcula, 15 Papitas rosty, 15 Criollitos capresse, 15 Pinchos de pollo y panceta, 15 Figacitas de bondiola con salsa malbec, 15 Triangulitos de queso azul y peras caramelizadas",
            items: [
                "15 Sconcitos de queso con Jamón crudo y rúcula",
                "15 Papitas rosty",
                "15 Criollitos capresse",
                "15 Pinchos de pollo y panceta",
                "15 Figacitas de bondiola con salsa malbec",
                "15 Triangulitos de queso azul y peras caramelizadas"
            ],
            type: "box"
        }
    ],
    "BOX TRES": [
        {
            name: "BOX TRES - Mix (12-15 personas)",
            price: 185000,
            description: "15 Picaditas individuales, 15 Empanaditas de jamón y queso, 15 Pinchos de pollo crispy, 15 Taquitos de bondiola, 15 Hamburguesitas",
            items: [
                "15 Picaditas individuales acompañadas con dip de hummus, mayo de zanahoria y pancitos",
                "15 Empanaditas de jamón y queso",
                "15 Pinchos de pollo crispy con salsa honey",
                "15 Taquitos de bondiola",
                "15 Hamburguesitas"
            ],
            type: "box"
        }
    ],

    // BOX DULCES (Precios por tamaño)
    "BOX PATTISERIE": [
        {
            name: "Box Pattiserie - Chica",
            price: 35000,
            units: 16,
            type: "box-size",
            parentId: "pattiserie",
            items: [
                "Brownie, dulce de leche y merengue",
                "Pavlovas (sin tacc)",
                "Lemon pie",
                "Rogelitos",
                "Mousse de chocolate amargo",
                "Mousse de coco",
                "Cheescake de frutos rojos",
                "Cheescake de maracuyá",
                "Mousse de café y caramelo",
                "Oreo",
                "Havanette",
                "Macarons (sin tacc)",
                "Sable de almendras",
                "Brownie, DDL, crema y frutilla",
                "Chocotorta"
            ]
        },
        {
            name: "Box Pattiserie - Grande",
            price: 85000,
            units: 42,
            type: "box-size",
            parentId: "pattiserie",
            items: [
                "Brownie, dulce de leche y merengue",
                "Pavlovas (sin tacc)",
                "Lemon pie",
                "Rogelitos",
                "Mousse de chocolate amargo",
                "Mousse de coco",
                "Cheescake de frutos rojos",
                "Cheescake de maracuyá",
                "Mousse de café y caramelo",
                "Oreo",
                "Havanette",
                "Macarons (sin tacc)",
                "Sable de almendras",
                "Brownie, DDL, crema y frutilla",
                "Chocotorta"
            ]
        }
    ],
    "BOX ALFAJORCITOS": [
        {
            name: "Box Alfajorcitos - Chica",
            price: 32000,
            units: 28,
            type: "box-size",
            parentId: "alfajorcitos",
            items: [
                "Alfajorcitos de maizena",
                "Alfajorcitos de manteca",
                "Alfajorcitos de almendras",
                "Alfajorcitos de chocolate",
                "Alfajorcitos de pistacho",
                "Alfacookies de chocolate negro",
                "Alfajorcitos de coco"
            ]
        },
        {
            name: "Box Alfajorcitos - Grande",
            price: 50000,
            units: 47,
            type: "box-size",
            parentId: "alfajorcitos",
            items: [
                "Alfajorcitos de maizena",
                "Alfajorcitos de manteca",
                "Alfajorcitos de almendras",
                "Alfajorcitos de chocolate",
                "Alfajorcitos de pistacho",
                "Alfacookies de chocolate negro",
                "Alfajorcitos de coco"
            ]
        }
    ],
    "BOX CUADRADITOS": [
        {
            name: "Box Cuadraditos - Chica",
            price: 34000,
            units: 28,
            type: "box-size",
            parentId: "cuadraditos",
            items: [
                "Crumble de manzana",
                "Cuadradito de brownie",
                "Lemonies",
                "Pastafrola",
                "Cuadradito de coco con DDL",
                "Crumble de frambuesas",
                "Cuadradito de nuez"
            ]
        },
        {
            name: "Box Cuadraditos - Grande",
            price: 60000,
            units: 49,
            type: "box-size",
            parentId: "cuadraditos",
            items: [
                "Crumble de manzana",
                "Cuadradito de brownie",
                "Lemonies",
                "Pastafrola",
                "Cuadradito de coco con DDL",
                "Crumble de frambuesas",
                "Cuadradito de nuez"
            ]
        }
    ],
    "BOX MIX": [
        {
            name: "Box Mix - Chica",
            price: 34000,
            units: 35,
            type: "box-size",
            parentId: "mix",
            items: [
                "Conitos de chocolate y DDL",
                "Trufas de coco / brigadeiros",
                "Trufas de chocolate con brownie",
                "Danesas",
                "Cookies red velvet",
                "Lunetts"
            ]
        },
        {
            name: "Box Mix - Grande",
            price: 52000,
            units: 56,
            type: "box-size",
            parentId: "mix",
            items: [
                "Conitos de chocolate y DDL",
                "Trufas de coco / brigadeiros",
                "Trufas de chocolate con brownie",
                "Danesas",
                "Cookies red velvet",
                "Lunetts"
            ]
        }
    ],

    // SHOTS
    "SHOTS": [
        {
            name: "Shots - Docena",
            price: 32000,
            units: 12,
            type: "shots",
            description: "Lemon pie, Cheesecake, Oreo, Chocotorta, Mousse de chocolate",
            items: [
                "Lemon pie",
                "Cheesecake",
                "Oreo",
                "Chocotorta",
                "Mousse de chocolate"
            ]
        }
    ],

    // FINGERS FRIOS (Precios individuales)
    "Fingers Fríos": [
        { name: "Masitas de queso – x24", price: 19000 },
        { name: "Pinchos bocconcinos – x12", price: 22000 },
        { name: "Ensaladitas César – x12", price: 48000 },
        { name: "Pecetitos – x12", price: 38000 },
        { name: "Papas rosty – x12", price: 15000 },
        { name: "Picaditas individuales – x12", price: 78000 },
        { name: "Figacita J y Q – x12", price: 21000 },
        { name: "Criollito J y Q – x12", price: 25000 }
    ],

    // FINGERS CALIENTES
    "Fingers Calientes": [
        { name: "Empanaditas de bondiola – x12", price: 22000 },
        { name: "Empanaditas de JyQ – x12", price: 22000 },
        { name: "Empanaditas de Pollo – x12", price: 22000 },
        { name: "Empanaditas de carne – x12", price: 22000 },
        { name: "Empanaditas de Osobuco – x12", price: 22000 },
        { name: "Empanaditas de Lomo – x12", price: 30000 },
        { name: "Canastitas de capresse", price: 20000 },
        { name: "Canastitas Queso azul y cebolla caramelizada", price: 20000 },
        { name: "Canastitas Panceta y ciruela", price: 20000 },
        { name: "Canastitas Calabaza", price: 18000 },
        { name: "Canastitas Espinaca", price: 20000 },
        { name: "Pollitos crispy con salsa honey – x12", price: 22000 },
        { name: "Hamburguesitas con cheddar – x12", price: 36000 },
        { name: "Tacos de bondiola – x12", price: 36000 },
        { name: "Pinchos de pollo y panceta con salsa manzana – x12", price: 22000 },
        { name: "Tarteletas espinaca – x12", price: 18000 },
        { name: "Roast beef – x12", price: 30000 },
        { name: "Roll de masa philo con JYQ – x12", price: 28000 },
        { name: "Triangulito de bondiola – x12", price: 40000 },
        { name: "Tarteleta de champi – x12", price: 30000 },
        { name: "Brochetitas de ternera con salsa malbec – x12", price: 40000 },
        { name: "Verduritas asadas – x12", price: 22000 },
        { name: "Medialunitas JYQ – x12", price: 28000 },
        { name: "Roll de masa philo con queso y cebolla caramelizada – x12", price: 30000 }
    ],

    // TORTAS CLASICAS
    "Tortas Clásicas": [
        { name: "BROWNIE", price: 38000 },
        { name: "RED VELVET", price: 48000 },
        { name: "BANOFFE", price: 32000 },
        { name: "CHOCOTORTA", price: 42000 },
        { name: "TORTA DE NUEZ", price: 32000 },
        { name: "MATILDA", price: 48000 },
        { name: "SABLÉ DE ALMENDRAS", price: 48000 },
        { name: "MARQUISE DE FRUTOS ROJOS", price: 42000 },
        { name: "ROGEL", price: 36000 },
        { name: "OREO TENTACIÓN", price: 42000 }
    ],

    // COMBOS DULCES
    "Combos Dulces": [
        { 
            name: "COMBO 1", 
            price: 68000, 
            type: "box",
            items: [
                "6 Cookies decoradas",
                "6 Cakepops",
                "6 Oreos decoradas",
                "4 Paletas"
            ]
        },
        { 
            name: "COMBO 2", 
            price: 102000, 
            type: "box",
            items: [
                "6 Cookies decoradas",
                "6 Cakepops",
                "6 Oreos decoradas",
                "6 Paletas",
                "6 Cupcakes"
            ]
        },
        { 
            name: "COMBO 3", 
            price: 230000, 
            type: "box",
            items: [
                "12 Cookies decoradas",
                "12 Cakepops",
                "12 Oreos decoradas",
                "6 Paletas",
                "12 Cupcakes",
                "12 Chocolates"
            ]
        }
    ],

    // DESAYUNOS
    "Desayunos": [
        { name: "Desayuno a Domicilio", price: 70000, type: "box" }
    ],

    // --- EVENTOS ---
    "EVENTOS_GOURMET": [
        // PARTE FRÍA
        { name: "Tarteletas frías de hummus y atún", section: "PARTE FRÍA" },
        { name: "Degustación de quesos", section: "PARTE FRÍA" },
        { name: "Scon de queso al romero con lájas de salmón", section: "PARTE FRÍA" },
        { name: "Dip de queso azul y nueces", section: "PARTE FRÍA" },
        { name: "Locatelli de pollo y tomate", section: "PARTE FRÍA" },
        { name: "Figacita de lomo y morrones asados", section: "PARTE FRÍA" },
        { name: "Chipacitos de crudo y brie", section: "PARTE FRÍA" },
        // PARTE CALIENTE
        { name: "Triangulito de masa philo y bondiola braseada", section: "PARTE CALIENTE" },
        { name: "Quiché de champignones", section: "PARTE CALIENTE" },
        { name: "Papas rosti", section: "PARTE CALIENTE" },
        { name: "Brochetitas de ternera", section: "PARTE CALIENTE" },
        { name: "Hamburguesitas", section: "PARTE CALIENTE" },
        { name: "Cazuela de ravioles con salsa rosa", section: "PARTE CALIENTE" },
        // POSTRE
        { name: "Shot de lemon pie", section: "POSTRE" },
        { name: "Shot de oreo", section: "POSTRE" }
    ],
    "EVENTOS_CLASICO": [
        // PARTE FRÍA
        { name: "Masitas de queso", section: "PARTE FRÍA" },
        { name: "Pinchos bocconcinos", section: "PARTE FRÍA" },
        { name: "Dip de queso azul con nueces", section: "PARTE FRÍA" },
        { name: "Criollito capresse", section: "PARTE FRÍA" },
        { name: "Sconcito de crudo y rúcula", section: "PARTE FRÍA" },
        { name: "Locatelli de pavita y tomate", section: "PARTE FRÍA" },
        { name: "Figacita de peceto, lechuga y tomate", section: "PARTE FRÍA" },
        // PARTE CALIENTE
        { name: "Pinchos de pollo y panceta", section: "PARTE CALIENTE" },
        { name: "Figacita de bondiola, queso fresco y salsa malbec", section: "PARTE CALIENTE" },
        { name: "Canastitas de espinaca", section: "PARTE CALIENTE" },
        { name: "Roll de masa philo con jamón y queso", section: "PARTE CALIENTE" },
        { name: "Figacita de roast beef tiernizado, cheddar y cebolla caramelizada", section: "PARTE CALIENTE" },
        // POSTRE
        { name: "Shot de lemon pie", section: "POSTRE" },
        { name: "Shot de oreo", section: "POSTRE" }
    ],
    "EVENTOS_PICADA": [
        // PARTE FRÍA
        { name: "Picaditas individuales", section: "PARTE FRÍA" },
        { name: "Ensaladita caesar", section: "PARTE FRÍA" },
        { name: "Sandwiche de peceto", section: "PARTE FRÍA" },
        // PARTE CALIENTE
        { name: "Papitas rosty", section: "PARTE CALIENTE" },
        { name: "Pinchos de pollo crispy", section: "PARTE CALIENTE" },
        { name: "Mini hamburguesitas con queso cheddar", section: "PARTE CALIENTE" },
        { name: "Mini tacos de bondiola", section: "PARTE CALIENTE" },
        // POSTRE
        { name: "Shot de cheesecake", section: "POSTRE" },
        { name: "Shot de oreo", section: "POSTRE" }
    ],
    "EVENTOS_PIZZA": [
        // ENTRADA
        { name: "Pan de queso con oliva y provenzal", section: "ENTRADA" },
        // EMPANADAS
        { name: "Bondiola", section: "EMPANADAS" },
        { name: "Jamón y queso", section: "EMPANADAS" },
        { name: "Pollo", section: "EMPANADAS" },
        { name: "Criolla", section: "EMPANADAS" },
        // CANASTITAS
        { name: "Caprese", section: "CANASTITAS" },
        { name: "Roquefort", section: "CANASTITAS" },
        { name: "Panceta", section: "CANASTITAS" },
        // PIZZAS
        { name: "Muzzarella", section: "PIZZAS" },
        { name: "Tomate, oliva y albahaca", section: "PIZZAS" },
        { name: "Tomate y provenzal", section: "PIZZAS" },
        { name: "Jamón y morrones", section: "PIZZAS" },
        { name: "Rúcula, parmesano y jamón crudo", section: "PIZZAS" },
        { name: "Rúcula, brie y champignones", section: "PIZZAS" },
        { name: "Rúcula, cherrys y bocconcinos", section: "PIZZAS" },
        { name: "Calabresa", section: "PIZZAS" },
        { name: "Fugazzeta", section: "PIZZAS" },
        { name: "Roquefort y cebolla caramelizada", section: "PIZZAS" },
        { name: "Panceta y huevo", section: "PIZZAS" },
        { name: "Espinaca y salsa blanca", section: "PIZZAS" },
        // POSTRE
        { name: "Shot de lemon", section: "POSTRE" },
        { name: "Shot de oreo", section: "POSTRE" }
    ]
};

async function resetDatabase() {
    console.log("Iniciando reseteo de base de datos...");

    // 1. Obtener todas las colecciones existentes (simulado borrando documentos conocidos)
    // Nota: Firestore no permite listar colecciones desde el cliente web fácilmente sin saber sus nombres
    // Vamos a usar los nombres de las claves de productsData como nombres de colecciones
    
    const collectionNames = Object.keys(productsData);

    for (const colName of collectionNames) {
        console.log(`Limpiando colección: ${colName}...`);
        const colRef = collection(db, colName);
        const snapshot = await getDocs(colRef);
        
        const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
        await Promise.all(deletePromises);
        console.log(`Colección ${colName} limpiada.`);
    }

    console.log("Base de datos limpia. Iniciando carga de datos...");

    // 2. Cargar nuevos datos
    for (const [colName, items] of Object.entries(productsData)) {
        console.log(`Cargando productos en: ${colName}...`);
        const colRef = collection(db, colName);
        
        const addPromises = items.map(item => addDoc(colRef, item));
        await Promise.all(addPromises);
    }

    console.log("¡Carga de datos completada exitosamente!");
    alert("Base de datos actualizada correctamente.");
}

export { resetDatabase };
window.resetDatabase = resetDatabase;
