/* ==================================================================
   荣盛科技管理后台 · 统一脚本
   - 认证、模态框、Toast、上传、各页面初始化
   ================================================================== */

/* ---------------- API 基础 ---------------- */
const API_BASE = ''; // 相对路径，兼容部署

/* ---------------- 认证管理 ---------------- */

// 获取 token
function getToken() {
    return localStorage.getItem('admin_token');
}

// 保存 token
function setToken(token) {
    localStorage.setItem('admin_token', token);
}

// 清除 token
function clearToken() {
    localStorage.removeItem('admin_token');
}

// 认证检查（非登录页执行）
function checkAuth() {
    if (!getToken()) {
        window.location.href = 'index.html';
        return false;
    }
    return true;
}

// 退出登录
function logout() {
    clearToken();
    window.location.href = 'index.html';
}

/**
 * 带认证的 fetch 封装
 * - 自动附带 Authorization 头
 * - 401 自动跳转登录
 * - 统一处理 JSON 解析
 */
async function authFetch(url, options = {}) {
    const headers = options.headers || {};
    headers['Authorization'] = 'Bearer ' + getToken();

    // 自动设置 JSON Content-Type（除非是 FormData）
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    try {
        const res = await fetch(API_BASE + url, { ...options, headers });
        if (res.status === 401) {
            toast('登录已过期，请重新登录', 'error');
            setTimeout(() => logout(), 1200);
            throw new Error('未授权');
        }
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.success === false) {
            throw new Error(data.message || `请求失败 (${res.status})`);
        }
        return data;
    } catch (err) {
        if (err.name === 'TypeError') {
            throw new Error('网络错误，请检查后端服务');
        }
        throw err;
    }
}

/* ---------------- Toast 消息 ---------------- */

function ensureToastWrap() {
    let wrap = document.querySelector('.toast-wrap');
    if (!wrap) {
        wrap = document.createElement('div');
        wrap.className = 'toast-wrap';
        document.body.appendChild(wrap);
    }
    return wrap;
}

const TOAST_ICONS = {
    success: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12l5 5L20 7"/></svg>',
    error:   '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16v.5"/></svg>',
    warning: '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 3l10 18H2z"/><path d="M12 10v5M12 18v.5"/></svg>',
    info:    '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="9"/><path d="M12 16v-5M12 8v.5"/></svg>'
};

function toast(message, type = 'info', duration = 3000) {
    const wrap = ensureToastWrap();
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.innerHTML = `${TOAST_ICONS[type] || TOAST_ICONS.info}<span>${escapeHtml(message)}</span>`;
    wrap.appendChild(el);
    setTimeout(() => el.remove(), duration);
}

/* ---------------- 模态框 ---------------- */

function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add('show');
        document.body.style.overflow = 'hidden';
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove('show');
        document.body.style.overflow = '';
    }
}

// 自动绑定模态框 ESC 关闭与遮罩层点击关闭
document.addEventListener('keydown', e => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.show').forEach(m => m.classList.remove('show'));
        document.body.style.overflow = '';
    }
});
document.addEventListener('click', e => {
    if (e.target.classList && e.target.classList.contains('modal-mask')) {
        const modal = e.target.closest('.modal');
        if (modal) {
            modal.classList.remove('show');
            document.body.style.overflow = '';
        }
    }
});

/* ---------------- 确认对话框 ---------------- */

