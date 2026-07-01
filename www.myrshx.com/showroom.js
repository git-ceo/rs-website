/* ============================================
   产品展厅页面交互逻辑
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    initShowroomNavbar();
    initBackToTop();
    initScrollAnimations();
    loadShowroom();
});

var _showroomData = { categories: [], items: [] };
var _activeCategory = 'all';
var _searchQuery = '';

function initShowroomNavbar() {
    var header = document.getElementById('header');
    var hamburger = document.getElementById('hamburger');
    var navMenu = document.getElementById('navMenu');

    // 展厅页无全屏透明 Hero，导航栏始终保持「滚动后」的实底样式，避免顶部白字白底
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

async function loadShowroom() {
    var grid = document.getElementById('showroomGrid');
    var filtersEl = document.getElementById('showroomFilters');
    var searchEl = document.getElementById('showroomSearch');
    var totalEl = document.getElementById('showroomTotal');

    try {
        var res = await fetch('/api/showroom').then(function (r) { return r.json(); });
        if (!res.success) throw new Error(res.message || '加载失败');

        _showroomData = res.data || { categories: [], items: [] };
        if (totalEl) totalEl.textContent = _showroomData.items.length;

        filtersEl.innerHTML = '<button class="showroom-filter active" data-category="all">全部</button>' +
            _showroomData.categories.map(function (cat) {
                return '<button class="showroom-filter" data-category="' + escapeHtml(cat.id) + '">' +
                    escapeHtml(cat.name) + '</button>';
            }).join('');

        filtersEl.querySelectorAll('.showroom-filter').forEach(function (btn) {
            btn.addEventListener('click', function () {
                filtersEl.querySelectorAll('.showroom-filter').forEach(function (b) {
                    b.classList.remove('active');
                });
                btn.classList.add('active');
                _activeCategory = btn.dataset.category;
                renderShowroomItems();
            });
        });

        searchEl.addEventListener('input', function (e) {
            _searchQuery = e.target.value.trim().toLowerCase();
            renderShowroomItems();
        });

        renderShowroomItems();
    } catch (err) {
        grid.innerHTML = '<div class="showroom-error">加载失败，请刷新页面重试</div>';
        console.error('产品展厅加载失败:', err);
    }
}

function renderShowroomItems() {
    var grid = document.getElementById('showroomGrid');
    var emptyEl = document.getElementById('showroomEmpty');
    var catMap = {};

    _showroomData.categories.forEach(function (c) {
        catMap[c.id] = c.name;
    });

    var filtered = _showroomData.items.filter(function (item) {
        if (_activeCategory !== 'all' && item.category !== _activeCategory) return false;
        if (!_searchQuery) return true;
        var haystack = [
            item.name, item.brand, item.spec, item.description,
            (item.tags || []).join(' ')
        ].join(' ').toLowerCase();
        return haystack.indexOf(_searchQuery) !== -1;
    });

    if (filtered.length === 0) {
        grid.innerHTML = '';
        emptyEl.removeAttribute('hidden');
        return;
    }

    emptyEl.setAttribute('hidden', '');
    grid.innerHTML = filtered.map(function (item, i) {
        var imgStyle = item.image
            ? 'background-image: url(\'' + escapeHtml(item.image) + '\')'
            : '';
        var tags = (item.tags || []).map(function (t) {
            return '<span class="showroom-tag">' + escapeHtml(t) + '</span>';
        }).join('');
        var hotBadge = item.hot
            ? '<span class="showroom-hot">热销</span>'
            : '';

        return '<article class="showroom-card anim" data-anim="fadeUp" style="transition-delay:' + (i % 6 * 0.08) + 's; cursor:pointer;">' +
            '<div class="showroom-card-img" style="' + imgStyle + '">' +
            hotBadge +
            '<span class="showroom-cat">' + escapeHtml(catMap[item.category] || '') + '</span>' +
            '</div>' +
            '<div class="showroom-card-body">' +
            '<div class="showroom-brand">' + escapeHtml(item.brand || '') + '</div>' +
            '<h3>' + escapeHtml(item.name) + '</h3>' +
            (item.spec ? '<div class="showroom-spec">' + escapeHtml(item.spec) + '</div>' : '') +
            '<p>' + escapeHtml(item.description || '') + '</p>' +
            (tags ? '<div class="showroom-tags">' + tags + '</div>' : '') +
            '<a href="https://sc.myrshx.com/ShopPC/#/" target="_blank" rel="noopener noreferrer" class="showroom-inquiry">去商城采购 <span>&rarr;</span></a>' +
            '</div>' +
            '</article>';
    }).join('');

    initScrollAnimations();
    trimShowroomGridRows();
}

function trimShowroomGridRows() {
    var grid = document.getElementById('showroomGrid');
    if (!grid) return;
    var cols = window.getComputedStyle(grid).gridTemplateColumns.split(' ').length;
    var cards = grid.querySelectorAll('.showroom-card');
    var complete = Math.floor(cards.length / cols) * cols;
    for (var ci = 0; ci < cards.length; ci++) {
        cards[ci].style.display = ci < complete ? '' : 'none';
    }
}

window.addEventListener('resize', trimShowroomGridRows);

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}