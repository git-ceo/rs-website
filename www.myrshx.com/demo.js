/* ============================================
   荣盛科技官网 · 自动演示模式 v2
   首页从头滚到尾 → 自动跳转各子页面继续滚动
   ============================================ */

(function () {
    'use strict';

    if (window.__RS_DEMO_BOOTED) return;
    window.__RS_DEMO_BOOTED = true;

    var PAGES = [
        'index.html',
        'about.html',
        'culture.html',
        'logistics.html',
        'business.html',
        'showroom.html',
        'solutions.html',
        'news.html'
    ];

    var SCROLL_SPEED = 900;
    var EASE_IN_MS = 500;
    var TOP_PAUSE_MS = 800;
    var BOTTOM_PAUSE_MS = 300;
    var FINALE_HOLD_MS = 4000;
    var LAYOUT_WAIT_MAX = 150;
    var CONTENT_WAIT_MS = 12000;
    var CONTENT_SETTLE_MS = 800;

    /* 需要等 API 渲染完成的页面 */
    var DYNAMIC_PAGES = {
        'culture.html': {
            ready: '#cultureGrid .culture-card',
            done: '#cultureGrid .culture-card, #cultureGrid .culture-error, #cultureEmpty:not([hidden])'
        },
        'showroom.html': {
            ready: '#showroomGrid .showroom-card',
            done: '#showroomGrid .showroom-card, #showroomGrid .showroom-error, #showroomEmpty:not([hidden])'
        },
        'news.html': {
            ready: '#newsList .news-list-item',
            done: '#newsList .news-list-item, #newsList .news-page-empty'
        }
    };

    /* 各页滚动目标：null = 滚到底；字符串 = 滚到该元素展示完即停 */
    var PAGE_SCROLL_TARGET = {
        'index.html': null,
        'about.html': null,
        'culture.html': '#cultureGrid',
        'logistics.html': '.logistics-delivery',
        'business.html': null,
        'showroom.html': '#showroomGrid',
        'solutions.html': null,
        'news.html': null
    };

    var state = {
        running: false,
        rafId: null,
        overlay: null,
        pageIndex: 0,
        statNodes: [],
        recordPhase: 'idle',
        recordPauseLeft: 0,
        scrollCurrentY: 0,
        scrollTargetY: 0,
        scrollStartY: 0
    };

    function getParams() {
        return new URLSearchParams(window.location.search);
    }

    function buildUrl(pageIndex, skipCountdown) {
        var params = getParams();
        var qs = 'demo=1&dp=' + pageIndex;
        if (params.get('clean') === '1') qs += '&clean=1';
        if (params.get('loop') === '1') qs += '&loop=1';
        if (params.get('record') === '1') qs += '&record=1';
        if (skipCountdown) qs += '&sc=1';
        return PAGES[pageIndex] + '?' + qs;
    }

    function isRecordMode() {
        return getParams().get('record') === '1';
    }

    function getScrollSpeed() {
        if (isRecordMode()) return 420;
        var page = PAGES[state.pageIndex];
        return DYNAMIC_PAGES[page] ? 650 : SCROLL_SPEED;
    }

    function getTopPause() {
        return isRecordMode() ? 350 : TOP_PAUSE_MS;
    }

    function getBottomPause() {
        return isRecordMode() ? 120 : BOTTOM_PAUSE_MS;
    }

    function getFinaleHold() {
        return isRecordMode() ? 2200 : FINALE_HOLD_MS;
    }

    function getContentSettle() {
        return isRecordMode() ? 350 : CONTENT_SETTLE_MS;
    }

    function getScrollTargetY() {
        var maxY = getMaxScrollY();
        var page = PAGES[state.pageIndex];
        var selector = PAGE_SCROLL_TARGET[page];
        if (!selector) return maxY;

        var el = document.querySelector(selector);
        if (!el) return maxY;

        var rect = el.getBoundingClientRect();
        var y = getScrollY() + rect.bottom - window.innerHeight * 0.82;
        return Math.min(Math.max(0, Math.round(y)), maxY);
    }

    function getScrollY() {
        return window.pageYOffset
            || document.documentElement.scrollTop
            || document.body.scrollTop
            || 0;
    }

    function getMaxScrollY() {
        var h = Math.max(
            document.documentElement.scrollHeight,
            document.body.scrollHeight,
            document.documentElement.offsetHeight,
            document.body.offsetHeight
        );
        return Math.max(0, h - window.innerHeight);
    }

    function setScrollY(y) {
        var top = Math.round(y);
        window.scrollTo(0, top);
        if (!isRecordMode()) {
            document.documentElement.scrollTop = top;
            document.body.scrollTop = top;
        }
    }

    function preparePage() {
        document.documentElement.classList.add('demo-mode');
        document.documentElement.style.scrollBehavior = 'auto';

        document.querySelectorAll('.anim').forEach(function (el) {
            el.style.transitionDelay = '0s';
            el.classList.add('animated');
        });
        document.querySelectorAll('img[loading="lazy"]').forEach(function (img) {
            img.loading = 'eager';
            if (img.dataset.src && !img.src) img.src = img.dataset.src;
        });
        state.statNodes = Array.prototype.slice.call(
            document.querySelectorAll('.stat-number[data-target]')
        ).map(function (el) {
            return { el: el, done: false };
        });
    }

    function formatNumber(num) {
        if (num >= 1000) {
            return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        }
        return num.toString();
    }

    function animateStat(el) {
        var target = parseInt(el.getAttribute('data-target'), 10);
        if (isNaN(target)) return;
        var duration = 1100;
        var startTime = performance.now();
        function step(now) {
            var progress = Math.min((now - startTime) / duration, 1);
            var eased = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            el.textContent = formatNumber(Math.floor(eased * target));
            if (progress < 1) requestAnimationFrame(step);
            else el.textContent = formatNumber(target);
        }
        requestAnimationFrame(step);
    }

    function checkStatsInView() {
        state.statNodes.forEach(function (item) {
            if (item.done) return;
            var rect = item.el.getBoundingClientRect();
            if (rect.top < window.innerHeight && rect.bottom > 0) {
                item.done = true;
                animateStat(item.el);
            }
        });
    }

    function buildOverlay(showStartScreen) {
        var overlay = document.createElement('div');
        overlay.className = 'demo-overlay';

        var startScreenHtml = showStartScreen
            ? '<div class="demo-start-screen" id="demoStartScreen">' +
                  '<img src="images/logo.png" alt="荣盛科技" class="demo-start-logo">' +
                  '<h2 class="demo-start-title">绵阳市荣盛科技有限公司</h2>' +
                  '<p class="demo-start-subtitle">官网演示模式</p>' +
                  '<div class="demo-countdown" id="demoCountdown">3</div>' +
                  '<p class="demo-start-hint">演示即将开始，请全屏录屏</p>' +
              '</div>'
            : '';

        overlay.innerHTML =
            startScreenHtml +
            '<div class="demo-progress-wrap"><div class="demo-progress-bar" id="demoProgressBar"></div></div>' +
            '<div class="demo-badge"><span class="demo-badge-dot"></span>演示中</div>' +
            '<div class="demo-scene-dots" id="demoSceneDots"></div>' +
            '<div class="demo-finale" id="demoFinale">' +
                '<img src="images/logo.png" alt="荣盛科技" class="demo-finale-logo">' +
                '<h2 class="demo-finale-company">绵阳市荣盛科技有限公司</h2>' +
                '<p class="demo-finale-motto">服务更专业 · 客户更省心</p>' +
                '<p class="demo-finale-tagline">智能实验室一站式方案解决专家</p>' +
                '<p class="demo-finale-url">www.myrshx.com</p>' +
            '</div>' +
            '<button class="demo-exit-btn" id="demoExitBtn" title="按 Esc 也可退出">退出演示</button>';

        document.body.appendChild(overlay);
        state.overlay = overlay;

        var dotsContainer = document.getElementById('demoSceneDots');
        PAGES.forEach(function (_, i) {
            var dot = document.createElement('span');
            dot.className = 'demo-scene-dot';
            if (i < state.pageIndex) dot.classList.add('is-done');
            if (i === state.pageIndex) dot.classList.add('is-active');
            dotsContainer.appendChild(dot);
        });

        document.getElementById('demoExitBtn').addEventListener('click', exitDemo);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') exitDemo();
        });
    }

    function updateProgress(pageProgress) {
        var bar = document.getElementById('demoProgressBar');
        if (!bar) return;
        var overall = ((state.pageIndex + pageProgress) / PAGES.length) * 100;
        bar.style.width = Math.min(overall, 100) + '%';
    }

    function startPageScroll(onDone) {
        state.scrollCurrentY = getScrollY();
        state.scrollTargetY = getScrollTargetY();
        var distance = Math.max(0, state.scrollTargetY - state.scrollCurrentY);
        if (distance < 2) {
            setScrollY(state.scrollTargetY);
            updateProgress(state.scrollTargetY >= getMaxScrollY() - 2 ? 1 : 0.85);
            checkStatsInView();
            if (isRecordMode()) {
                state.recordPhase = 'bottom-pause';
                state.recordPauseLeft = getBottomPause();
            } else if (onDone) {
                onDone();
            }
            return;
        }
        if (isRecordMode()) {
            state.scrollStartY = state.scrollCurrentY;
            state.recordPhase = 'scrolling';
            return;
        }
        runScrollAnimation(onDone);
    }

    function runScrollAnimation(onDone) {
        var waitFrames = 0;
        var scrollStart = 0;
        var startY = 0;
        var targetY = 0;
        var duration = 0;
        var scrolling = false;

        function frame(now) {
            if (!state.running) return;

            if (!scrolling) {
                if (getMaxScrollY() < 80 && waitFrames < LAYOUT_WAIT_MAX) {
                    waitFrames++;
                    state.rafId = requestAnimationFrame(frame);
                    return;
                }
                startY = getScrollY();
                targetY = getScrollTargetY();
                var distance = Math.max(0, targetY - startY);
                if (distance < 2) {
                    setScrollY(targetY);
                    updateProgress(targetY >= getMaxScrollY() - 2 ? 1 : 0.85);
                    checkStatsInView();
                    onDone();
                    return;
                }
                duration = Math.max((distance / getScrollSpeed()) * 1000, 600);
                scrollStart = now;
                scrolling = true;
            }

            var elapsed = now - scrollStart;
            var t = Math.min(elapsed / duration, 1);
            var eased = isRecordMode() ? t : easeInOutCubic(t);
            var y = startY + (targetY - startY) * eased;
            setScrollY(y);
            var span = Math.max(targetY - startY, 1);
            updateProgress((y - startY) / span * 0.92);
            checkStatsInView();

            if (t < 1) {
                state.rafId = requestAnimationFrame(frame);
            } else {
                setScrollY(targetY);
                updateProgress(targetY >= getMaxScrollY() - 2 ? 1 : 0.92);
                onDone();
            }
        }

        state.rafId = requestAnimationFrame(frame);
    }

    function recordTick(deltaMs) {
        if (!state.running || !isRecordMode()) {
            return { booting: true, allDone: false };
        }

        if (state.recordPhase === 'top-pause') {
            state.recordPauseLeft -= deltaMs;
            if (state.recordPauseLeft <= 0) {
                startPageScroll(function () {
                    state.recordPhase = 'bottom-pause';
                    state.recordPauseLeft = getBottomPause();
                });
            }
            return recordStatus();
        }

        if (state.recordPhase === 'scrolling') {
            var speed = getScrollSpeed();
            state.scrollCurrentY += speed * (deltaMs / 1000);
            if (state.scrollCurrentY >= state.scrollTargetY) {
                state.scrollCurrentY = state.scrollTargetY;
                setScrollY(state.scrollCurrentY);
                updateProgress(state.scrollTargetY >= getMaxScrollY() - 2 ? 1 : 0.92);
                checkStatsInView();
                state.recordPhase = 'bottom-pause';
                state.recordPauseLeft = getBottomPause();
            } else {
                setScrollY(state.scrollCurrentY);
                var span = Math.max(state.scrollTargetY - state.scrollStartY, 1);
                updateProgress((state.scrollCurrentY - state.scrollStartY) / span * 0.92);
                checkStatsInView();
            }
            return recordStatus();
        }

        if (state.recordPhase === 'bottom-pause') {
            state.recordPauseLeft -= deltaMs;
            if (state.recordPauseLeft <= 0) {
                var next = state.pageIndex + 1;
                if (next < PAGES.length) {
                    state.recordPhase = 'navigating';
                    window.location.href = buildUrl(next, true);
                    return { booting: true, allDone: false, navigating: true };
                } else {
                    showFinale();
                    state.recordPhase = 'finale';
                    state.recordPauseLeft = getFinaleHold();
                }
            }
            return recordStatus();
        }

        if (state.recordPhase === 'finale') {
            state.recordPauseLeft -= deltaMs;
            return recordStatus();
        }

        return recordStatus();
    }

    function recordStatus() {
        var finale = document.getElementById('demoFinale');
        return {
            booting: false,
            allDone: state.recordPhase === 'finale' && state.recordPauseLeft <= 0,
            finaleVisible: !!(finale && finale.classList.contains('is-visible'))
        };
    }

    function scrollPageToTarget(onDone) {
        startPageScroll(onDone);
    }

    function easeInOutCubic(t) {
        return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
    }

    function gotoNextPage() {
        var next = state.pageIndex + 1;
        if (next < PAGES.length) {
            window.location.href = buildUrl(next, true);
        } else {
            showFinale();
        }
    }

    function showFinale() {
        if (!isRecordMode()) state.running = false;
        var finale = document.getElementById('demoFinale');
        if (finale) finale.classList.add('is-visible');

        if (!isRecordMode() && getParams().get('loop') === '1') {
            setTimeout(function () {
                window.location.href = buildUrl(0, true);
            }, getFinaleHold());
        }
    }

    function exitDemo() {
        state.running = false;
        if (state.rafId) cancelAnimationFrame(state.rafId);
        document.body.classList.remove('demo-mode');
        document.documentElement.classList.remove('demo-mode');
        document.documentElement.style.scrollBehavior = '';
        if (state.overlay) state.overlay.remove();
        state.overlay = null;
        window.history.replaceState(null, '', window.location.pathname);
    }

    function waitForPageContent(callback) {
        var page = PAGES[state.pageIndex];
        var cfg = DYNAMIC_PAGES[page];
        if (!cfg) {
            callback();
            return;
        }

        var settled = false;
        function finish() {
            if (settled) return;
            settled = true;
            window.removeEventListener('rs-demo-content-ready', onReady);
            setScrollY(0);
            document.querySelectorAll(cfg.ready + ' img, ' + cfg.ready).forEach(function (el) {
                if (el.tagName === 'IMG') el.loading = 'eager';
            });
            setTimeout(callback, getContentSettle());
        }

        function isDone() {
            return !!document.querySelector(cfg.done);
        }

        function onReady() {
            if (isDone()) finish();
        }

        window.addEventListener('rs-demo-content-ready', onReady);

        if (isDone()) {
            finish();
            return;
        }

        var start = Date.now();
        (function poll() {
            if (isDone()) {
                finish();
                return;
            }
            if (Date.now() - start > CONTENT_WAIT_MS) {
                finish();
                return;
            }
            requestAnimationFrame(poll);
        })();
    }

    function beginScroll() {
        waitForPageContent(function () {
            state.running = true;
            setScrollY(0);
            if (isRecordMode()) {
                state.recordPhase = 'top-pause';
                state.recordPauseLeft = getTopPause();
                return;
            }
            setTimeout(function () {
                if (!state.running) return;
                scrollPageToTarget(function () {
                    setTimeout(gotoNextPage, getBottomPause());
                });
            }, getTopPause());
        });
    }

    function runCountdown(callback) {
        var screen = document.getElementById('demoStartScreen');
        var countEl = document.getElementById('demoCountdown');
        var count = 3;

        function tick() {
            if (count > 0) {
                countEl.textContent = count;
                count--;
                setTimeout(tick, 1000);
            } else {
                countEl.textContent = '开始';
                countEl.classList.add('is-go');
                setTimeout(function () {
                    screen.classList.add('is-hidden');
                    callback();
                }, 600);
            }
        }
        tick();
    }

    function init() {
        var params = getParams();
        if (params.get('demo') !== '1') return;
        if (state.overlay) return;

        state.pageIndex = parseInt(params.get('dp') || '0', 10);
        if (isNaN(state.pageIndex) || state.pageIndex < 0 || state.pageIndex >= PAGES.length) {
            state.pageIndex = 0;
        }

        var skipCountdown = true;

        if (params.get('clean') === '1') {
            document.body.classList.add('demo-clean');
        }
        if (isRecordMode()) {
            document.body.classList.add('demo-record');
        }
        document.body.classList.add('demo-mode');

        preparePage();
        buildOverlay(false);
        beginScroll();
    }

    function boot() {
        function start() {
            requestAnimationFrame(function () {
                requestAnimationFrame(init);
            });
        }
        if (document.readyState === 'complete') {
            setTimeout(start, 200);
        } else {
            window.addEventListener('load', function () {
                setTimeout(start, 200);
            }, { once: true });
        }
    }

    window.DemoMode = { pages: PAGES, exit: exitDemo, start: beginScroll, recordTick: recordTick };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }
})();
