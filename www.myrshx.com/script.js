/* ============================================
   绵阳市荣盛科技有限公司 - 官网交互逻辑 v2.0
   大气动画 · 粒子光效 · 流畅交互
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    initNavbar();
    initHeroSlider();
    initHeroParticles();
    initScrollAnimations();
    initStatsCounter();
    initContactForm();
    initBackToTop();
    initStrengthTabs();
    initStrategyChart();
    initAuthLightbox();
    initCultureTabs();
    // 在所有静态初始化完成后再触发动态内容加载（优雅降级）
    loadDynamicContent();
});

/* ============================================
   导航栏模块
   ============================================ */
function initNavbar() {
    var header = document.getElementById('header');
    var hamburger = document.getElementById('hamburger');
    var navMenu = document.getElementById('navMenu');
    var navLinks = document.querySelectorAll('.nav-link');

    // 滚动时切换导航栏样式
    window.addEventListener('scroll', function () {
        if (window.scrollY > 80) {
            header.classList.add('scrolled');
        } else {
            header.classList.remove('scrolled');
        }
        updateActiveNav();
    });

    // 移动端汉堡菜单
    hamburger.addEventListener('click', function () {
        hamburger.classList.toggle('active');
        navMenu.classList.toggle('active');
    });

    // 导航项点击：仅拦截首页锚点(#xxx)，独立页面(如 showroom.html)正常跳转
    navLinks.forEach(function (link) {
        link.addEventListener('click', function (e) {
            var href = this.getAttribute('href') || '';

            if (!href.startsWith('#')) {
                hamburger.classList.remove('active');
                navMenu.classList.remove('active');
                return;
            }

            e.preventDefault();
            var targetSection = document.querySelector(href);

            if (targetSection) {
                var offsetTop = targetSection.offsetTop - 70;
                window.scrollTo({ top: offsetTop, behavior: 'smooth' });
            }

            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        });
    });

    // 点击菜单外部关闭移动端菜单
    document.addEventListener('click', function (e) {
        if (!navMenu.contains(e.target) && !hamburger.contains(e.target)) {
            hamburger.classList.remove('active');
            navMenu.classList.remove('active');
        }
    });


    // ========== 动态「更多」下拉菜单：溢出时自动收纳 ==========
    var navMore = document.getElementById('navMore');
    var navDropdown = document.getElementById('navDropdown');
    var moreTrigger = navMore ? navMore.querySelector('.nav-more-trigger') : null;
    var isMobile = false;

    function reflowNav() {
        if (!navMore || !navDropdown) return;
        // 移动端：显示全部，隐藏「更多」
        if (window.innerWidth <= 991) {
            isMobile = true;
            navMore.style.display = 'none';
            // 把 dropdown 里的项全部移回 nav-menu（插回「更多」前面）
            while (navDropdown.firstChild) {
                navMenu.insertBefore(navDropdown.firstChild, navMore);
            }
            navMore.classList.remove('active');
            // 恢复 gap（JS 动态移除可能破坏了 gap 布局）
            navMenu.style.gap = '';
            return;
        }

        isMobile = false;
        navMore.style.display = '';
        // 先把所有项从 dropdown 移回 nav-menu（重置到满配状态）
        while (navDropdown.firstChild) {
            navMenu.insertBefore(navDropdown.firstChild, navMore);
        }
        navMore.classList.remove('active');

        // 强制 gap 一致（确保测量准确）
        navMenu.style.gap = '36px';

        // 用 requestAnimationFrame 等浏览器完成布局后再测量
        requestAnimationFrame(function () {
            var container = navMenu.closest('.container');
            if (!container) {
                console.warn('nav overflow: .container not found');
                return;
            }
            var containerRect = container.getBoundingClientRect();
            var containerRight = containerRect.right - 6; // 留 6px 缓冲

            // 从后往前检查每一个常规 li（跳过 navMore）
            var allItems = navMenu.querySelectorAll('li:not(.nav-more)');
            // 转成数组，从后往前遍历
            var itemsArr = Array.prototype.slice.call(allItems);
            for (var i = itemsArr.length - 1; i >= 0; i--) {
                var item = itemsArr[i];
                var itemRect = item.getBoundingClientRect();
                // 如果这个 item 右边界超出容器右边界，移到 dropdown
                if (itemRect.right > containerRight) {
                    navDropdown.insertBefore(item, navDropdown.firstChild);
                } else {
                    // 一旦有一个没超出，更靠左的也不会超出（从右向左检查）
                    break;
                }
            }
            // 没溢出项时隐藏「更多」按钮，避免 hover 露出空面板
            navMore.style.display = navDropdown.children.length ? '' : 'none';
        });
    }

    // 「更多」点击切换下拉（触屏设备需要）
    if (moreTrigger) {
        moreTrigger.addEventListener('click', function (e) {
            e.preventDefault();
            if (!isMobile) {
                navMore.classList.toggle('active');
            }
        });
    }

    // 点击外部关闭下拉
    document.addEventListener('click', function (e) {
        if (navMore && !navMore.contains(e.target)) {
            navMore.classList.remove('active');
        }
    });

    // 初始化执行 + resize 时重新计算
    reflowNav();
    var resizeTimer = null;
    window.addEventListener('resize', function () {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(reflowNav, 100);
    });

    // 根据滚动位置高亮导航
    function updateActiveNav() {
        var sections = document.querySelectorAll('section[id]');
        var scrollPos = window.scrollY + 120;

        sections.forEach(function (section) {
            var sectionTop = section.offsetTop;
            var sectionHeight = section.offsetHeight;
            var sectionId = section.getAttribute('id');

            if (scrollPos >= sectionTop && scrollPos < sectionTop + sectionHeight) {
                navLinks.forEach(function (link) {
                    link.classList.remove('active');
                    if (link.getAttribute('href') === '#' + sectionId) {
                        link.classList.add('active');
                    }
                });
            }
        });
    }
}

