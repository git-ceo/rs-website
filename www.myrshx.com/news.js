/* ============================================
   新闻中心列表页
   ============================================ */

var NEWS_PAGE_SIZE = 5;
var _allNews = [];
var _currentPage = 1;

document.addEventListener('DOMContentLoaded', function () {
    initNewsNavbar();
    initBackToTop();
    loadNewsPage();
});

function initNewsNavbar() {
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
        btn.classList.toggle('visible', window.scrollY > 400);
    });

    btn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

async function loadNewsPage() {
    var listEl = document.getElementById('newsList');
    if (!listEl) return;

    try {
        var res = await fetch('/api/news');
        if (!res.ok) throw new Error('加载失败');
        var json = await res.json();
        var news = Array.isArray(json) ? json : (json.data || []);
        if (!Array.isArray(news) || !news.length) {
            listEl.innerHTML = '<div class="news-page-empty"><p>暂无新闻</p></div>';
            signalDemoContentReady();
            return;
        }
        _allNews = news;
        _currentPage = 1;
        renderNewsPage();
        signalDemoContentReady();
    } catch (err) {
        listEl.innerHTML = '<div class="news-page-empty"><p>新闻加载失败，请稍后重试</p></div>';
        console.log('新闻列表加载失败', err);
        signalDemoContentReady();
    }
}

function signalDemoContentReady() {
    window.dispatchEvent(new CustomEvent('rs-demo-content-ready'));
}

function renderNewsPage() {
    var listEl = document.getElementById('newsList');
    var paginationEl = document.getElementById('newsPagination');
    if (!listEl) return;

    var totalPages = Math.max(1, Math.ceil(_allNews.length / NEWS_PAGE_SIZE));
    if (_currentPage > totalPages) _currentPage = totalPages;

    var start = (_currentPage - 1) * NEWS_PAGE_SIZE;
    var pageItems = _allNews.slice(start, start + NEWS_PAGE_SIZE);

    listEl.innerHTML = pageItems.map(function (item) {
        var img = item.image || 'imgs/news/news-1.jpeg';
        var detailUrl = 'news-detail.html?id=' + encodeURIComponent(item.id);
        return ''
            + '<a href="' + detailUrl + '" class="news-list-item anim animated">'
            +   '<div class="news-list-thumb">'
            +     '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(item.title || '') + '" loading="lazy">'
            +   '</div>'
            +   '<div class="news-list-body">'
            +     '<time class="news-list-date" datetime="' + escapeHtml(item.date || '') + '">' + escapeHtml(formatNewsDate(item.date)) + '</time>'
            +     '<h3>' + escapeHtml(item.title || '') + '</h3>'
            +     '<p>' + escapeHtml(item.summary || '') + '</p>'
            +     '<span class="news-list-more">阅读全文 <span aria-hidden="true">&rarr;</span></span>'
            +   '</div>'
            + '</a>';
    }).join('');

    if (paginationEl) {
        if (totalPages <= 1) {
            paginationEl.hidden = true;
            paginationEl.innerHTML = '';
        } else {
            paginationEl.hidden = false;
            paginationEl.innerHTML = buildPaginationHtml(totalPages);
            bindPaginationEvents(paginationEl, totalPages);
        }
    }
}

function buildPaginationHtml(totalPages) {
    var html = '';
    var pages = [];
    for (var i = 1; i <= totalPages; i++) pages.push(i);

    pages.forEach(function (p) {
        var cls = p === _currentPage ? 'news-page-btn active' : 'news-page-btn';
        html += '<button type="button" class="' + cls + '" data-page="' + p + '">' + p + '</button>';
    });

    if (_currentPage < totalPages) {
        html += '<button type="button" class="news-page-btn news-page-next" data-page="' + (_currentPage + 1) + '" aria-label="下一页">&gt;</button>';
    }
    return html;
}

function bindPaginationEvents(el, totalPages) {
    el.querySelectorAll('[data-page]').forEach(function (btn) {
        btn.addEventListener('click', function () {
            var page = parseInt(btn.getAttribute('data-page'), 10);
            if (isNaN(page) || page < 1 || page > totalPages) return;
            _currentPage = page;
            renderNewsPage();
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    });
}

function formatNewsDate(dateStr) {
    if (!dateStr) return '';
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    var y = d.getFullYear();
    var m = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + day;
}

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}
