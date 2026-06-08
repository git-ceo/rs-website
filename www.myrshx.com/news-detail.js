/* ============================================
   新闻详情页
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    initNewsNavbar();
    initBackToTop();
    loadNewsDetail();
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

function getNewsIdFromUrl() {
    var params = new URLSearchParams(window.location.search);
    return params.get('id') || '';
}

async function loadNewsDetail() {
    var articleEl = document.getElementById('newsDetailArticle');
    if (!articleEl) return;

    var id = getNewsIdFromUrl();
    if (!id) {
        articleEl.innerHTML = '<div class="news-page-empty"><p>未找到该新闻</p><a href="news.html" class="btn btn-hero-primary">返回新闻列表</a></div>';
        return;
    }

    try {
        var res = await fetch('/api/news/' + encodeURIComponent(id));
        if (!res.ok) throw new Error('加载失败');
        var json = await res.json();
        var item = json && json.id ? json : (json.data || null);
        if (!item) throw new Error('无数据');
        renderNewsDetail(item);
    } catch (err) {
        articleEl.innerHTML = '<div class="news-page-empty"><p>新闻加载失败或不存在</p><a href="news.html" class="btn btn-hero-primary">返回新闻列表</a></div>';
        console.log('新闻详情加载失败', err);
    }
}

function renderNewsDetail(item) {
    var articleEl = document.getElementById('newsDetailArticle');
    if (!articleEl || !item) return;

    document.title = (item.title || '新闻详情') + ' - 绵阳市荣盛科技有限公司';

    var metaDesc = document.querySelector('meta[name="description"]');
    if (metaDesc && item.summary) metaDesc.setAttribute('content', item.summary);

    var img = item.image || 'imgs/news/news-1.jpeg';
    var dateStr = formatNewsDate(item.date);
    var contentHtml = item.content || '<p>' + escapeHtml(item.summary || '') + '</p>';

    articleEl.innerHTML = ''
        + '<h1 class="news-detail-title">' + escapeHtml(item.title || '') + '</h1>'
        + '<div class="news-detail-meta">'
        +   '<span>发布时间：' + escapeHtml(dateStr) + '</span>'
        +   '<span>来源：绵阳市荣盛科技有限公司</span>'
        + '</div>'
        + '<div class="news-detail-cover">'
        +   '<img src="' + escapeHtml(img) + '" alt="' + escapeHtml(item.title || '') + '">'
        + '</div>'
        + '<div class="news-detail-content">' + contentHtml + '</div>';

    articleEl.classList.add('anim', 'animated');
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
