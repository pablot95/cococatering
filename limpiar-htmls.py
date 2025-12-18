#!/usr/bin/env python3
"""
Script para vaciar el contenido hardcodeado de los HTMLs
y dejar solo el contenedor para que Firebase lo llene dinámicamente
"""

import re

# Archivos a procesar
archivos = [
    'fingers-frios.html',
    'fingers-calientes.html',
    'box-dulces.html',
    'combos-dulces.html',
    'tortas-clasicas.html',
    'shots.html',
    'desayunos.html'
]

# Contenido vacío a insertar
contenido_vacio = '''        <!-- Contenedor que será llenado dinámicamente por Firebase -->
        <div class="menu-scroll-container">
            <!-- Los productos se cargarán automáticamente desde Firebase -->
            <div style="text-align: center; padding: 50px; color: #666;">
                <p>Cargando productos...</p>
            </div>
        </div>'''

for archivo in archivos:
    try:
        # Leer archivo
        with open(archivo, 'r', encoding='utf-8') as f:
            contenido = f.read()
        
        # Patrón para encontrar el contenedor y todo su contenido
        patron = r'        <div class="menu-scroll-container">.*?</div>\s*</div>'
        
        # Reemplazar con contenido vacío
        nuevo_contenido = re.sub(
            patron,
            contenido_vacio,
            contenido,
            flags=re.DOTALL
        )
        
        # Escribir de vuelta
        with open(archivo, 'w', encoding='utf-8') as f:
            f.write(nuevo_contenido)
        
        print(f"✅ {archivo} limpiado exitosamente")
        
    except Exception as e:
        print(f"❌ Error con {archivo}: {e}")

print("\n🎉 Todos los archivos procesados")
