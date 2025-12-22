// Script para manejar hover en fingers salados
document.addEventListener('DOMContentLoaded', function() {
    const items = document.querySelectorAll('.dulces-item');
    const heroImage = document.getElementById('saladosHeroImage');

    let lastImage = null;

    items.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const newImage = this.getAttribute('data-image');
            if (newImage && heroImage) {
                lastImage = newImage;
                heroImage.style.opacity = '0';
                setTimeout(() => {
                    heroImage.src = newImage;
                    heroImage.style.opacity = '1';
                }, 180);
            }
        });
    });
});

// ===================================
// Protección contra inspección y copia
// ===================================
// Deshabilitar click derecho
/*
document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
});

// Deshabilitar teclas de desarrollo (F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U)
document.addEventListener('keydown', (e) => {
    if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J')) || 
        (e.ctrlKey && e.key === 'U')
    ) {
        e.preventDefault();
        return false;
    }
});
*/
