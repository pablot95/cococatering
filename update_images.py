# Script para actualizar nombres de imágenes en HTMLs
import re
import os

files_to_update = [
    'eventos.html',
    'fingers-frios.html',
    'fingers-calientes.html',
    'box-dulces.html',
    'shots.html',
    'tortas-clasicas.html'
]

def replace_image_paths(content):
    # Reemplaza productos/nombre con espacios.jpg por productos/nombre-con-guiones.jpg
    pattern = r'productos/([^"]+?)\.jpg'
    
    def replacer(match):
        filename = match.group(1)
        new_filename = filename.replace(' ', '-')
        return f'productos/{new_filename}.jpg'
    
    return re.sub(pattern, replacer, content)

for filename in files_to_update:
    if os.path.exists(filename):
        print(f'Procesando {filename}...')
        
        # Leer archivo
        with open(filename, 'r', encoding='utf-8') as f:
            content = f.read()
        
        # Reemplazar
        new_content = replace_image_paths(content)
        
        # Guardar
        with open(filename, 'w', encoding='utf-8') as f:
            f.write(new_content)
        
        print(f'  ✓ {filename} actualizado')
    else:
        print(f'  ✗ {filename} no encontrado')

print('\n¡Proceso completado!')