/* ============================================
   Hero 轮播图模块
   ============================================ */
function initHeroSlider() {
    var slides = document.querySelectorAll('.hero-slide');
    var dots = document.querySelectorAll('.dot');
    var prevBtn = document.querySelector('.hero-prev');
    var nextBtn = document.querySelector('.hero-next');
    var heroSection = document.querySelector('.hero');

    var currentSlide = 0;
    var slideInterval = null;
    var totalSlides = slides.length;

    function goToSlide(index) {
        // 移除当前 active 的动画类
        var currentContent = slides[currentSlide].querySelectorAll('.animate-hero');
        currentContent.forEach(function (el) {
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
        });

        slides[currentSlide].classList.remove('active');
        dots[currentSlide].classList.remove('active');

        currentSlide = (index + totalSlides) % totalSlides;

        slides[currentSlide].classList.add('active');
        dots[currentSlide].classList.add('active');

        // 触发新幻灯片的入场动画
        var newContent = slides[currentSlide].querySelectorAll('.animate-hero');
        newContent.forEach(function (el, i) {
            el.style.transition = 'none';
            el.style.opacity = '0';
            el.style.transform = 'translateY(30px)';
            setTimeout(function () {
                el.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out';
                el.style.transitionDelay = (i * 0.2) + 's';
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
            }, 50);
        });
    }

    function nextSlide() { goToSlide(currentSlide + 1); }
    function prevSlide() { goToSlide(currentSlide - 1); }

    function startAutoPlay() { slideInterval = setInterval(nextSlide, 6000); }
    function stopAutoPlay() {
        if (slideInterval) { clearInterval(slideInterval); slideInterval = null; }
    }

    nextBtn.addEventListener('click', function () {
        nextSlide(); stopAutoPlay(); startAutoPlay();
    });
    prevBtn.addEventListener('click', function () {
        prevSlide(); stopAutoPlay(); startAutoPlay();
    });

    dots.forEach(function (dot, index) {
        dot.addEventListener('click', function () {
            goToSlide(index); stopAutoPlay(); startAutoPlay();
        });
    });

    heroSection.addEventListener('mouseenter', stopAutoPlay);
    heroSection.addEventListener('mouseleave', startAutoPlay);

    // 初始触发第一个幻灯片动画
    var firstContent = slides[0].querySelectorAll('.animate-hero');
    firstContent.forEach(function (el, i) {
        setTimeout(function () {
            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';
        }, 300 + i * 200);
    });

    startAutoPlay();
}

