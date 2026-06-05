/* ============================================
   仓储运输独立页面
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    initLogisticsNavbar();
    initBackToTop();
    initScrollAnimations();
});

function initLogisticsNavbar() {
    var header = document.getElementById('header');
    var hamburger = document.getElementById('hamburger');
    var navMenu = document.getElementById('navMenu');
    if (!header || !hamburger || !navMenu) return;

    header.classList.add('scrolled');

    hamburger.addEventListener('click', function () {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    document.addEventListener('click', function (e) {
        if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });
}

function initBackToTop() {
    var btn = document.getElementById('backToTop');
    if (!btn) return;

    window.addEventListener('scroll', function () {
        if (window.scrollY > 400) {
            btn.classList.add('visible');
        } else {
            btn.classList.remove('visible');
        }
    });

    btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function initScrollAnimations() {
    var animElements = document.querySelectorAll('.anim');
    if (!animElements.length || !('IntersectionObserver' in window)) {
        animElements.forEach(function (el) { el.classList.add('animated'); });
        return;
    }

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('animated');
            var parent = entry.target.parentElement;
            if (parent) {
                var siblings = parent.querySelectorAll('.anim');
                siblings.forEach(function (sib, idx) {
                    sib.style.transitionDelay = (idx * 0.08) + 's';
                });
            }
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    animElements.forEach(function (el) { observer.observe(el); });
}
