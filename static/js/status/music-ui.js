/**
 * 方案二：左下角悬浮唱片播放器 UI 控制器
 * 依赖：jQuery, window._statusMusicPlayer
 */

(function($) {
    'use strict';

    // ============================
    //  SVG 图标库
    // ============================
    const ICONS = {
lrc: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>',
list: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>',
shuffle: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/><polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/><line x1="4" y1="4" x2="9" y2="9"/></svg>',
single: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>',
prev: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/></svg>',
play: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>',
pause: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>',
next: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/></svg>',
close: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>',
    music: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>'
    };

    class MusicFABController {
        constructor() {
            this.panelVisible = false;
            this.progressTimer = null;
            this.watcherInterval = null;
            this.lastIndex = -1;
            this.showLrc = false;
            this.playMode = 'list';  // 'list' | 'shuffle' | 'single'
            this.lrcLines = [];
            this.lrcTimer = null;
            this._lrcRetryTimer = null;
            this._lastName = '';
            this._lastArtist = '';
            this._lastIcon = '';
            this._isSeeking = false;
            this._cachedSourceTitle = ''; // 缓存媒体源信息，优化高频轮询
            this._vipToastTimer = null;

            // 懒加载
            this.allAudios = [];
            this.renderedCount = 0;
            this.PAGE_SIZE = 30;
            this.LOAD_MORE = 20;
            this.isLoadingMore = false;

            // 外部事件句柄暂存
            this._onFabMove = null;
            this._onFabEnd = null;
            this._scrollLockHandler = null;

            this._waitForPlayer();
        }

        _waitForPlayer() {
            const self = this;
            let attempts = 0;
            const check = setInterval(() => {
                attempts++;
                if ((window._statusMusicPlayer && typeof window._statusMusicPlayer.getAPlayer === 'function') || attempts >= 50) {
                    clearInterval(check);
                    self._injectDOM();
                    self._bindEvents();
                    self._startWatcher();
                    $('body').removeClass('music-scroll-locked');
                }
            }, 200);
        }

        _injectDOM() {
            if ($('#music-fab-root').length) return;

            const html = `
            <div id="music-fab-root">
                <div class="music-fab-container" id="musicFabContainer">
                    <button class="music-fab-btn" id="musicFabBtn" title="音乐播放器">
                        <img class="music-fab-cover" id="musicFabCover" src="" alt="">
                        <div class="music-fab-dot"></div>
                        <span class="music-fab-tooltip">音乐播放器</span>
                    </button>
                </div>

                <div class="music-panel-overlay" id="musicPanelOverlay"></div>

                <div class="music-panel" id="musicPanel">
                    <div class="music-panel-header">
                        <div class="music-panel-title">${ICONS.music} 音乐播放器</div>
                        <div class="music-panel-header-tools"></div>
                        <button class="music-panel-close" id="musicPanelClose" title="关闭">${ICONS.close}</button>
                    </div>

                    <div class="music-panel-cover" id="musicPanelCover">
                        <img id="musicPanelCoverImg" src="" alt="" style="width:100%;height:100%;object-fit:cover;">
                    </div>

                    <div class="music-panel-lrc" id="musicPanelLrc">
                        <div class="lrc-inner" id="musicLrcInner">
                            <span class="lrc-line">♪ 暂无歌词</span>
                        </div>
                    </div>

                    <div class="music-panel-info" id="musicPanelInfo">
                        <div class="music-panel-name" id="musicPanelName">未在播放</div>
                        <div class="music-panel-artist" id="musicPanelArtist">点击卡片播放音乐</div>
                    </div>

                    <div class="music-panel-progress">
                        <span id="musicCurrentTime">00:00</span>
                        <div class="music-progress-bar" id="musicProgressBar">
                            <div class="music-progress-fill" id="musicProgressFill" style="width:0%"></div>
                        </div>
                        <span id="musicDuration">00:00</span>
                    </div>

                    <div class="music-panel-controls">
                        <div class="music-controls-left">
                            <button class="music-ctrl-tool-btn" id="musicModeBtn" title="顺序播放">${ICONS.list}</button>
                            <button class="music-ctrl-tool-btn" id="musicLrcBtn" title="歌词">${ICONS.lrc}</button>
                        </div>
                        <div class="music-controls-center">
                            <button class="music-ctrl-btn" id="musicPrevBtn" title="上一首">${ICONS.prev}</button>
                            <button class="music-ctrl-btn play-btn" id="musicPlayBtn" title="播放">${ICONS.play}</button>
                            <button class="music-ctrl-btn" id="musicNextBtn" title="下一首">${ICONS.next}</button>
                        </div>
                        <div class="music-controls-right">
                            <button class="music-shuffle-mini-btn" id="musicShuffleBtn" title="随机播放" style="visibility: hidden;">🎲 随机来一首</button>
                        </div>
                    </div>

                    <div class="music-panel-playlist" id="musicPanelPlaylist"></div>
                </div>
            </div>`;

            $('body').append(html);

            this.$fabContainer = $('#musicFabContainer');
            this.$fabBtn = $('#musicFabBtn');
            this.$fabCover = $('#musicFabCover');
            this.$overlay = $('#musicPanelOverlay');
            this.$panel = $('#musicPanel');
            this.$panelCover = $('#musicPanelCover');
            this.$panelCoverImg = $('#musicPanelCoverImg');
            this.$panelLrc = $('#musicPanelLrc');
            this.$lrcInner = $('#musicLrcInner');
            this.$panelInfo = $('#musicPanelInfo');
            this.$name = $('#musicPanelName');
            this.$artist = $('#musicPanelArtist');
            this.$currentTime = $('#musicCurrentTime');
            this.$duration = $('#musicDuration');
            this.$progressBar = $('#musicProgressBar');
            this.$progressFill = $('#musicProgressFill');
            this.$playBtn = $('#musicPlayBtn');
            this.$prevBtn = $('#musicPrevBtn');
            this.$nextBtn = $('#musicNextBtn');
            this.$playlist = $('#musicPanelPlaylist');
            this.$shuffleBtn = $('#musicShuffleBtn');
            this.$closeBtn = $('#musicPanelClose');
            this.$lrcBtn = $('#musicLrcBtn');
            this.$modeBtn = $('#musicModeBtn');
        }

        _bindEvents() {
            const self = this;

            // ==========================================
            // 🚀 悬浮按钮完美拖拽与点击兼容处理
            // ==========================================
            let isDraggingFab = false, fabMoved = false;
            let fabStartX, fabStartY, fabOrigLeft, fabOrigBottom;

            // 禁止图片和按钮的原生拖拽干扰
            this.$fabBtn.find('img').on('dragstart', (e) => e.preventDefault());

            const onFabStart = function(e) {
                isDraggingFab = true;
                fabMoved = false;
                const ev = e.type.startsWith('touch') ? e.touches[0] : e;
                fabStartX = ev.clientX;
                fabStartY = ev.clientY;
                const $cont = self.$fabContainer;
                fabOrigLeft = parseInt($cont.css('left')) || 28;
                fabOrigBottom = parseInt($cont.css('bottom')) || 32;
            };

            this._onFabMove = function(e) {
                if (!isDraggingFab) return;
                const ev = e.type.startsWith('touch') ? e.touches[0] : e;
                const dx = ev.clientX - fabStartX;
                const dy = fabStartY - ev.clientY; // 往上拖拽时 clientY 减小，dy 增大，符合 bottom 逻辑

                // 设立轻微滤波阈值，防抖防误触
                if (Math.abs(dx) > 4 || Math.abs(dy) > 4) {
                    fabMoved = true;
                }

                if (fabMoved) {
                    if (e.cancelable) e.preventDefault(); // 阻断拖拽移动时移动端网页背景的同步滚动
                    const newLeft = Math.max(8, Math.min(window.innerWidth - 72, fabOrigLeft + dx));
                    const newBottom = Math.max(8, Math.min(window.innerHeight - 72, fabOrigBottom + dy));
                    self.$fabContainer.css({ left: newLeft + 'px', bottom: newBottom + 'px' });
                }
            };

            this._onFabEnd = function() {
                isDraggingFab = false;
            };

            // 使用原生绑定加 { passive: false / true } 确保高版本 Mobile 浏览器手势不卡顿且能完美 preventDefault
            const fabBtnEl = this.$fabBtn[0];
            if (fabBtnEl) {
                fabBtnEl.addEventListener('mousedown', onFabStart);
                fabBtnEl.addEventListener('touchstart', onFabStart, { passive: true });
            }

            document.addEventListener('mousemove', this._onFabMove);
            document.addEventListener('touchmove', this._onFabMove, { passive: false });
            document.addEventListener('mouseup', this._onFabEnd);
            document.addEventListener('touchend', this._onFabEnd);

            // 统一的单点击逻辑响应（完美过滤拖拽完毕的手势）
            this.$fabBtn.on('click', function() {
                if (fabMoved) return;
                self._showPanel();
            });

            this.$closeBtn.on('click', (e) => { e.stopPropagation(); self._hidePanel(); });
            this.$overlay.on('click', () => self._hidePanel());

            this.$playBtn.on('click', () => {
                const ap = self._getAPlayer();
                if (ap) ap.toggle();
            });

            self._updateNavButtons();

            this.$shuffleBtn.on('click', () => {
                const ap = self._getAPlayer();
                if (!ap || !ap.list || ap.list.audios.length <= 1) return;
                const list = ap.list;
                const currentIndex = list.index;
                let randomIndex;
                do {
                    randomIndex = Math.floor(Math.random() * list.audios.length);
                } while (randomIndex === currentIndex && list.audios.length > 1);
                list.switch(randomIndex);
                ap.play();
            });

            this.$lrcBtn.on('click', () => {
                self.showLrc = !self.showLrc;
                self._updateLrcVisibility();
            });

            // 进度条拖拽
            // 进度条拖拽
            let isDragging = false;
            let dragRatio = 0; // 💡 新增：用内存变量保存进度比例，速度更快

            this.$progressBar.on('mousedown touchstart', function(e) {
                isDragging = true;
                self._isSeeking = true;
                const ap = self._getAPlayer();
                const ev = e.type === 'touchstart' ? e.touches[0] : e;
                if (ap && ap.audio.duration) {
                    const rect = this.getBoundingClientRect();
                    dragRatio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                    self.$progressFill.css('width', (dragRatio * 100) + '%');
                    self.$currentTime.text(self._formatTime(dragRatio * ap.audio.duration));
                }
                e.preventDefault();
            });

            $(document).on('mousemove.musicfab touchmove.musicfab', function(e) {
                if (!isDragging) return;
                const ap = self._getAPlayer();
                const ev = e.type === 'touchmove' ? e.touches[0] : e;
                if (ap && ap.audio.duration) {
                    const rect = self.$progressBar[0].getBoundingClientRect();
                    dragRatio = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
                    self.$progressFill.css('width', (dragRatio * 100) + '%');
                    self.$currentTime.text(self._formatTime(dragRatio * ap.audio.duration));
                }
            });

            $(document).on('mouseup.musicfab touchend.musicfab', function() {
                if (!isDragging) return;
                isDragging = false;
                const ap = self._getAPlayer();
                if (ap && ap.audio.duration) {
                    // 💡 核心修复：直接使用刚刚记录在内存里的 dragRatio 去跳转！
                    ap.seek(dragRatio * ap.audio.duration);
                }
                setTimeout(function() { self._isSeeking = false; }, 400);
            });

            this.$modeBtn.on('click', () => {
                const modes = ['list', 'shuffle', 'single'];
                const icons = { list: ICONS.list, shuffle: ICONS.shuffle, single: ICONS.single };
                const titles = { list: '顺序播放', shuffle: '随机播放', single: '单曲循环' };
                const currentIdx = modes.indexOf(self.playMode);
                const nextIdx = (currentIdx + 1) % modes.length;
                self.playMode = modes[nextIdx];
                self.$modeBtn.html(icons[self.playMode]);
                self.$modeBtn.attr('title', titles[self.playMode]);
                if (self.playMode === 'list') self.$modeBtn.removeClass('active');
                else self.$modeBtn.addClass('active');
                self._updateNavButtons();
                const ap = self._getAPlayer();
                if (ap) {
                    if (self.playMode === 'single') { ap.options.loop = 'one'; ap.options.order = 'list'; }
                    else if (self.playMode === 'shuffle') { ap.options.loop = 'all'; ap.options.order = 'random'; }
                    else { ap.options.loop = 'all'; ap.options.order = 'list'; }
                }
            });

            this.$playlist.on('scroll', () => { self._checkLazyLoad(); });
            $(document).on('keydown.musicfab', (e) => {
                if (e.key === 'Escape' && self.panelVisible) self._hidePanel();
            });
        }

        _getAPlayer() {
            if (window._statusMusicPlayer && typeof window._statusMusicPlayer.getAPlayer === 'function') {
                const ap = window._statusMusicPlayer.getAPlayer();
                if (ap && ap.audio) return ap;
            }
            return null;
        }

        _updateNavButtons() {
            const self = this;
            this.$prevBtn.off('click');
            this.$nextBtn.off('click');

            // 上一首
            this.$prevBtn.on('click', () => {
                const ap = self._getAPlayer();
                if (!ap || !ap.list || ap.list.audios.length <= 1) return;
                let index;
                if (self.playMode === 'shuffle') {
                    index = Math.floor(Math.random() * ap.list.audios.length);
                    if (index === ap.list.index && ap.list.audios.length > 1) {
                        index = (index + 1) % ap.list.audios.length;
                    }
                } else {
                    index = ap.list.index - 1;
                    if (index < 0) index = ap.list.audios.length - 1;
                }
                ap.list.switch(index);
                ap.play();
            });

            // 下一首
            this.$nextBtn.on('click', () => {
                const ap = self._getAPlayer();
                if (!ap || !ap.list || ap.list.audios.length <= 1) return;
                let index;
                if (self.playMode === 'shuffle') {
                    index = Math.floor(Math.random() * ap.list.audios.length);
                    if (index === ap.list.index && ap.list.audios.length > 1) {
                        index = (index + 1) % ap.list.audios.length;
                    }
                } else {
                    index = ap.list.index + 1;
                    if (index >= ap.list.audios.length) index = 0;
                }
                ap.list.switch(index);
                ap.play();
            });
        }

_getMusicSource() {
    const ap = this._getAPlayer();
    if (!ap) return { server: '', type: '' };
    
    const currentAudio = ap.list.audios[ap.list.index];
    const url = currentAudio?.url || '';
    
    // 优先用当前歌曲 url 判断
    if (url.includes('126.net') || url.includes('163.com')) {
        return { server: '网易云', type: ap.list.audios.length > 1 ? '歌单' : '单曲' };
    }
    if (url.includes('qq.com') || url.includes('qpic.cn') || url.includes('tencent')) {
        return { server: 'QQ音乐', type: ap.list.audios.length > 1 ? '歌单' : '单曲' };
    }
    
    // 降级用 _currentLink
    const link = window._statusMusicPlayer._currentLink || '';
    if (link.includes('music.163.com') || link.includes('163.com')) {
        return { server: '网易云', type: ap.list.audios.length > 1 ? '歌单' : '单曲' };
    }
    if (link.includes('y.qq.com') || link.includes('qq.com')) {
        return { server: 'QQ音乐', type: ap.list.audios.length > 1 ? '歌单' : '单曲' };
    }
    
    return { server: '', type: '' };
}

        /* ========== 面板显隐 ========== */
        _showPanel() {
            this.panelVisible = true;
            $('body').addClass('music-scroll-locked');
            this.$overlay.addClass('active');
            this.$panel.addClass('active');
            this._refreshPlaylistData();
            this._updateLrcVisibility();
                const src = this._getMusicSource();
    this._cachedSourceTitle = src.server ? `${ICONS.music} 音乐播放器 - ${src.server} ${src.type}` : `${ICONS.music} 音乐播放器`;
            this._updatePanelFromAPlayer(true);
            this._startProgressTimer();

            // ==========================================
            // 🔒 全平台背景滚动锁定（已完美修复花括号嵌套）
            // ==========================================
            // 1. 针对 PC 端和 Android (CSS 辅助锁类)
            $('body').addClass('music-scroll-locked');

            // 2. 针对 iOS / iPadOS (JS 硬件级手势拦截锁)
            if (!this._scrollLockHandler) {
                this._scrollLockHandler = function(e) {
                    // 💡 核心逻辑：如果滑动发生的节点并不在我们的播放器根容器内部，就直接拦截并干掉它
                    // 这样背景网页就无法被拖扯挪动，但播放器内部的歌词、歌曲列表依然保持自由丝滑的随心滚动
                    if (!$(e.target).closest('#music-fab-root').length) {
                        if (e.cancelable) e.preventDefault();
                    }
                };
            }
            // 挂载全局触控拦截器
            document.addEventListener('touchmove', this._scrollLockHandler, { passive: false });
        }

        _hidePanel() {
            this.panelVisible = false;
            $('body').removeClass('music-scroll-locked');
            this.$overlay.removeClass('active');
            this.$panel.removeClass('active');
            this._stopProgressTimer();
            this._stopLrcTimer();
            
            // ==========================================
            // 🔓 解除滚动锁定，还给整个网页完全自由
            // ==========================================
            // 1. 移除 PC/Android 的锁类
            $('body').removeClass('music-scroll-locked');

            // 2. 移除全局触摸硬件层拦截器
            if (this._scrollLockHandler) {
                document.removeEventListener('touchmove', this._scrollLockHandler, { passive: false });
            }
        }

        /* ========== 歌词 ========== */
_updateLrcVisibility() {
    if (this.showLrc) {
        this.$panelCover.hide();
        this.$panelInfo.addClass('hidden');
        this.$panelLrc.addClass('show');
        this.$lrcBtn.addClass('active');
        
        // ✅ 先停止旧定时器，清空旧歌词
        this._stopLrcTimer();
        this.lrcLines = [];
        
        // 立即尝试解析
        this._parseCurrentLrc();
        
        // 如果解析失败，设置重试（和上面类似的逻辑）
        if (this.lrcLines.length === 0) {
            this.$lrcInner.html('<span class="lrc-line">♪ 歌词加载中...</span>');
            this._retryLoadLrc();
        } else {
            this._startLrcTimer();
        }
    } else {
        this.$panelCover.show();
        this.$panelInfo.removeClass('hidden');
        this.$panelLrc.removeClass('show');
        this.$lrcBtn.removeClass('active');
        this._stopLrcTimer();
    }
}

// ✅ 新增独立的歌词重试方法
// ✅ 独立的歌词重试方法（保持不变，已经很好了）
_retryLoadLrc() {
    clearTimeout(this._lrcRetryTimer);
    const self = this;
    let retryCount = 0;
    const maxRetries = 8;
    
    const tryLoadLrc = () => {
        retryCount++;
        const ap = self._getAPlayer();
        if (!ap) {
            if (retryCount < maxRetries) {
                self._lrcRetryTimer = setTimeout(tryLoadLrc, 300);
            }
            return;
        }
        
        const audio = ap.list.audios[ap.list.index];
        if (audio && audio.lrc && typeof audio.lrc === 'string' && audio.lrc.trim() !== '') {
            const lrcContent = audio.lrc.trim();
            if (!lrcContent.startsWith('http') && lrcContent.includes('[')) {
                self._parseCurrentLrc();
                if (self.lrcLines.length > 0) return;
            }
        }
        
        if (retryCount < maxRetries) {
            const delay = Math.min(200 + retryCount * 100, 800);
            self._lrcRetryTimer = setTimeout(tryLoadLrc, delay);
        } else {
            self.$lrcInner.html('<span class="lrc-line">♪ 暂无歌词</span>');
        }
    };
    
    this._lrcRetryTimer = setTimeout(tryLoadLrc, 300);
}

_parseCurrentLrc() {
    const ap = this._getAPlayer();
    if (!ap) return;
    const currentIndex = ap.list.index;
    const currentAudio = ap.list.audios[currentIndex] || {};
    const rawLrc = currentAudio.lrc || '';

    if (!rawLrc || rawLrc.startsWith('http') || rawLrc.trim() === '') {
        this.lrcLines = [];
        this.$lrcInner.html('<span class="lrc-line">♪ 纯音乐，请欣赏</span>');
        return;
    }

    const lines = [];
    rawLrc.split('\n').forEach(line => {
        const match = line.match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
        if (match) {
            const time = parseInt(match[1]) * 60 + parseFloat(match[2]);
            const text = match[3].trim();
            if (text) lines.push({ time, text });
        }
    });

    this.lrcLines = lines.length > 0 ? lines : [];
    if (this.lrcLines.length === 0) {
        this.$lrcInner.html('<span class="lrc-line">♪ 纯音乐，请欣赏</span>');
        return;
    }
    
    // ✅ 立即根据当前播放位置渲染歌词
    const currentTime = ap.audio.currentTime || 0;
    let activeIndex = -1;
    for (let i = 0; i < this.lrcLines.length; i++) {
        if (this.lrcLines[i].time <= currentTime) activeIndex = i;
        else break;
    }
    this._renderLrc(activeIndex);
    
    // ✅ 重新启动歌词定时器
    if (this.showLrc) {
        this._startLrcTimer();
    }
}

        _renderLrc(activeIndex) {
            if (this.lrcLines.length === 0) {
                this.$lrcInner.html('<span class="lrc-line">♪ 纯音乐，请欣赏</span>');
                return;
            }
            const total = this.lrcLines.length;
            const startIdx = Math.max(0, activeIndex - 3);
            const endIdx = Math.min(total - 1, activeIndex + 3);
            let html = '';
            for (let i = startIdx; i <= endIdx; i++) {
                const opacity = Math.max(0.15, 1 - Math.abs(i - activeIndex) * 0.25);
                const isActive = i === activeIndex;
                html += `<span class="lrc-line${isActive ? ' active' : ''}" style="opacity:${opacity}">${this._escapeHTML(this.lrcLines[i].text)}</span>`;
            }
            this.$lrcInner.html(html);
        }

        _startLrcTimer() {
            this._stopLrcTimer();
            const self = this;
            this._lastActiveLrcIndex = -1; // 新增状态记录
            
            this.lrcTimer = setInterval(() => {
                const ap = self._getAPlayer();
                if (!ap || ap.audio.paused || !self.showLrc || self.lrcLines.length === 0) return;
                const currentTime = ap.audio.currentTime;
                let activeIndex = -1;
                for (let i = 0; i < self.lrcLines.length; i++) {
                    if (self.lrcLines[i].time <= currentTime) activeIndex = i;
                    else break;
                }
                
                // 💡 核心修复：只有当歌词行数真的发生变化时，才去触发昂贵的 DOM 重绘
                if (activeIndex !== self._lastActiveLrcIndex) {
                    self._lastActiveLrcIndex = activeIndex;
                    self._renderLrc(activeIndex);
                }
            }, 150);
        }

        _stopLrcTimer() {
            if (this.lrcTimer) { clearInterval(this.lrcTimer); this.lrcTimer = null; }
        }

        /* ========== 集中管理构建歌单项 (DRY) ========== */
_createPlaylistItem(audio, index, currentIndex) {
    const self = this;
    const isActive = index === currentIndex;
    const $item = $(`
        <div class="music-playlist-item${isActive ? ' active' : ''}" data-index="${index}">
            <span class="music-playlist-index">${isActive ? '🎵' : (index + 1)}</span>
            <div class="music-playlist-info">
                <div class="music-playlist-name">${self._escapeHTML(audio.name || '未知')}</div>
                <div class="music-playlist-artist">${self._escapeHTML(audio.artist || '')}</div>
            </div>
        </div>
    `);
    
    $item.on('click', function() {
        const idx = parseInt($(this).data('index'));
        const ap = self._getAPlayer();
        if (ap) {
            if (ap.list.index === idx) {
                // 当前正在播放的歌曲，不做任何操作
                return;
            }
            ap.list.switch(idx);
            ap.play();
            
            // ✅ 切换歌曲后立即处理歌词
            if (self.showLrc) {
                self.lrcLines = [];
                self._stopLrcTimer();
                self._parseCurrentLrc();
                if (self.lrcLines.length === 0) {
                    self.$lrcInner.html('<span class="lrc-line">♪ 歌词加载中...</span>');
                    self._retryLoadLrc();
                }
            }
            
            const source = self._getMusicSource();
            self._cachedSourceTitle = source.server ? `${ICONS.music} 音乐播放器 - ${source.server}${source.type}` : `${ICONS.music} 音乐播放器`;
            const $title = self.$panel.find('.music-panel-title');
            if ($title.html() !== self._cachedSourceTitle) $title.html(self._cachedSourceTitle);
            self._highlightPlaylistItem(idx);
            self._scrollToPlaylistItem(idx);
        }
    });
    return $item;
}

        /* ========== 懒加载歌单 ========== */
        _refreshPlaylistData() {
            const ap = this._getAPlayer();
            if (!ap || !ap.list || !ap.list.audios.length) {
                this.allAudios = [];
                this.renderedCount = 0;
                this.$playlist.html('<div style="text-align:center;padding:24px;color:var(--color-text-secondary);font-size:0.8rem;">暂无歌曲</div>');
                this.$shuffleBtn.hide();
                return;
            }
            this.allAudios = ap.list.audios;
            this.renderedCount = 0;
            this.isLoadingMore = false;
            this.$playlist.empty();
            this._renderBatch();
            this.$shuffleBtn.css('visibility', this.allAudios.length > 1 ? 'visible' : 'hidden');
        }

        _renderBatch() {
            const total = this.allAudios.length;
            const end = Math.min(this.renderedCount + this.PAGE_SIZE, total);
            const currentIndex = this._getAPlayer() ? this._getAPlayer().list.index : -1;

            for (let i = this.renderedCount; i < end; i++) {
                this.$playlist.append(this._createPlaylistItem(this.allAudios[i], i, currentIndex));
            }

            this.renderedCount = end;
            if (this.renderedCount < total) {
                this.$playlist.append('<div class="music-playlist-loading" id="musicLoadMore">滚动加载更多...</div>');
            } else {
                $('#musicLoadMore').remove();
            }
        }

        _checkLazyLoad() {
            if (this.isLoadingMore || this.renderedCount >= this.allAudios.length) return;
            const $scroll = this.$playlist;
            if ($scroll.scrollTop() + $scroll.innerHeight() >= $scroll[0].scrollHeight - 40) {
                this.isLoadingMore = true;
                $('#musicLoadMore').text('加载中...');
                setTimeout(() => {
                    this._renderMore();
                    this.isLoadingMore = false;
                }, 150);
            }
        }

        _renderMore() {
            const total = this.allAudios.length;
            const end = Math.min(this.renderedCount + this.LOAD_MORE, total);
            const currentIndex = this._getAPlayer() ? this._getAPlayer().list.index : -1;

            $('#musicLoadMore').remove();
            for (let i = this.renderedCount; i < end; i++) {
                this.$playlist.append(this._createPlaylistItem(this.allAudios[i], i, currentIndex));
            }

            this.renderedCount = end;
            if (this.renderedCount < total) {
                this.$playlist.append('<div class="music-playlist-loading" id="musicLoadMore">滚动加载更多...</div>');
            }
        }

        _highlightPlaylistItem(index) {
            const $prev = this.$playlist.find('.music-playlist-item.active');
            if ($prev.length) {
                const prevIdx = parseInt($prev.attr('data-index'));
                $prev.removeClass('active').find('.music-playlist-index').text(prevIdx + 1);
            }
            const $curr = this.$playlist.find(`.music-playlist-item[data-index="${index}"]`);
            if ($curr.length && !$curr.hasClass('active')) {
                $curr.addClass('active').find('.music-playlist-index').text('🎵');
            }
        }

        _scrollToPlaylistItem(index) {
            const $item = this.$playlist.find(`.music-playlist-item[data-index="${index}"]`);
            if ($item.length) {
                $item[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }

        /* ========== Watchdog ========== */
        _startWatcher() {
            const self = this;
            this.watcherInterval = setInterval(() => self._syncAPlayerState(), 400);
        }

        _ensureItemRendered(index) {
            if (index < this.renderedCount) return;
            let target = this.renderedCount;
            while (target <= index) { target += this.LOAD_MORE; }
            const end = Math.min(target, this.allAudios.length);
            const currentIndex = this._getAPlayer() ? this._getAPlayer().list.index : -1;
            
            for (let i = this.renderedCount; i < end; i++) {
                this.$playlist.append(this._createPlaylistItem(this.allAudios[i], i, currentIndex));
            }
            this.renderedCount = end;
            $('#musicLoadMore').remove();
            if (this.renderedCount < this.allAudios.length) {
                this.$playlist.append('<div class="music-playlist-loading" id="musicLoadMore">滚动加载更多...</div>');
            }
        }

_syncAPlayerState() {
    const ap = this._getAPlayer();
    if (!ap) {
        this.$fabContainer.removeClass('visible');
        this.$fabBtn.removeClass('playing');
        this.$panelCover.removeClass('playing');
        return;
    }

    const isPlaying = !ap.audio.paused;
    const currentIndex = ap.list.index;
    const currentAudio = ap.list.audios[currentIndex];

    this.$fabContainer.addClass('visible');

    if (isPlaying) {
        this.$fabBtn.addClass('playing');
    } else {
        this.$fabBtn.removeClass('playing');
    }
    const tipText = currentAudio?.name || '音乐播放器';
    const $tip = this.$fabBtn.find('.music-fab-tooltip');
    if ($tip.text() !== tipText) $tip.text(tipText);

    // 切歌状态强制一致性判定
    if (currentIndex !== this.lastIndex) {
        this.lastIndex = currentIndex;
        
        // 👉 确保 APlayer 核心配置状态与当前 UI 循环模式强一致
        if (ap) {
            if (this.playMode === 'single') {
                ap.options.loop = 'one';
                ap.options.order = 'list';
            } else if (this.playMode === 'shuffle') {
                ap.options.loop = 'all';
                ap.options.order = 'random';
            } else {
                ap.options.loop = 'all';
                ap.options.order = 'list';
            }
        }

        if (currentAudio && currentAudio.cover) {
            this.$fabCover.attr('src', currentAudio.cover);
        }

        const source = this._getMusicSource();
        this._cachedSourceTitle = source.server ? `${ICONS.music} 音乐播放器 - ${source.server} ${source.type}` : `${ICONS.music} 音乐播放器`;

        // VIP 歌曲 30 秒试听提示机制
        // 💡 1. 切歌时重置 VIP 弹窗标记，去掉慢吞吞的 800ms 定时器
        this._currentSongVipToasted = false;

        if (this.panelVisible) {
            this._ensureItemRendered(currentIndex);
            this._highlightPlaylistItem(currentIndex);
            this._scrollToPlaylistItem(currentIndex);
            
            // ✅ 统一处理歌词加载
            if (this.showLrc) {
                this.lrcLines = [];
                this._stopLrcTimer();
                this._parseCurrentLrc();
                
                if (this.lrcLines.length === 0) {
                    this.$lrcInner.html('<span class="lrc-line">♪ 歌词加载中...</span>');
                    this._retryLoadLrc();
                }
            }
        }
    } else if (currentAudio && currentAudio.cover) {
        if (this.$fabCover.attr('src') !== currentAudio.cover) {
            this.$fabCover.attr('src', currentAudio.cover);
        }
    }
    // 💡 2. 极速 VIP 判定：依托 400ms 的状态轮询，只要时长数据一就绪，立刻触发，不再死等！
    if (!this._currentSongVipToasted && ap && ap.audio && ap.audio.duration) {
        const dur = ap.audio.duration;
        if ((dur >= 28 && dur <= 35) || (dur >= 43 && dur <= 47)) {
            this._showVIPToast();
            this._currentSongVipToasted = true; // 标记已弹过
        } else if (dur > 0) {
            this._currentSongVipToasted = true; // 普通歌曲加载出时长了，也标记一下，免得一直测
        }
    }
    if (this.panelVisible && !this._isSeeking) {
        this._updatePanelFromAPlayer(false);
    }
}

_showVIPToast() {
    let container = document.getElementById('music-toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'music-toast-container';
        document.body.appendChild(container);
    }

    // 💡 3. 核心突破：瞬间移除残留的旧 VIP 提示，绝不排队等待！
    const oldVipToasts = container.querySelectorAll('.music-vip-toast');
    oldVipToasts.forEach(t => t.remove());

    const toast = document.createElement('div');
    // 加上专属的 music-vip-toast 类名以便精准定点清除
    toast.className = 'music-toast-notice music-vip-toast';
    toast.innerHTML = `
        <span style="color:#ff9800;font-size:1.1rem;flex-shrink:0;">🎵</span>
        <span style="flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-weight:600;color:#ff9800;">VIP歌曲，30秒试听</span>
    `;

    container.appendChild(toast);

    // 强制重绘后触发进场动画
    toast.offsetHeight;
    toast.classList.add('active');

    // 3 秒后优雅离场
    setTimeout(() => {
        if (toast.classList.contains('fade-out')) return;
        toast.classList.remove('active');
        toast.classList.add('fade-out');
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 350);
    }, 3000);
}

        _updatePanelFromAPlayer(force) {
            const ap = this._getAPlayer();
            if (!ap) return;

            const isPlaying = !ap.audio.paused;
            const currentIndex = ap.list.index;
            const currentAudio = ap.list.audios[currentIndex] || {};

            if (currentAudio.cover) {
                if (force || this.$panelCoverImg.attr('src') !== currentAudio.cover) {
                    this.$panelCoverImg.attr('src', currentAudio.cover);
                }
            }

            const $title = this.$panel.find('.music-panel-title');
            if ($title.html() !== this._cachedSourceTitle) {
                $title.html(this._cachedSourceTitle);
            }

            const rawName = currentAudio.name || '未知歌曲';
            const dur = ap.audio.duration || 0;
            const isVIP = (dur >= 28 && dur <= 35) || (dur >= 43 && dur <= 47);
            const newName = isVIP ? rawName + ' <span class="music-vip-badge">VIP</span>' : rawName;

            if (this._lastName !== newName) {
                this._lastName = newName;
                this.$name.html(newName);
            }

            if (isVIP) {
                this.$progressFill.addClass('vip-blinking');
            } else {
                this.$progressFill.removeClass('vip-blinking');
            }

            const newArtist = currentAudio.artist || '未知歌手';
            if (this._lastArtist !== newArtist) {
                this._lastArtist = newArtist;
                this.$artist.text(newArtist);
            }

            const newIcon = isPlaying ? 'pause' : 'play';
            if (this._lastIcon !== newIcon) {
                this._lastIcon = newIcon;
                this.$playBtn.html(ICONS[newIcon]);
            }

            const currentTime = ap.audio.currentTime || 0;
            const duration = ap.audio.duration || 0;

        }

        _formatTime(seconds) {
            if (!seconds || isNaN(seconds)) return '00:00';
            const m = Math.floor(seconds / 60);
            const s = Math.floor(seconds % 60);
            return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
        }

_startProgressTimer() {
    this._stopProgressTimer();
    const self = this;
    this.progressTimer = setInterval(() => {
        if (self._isSeeking) return;
        const ap = self._getAPlayer();
        if (!ap || ap.audio.paused) return;
        const ct = ap.audio.currentTime || 0;
        const dur = ap.audio.duration || 0;
        self.$currentTime.text(self._formatTime(ct));
        self.$duration.text(self._formatTime(dur));  // ← 加这行
        // 替换旧的 css('width', ...)
        if (dur > 0) self.$progressFill.css('width', (ct / dur * 100) + '%');
    }, 200);
}

        _stopProgressTimer() {
            if (this.progressTimer) { clearInterval(this.progressTimer); this.progressTimer = null; }
        }

        _escapeHTML(str) {
            const div = document.createElement('div');
            div.textContent = str;
            return div.innerHTML;
        }

        destroy() {
            this._stopProgressTimer();
            this._stopLrcTimer();
            if (this.watcherInterval) clearInterval(this.watcherInterval);
            
            $(document).off('.musicfab');
            
            // 全局 DOM 级绑定安全解绑，杜绝泄漏
            if (this._onFabMove) {
                document.removeEventListener('touchmove', this._onFabMove, { passive: false });
            }
            if (this._scrollLockHandler) {
                document.removeEventListener('touchmove', this._scrollLockHandler, { passive: false });
            }
            
            $('#music-fab-root').remove();
        }
    }

    $(function() {
        if (!window._musicFAB) {
            window._musicFAB = new MusicFABController();
        }
    });

})(jQuery);