/* ============================================
   Hero 粒子光效模块
   ============================================ */
function initHeroParticles() {
    var container = document.getElementById('heroParticles');
    if (!container) return;

    var particleCount = 20;

    for (var i = 0; i < particleCount; i++) {
        var particle = document.createElement('div');
        var size = Math.random() * 4 + 2;
        var left = Math.random() * 100;
        var duration = Math.random() * 15 + 10;
        var delay = Math.random() * 10;

        particle.style.cssText =
            'position:absolute;' +
            'width:' + size + 'px;' +
            'height:' + size + 'px;' +
            'background:rgba(255,255,255,' + (Math.random() * 0.3 + 0.1) + ');' +
            'border-radius:50%;' +
            'left:' + left + '%;' +
            'bottom:-10px;' +
            'animation:float-particle ' + duration + 's ' + delay + 's infinite linear;' +
            'pointer-events:none;';

        container.appendChild(particle);
    }
}

/* ============================================
   滚动动画模块（带 stagger 效果）
   ============================================ */
function initScrollAnimations() {
    var animElements = document.querySelectorAll('.anim');

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                // 获取同一父容器下的兄弟 anim 元素，实现 stagger
                var parent = entry.target.parentElement;
                var siblings = parent.querySelectorAll('.anim');
                var index = 0;

                siblings.forEach(function (sib, i) {
                    if (sib === entry.target) {
                        index = i;
                    }
                });

                // 计算相对于容器中已出现元素的延迟
                var delay = 0;
                var allSiblings = Array.prototype.slice.call(siblings);
                var myIndex = allSiblings.indexOf(entry.target);
                // 只对容器内还未动画的元素加延迟
                var unanimated = allSiblings.filter(function (s) {
                    return !s.classList.contains('animated');
                });
                var staggerIndex = unanimated.indexOf(entry.target);
                if (staggerIndex > 0) {
                    delay = staggerIndex * 0.12;
                }

                entry.target.style.transitionDelay = delay + 's';

                // 使用 requestAnimationFrame 确保过渡生效
                requestAnimationFrame(function () {
                    entry.target.classList.add('animated');
                });

                observer.unobserve(entry.target);
            }
        });
    }, {
        threshold: 0.12,
        rootMargin: '0px 0px -40px 0px'
    });

    animElements.forEach(function (el) {
        observer.observe(el);
    });
}

/* ============================================
   数字计数器模块（更大字号、更慢速度）
   ============================================ */
function initStatsCounter() {
    var statNumbers = document.querySelectorAll('.stat-number');
    var hasAnimated = false;

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting && !hasAnimated) {
                hasAnimated = true;
                animateCounters();
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    var statsSection = document.querySelector('.stats-section');
    if (statsSection) {
        observer.observe(statsSection);
    }

    function animateCounters() {
        statNumbers.forEach(function (numEl) {
            var target = parseInt(numEl.getAttribute('data-target'));
            var duration = 2500; // 更慢的计数速度
            var startTime = performance.now();

            function updateCount(currentTime) {
                var elapsed = currentTime - startTime;
                var progress = Math.min(elapsed / duration, 1);

                // easeOutExpo 缓动 - 更优雅的减速效果
                var easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
                var currentValue = Math.floor(easeProgress * target);

                numEl.textContent = formatNumber(currentValue);

                if (progress < 1) {
                    requestAnimationFrame(updateCount);
                } else {
                    numEl.textContent = formatNumber(target);
                }
            }

            requestAnimationFrame(updateCount);
        });
    }

    // 数字格式化（千分位）
    function formatNumber(num) {
        if (num >= 1000) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        return num.toString();
    }
}

/* ============================================
   联系表单验证模块
   ============================================ */
