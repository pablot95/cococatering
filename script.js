// ===================================
// Carrusel de Imágenes
// ===================================
let currentSlideIndex = 0;
const slides = document.querySelectorAll('.carousel-slide');
const indicators = document.querySelectorAll('.indicator');
let autoSlideInterval;

// Mostrar slide específico
function showSlide(index) {
    // Asegurar que el índice esté en rango
    if (index >= slides.length) {
        currentSlideIndex = 0;
    } else if (index < 0) {
        currentSlideIndex = slides.length - 1;
    } else {
        currentSlideIndex = index;
    }

    // Remover clase active de todos los slides e indicadores
    slides.forEach(slide => slide.classList.remove('active'));
    indicators.forEach(indicator => indicator.classList.remove('active'));

    // Agregar clase active al slide e indicador actual
    slides[currentSlideIndex].classList.add('active');
    indicators[currentSlideIndex].classList.add('active');
}

// Cambiar slide (prev/next)
function changeSlide(direction) {
    showSlide(currentSlideIndex + direction);
    resetAutoSlide();
}

// Ir a slide específico
function currentSlide(index) {
    showSlide(index);
    resetAutoSlide();
}

// Auto-avance del carrusel
function startAutoSlide() {
    autoSlideInterval = setInterval(() => {
        showSlide(currentSlideIndex + 1);
    }, 5000); // Cambia cada 5 segundos
}

// Reiniciar auto-avance
function resetAutoSlide() {
    clearInterval(autoSlideInterval);
    startAutoSlide();
}

// Iniciar carrusel al cargar
document.addEventListener('DOMContentLoaded', () => {
    showSlide(0);
    startAutoSlide();

    // Pausar auto-slide al hover sobre controles
    const controls = document.querySelectorAll('.carousel-control, .indicator');
    controls.forEach(control => {
        control.addEventListener('mouseenter', () => {
            clearInterval(autoSlideInterval);
        });
        control.addEventListener('mouseleave', () => {
            resetAutoSlide();
        });
    });

    // Soporte para swipe en móviles
    let touchStartX = 0;
    let touchEndX = 0;

    const carousel = document.querySelector('.hero-carousel');

    carousel.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
    });

    carousel.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        handleSwipe();
    });

    function handleSwipe() {
        if (touchEndX < touchStartX - 50) {
            // Swipe izquierda
            changeSlide(1);
        }
        if (touchEndX > touchStartX + 50) {
            // Swipe derecha
            changeSlide(-1);
        }
    }
});

// ===================================
// Animación de entrada para botones
// ===================================
const navButtons = document.querySelectorAll('.nav-btn');

navButtons.forEach((btn, index) => {
    btn.style.animation = `fadeInUp 0.6s ease ${0.1 * index + 0.5}s backwards`;
});

// ===================================
// Control de navegación con teclado
// ===================================
document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowLeft') {
        changeSlide(-1);
    } else if (e.key === 'ArrowRight') {
        changeSlide(1);
    }
});

// ===================================
// Efecto parallax suave en logo
// ===================================
window.addEventListener('scroll', () => {
    const logo = document.querySelector('.logo-header');
    const scrolled = window.pageYOffset;
    
    if (logo && scrolled < 100) {
        logo.style.transform = `translate(-50%, ${scrolled * 0.3}px)`;
    }
});

console.log('%c🍽️ Cocó Catering - Bienvenido! ', 'background: #8B2E3A; color: #FEFEFE; font-size: 16px; padding: 10px; border-radius: 5px;');
