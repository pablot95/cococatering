// Script para cambiar imagen del hero al hacer hover en los items de fingers dulces
document.addEventListener('DOMContentLoaded', function() {
    const dulcesItems = document.querySelectorAll('.a');
    const heroImage = document.getElementById('dulcesHeroImage');

    dulcesItems.forEach(item => {
        const changeImage = (e) => {
            if (e && e.stopPropagation) e.stopPropagation();
            
            const imageUrl = item.getAttribute('data-image');
            if (imageUrl && heroImage) {
                // Eliminar opacidad 0 para evitar parpadeo en móviles si la imagen ya está cargada
                // heroImage.style.opacity = '0'; 
                
                // Cambio directo
                heroImage.src = imageUrl;
                heroImage.style.opacity = '1';
            }
        };

        item.addEventListener('mouseenter', changeImage);
        item.addEventListener('touchstart', changeImage, { passive: true });
        item.addEventListener('click', changeImage);
    });
});


// Script para cambiar imagen del hero al hacer hover en los items de fingers dulces (Shots)
document.addEventListener('DOMContentLoaded', function() {
    const dulcesItems2 = document.querySelectorAll('.b');
    const heroImage2 = document.getElementById('shotsHeroImage');

    dulcesItems2.forEach(item => {
        const changeImage = (e) => {
            if (e && e.stopPropagation) e.stopPropagation();

            const imageUrl = item.getAttribute('data-image');
            if (imageUrl && heroImage2) {
                // Eliminar opacidad 0 para evitar parpadeo
                // heroImage2.style.opacity = '0';
                
                heroImage2.src = imageUrl;
                heroImage2.style.opacity = '1';
            }
        };

        item.addEventListener('mouseenter', changeImage);
        item.addEventListener('touchstart', changeImage, { passive: true });
        item.addEventListener('click', changeImage);
    });
});