function initContactForm() {
    var form = document.getElementById('contactForm');
    if (!form) return;

    form.addEventListener('submit', function (e) {
        e.preventDefault();

        var name = form.querySelector('#name').value.trim();
        var phone = form.querySelector('#phone').value.trim();
        var email = form.querySelector('#email').value.trim();
        var message = form.querySelector('#message').value.trim();

        if (!name) { showToast('请输入您的姓名', 'error'); return; }

        var phoneRegex = /^1[3-9]\d{9}$/;
        if (!phone) { showToast('请输入您的手机号', 'error'); return; }
        if (!phoneRegex.test(phone)) { showToast('请输入正确的手机号码', 'error'); return; }

        if (email) {
            var emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) { showToast('请输入正确的邮箱地址', 'error'); return; }
        }

        if (!message) { showToast('请输入您的咨询内容', 'error'); return; }

        showToast('提交成功！我们将尽快与您联系。', 'success');
        form.reset();
    });

    // 消息提示
    function showToast(msg, type) {
        var existingToast = document.querySelector('.toast-message');
        if (existingToast) existingToast.remove();

        var toast = document.createElement('div');
        toast.className = 'toast-message ' + type;
        toast.textContent = msg;
        toast.style.cssText =
            'position:fixed;top:24px;left:50%;transform:translateX(-50%);' +
            'padding:14px 32px;border-radius:8px;color:#fff;font-size:15px;' +
            'z-index:9999;animation:toastIn 0.4s ease;font-weight:500;' +
            'box-shadow:0 8px 30px rgba(0,0,0,0.15);' +
            'backdrop-filter:blur(8px);letter-spacing:0.5px;';

        toast.style.background = type === 'success'
            ? 'linear-gradient(135deg, #059669, #10b981)'
            : 'linear-gradient(135deg, #dc2626, #ef4444)';

        document.body.appendChild(toast);

        setTimeout(function () {
            toast.style.opacity = '0';
            toast.style.transition = 'opacity 0.4s ease';
            setTimeout(function () { toast.remove(); }, 400);
        }, 3000);
    }
}

/* ============================================
   返回顶部模块
   ============================================ */
