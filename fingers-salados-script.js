// Script para manejar hover en fingers salados
document.addEventListener('DOMContentLoaded', function() {
    const items = document.querySelectorAll('.dulces-item');
    const heroImage = document.getElementById('saladosHeroImage');

    let lastImage = null;

    items.forEach(item => {
        const changeImage = (e) => {
            if (e && e.stopPropagation) e.stopPropagation();

            const newImage = item.getAttribute('data-image');
            if (newImage && heroImage) {
                lastImage = newImage;
                // Eliminar opacidad 0 y timeout para respuesta inmediata
                // heroImage.style.opacity = '0';
                
                heroImage.src = newImage;
                heroImage.style.opacity = '1';
            }
        };

        item.addEventListener('mouseenter', changeImage);
        item.addEventListener('touchstart', changeImage, { passive: true });
        item.addEventListener('click', changeImage);
    });
});