function confirmDialog({ title = '确认操作', message = '', confirmText = '确认', cancelText = '取消', danger = false }) {
    return new Promise(resolve => {
        // 移除旧的
        document.querySelectorAll('#__confirm_modal').forEach(el => el.remove());

        const modal = document.createElement('div');
        modal.id = '__confirm_modal';
        modal.className = 'modal show';
        modal.innerHTML = `
            <div class="modal-mask"></div>
            <div class="modal-body sm">
                <div class="modal-head">
                    <div class="t">
                        <span class="eyebrow">${danger ? 'CAUTION' : 'CONFIRM'}</span>
                        ${escapeHtml(title)}
                    </div>
                </div>
                <div class="modal-content">
                    <p style="color:var(--c-ink-soft); font-size:14px; line-height:1.7;">${escapeHtml(message)}</p>
                </div>
                <div class="modal-foot">
                    <button class="btn btn-secondary" data-act="cancel">${escapeHtml(cancelText)}</button>
                    <button class="btn ${danger ? 'btn-danger' : 'btn-primary'}" data-act="ok">${escapeHtml(confirmText)}</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.body.style.overflow = 'hidden';

        const close = (val) => {
            modal.remove();
            document.body.style.overflow = '';
            resolve(val);
        };
        modal.querySelector('[data-act="ok"]').onclick = () => close(true);
        modal.querySelector('[data-act="cancel"]').onclick = () => close(false);
        modal.querySelector('.modal-mask').onclick = () => close(false);
    });
}

/* ---------------- 工具函数 ---------------- */

function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

function formatDate(date) {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function formatDateTime(date) {
    if (!date) return '—';
    const d = new Date(date);
    if (isNaN(d.getTime())) return date;
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const h = String(d.getHours()).padStart(2, '0');
    const min = String(d.getMinutes()).padStart(2, '0');
    return `${y}-${m}-${day} ${h}:${min}`;
}

function getQuery(name) {
    return new URLSearchParams(location.search).get(name);
}

/* ---------------- 图片上传 ---------------- */

/**
 * 上传图片到服务器
 * @param {File} file - 文件对象
 * @returns {Promise<string>} 返回图片 URL
 */
async function uploadImage(file) {
    if (!file) throw new Error('请选择文件');
    if (file.size > 5 * 1024 * 1024) throw new Error('文件大小不能超过 5MB');

    const formData = new FormData();
    // 服务端字段名为 file
    formData.append('file', file);

    const res = await authFetch('/api/upload', {
        method: 'POST',
        body: formData
    });
    return res.data.url;
}

/**
 * 绑定上传组件
 * @param {string} boxId - 上传容器 ID
 * @param {function} onChange - 上传完成回调，参数为 url
 * @param {string} initialUrl - 初始图片 URL
 */
function bindUpload(boxId, onChange, initialUrl) {
    const box = document.getElementById(boxId);
    if (!box) return;
    const input = box.querySelector('input[type="file"]');

    const renderHint = () => {
        box.classList.remove('has-image');
        box.innerHTML = `
            <input type="file" accept="image/*">
            <div class="upload-hint">
                <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
                    <path d="M12 16V4M12 4l-5 5M12 4l5 5"/>
                    <path d="M4 14v4a2 2 0 002 2h12a2 2 0 002-2v-4"/>
                </svg>
                <b>点击上传或拖拽图片</b>
                <span>支持 JPG / PNG / WebP · 最大 5MB</span>
            </div>
        `;
        bindEvents();
    };

    const renderImage = (url) => {
        box.classList.add('has-image');
        box.innerHTML = `
            <input type="file" accept="image/*">
            <img class="preview" src="${url}" alt="预览">
            <button type="button" class="clear-btn" title="移除">×</button>
        `;
        box.querySelector('.clear-btn').onclick = (e) => {
            e.stopPropagation();
            renderHint();
            onChange('');
        };
        bindEvents();
    };

    const bindEvents = () => {
        const fileInput = box.querySelector('input[type="file"]');
        box.onclick = (e) => {
            if (e.target.classList && e.target.classList.contains('clear-btn')) return;
            fileInput.click();
        };
        fileInput.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                box.style.opacity = '.6';
                const url = await uploadImage(file);
                renderImage(url);
                onChange(url);
                toast('图片上传成功', 'success');
            } catch (err) {
                toast(err.message || '上传失败', 'error');
            } finally {
                box.style.opacity = '';
            }
        };
        // 拖拽支持
        box.ondragover = (e) => { e.preventDefault(); box.style.borderColor = 'var(--c-accent)'; };
        box.ondragleave = () => { box.style.borderColor = ''; };
        box.ondrop = async (e) => {
            e.preventDefault();
            box.style.borderColor = '';
            const file = e.dataTransfer.files[0];
            if (!file) return;
            try {
                box.style.opacity = '.6';
                const url = await uploadImage(file);
                renderImage(url);
                onChange(url);
                toast('图片上传成功', 'success');
            } catch (err) {
                toast(err.message || '上传失败', 'error');
            } finally {
                box.style.opacity = '';
            }
        };
    };

    if (initialUrl) renderImage(initialUrl);
    else renderHint();
}

/* ---------------- 侧边栏渲染 ---------------- */

/**
 * 注入侧边栏 HTML（每个内页统一调用）
 * @param {string} active - 当前激活页（dashboard/news/carousel/products/company）
 */
function renderSidebar(active) {
    const NAV = [
        { key: 'dashboard',     num: '01', label: '仪表盘',     href: 'dashboard.html',     icon: '<path d="M3 13l9-9 9 9M5 11v9h4v-6h6v6h4v-9"/>' },
        { key: 'news',          num: '02', label: '新闻管理',   href: 'news.html',          icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h10M7 16h6"/>' },
        { key: 'carousel',      num: '03', label: '轮播图',     href: 'carousel.html',      icon: '<rect x="3" y="6" width="18" height="12" rx="2"/><path d="M9 12l3-2 3 2-3 2z"/>' },
        { key: 'products',      num: '04', label: '产品管理',   href: 'products.html',      icon: '<path d="M21 8L12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5M12 13v8"/>' },
        { key: 'company',       num: '05', label: '公司信息',   href: 'company.html',       icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 8h6M9 12h6M9 16h4"/>' },
        { key: 'authorization', num: '06', label: '品牌授权',   href: 'authorization.html', icon: '<path d="M9 12l2 2 4-4"/><rect x="3" y="3" width="18" height="18" rx="2"/>' },
        { key: 'culture',       num: '07', label: '企业文化',   href: 'culture.html',       icon: '<circle cx="12" cy="12" r="9"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01M15 9h.01"/>' },
        { key: 'clients',       num: '08', label: '客户Logo',   href: 'clients.html',       icon: '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>' },
        { key: 'showroom',      num: '09', label: '产品展厅',   href: 'showroom.html',      icon: '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/>' }
    ];

    const navHtml = NAV.map(item => `
        <li>
            <a href="${item.href}" class="${item.key === active ? 'active' : ''}">
                <span class="num">${item.num}</span>
                <svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${item.icon}</svg>
                <span class="label">${item.label}</span>
            </a>
        </li>
    `).join('');

    const html = `
        <aside class="sidebar">
            <div class="side-brand">
                <div class="row">
                    <div class="mark">荣</div>
                    <div>
                        <div class="name">荣盛科技</div>
                        <div class="tag">Console · v1.0</div>
                    </div>
                </div>
            </div>

            <div class="side-section-label">— Navigation —</div>
            <ul class="side-nav">${navHtml}</ul>

            <div class="side-foot">
                <button class="btn-logout" onclick="logout()">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                        <path d="M16 17l5-5-5-5M21 12H9"/>
                    </svg>
                    <span>退出登录</span>
                </button>
                <div class="side-version">EST · 1993 / MYRSTECH</div>
            </div>
        </aside>
    `;
    document.body.insertAdjacentHTML('afterbegin', html);
}

/* ==================================================================
   各页面初始化
   ================================================================== */

/* ---------------- 仪表盘 ---------------- */
async function initDashboard() {
    if (!checkAuth()) return;

    // 时间显示
    const now = new Date();
    const dateStr = formatDate(now);
    const timeStr = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;
    document.getElementById('now-time').innerHTML = `<b>${timeStr}</b>${dateStr}`;

    // 拉取数据
    try {
        const [newsRes, carouselRes, prodRes, authRes, cultureRes, clientsRes] = await Promise.all([
            fetch('/api/news').then(r => r.json()),
            fetch('/api/carousel').then(r => r.json()),
            fetch('/api/products').then(r => r.json()),
            fetch('/api/authorization').then(r => r.json()),
            fetch('/api/culture').then(r => r.json()),
            fetch('/api/clients').then(r => r.json())
        ]);

        const news = newsRes.data || [];
        const carousel = carouselRes.data || [];
        const products = (prodRes.data && prodRes.data.products) || [];
        const authItems = (authRes.data && authRes.data.items) || [];
        const cultureItems = (cultureRes.data && cultureRes.data.items) || [];
        const clientItems = (clientsRes.data && clientsRes.data.items) || [];

        document.getElementById('stat-news').textContent = news.length;
        document.getElementById('stat-carousel').textContent = carousel.length;
        document.getElementById('stat-products').textContent = products.length;
        document.getElementById('stat-auth').textContent = authItems.length;
        document.getElementById('stat-culture').textContent = cultureItems.length;
        document.getElementById('stat-clients').textContent = clientItems.length;

        // 最近更新时间
        const allDates = [
            ...news.map(n => n.updatedAt || n.date),
            ...carousel.map(() => null)
        ].filter(Boolean).sort();
        const latest = allDates[allDates.length - 1];
        document.getElementById('stat-recent').textContent = latest ? formatDate(latest) : '—';

        // 最近新闻
        const recentList = document.getElementById('recent-news');
        if (news.length === 0) {
            recentList.innerHTML = '<li style="justify-content:center; color:var(--c-muted);">暂无新闻</li>';
        } else {
            recentList.innerHTML = news.slice(0, 5).map((n, i) => `
                <li>
                    <span class="num">${String(i+1).padStart(2,'0')}</span>
                    <span class="title">${escapeHtml(n.title)}</span>
                    <span class="date">${formatDate(n.date)}</span>
                </li>
            `).join('');
        }
    } catch (err) {
        toast('加载数据失败：' + err.message, 'error');
    }
}

/* ---------------- 新闻管理 ---------------- */
let _newsCache = [];

async function initNewsList() {
    if (!checkAuth()) return;
    await loadNews();

    document.getElementById('btn-new-news').onclick = () => openNewsModal(null);
    document.getElementById('news-form').onsubmit = saveNews;
    document.getElementById('news-summary').oninput = (e) => {
        document.getElementById('summary-count').textContent = e.target.value.length;
    };

    bindUpload('news-upload', (url) => {
        document.getElementById('news-image').value = url;
    });
}

async function loadNews() {
    const tbody = document.getElementById('news-tbody');
    tbody.innerHTML = '<tr><td colspan="5" class="empty"><div class="loading dark"></div><br>加载中...</td></tr>';
    try {
        const res = await fetch('/api/news').then(r => r.json());
        _newsCache = res.data || [];
        if (_newsCache.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="empty">暂无新闻数据</td></tr>`;
            return;
        }
        tbody.innerHTML = _newsCache.map((n, i) => `
            <tr>
                <td class="col-num">${String(i+1).padStart(2,'0')}</td>
                <td>
                    <div class="ttl">${escapeHtml(n.title)}</div>
                    <div class="col-summary" style="color:var(--c-muted); font-size:12px; margin-top:4px;">${escapeHtml((n.summary || '').slice(0, 60))}</div>
                </td>
                <td class="col-date">${formatDate(n.date)}</td>
                <td class="col-date">${formatDateTime(n.updatedAt)}</td>
                <td class="col-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openNewsModal('${n.id}')">编辑</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteNews('${n.id}')">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="5" class="empty">加载失败：${escapeHtml(err.message)}</td></tr>`;
    }
}

function openNewsModal(id) {
    const item = id ? _newsCache.find(n => n.id === id) : null;
    document.getElementById('news-modal-title').textContent = item ? '编辑新闻' : '发布新闻';
    document.getElementById('news-id').value = item ? item.id : '';
    document.getElementById('news-title').value = item ? item.title : '';
    document.getElementById('news-date').value = item ? item.date : new Date().toISOString().split('T')[0];
    document.getElementById('news-summary').value = item ? (item.summary || '') : '';
    document.getElementById('news-content').value = item ? item.content : '';
    document.getElementById('news-image').value = item ? (item.image || '') : '';
    document.getElementById('summary-count').textContent = item ? (item.summary || '').length : 0;
    bindUpload('news-upload', (url) => {
        document.getElementById('news-image').value = url;
    }, item ? item.image : '');
    openModal('news-modal');
}

async function saveNews(e) {
    e.preventDefault();
    const id = document.getElementById('news-id').value;
    const payload = {
        title: document.getElementById('news-title').value.trim(),
        date: document.getElementById('news-date').value,
        summary: document.getElementById('news-summary').value.trim(),
        content: document.getElementById('news-content').value.trim(),
        image: document.getElementById('news-image').value
    };

    if (!payload.title) return toast('请输入标题', 'warning');
    if (!payload.content) return toast('请输入正文内容', 'warning');
    if (payload.summary.length > 100) return toast('摘要不能超过100字', 'warning');

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 保存中';

    try {
        if (id) {
            await authFetch(`/api/news/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            toast('新闻已更新', 'success');
        } else {
            await authFetch('/api/news', { method: 'POST', body: JSON.stringify(payload) });
            toast('新闻已发布', 'success');
        }
        closeModal('news-modal');
        await loadNews();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '保存';
    }
}

async function deleteNews(id) {
    const item = _newsCache.find(n => n.id === id);
    const ok = await confirmDialog({
        title: '删除新闻',
        message: `确认删除「${item ? item.title : ''}」？此操作不可恢复。`,
        confirmText: '确认删除',
        danger: true
    });
    if (!ok) return;

    try {
        await authFetch(`/api/news/${id}`, { method: 'DELETE' });
        toast('已删除', 'success');
        await loadNews();
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ---------------- 轮播图管理 ---------------- */
let _carouselCache = [];

async function initCarousel() {
    if (!checkAuth()) return;
    await loadCarousel();

    document.getElementById('btn-new-carousel').onclick = () => openCarouselModal(null);
    document.getElementById('carousel-form').onsubmit = saveCarousel;
    bindUpload('carousel-upload', (url) => {
        document.getElementById('carousel-image').value = url;
    });
}

async function loadCarousel() {
    const grid = document.getElementById('carousel-grid');
    grid.innerHTML = '<div class="page-loading"><div class="loading dark"></div><div>加载中...</div></div>';
    try {
        const res = await fetch('/api/carousel').then(r => r.json());
        _carouselCache = res.data || [];
        if (_carouselCache.length === 0) {
            grid.innerHTML = `<div class="empty" style="grid-column:1/-1;">暂无轮播图，点击右上角添加</div>`;
            return;
        }
        grid.innerHTML = _carouselCache.map(c => `
            <div class="cs-card">
                <div class="img">
                    ${c.image ? `<img src="/${c.image.replace(/^\/+/, '')}" alt="">` : ''}
                    <span class="order">No. ${String(c.order).padStart(2,'0')}</span>
                </div>
                <div class="body">
                    <div class="ttl">${escapeHtml(c.title)}</div>
                    <div class="sub">${escapeHtml(c.subtitle || '—')}</div>
                    <div class="desc">${escapeHtml(c.description || '')}</div>
                    <div class="acts">
                        <span class="btn-tag">${escapeHtml(c.buttonText || '按钮')}</span>
                        <div>
                            <button class="btn btn-secondary btn-sm" onclick="openCarouselModal('${c.id}')">编辑</button>
                            <button class="btn btn-danger btn-sm" onclick="deleteCarousel('${c.id}')">删除</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
        // 限额提示
        const newBtn = document.getElementById('btn-new-carousel');
        if (newBtn) {
            if (_carouselCache.length >= 5) {
                newBtn.disabled = true;
                newBtn.style.opacity = '.5';
                newBtn.title = '最多支持 5 张轮播';
            } else {
                newBtn.disabled = false;
                newBtn.style.opacity = '';
                newBtn.title = '';
            }
        }
    } catch (err) {
        grid.innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
    }
}

function openCarouselModal(id) {
    const item = id ? _carouselCache.find(c => c.id === id) : null;
    if (!item && _carouselCache.length >= 5) {
        return toast('最多支持 5 张轮播图', 'warning');
    }
    document.getElementById('carousel-modal-title').textContent = item ? '编辑轮播' : '新增轮播';
    document.getElementById('carousel-id').value = item ? item.id : '';
    document.getElementById('carousel-title').value = item ? item.title : '';
    document.getElementById('carousel-subtitle').value = item ? (item.subtitle || '') : '';
    document.getElementById('carousel-description').value = item ? (item.description || '') : '';
    document.getElementById('carousel-buttonText').value = item ? (item.buttonText || '了解更多') : '了解更多';
    document.getElementById('carousel-order').value = item ? item.order : (_carouselCache.length + 1);
    document.getElementById('carousel-image').value = item ? (item.image || '') : '';
    bindUpload('carousel-upload', (url) => {
        document.getElementById('carousel-image').value = url;
    }, item ? item.image : '');
    openModal('carousel-modal');
}

async function saveCarousel(e) {
    e.preventDefault();
    const id = document.getElementById('carousel-id').value;
    const payload = {
        title: document.getElementById('carousel-title').value.trim(),
        subtitle: document.getElementById('carousel-subtitle').value.trim(),
        description: document.getElementById('carousel-description').value.trim(),
        buttonText: document.getElementById('carousel-buttonText').value.trim(),
        order: parseInt(document.getElementById('carousel-order').value) || 1,
        image: document.getElementById('carousel-image').value
    };

    if (!payload.title) return toast('请输入主标题', 'warning');

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 保存中';

    try {
        if (id) {
            await authFetch(`/api/carousel/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            toast('已更新', 'success');
        } else {
            await authFetch('/api/carousel', { method: 'POST', body: JSON.stringify(payload) });
            toast('已添加', 'success');
        }
        closeModal('carousel-modal');
        await loadCarousel();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '保存';
    }
}

async function deleteCarousel(id) {
    const item = _carouselCache.find(c => c.id === id);
    const ok = await confirmDialog({
        title: '删除轮播图',
        message: `确认删除「${item ? item.title : ''}」？`,
        confirmText: '确认删除',
        danger: true
    });
    if (!ok) return;

    try {
        await authFetch(`/api/carousel/${id}`, { method: 'DELETE' });
        toast('已删除', 'success');
        await loadCarousel();
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ---------------- 产品管理 ---------------- */
let _productsCache = null;

async function initProducts() {
    if (!checkAuth()) return;
    await loadProducts();
    document.getElementById('product-form').onsubmit = saveProduct;
    bindUpload('product-upload', (url) => {
        document.getElementById('product-image').value = url;
    });
    document.getElementById('btn-save-brands').onclick = saveBrands;
}

async function loadProducts() {
    const grid = document.getElementById('product-grid');
    const brandWrap = document.getElementById('brand-wrap');
    grid.innerHTML = '<div class="page-loading"><div class="loading dark"></div><div>加载中...</div></div>';
    try {
        const res = await fetch('/api/products').then(r => r.json());
        _productsCache = res.data || { products: [], brands: { categories: [] } };
        const products = _productsCache.products || [];

        grid.innerHTML = products.map((p, i) => `
            <div class="prod-card">
                <div class="img">
                    ${p.image ? `<img src="/${p.image.replace(/^\/+/, '')}" alt="">` : ''}
                    <span class="pid">No.${String(i+1).padStart(2,'0')} · ${escapeHtml(p.id)}</span>
                </div>
                <div class="body">
                    <div class="ttl">${escapeHtml(p.title)}</div>
                    <div class="desc">${escapeHtml(p.description)}</div>
                    <div class="feat-tags">
                        ${(p.features || []).map(f => `<span>${escapeHtml(f)}</span>`).join('')}
                    </div>
                    <div class="acts">
                        <button class="btn btn-primary btn-sm" onclick="openProductModal('${p.id}')">编辑</button>
                    </div>
                </div>
            </div>
        `).join('');

        // 渲染品牌
        renderBrands();
    } catch (err) {
        grid.innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
    }
}

function renderBrands() {
    const wrap = document.getElementById('brand-wrap');
    const cats = (_productsCache.brands && _productsCache.brands.categories) || [];
    wrap.innerHTML = cats.map((cat, ci) => `
        <div class="brand-cat">
            <div class="brand-cat-head">
                <div class="brand-cat-name">
                    <span class="num">${String(ci+1).padStart(2,'0')}</span>${escapeHtml(cat.name)}
                </div>
                <span style="font-family:var(--f-mono); font-size:11px; color:var(--c-muted);">${cat.brands.length} 项</span>
            </div>
            <div class="brand-list">
                ${cat.brands.map((b, bi) => `
                    <span class="brand-tag">
                        ${escapeHtml(b)}
                        <span class="x" onclick="removeBrand(${ci}, ${bi})">×</span>
                    </span>
                `).join('')}
                <span class="brand-add" onclick="this.querySelector('input').focus()">
                    +
                    <input type="text" placeholder="新增品牌" onkeydown="addBrandKey(event, ${ci})">
                </span>
            </div>
        </div>
    `).join('');
}

function addBrandKey(e, ci) {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = e.target.value.trim();
    if (!val) return;
    const cats = _productsCache.brands.categories;
    if (cats[ci].brands.includes(val)) {
        toast('品牌已存在', 'warning');
        return;
    }
    cats[ci].brands.push(val);
    renderBrands();
}

function removeBrand(ci, bi) {
    _productsCache.brands.categories[ci].brands.splice(bi, 1);
    renderBrands();
}

async function saveBrands() {
    const btn = document.getElementById('btn-save-brands');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 保存中';
    try {
        await authFetch('/api/products-brands', {
            method: 'PUT',
            body: JSON.stringify({ categories: _productsCache.brands.categories })
        });
        toast('品牌列表已保存', 'success');
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '保存品牌列表';
    }
}

function openProductModal(id) {
    const item = _productsCache.products.find(p => p.id === id);
    if (!item) return;
    document.getElementById('product-modal-title').textContent = '编辑产品';
    document.getElementById('product-id').value = item.id;
    document.getElementById('product-title').value = item.title;
    document.getElementById('product-description').value = item.description;
    document.getElementById('product-image').value = item.image || '';

    const features = item.features || [];
    for (let i = 0; i < 4; i++) {
        document.getElementById(`product-feat-${i}`).value = features[i] || '';
    }
    bindUpload('product-upload', (url) => {
        document.getElementById('product-image').value = url;
    }, item.image);
    openModal('product-modal');
}

async function saveProduct(e) {
    e.preventDefault();
    const id = document.getElementById('product-id').value;
    const features = [];
    for (let i = 0; i < 4; i++) {
        const v = document.getElementById(`product-feat-${i}`).value.trim();
        if (v) features.push(v);
    }
    const payload = {
        title: document.getElementById('product-title').value.trim(),
        description: document.getElementById('product-description').value.trim(),
        image: document.getElementById('product-image').value,
        features
    };

    if (!payload.title) return toast('请输入产品标题', 'warning');

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 保存中';

    try {
        await authFetch(`/api/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        toast('产品已更新', 'success');
        closeModal('product-modal');
        await loadProducts();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '保存';
    }
}

/* ---------------- 公司信息 ---------------- */

async function initCompany() {
    if (!checkAuth()) return;
    try {
        const res = await fetch('/api/company').then(r => r.json());
        const c = res.data || {};
        document.getElementById('c-name').value = c.name || '';
        document.getElementById('c-address').value = c.address || '';
        document.getElementById('c-phone').value = c.phone || '';
        document.getElementById('c-customerService').value = c.customerService || '';
        document.getElementById('c-complaint').value = c.complaint || '';
        document.getElementById('c-email').value = c.email || '';
        document.getElementById('c-mission').value = c.mission || '';
        document.getElementById('c-servicePhilosophy').value = c.service_philosophy || '';
        document.getElementById('c-culture').value = c.culture || '';
        document.getElementById('c-chairman').value = c.chairman_message || '';
        document.getElementById('c-slogan').value = c.slogan || '';
        document.getElementById('c-website').value = c.website || '';
        document.getElementById('c-founded').value = c.founded || '';
    } catch (err) {
        toast('加载失败：' + err.message, 'error');
    }

    document.getElementById('company-form').onsubmit = saveCompany;
}

async function saveCompany(e) {
    e.preventDefault();
    const payload = {
        name: document.getElementById('c-name').value.trim(),
        address: document.getElementById('c-address').value.trim(),
        phone: document.getElementById('c-phone').value.trim(),
        customerService: document.getElementById('c-customerService').value.trim(),
        complaint: document.getElementById('c-complaint').value.trim(),
        email: document.getElementById('c-email').value.trim(),
        mission: document.getElementById('c-mission').value.trim(),
        service_philosophy: document.getElementById('c-servicePhilosophy').value.trim(),
        culture: document.getElementById('c-culture').value.trim(),
        chairman_message: document.getElementById('c-chairman').value.trim(),
        slogan: document.getElementById('c-slogan').value.trim(),
        website: document.getElementById('c-website').value.trim(),
        founded: document.getElementById('c-founded').value.trim()
    };

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 保存中';

    try {
        await authFetch('/api/company', { method: 'PUT', body: JSON.stringify(payload) });
        toast('公司信息已保存', 'success');
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '保存修改';
    }
}

/* ---------------- 登录 ---------------- */

async function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const errEl = document.getElementById('login-error');
    const btn = document.getElementById('login-btn');

    errEl.textContent = '';
    if (!username || !password) {
        errEl.textContent = '请输入用户名和密码';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> <span>登录中...</span>';

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password })
        });
        const data = await res.json();
        if (!res.ok || data.success === false) {
            errEl.textContent = data.message || '登录失败';
            btn.disabled = false;
            btn.innerHTML = '<span>进 入 控 制 台</span>';
            return;
        }
        setToken(data.data.token);
        btn.innerHTML = '<span>登 录 成 功 →</span>';
        setTimeout(() => { window.location.href = 'dashboard.html'; }, 400);
    } catch (err) {
        errEl.textContent = '网络错误，请稍后重试';
        btn.disabled = false;
        btn.innerHTML = '<span>进 入 控 制 台</span>';
    }
}