function initBackToTop() {
    var backToTopBtn = document.getElementById('backToTop');

    window.addEventListener('scroll', function () {
        if (window.scrollY > 400) {
            backToTopBtn.classList.add('visible');
        } else {
            backToTopBtn.classList.remove('visible');
        }
    });

    backToTopBtn.addEventListener('click', function () {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

/* ============================================
   企业实力 Tab 切换模块
   ============================================ */
function initStrengthTabs() {
    var tabs = document.querySelectorAll('.strength-tab');
    var panels = document.querySelectorAll('.strength-panel');
    var indicator = document.querySelector('.strength-tab-indicator');

    if (!tabs.length || !panels.length) return;

    function moveIndicator(activeTab) {
        if (!indicator || !activeTab) return;
        indicator.style.width = activeTab.offsetWidth + 'px';
        indicator.style.transform = 'translateX(' + (activeTab.offsetLeft - 6) + 'px)';
    }

    function activateTab(tab) {
        var targetTab = tab.getAttribute('data-tab');
        tabs.forEach(function (t) { t.classList.remove('active'); });
        panels.forEach(function (p) { p.classList.remove('active'); });
        tab.classList.add('active');
        var targetPanel = document.getElementById('tab-' + targetTab);
        if (targetPanel) targetPanel.classList.add('active');
        moveIndicator(tab);
    }

    tabs.forEach(function (tab) {
        tab.addEventListener('click', function () {
            activateTab(this);
        });
    });

    var initial = document.querySelector('.strength-tab.active');
    if (initial) {
        moveIndicator(initial);
        window.addEventListener('resize', function () {
            var current = document.querySelector('.strength-tab.active');
            moveIndicator(current);
        });
    }
}

/* ============================================
   动态内容加载模块（优雅降级：API不可用时保持静态HTML内容）
   ============================================ */
async function loadDynamicContent() {
    try {
        await Promise.allSettled([
            loadNews(),
            loadCarousel(),
            loadCompanyInfo()
        ]);
    } catch (e) {
        console.log('动态内容加载跳过（静态模式）');
    }
}

/* ----------------------------------------
   1. 新闻动态加载
   ---------------------------------------- */
async function loadNews() {
    try {
        var res = await fetch('/api/news');
        if (!res.ok) return;
        var json = await res.json();
        var news = Array.isArray(json) ? json : (json.data || []);
        if (!Array.isArray(news) || !news.length) return;

        var container = document.querySelector('.news-grid');
        if (!container) return;

        // 仅渲染前 3 条新闻，与静态结构保持一致
        container.innerHTML = news.slice(0, 3).map(function (item, idx) {
            var dateInfo = parseNewsDate(item.date);
            var imageUrl = item.image || 'images/pdf_img_40_4.jpeg';
            // 兼容静态样式：第 2、3 张额外加 news-image-2 / news-image-3 修饰类
            var imageClass = idx === 0
                ? 'news-image'
                : 'news-image news-image-' + (idx + 1);
            var overlay = 'linear-gradient(rgba(0,40,80,0.3), rgba(0,40,80,0.5))';
            return ''
                + '<div class="news-card anim" data-anim="fadeUp">'
                +   '<div class="' + imageClass + '" style="background-image: ' + overlay + ', url(\'' + imageUrl + '\'); background-size: cover; background-position: center;">'
                +     '<div class="news-date-badge">'
                +       '<span class="news-day">' + dateInfo.day + '</span>'
                +       '<span class="news-month">' + dateInfo.month + '</span>'
                +     '</div>'
                +   '</div>'
                +   '<div class="news-body">'
                +     '<h4>' + escapeHtml(item.title || '') + '</h4>'
                +     '<p>' + escapeHtml(item.summary || '') + '</p>'
                +     '<a href="news-detail.html?id=' + encodeURIComponent(item.id || '') + '" class="news-link">阅读全文 &rarr;</a>'
                +   '</div>'
                + '</div>';
        }).join('');

        // 为新生成的卡片注册滚动动画
        observeNewAnimElements(container);
    } catch (err) {
        console.log('新闻加载失败，保持静态内容', err);
    }
}

// 解析新闻日期为页面所需的 日 / 年.月 显示格式
function parseNewsDate(dateStr) {
    if (!dateStr) return { day: '', month: '' };
    var d = new Date(dateStr);
    if (isNaN(d.getTime())) return { day: '', month: '' };
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    return { day: day, month: d.getFullYear() + '.' + month };
}

/* ----------------------------------------
   2. 轮播图动态加载
   ---------------------------------------- */
async function loadCarousel() {
    try {
        var res = await fetch('/api/carousel');
        if (!res.ok) return;
        var slides = await res.json();
        if (!Array.isArray(slides) || !slides.length) return;

        // 按 order 字段升序排序
        slides.sort(function (a, b) {
            return (a.order || 0) - (b.order || 0);
        });

        var slider = document.querySelector('.hero-slider');
        var dots = document.querySelector('.hero-dots');
        if (!slider || !dots) return;

        var overlay = 'linear-gradient(rgba(0,40,80,0.6), rgba(0,40,80,0.7))';

        // 重建轮播 slides，结构与静态 HTML 完全一致
        slider.innerHTML = slides.map(function (slide, i) {
            var activeClass = i === 0 ? 'hero-slide active' : 'hero-slide';
            var btnText = escapeHtml(slide.buttonText || '了解更多');
            var btnLink = slide.buttonLink || '#';
            return ''
                + '<div class="' + activeClass + '" style="background-image: ' + overlay + ', url(\'' + slide.image + '\'); background-size: cover; background-position: center;">'
                +   '<div class="hero-content">'
                +     '<p class="hero-subtitle animate-hero">' + escapeHtml(slide.subtitle || '') + '</p>'
                +     '<h1 class="animate-hero">' + escapeHtml(slide.title || '') + '</h1>'
                +     '<p class="hero-desc animate-hero">' + escapeHtml(slide.description || '') + '</p>'
                +     '<div class="hero-btns animate-hero">'
                +       '<a href="' + btnLink + '" class="btn btn-hero-primary">' + btnText + '</a>'
                +       '<a href="#contact" class="btn btn-hero-outline">联系我们</a>'
                +     '</div>'
                +   '</div>'
                + '</div>';
        }).join('');

        // 重建圆点指示器
        dots.innerHTML = slides.map(function (_, i) {
            return '<span class="dot' + (i === 0 ? ' active' : '') + '" data-index="' + i + '"></span>';
        }).join('');

        // 重新初始化轮播功能（重新绑定事件、重置索引、重启自动播放）
        if (typeof initHeroSlider === 'function') {
            try { initHeroSlider(); } catch (e) { /* 忽略重初始化异常 */ }
        }
    } catch (err) {
        console.log('轮播图加载失败，保持静态内容', err);
    }
}

/* ----------------------------------------
   3. 企业文化动态加载
   ---------------------------------------- */
async function loadCulture() {
    try {
        var res = await fetch('/api/culture');
        if (!res.ok) return;
        var json = await res.json();
        var data = json.data || json;
        var items = data.items;
        var categories = data.categories || [];
        if (!Array.isArray(items) || !items.length) return;

        var container = document.getElementById('culture-grid');
        if (!container) return;

        var catMap = {};
        categories.forEach(function (c) { catMap[c.id] = c; });

        items.sort(function (a, b) {
            return (a.order || 0) - (b.order || 0);
        });

        container.innerHTML = items.map(function (item) {
            var cat = catMap[item.category] || {};
            var catLabel = (cat.icon || '') + ' ' + (cat.name || item.category);
            return ''
                + '<div class="culture-card" data-category="' + escapeHtml(item.category) + '">'
                +   '<div class="culture-card-img">'
                +     '<img src="' + escapeHtml(item.image) + '" alt="' + escapeHtml(item.title) + '" loading="lazy">'
                +   '</div>'
                +   '<div class="culture-card-info">'
                +     '<span class="culture-card-cat">' + escapeHtml(catLabel) + '</span>'
                +     '<span class="culture-card-desc">' + escapeHtml(item.title) + '</span>'
                +   '</div>'
                + '</div>';
        }).join('');

        observeNewAnimElements(container);
    } catch (err) {
        console.log('企业文化加载失败，保持静态内容', err);
    }
}

/* ----------------------------------------
   4. 公司信息动态加载
   ---------------------------------------- */
async function loadCompanyInfo() {
    try {
        var res = await fetch('/api/company');
        if (!res.ok) return;
        var info = await res.json();
        if (!info) return;

        // 联系信息区域映射：以 strong 标签文本为键
        var contactMap = {
            '公司地址': info.address,
            '服务热线': info.phone,
            '客服经理': info.customerService,
            '企业邮箱': info.email,
            '投诉热线': info.complaint ? (info.complaint + '（微信同号）') : null
        };

        document.querySelectorAll('.contact-info .contact-item').forEach(function (item) {
            var strong = item.querySelector('strong');
            var desc = item.querySelector('div > p');
            if (!strong || !desc) return;
            var key = strong.textContent.trim();
            if (contactMap[key]) {
                desc.textContent = contactMap[key];
            }
        });

        // 页脚联系方式（顺序：地址、电话、邮箱、客服经理）
        var footerSpans = document.querySelectorAll('.footer-contact .footer-contact-item span');
        var footerData = [info.address, info.phone, info.email, info.customerService];
        footerSpans.forEach(function (span, idx) {
            if (footerData[idx]) span.textContent = footerData[idx];
        });

        // 服务理念（Hero 横幅、关于我们、页脚）
        var servicePhilosophy = info.service_philosophy || '服务更专业，客户更省心';
        var mottoParts = servicePhilosophy.split(/[，,]/).map(function (s) { return s.trim(); }).filter(Boolean);
        var banner = document.getElementById('heroServiceBanner');
        if (banner) {
            if (mottoParts.length >= 2) {
                banner.innerHTML = '<span class="hero-service-banner-part">' + escapeHtml(mottoParts[0])
                    + '</span><span class="hero-service-banner-divider"></span><span class="hero-service-banner-part">'
                    + escapeHtml(mottoParts[1]) + '</span>';
            } else {
                banner.innerHTML = '<span class="hero-service-banner-part">' + escapeHtml(servicePhilosophy) + '</span>';
            }
        }
        document.querySelectorAll('.about-motto').forEach(function (el) {
            el.textContent = '「' + servicePhilosophy + '」';
        });
        document.querySelectorAll('.about-feature-motto span').forEach(function (el) {
            el.textContent = servicePhilosophy;
        });

        // 页脚公司简介（服务理念 + slogan + culture 拼接）
        var footerDesc = document.querySelector('.footer-desc');
        if (footerDesc && info.slogan && info.culture) {
            footerDesc.textContent = servicePhilosophy + '。' + info.slogan + '，助力中国科研事业发展。公司秉承“'
                + info.culture + '”的企业文化，致力于为客户提供最优质的实验室整体解决方案。';
        }

        // 董事长致辞首段（保留后续含 strong 的强调段落）
        if (info.chairman_message) {
            var firstP = document.querySelector('.chairman-speech p');
            if (firstP && !firstP.querySelector('strong')) {
                firstP.textContent = info.chairman_message;
            }
        }
    } catch (err) {
        console.log('公司信息加载失败，保持静态内容', err);
    }
}

/* ----------------------------------------
   工具函数
   ---------------------------------------- */
// HTML 转义，避免数据中含特殊字符破坏页面结构
function escapeHtml(str) {
    if (str == null) return '';
    return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}

// 为动态生成的 .anim 元素挂载 IntersectionObserver，以保持滚动动画一致
function observeNewAnimElements(container) {
    if (!container || !('IntersectionObserver' in window)) return;
    var animElements = container.querySelectorAll('.anim:not(.animated)');
    if (!animElements.length) return;

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                // stagger 延迟，与 initScrollAnimations 风格一致
                var siblings = Array.prototype.slice.call(
                    entry.target.parentElement.querySelectorAll('.anim')
                );
                var unanimated = siblings.filter(function (s) {
                    return !s.classList.contains('animated');
                });
                var idx = unanimated.indexOf(entry.target);
                entry.target.style.transitionDelay = (idx > 0 ? idx * 0.12 : 0) + 's';
                requestAnimationFrame(function () {
                    entry.target.classList.add('animated');
                });
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

    animElements.forEach(function (el) { observer.observe(el); });
}

/* ============================================
   战略目标柱状图 - 入场动画
   ============================================ */
function initStrategyChart() {
    var chartEl = document.querySelector('.strategy-chart');
    if (!chartEl) return;

    var anchors = chartEl.querySelectorAll('.bar-anchor');
    if (!anchors.length) return;

    // 记录目标高度，初始设为 0
    anchors.forEach(function (anchor) {
        anchor.dataset.targetHeight = anchor.style.height;
        anchor.style.height = '0';
        anchor.dataset.animated = 'false';
    });

    var observer = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) {
            if (entry.isIntersecting) {
                var chartAnchors = entry.target.querySelectorAll('.bar-anchor');
                chartAnchors.forEach(function (anchor, i) {
                    setTimeout(function () {
                        anchor.style.height = anchor.dataset.targetHeight;
                        anchor.dataset.animated = 'true';
                    }, i * 150);
                });
                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.3 });

    observer.observe(chartEl);
}

/* ============================================
   品牌授权 Lightbox · 编辑式画廊全屏查看
   ============================================ */
function initAuthLightbox() {
    var cards = document.querySelectorAll('.auth-card');
    if (!cards.length) return;

    // 创建 lightbox（一次性）
    var lb = document.createElement('div');
    lb.className = 'auth-lightbox';
    lb.setAttribute('role', 'dialog');
    lb.setAttribute('aria-modal', 'true');
    lb.setAttribute('aria-label', '授权书查看');
    lb.innerHTML =
        '<div class="auth-lightbox-frame">' +
            '<button class="auth-lightbox-close" type="button" aria-label="关闭">\u00d7</button>' +
            '<img alt="" />' +
            '<div class="auth-lightbox-caption"></div>' +
        '</div>';
    document.body.appendChild(lb);

    var lbImg = lb.querySelector('img');
    var lbCap = lb.querySelector('.auth-lightbox-caption');
    var lbClose = lb.querySelector('.auth-lightbox-close');
    var lbFrame = lb.querySelector('.auth-lightbox-frame');

    function openLightbox(src, label) {
        lbImg.src = src;
        lbImg.alt = label || '';
        lbCap.textContent = label || '';
        lb.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeLightbox() {
        lb.classList.remove('active');
        document.body.style.overflow = '';
        setTimeout(function () { lbImg.src = ''; }, 350);
    }

    cards.forEach(function (card) {
        card.addEventListener('click', function () {
            var img = card.querySelector('img');
            var brandEl = card.querySelector('.auth-brand');
            if (!img) return;
            var label = brandEl ? brandEl.textContent.trim() : (img.alt || '');
            openLightbox(img.src, label);
        });
    });

    // 点击遮罩关闭（点击画框内不关闭，除非点关闭按钮）
    lb.addEventListener('click', function (e) {
        if (e.target === lb) closeLightbox();
    });
    lbClose.addEventListener('click', closeLightbox);
    // 阻止画框内点击冒泡到遮罩
    lbFrame.addEventListener('click', function (e) {
        if (e.target !== lbClose) e.stopPropagation();
    });
    // ESC 键关闭
    document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && lb.classList.contains('active')) closeLightbox();
    });
}

