// Script para cambiar imagen del hero al hacer hover en los items de fingers dulces
document.addEventListener('DOMContentLoaded', function() {
    const dulcesItems = document.querySelectorAll('.a');
    const heroImage = document.getElementById('dulcesHeroImage');

    dulcesItems.forEach(item => {
        const changeImage = () => {
            const imageUrl = item.getAttribute('data-image');
            if (imageUrl && heroImage) {
                heroImage.style.opacity = '0';
                setTimeout(() => {
                    heroImage.src = imageUrl;
                    heroImage.style.opacity = '1';
                }, 0);
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
        const changeImage = () => {
            const imageUrl = item.getAttribute('data-image');
            if (imageUrl && heroImage2) {
                heroImage2.style.opacity = '0';
                setTimeout(() => {
                    heroImage2.src = imageUrl;
                    heroImage2.style.opacity = '1';
                }, 0);
            }
        };

        item.addEventListener('mouseenter', changeImage);
        item.addEventListener('touchstart', changeImage, { passive: true });
        item.addEventListener('click', changeImage);
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