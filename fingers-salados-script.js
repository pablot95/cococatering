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