/* ===== 企业文化 Tab 过滤 ===== */
function initCultureTabs() {
    const tabs = document.querySelectorAll('.culture-tab');
    if (!tabs.length) return;

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const category = tab.dataset.culture;
            document.querySelectorAll('.culture-card').forEach(card => {
                if (category === 'all' || card.dataset.category === category) {
                    card.classList.remove('hidden');
                } else {
                    card.classList.add('hidden');
                }
            });
        });
    });
}

/* ============================================
   发展历程自动横向滚动
   ============================================ */
function initTimelineAutoScroll() {
    var wrap = document.querySelector('.timeline-scroll-wrap');
    if (!wrap) return;
    console.log('Timeline auto-scroll started, scrollWidth=' + wrap.scrollWidth + ' clientWidth=' + wrap.clientWidth);
    if (wrap.scrollWidth <= wrap.clientWidth) return; // 内容不溢出则无需滚动

    var speed = 1.5; // 每 30ms 滚动的像素
    var direction = 1;
    var paused = false;

    function step() {
        if (paused) return;
        wrap.scrollLeft += speed * direction;
        if (wrap.scrollLeft >= wrap.scrollWidth - wrap.clientWidth) {
            direction = -1;
        } else if (wrap.scrollLeft <= 0) {
            direction = 1;
        }
    }

    setInterval(step, 30);

    // 鼠标悬停暂停
    wrap.addEventListener('mouseenter', function() { paused = true; });
    wrap.addEventListener('mouseleave', function() { paused = false; });
    // 触摸暂停
    wrap.addEventListener('touchstart', function() { paused = true; });
    wrap.addEventListener('touchend', function() { paused = false; });
}

// 启动发展历程自动滚动（DOM就绪后延时执行）
if (document.readyState === 'complete') {
    setTimeout(initTimelineAutoScroll, 800);
} else {
    window.addEventListener('load', function() {
        setTimeout(initTimelineAutoScroll, 500);
    });
}


// 宣传视频滚动自动播放
(function() {
    var video = document.querySelector('.video-wrapper video');
    if (!video) return;
    var userClicked = false;

    document.addEventListener('click', function() {
        if (!userClicked) {
            userClicked = true;
            video.muted = false;
            video.volume = 1;
        }
    }, { once: true });

    var observer = new IntersectionObserver(function(entries) {
        entries.forEach(function(entry) {
            if (entry.isIntersecting) {
                video.play().catch(function(){});
            }
        });
    }, { threshold: 0.5 });
    observer.observe(video);

    // 声音提示按钮
    var hint = document.getElementById('videoSoundHint');
    if (hint) {
        hint.addEventListener('click', function() {
            video.muted = false;
            video.volume = 1;
            userClicked = true;
            hint.style.opacity = '0';
            setTimeout(function() { hint.style.display = 'none'; }, 300);
        });
    }
})();