/* ---------------- 品牌授权管理 ---------------- */
let _authCache = { categories: [], items: [] };
let _authFilter = 'all';

async function initAuthorization() {
    if (!checkAuth()) return;
    await loadAuthorization();

    document.getElementById('btn-new-auth').onclick = () => openAuthModal();
    document.getElementById('auth-form').onsubmit = saveAuth;

    // Tab 切换
    document.getElementById('auth-tabs').addEventListener('click', e => {
        const btn = e.target.closest('.tab');
        if (!btn) return;
        document.querySelectorAll('#auth-tabs .tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        _authFilter = btn.dataset.cat;
        renderAuthGrid();
    });

    bindUpload('auth-upload', (url) => {
        document.getElementById('auth-image').value = url;
    });
}

async function loadAuthorization() {
    const grid = document.getElementById('auth-grid');
    grid.innerHTML = '<div class="page-loading" style="grid-column:1/-1;"><div class="loading dark"></div><div>加载中...</div></div>';
    try {
        const res = await fetch('/api/authorization').then(r => r.json());
        _authCache = res.data || { categories: [], items: [] };
        renderAuthGrid();
    } catch (err) {
        grid.innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
    }
}

function renderAuthGrid() {
    const grid = document.getElementById('auth-grid');
    let items = _authCache.items || [];
    if (_authFilter !== 'all') {
        items = items.filter(i => i.category === _authFilter);
    }
    if (items.length === 0) {
        grid.innerHTML = '<div class="empty" style="grid-column:1/-1;">暂无授权书数据</div>';
        return;
    }
    const catMap = {};
    (_authCache.categories || []).forEach(c => { catMap[c.id] = c; });
    grid.innerHTML = items.map(item => {
        const cat = catMap[item.category] || {};
        return `
            <div class="cs-card">
                <div class="img">
                    ${item.image ? `<img src="/${item.image}" alt="${escapeHtml(item.brand)}">` : ''}
                    <span class="order">${cat.icon || ''} ${escapeHtml(cat.name || '')}</span>
                </div>
                <div class="body">
                    <div class="ttl">${escapeHtml(item.brand)}</div>
                    ${item.brand_en ? `<div class="sub">${escapeHtml(item.brand_en)}</div>` : ''}
                    <div class="acts">
                        <span class="btn-tag">#${item.id}</span>
                        <div>
                            <button class="btn btn-danger btn-sm" onclick="deleteAuth(${item.id})">删除</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openAuthModal() {
    document.getElementById('auth-modal-title').textContent = '新增授权书';
    document.getElementById('auth-id').value = '';
    document.getElementById('auth-brand').value = '';
    document.getElementById('auth-brand-en').value = '';
    document.getElementById('auth-category').value = 'reagent';
    document.getElementById('auth-image').value = '';
    bindUpload('auth-upload', (url) => {
        document.getElementById('auth-image').value = url;
    });
    openModal('auth-modal');
}

async function saveAuth(e) {
    e.preventDefault();
    const payload = {
        brand: document.getElementById('auth-brand').value.trim(),
        brand_en: document.getElementById('auth-brand-en').value.trim(),
        category: document.getElementById('auth-category').value,
        image: document.getElementById('auth-image').value
    };

    if (!payload.brand) return toast('请输入品牌名称', 'warning');
    if (!payload.image) return toast('请上传授权书图片', 'warning');

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 保存中';

    try {
        await authFetch('/api/authorization', { method: 'POST', body: JSON.stringify(payload) });
        toast('授权书已添加', 'success');
        closeModal('auth-modal');
        await loadAuthorization();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '保存';
    }
}

async function deleteAuth(id) {
    const item = _authCache.items.find(i => i.id === id);
    const ok = await confirmDialog({
        title: '删除授权书',
        message: `确认删除「${item ? item.brand : ''}」的授权书？`,
        confirmText: '确认删除',
        danger: true
    });
    if (!ok) return;

    try {
        await authFetch(`/api/authorization/${id}`, { method: 'DELETE' });
        toast('已删除', 'success');
        await loadAuthorization();
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ---------------- 企业文化管理 ---------------- */
let _cultureCache = { categories: [], items: [] };
let _cultureFilter = 'all';

async function initCulture() {
    if (!checkAuth()) return;
    await loadCulture();

    document.getElementById('btn-new-culture').onclick = () => openCultureModal();
    document.getElementById('culture-form').onsubmit = saveCulture;

    // Tab 切换
    document.getElementById('culture-tabs').addEventListener('click', e => {
        const btn = e.target.closest('.tab');
        if (!btn) return;
        document.querySelectorAll('#culture-tabs .tab').forEach(t => t.classList.remove('active'));
        btn.classList.add('active');
        _cultureFilter = btn.dataset.cat;
        renderCultureGrid();
    });

    bindUpload('culture-upload', (url) => {
        document.getElementById('culture-image').value = url;
    });
}

async function loadCulture() {
    const grid = document.getElementById('culture-grid');
    grid.innerHTML = '<div class="page-loading" style="grid-column:1/-1;"><div class="loading dark"></div><div>加载中...</div></div>';
    try {
        const res = await fetch('/api/culture').then(r => r.json());
        _cultureCache = res.data || { categories: [], items: [] };
        renderCultureGrid();
    } catch (err) {
        grid.innerHTML = `<div class="empty">加载失败：${escapeHtml(err.message)}</div>`;
    }
}

function renderCultureGrid() {
    const grid = document.getElementById('culture-grid');
    let items = _cultureCache.items || [];
    if (_cultureFilter !== 'all') {
        items = items.filter(i => i.category === _cultureFilter);
    }
    if (items.length === 0) {
        grid.innerHTML = '<div class="empty" style="grid-column:1/-1;">暂无活动照片</div>';
        return;
    }
    const catMap = {};
    (_cultureCache.categories || []).forEach(c => { catMap[c.id] = c; });
    grid.innerHTML = items.map(item => {
        const cat = catMap[item.category] || {};
        return `
            <div class="cs-card">
                <div class="img">
                    ${item.image ? `<img src="/${item.image}" alt="${escapeHtml(item.title)}">` : ''}
                    <span class="order">${cat.icon || ''} ${escapeHtml(cat.name || '')}</span>
                </div>
                <div class="body">
                    <div class="ttl">${escapeHtml(item.title)}</div>
                    <div class="acts">
                        <span class="btn-tag">#${item.id}</span>
                        <div>
                            <button class="btn btn-danger btn-sm" onclick="deleteCulture(${item.id})">删除</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function openCultureModal() {
    document.getElementById('culture-modal-title').textContent = '新增活动照片';
    document.getElementById('culture-title').value = '';
    document.getElementById('culture-category').value = 'cooking';
    document.getElementById('culture-image').value = '';
    bindUpload('culture-upload', (url) => {
        document.getElementById('culture-image').value = url;
    });
    openModal('culture-modal');
}

async function saveCulture(e) {
    e.preventDefault();
    const payload = {
        title: document.getElementById('culture-title').value.trim(),
        category: document.getElementById('culture-category').value,
        image: document.getElementById('culture-image').value
    };

    if (!payload.title) return toast('请输入标题', 'warning');
    if (!payload.image) return toast('请上传活动照片', 'warning');

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 保存中';

    try {
        await authFetch('/api/culture', { method: 'POST', body: JSON.stringify(payload) });
        toast('照片已添加', 'success');
        closeModal('culture-modal');
        await loadCulture();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '保存';
    }
}

async function deleteCulture(id) {
    const item = _cultureCache.items.find(i => i.id === id);
    const ok = await confirmDialog({
        title: '删除照片',
        message: `确认删除「${item ? item.title : ''}」？`,
        confirmText: '确认删除',
        danger: true
    });
    if (!ok) return;

    try {
        await authFetch(`/api/culture/${id}`, { method: 'DELETE' });
        toast('已删除', 'success');
        await loadCulture();
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ---------------- 客户Logo管理 ---------------- */
let _clientsCache = { items: [] };

async function initClients() {
    if (!checkAuth()) return;
    await loadClients();

    document.getElementById('btn-new-client').onclick = () => openClientModal(null);
    document.getElementById('client-form').onsubmit = saveClient;

    bindUpload('client-upload', (url) => {
        document.getElementById('client-logo').value = url;
    });
}

async function loadClients() {
    const tbody = document.getElementById('client-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="empty"><div class="loading dark"></div><br>加载中...</td></tr>';
    try {
        const res = await fetch('/api/clients').then(r => r.json());
        _clientsCache = res.data || { items: [] };
        const items = _clientsCache.items || [];
        document.getElementById('client-count').textContent = items.length;
        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty">暂无客户数据</td></tr>';
            return;
        }
        tbody.innerHTML = items.map((c, i) => `
            <tr>
                <td class="col-num">${String(i + 1).padStart(2, '0')}</td>
                <td>${c.logo ? `<img src="/${c.logo}" alt="" style="height:32px; max-width:80px; object-fit:contain;">` : '—'}</td>
                <td><div class="ttl">${escapeHtml(c.name)}</div></td>
                <td style="color:var(--c-muted); font-size:12px;">${escapeHtml(c.short || '—')}</td>
                <td style="font-family:var(--f-mono); font-size:12px;">${c.order}</td>
                <td class="col-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openClientModal(${c.id})">编辑</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteClient(${c.id})">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty">加载失败：${escapeHtml(err.message)}</td></tr>`;
    }
}

function openClientModal(id) {
    const item = id ? (_clientsCache.items || []).find(c => c.id === id) : null;
    document.getElementById('client-modal-title').textContent = item ? '编辑客户' : '新增客户';
    document.getElementById('client-id').value = item ? item.id : '';
    document.getElementById('client-name').value = item ? item.name : '';
    document.getElementById('client-short').value = item ? (item.short || '') : '';
    document.getElementById('client-logo').value = item ? (item.logo || '') : '';
    bindUpload('client-upload', (url) => {
        document.getElementById('client-logo').value = url;
    }, item ? item.logo : '');
    openModal('client-modal');
}

async function saveClient(e) {
    e.preventDefault();
    const id = document.getElementById('client-id').value;
    const payload = {
        name: document.getElementById('client-name').value.trim(),
        short: document.getElementById('client-short').value.trim(),
        logo: document.getElementById('client-logo').value
    };

    if (!payload.name) return toast('请输入客户名称', 'warning');

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 保存中';

    try {
        if (id) {
            await authFetch(`/api/clients/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            toast('客户已更新', 'success');
        } else {
            await authFetch('/api/clients', { method: 'POST', body: JSON.stringify(payload) });
            toast('客户已添加', 'success');
        }
        closeModal('client-modal');
        await loadClients();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '保存';
    }
}

async function deleteClient(id) {
    const item = (_clientsCache.items || []).find(c => c.id === id);
    const ok = await confirmDialog({
        title: '删除客户',
        message: `确认删除「${item ? item.name : ''}」？`,
        confirmText: '确认删除',
        danger: true
    });
    if (!ok) return;

    try {
        await authFetch(`/api/clients/${id}`, { method: 'DELETE' });
        toast('已删除', 'success');
        await loadClients();
    } catch (err) {
        toast(err.message, 'error');
    }
}

/* ---------------- 产品展厅管理 ---------------- */
let _showroomCache = { categories: [], items: [] };

async function initShowroom() {
    if (!checkAuth()) return;
    await loadShowroomAdmin();

    document.getElementById('btn-new-showroom').onclick = () => openShowroomModal(null);
    document.getElementById('showroom-form').onsubmit = saveShowroomItem;
    bindUpload('showroom-upload', (url) => {
        document.getElementById('showroom-image').value = url;
    });
}

async function loadShowroomAdmin() {
    const tbody = document.getElementById('showroom-tbody');
    tbody.innerHTML = '<tr><td colspan="6" class="empty"><div class="loading dark"></div><br>加载中...</td></tr>';

    try {
        const res = await authFetch('/api/showroom/all');
        _showroomCache = res.data || { categories: [], items: [] };
        const items = (_showroomCache.items || []).slice().sort((a, b) => (a.order || 0) - (b.order || 0));
        const catMap = {};
        (_showroomCache.categories || []).forEach(c => { catMap[c.id] = c.name; });

        if (items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="empty">暂无常卖品，点击右上角添加</td></tr>';
            return;
        }

        tbody.innerHTML = items.map((item, i) => `
            <tr>
                <td class="col-num">${String(i + 1).padStart(2, '0')}</td>
                <td>
                    <div class="ttl">${escapeHtml(item.name)}</div>
                    <div class="col-summary" style="color:var(--c-muted); font-size:12px; margin-top:4px;">${escapeHtml((item.spec || '').slice(0, 50))}</div>
                </td>
                <td>${escapeHtml(catMap[item.category] || item.category)}</td>
                <td>${escapeHtml(item.brand || '—')}</td>
                <td>
                    ${item.published !== false ? '<span style="color:var(--c-ok);">已发布</span>' : '<span style="color:var(--c-muted);">未发布</span>'}
                    ${item.hot ? ' · <span style="color:#dc2626;">热销</span>' : ''}
                </td>
                <td class="col-actions">
                    <button class="btn btn-secondary btn-sm" onclick="openShowroomModal('${item.id}')">编辑</button>
                    <button class="btn btn-danger btn-sm" onclick="deleteShowroomItem('${item.id}')">删除</button>
                </td>
            </tr>
        `).join('');
    } catch (err) {
        tbody.innerHTML = `<tr><td colspan="6" class="empty">加载失败：${escapeHtml(err.message)}</td></tr>`;
    }
}

function populateShowroomCategories(selected) {
    const select = document.getElementById('showroom-category');
    const cats = _showroomCache.categories || [];
    select.innerHTML = cats.map(c =>
        `<option value="${escapeHtml(c.id)}" ${c.id === selected ? 'selected' : ''}>${escapeHtml(c.name)}</option>`
    ).join('');
}

function openShowroomModal(id) {
    const item = id ? (_showroomCache.items || []).find(i => i.id === id) : null;
    document.getElementById('showroom-modal-title').textContent = item ? '编辑常卖品' : '添加常卖品';
    document.getElementById('showroom-id').value = item ? item.id : '';
    document.getElementById('showroom-name').value = item ? item.name : '';
    document.getElementById('showroom-brand').value = item ? (item.brand || '') : '';
    document.getElementById('showroom-spec').value = item ? (item.spec || '') : '';
    document.getElementById('showroom-description').value = item ? (item.description || '') : '';
    document.getElementById('showroom-image').value = item ? (item.image || '') : '';
    document.getElementById('showroom-tags').value = item ? (item.tags || []).join(', ') : '';
    document.getElementById('showroom-order').value = item ? (item.order || 1) : ((_showroomCache.items || []).length + 1);
    document.getElementById('showroom-hot').checked = item ? !!item.hot : false;
    document.getElementById('showroom-published').checked = item ? item.published !== false : true;

    populateShowroomCategories(item ? item.category : (_showroomCache.categories[0] && _showroomCache.categories[0].id));

    bindUpload('showroom-upload', (url) => {
        document.getElementById('showroom-image').value = url;
    }, item ? item.image : '');

    openModal('showroom-modal');
}

async function saveShowroomItem(e) {
    e.preventDefault();
    const id = document.getElementById('showroom-id').value;
    const tagsRaw = document.getElementById('showroom-tags').value.trim();
    const payload = {
        name: document.getElementById('showroom-name').value.trim(),
        category: document.getElementById('showroom-category').value,
        brand: document.getElementById('showroom-brand').value.trim(),
        spec: document.getElementById('showroom-spec').value.trim(),
        description: document.getElementById('showroom-description').value.trim(),
        image: document.getElementById('showroom-image').value,
        tags: tagsRaw ? tagsRaw.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [],
        order: parseInt(document.getElementById('showroom-order').value, 10) || 1,
        hot: document.getElementById('showroom-hot').checked,
        published: document.getElementById('showroom-published').checked
    };

    if (!payload.name) return toast('请输入产品名称', 'warning');
    if (!payload.category) return toast('请选择分类', 'warning');

    const btn = e.target.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span> 保存中';

    try {
        if (id) {
            await authFetch(`/api/showroom/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            toast('常卖品已更新', 'success');
        } else {
            await authFetch('/api/showroom', { method: 'POST', body: JSON.stringify(payload) });
            toast('常卖品已添加', 'success');
        }
        closeModal('showroom-modal');
        await loadShowroomAdmin();
    } catch (err) {
        toast(err.message, 'error');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '保存';
    }
}

async function deleteShowroomItem(id) {
    const item = (_showroomCache.items || []).find(i => i.id === id);
    const ok = await confirmDialog({
        title: '删除常卖品',
        message: `确认删除「${item ? item.name : ''}」？`,
        confirmText: '确认删除',
        danger: true
    });
    if (!ok) return;

    try {
        await authFetch(`/api/showroom/${id}`, { method: 'DELETE' });
        toast('已删除', 'success');
        await loadShowroomAdmin();
    } catch (err) {
        toast(err.message, 'error');
    }
}
