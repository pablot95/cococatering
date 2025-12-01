// Script para cambiar imagen del hero al hacer hover en los items de fingers dulces
document.addEventListener('DOMContentLoaded', function() {
    const dulcesItems = document.querySelectorAll('.a');
    const heroImage = document.getElementById('dulcesHeroImage');

    dulcesItems.forEach(item => {
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


// Script para cambiar imagen del hero al hacer hover en los items de fingers dulces (Shots)
document.addEventListener('DOMContentLoaded', function() {
    const dulcesItems2 = document.querySelectorAll('.b');
    const heroImage2 = document.getElementById('shotsHeroImage');

    dulcesItems2.forEach(item => {
        item.addEventListener('mouseenter', function() {
            const imageUrl = this.getAttribute('data-image');
            if (imageUrl && heroImage2) {
                heroImage2.style.opacity = '0';
                setTimeout(() => {
                    heroImage2.src = imageUrl;
                    heroImage2.style.opacity = '1';
                }, 0);
            }
        });
    });
});