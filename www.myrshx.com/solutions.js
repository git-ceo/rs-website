document.addEventListener('DOMContentLoaded', function () {
    // 导航栏
    var header = document.getElementById('header');
    var hamburger = document.getElementById('hamburger');
    var navMenu = document.getElementById('navMenu');
    hamburger.addEventListener('click', function () {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // 滚动动画
    var els = document.querySelectorAll('.anim');
    var obs = new IntersectionObserver(function (entries) {
        entries.forEach(function (e) {
            if (e.isIntersecting) e.target.classList.add('animated');
        });
    }, { threshold: 0.1 });
    els.forEach(function (el) { obs.observe(el); });

    // 返回顶部
    var backBtn = document.getElementById('backToTop');
    if (backBtn) {
        window.addEventListener('scroll', function () {
            backBtn.classList.toggle('visible', window.scrollY > 300);
        });
        backBtn.addEventListener('click', function () {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
});
