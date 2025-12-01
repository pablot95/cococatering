// Script para cambiar imagen del hero al hacer hover en los items del menú
document.addEventListener('DOMContentLoaded', function() {
    const menuItems = document.querySelectorAll('.menu-item');
    const heroImage = document.getElementById('menuHeroImage');

    menuItems.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const imageUrl = this.getAttribute('data-image');
            if (imageUrl && heroImage) {
                heroImage.style.opacity = '0';
                setTimeout(() => {
                    heroImage.src = imageUrl;
                    heroImage.style.opacity = '1';
                }, 0);
            }
        });
    });
});
