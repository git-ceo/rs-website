/* ============================================
   企业文化独立页面
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    initCultureNavbar();
    initBackToTop();
    initScrollAnimations();
    initCultureLightbox();
    loadCulturePage();
});

var _cultureData = { categories: [], items: [] };
var _cultureFilter = 'all';

var CULTURE_CARD_ANIMS = ['up', 'down', 'left', 'right', 'zoom', 'rotate'];
var CULTURE_REVEAL_ANIMS = ['fade', 'scale', 'up', 'down', 'left', 'right', 'blur', 'zoom'];

function cultureRandomItem(list) {
    return list[Math.floor(Math.random() * list.length)];
}

function cultureRandomDelay(index) {
    return (Math.min(index, 12) * 0.04 + Math.random() * 0.12).toFixed(3);
}

function initCultureNavbar() {
    var header = document.getElementById('header');
    var hamburger = document.getElementById('hamburger');
    var navMenu = document.getElementById('navMenu');

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
        btn.classList.toggle('visible', window.scrollY > 400);
    });

    btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

function initScrollAnimations() {
    if (!('IntersectionObserver' in window)) return;

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                entry.target.classList.add('animated');
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.anim').forEach(function (el) {
        observer.observe(el);
    });
}

function initCultureTabs() {
    var tabsEl = document.getElementById('cultureTabs');
    if (!tabsEl || tabsEl.dataset.bound === '1') return;
    tabsEl.dataset.bound = '1';

    tabsEl.querySelectorAll('.culture-tab').forEach(function (tab) {
        tab.addEventListener('click', function () {
            tabsEl.querySelectorAll('.culture-tab').forEach(function (t) {
                t.classList.remove('active');
            });
            tab.classList.add('active');
            _cultureFilter = tab.getAttribute('data-culture') || 'all';
            renderCultureGrid();
        });
    });
}

async function loadCulturePage() {
    var grid = document.getElementById('cultureGrid');
    var tabsEl = document.getElementById('cultureTabs');
    var totalEl = document.getElementById('cultureTotal');

    try {
        var res = await fetch('/api/culture');
        if (!res.ok) throw new Error('HTTP ' + res.status);
        var json = await res.json();
        var data = json.data || json;
        var items = data.items;
        var categories = data.categories || [];

        if (!Array.isArray(items) || !items.length) {
            throw new Error('暂无企业文化数据');
        }

        _cultureData = { categories: categories, items: items };
        _cultureFilter = 'all';

        if (totalEl) totalEl.textContent = String(items.length);

        if (tabsEl) {
            tabsEl.innerHTML = '<button type="button" class="culture-tab active" data-culture="all">全部</button>' +
                categories.map(function (cat) {
                    var label = (cat.icon ? cat.icon + ' ' : '') + cat.name;
                    return '<button type="button" class="culture-tab" data-culture="' + escapeHtml(cat.id) + '">' +
                        escapeHtml(label) + '</button>';
                }).join('');
            renderCultureGrid();
            initCultureTabs();
        } else {
            renderCultureGrid();
        }
        signalDemoContentReady();
    } catch (err) {
        if (grid) {
            grid.innerHTML = '<div class="culture-error">加载失败，请刷新页面重试<br><small>' +
                escapeHtml(err.message) + '</small></div>';
        }
        console.error('企业文化加载失败:', err);
        signalDemoContentReady();
    }
}

function signalDemoContentReady() {
    window.dispatchEvent(new CustomEvent('rs-demo-content-ready'));
}

function renderCultureGrid() {
    var grid = document.getElementById('cultureGrid');
    var emptyEl = document.getElementById('cultureEmpty');
    if (!grid) return;

    var catMap = {};
    (_cultureData.categories || []).forEach(function (c) {
        catMap[c.id] = c;
    });

    var items = _cultureData.items || [];
    var filtered = items
        .filter(function (item) {
            if (_cultureFilter === 'all') return true;
            return String(item.category) === String(_cultureFilter);
        })
        .sort(function (a, b) {
            return (a.order || 0) - (b.order || 0);
        });

    if (filtered.length === 0) {
        grid.innerHTML = '';
        if (emptyEl) emptyEl.hidden = false;
        return;
    }

    if (emptyEl) emptyEl.hidden = true;

    grid.innerHTML = filtered.map(function (item, i) {
        var cat = catMap[item.category] || {};
        var catLabel = ((cat.icon || '') + ' ' + (cat.name || item.category)).trim();
        var wideClass = '';
        var imgSrc = item.image || '';
        var cardAnim = cultureRandomItem(CULTURE_CARD_ANIMS);
        var revealAnim = cultureRandomItem(CULTURE_REVEAL_ANIMS);

        return '<div class="culture-card culture-card-in-' + cardAnim + wideClass + '" data-category="' + escapeHtml(item.category) + '" style="animation-delay:' + cultureRandomDelay(i) + 's">' +
            '<div class="culture-card-img culture-card-img--click culture-reveal-' + revealAnim + '">' +
            '<img src="' + escapeHtml(imgSrc) + '" alt="' + escapeHtml(item.title) + '" loading="lazy" decoding="async">' +
            '</div>' +
            '<div class="culture-card-info">' +
            '<span class="culture-card-cat">' + escapeHtml(catLabel) + '</span>' +
            '<span class="culture-card-desc">' + escapeHtml(item.title) + '</span>' +
            '</div>' +
            '</div>';
    }).join('');

    initCultureCardImages(grid);

    grid.querySelectorAll('.culture-card-img--click').forEach(function (wrap) {
        wrap.addEventListener('click', function () {
            var img = wrap.querySelector('img');
            if (img) openCultureLightbox(img.getAttribute('src'), img.getAttribute('alt'));
        });
    });
}

function initCultureCardImages(grid) {
    if (!grid) return;
    grid.querySelectorAll('.culture-card-img').forEach(function (wrap) {
        var img = wrap.querySelector('img');
        if (!img) return;

        function markLoaded() {
            wrap.classList.add('is-loaded');
        }

        function markError() {
            wrap.classList.add('is-loaded', 'is-error');
        }

        if (img.complete && img.naturalWidth > 0) {
            markLoaded();
        } else {
            img.addEventListener('load', markLoaded, { once: true });
            img.addEventListener('error', markError, { once: true });
        }
    });
}

function initCultureLightbox() {
    var lb = document.getElementById('cultureLightbox');
    var closeBtn = document.getElementById('cultureLightboxClose');
    if (!lb || !closeBtn) return;

    closeBtn.addEventListener('click', closeCultureLightbox);
    lb.addEventListener('click', function (e) {
        if (e.target === lb) closeCultureLightbox();
    });
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !lb.hidden) closeCultureLightbox();
    });
}

function openCultureLightbox(src, title) {
    var lb = document.getElementById('cultureLightbox');
    var img = document.getElementById('cultureLightboxImg');
    var cap = document.getElementById('cultureLightboxCaption');
    if (!lb || !img) return;

    img.src = src;
    img.alt = title || '';
    if (cap) cap.textContent = title || '';
    lb.hidden = false;
    document.body.style.overflow = 'hidden';
}

function closeCultureLightbox() {
    var lb = document.getElementById('cultureLightbox');
    if (!lb) return;
    lb.hidden = true;
    document.body.style.overflow = '';
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
