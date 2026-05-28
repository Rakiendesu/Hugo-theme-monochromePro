(function($) {
        'use strict';

        //评论气泡图标
        const ICON_COMMENT = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
        // 移动设备关键词（中英文全量）
        const MOBILE_DEVICE_KEYWORDS = [
            'iphone', 'ipad', 'android',
            '黑鲨', 'black shark',
            '谷歌', 'google', 'pixel',
            '荣耀', 'honor',
            '华为', 'huawei',
            '魅族', 'meizu',
            '小米', 'xiaomi', 'mi',
            '红米', 'redmi',
            '一加', 'oneplus',
            'oppo', 'vivo',
            '真我', 'realme',
            '三星', 'samsung', 'galaxy',
            '坚果', 'smartisan',
            '索尼', 'sony', 'xperia'
        ];
        class StatusManager {
            constructor() {
                this.baseUrl = window.STATUS_API_URL;
                this.dataUrl = this.baseUrl + '?t=' + Date.now();
                this.allStatuses = [];
                this.filteredStatuses = [];
                this.currentIndex = 0;
                this.pageSize = 6;
                this.isLoading = false;
                this.initialLoadComplete = false;
                this.currentFilters = {
                    year: 'all',
                    month: 'all',
                    location: 'all'
                };
                this.map = null;
                this.markerCluster = null;
                this.markersMap = {};
                this.$grid = null;
                this.msnry = null;
                // 💡 新增：专门用来锁死歌词高频重绘的变量
                this.lastActiveIndex = -1; 
                
                this.init();
            }

            async init() {
                try {
                    const response = await fetch(this.dataUrl);
                    const data = await response.json();
                    this.allStatuses = (data.statuses || []).sort((a, b) => {
                        const pa = a.pinned || 0;
                        const pb = b.pinned || 0;
                        // 都有置顶：权重小的排前面
                        if (pa > 0 && pb > 0) return pa - pb;
                        // 一个有置顶一个没有：有置顶的排前面
                        if (pa > 0) return -1;
                        if (pb > 0) return 1;
                        // 都没有置顶：按日期倒序
                        return new Date(b.date) - new Date(a.date);
                    });
                    this.filteredStatuses = [...this.allStatuses];

                    this.initMasonry();
                    this.initFilters();
                    this.renderFirstBatch();
                    this.finalizeInit();
                    setTimeout(() => this.initMap(this.allStatuses), 300);

                    this.initialLoadComplete = true;

                    this.$grid.imagesLoaded(() => {
                        if (this.msnry) this.msnry.layout();
                    });

                     // 预加载评论数
                    this.loadCommentCounts();
                    // 定位到某卡片
                    this.checkHashAndScroll();
                    // 预加载音乐信息
                    this.preloadMusicInfo();
                    this.bindEvents();
                    this.initFancybox();

                } catch (error) {
                    // 👇 替换为如下高颜值内联样式的错误提示
                    $('#status-list').html(`
                    <div style="
                        max-width: 400px;
                        margin: 40px auto;
                        padding: 24px 20px;
                        background: var(--color-background-card, #ffffff);
                        border: 1px solid rgba(255, 152, 0, 0.2);
                        box-shadow: 0 4px 16px rgba(0,0,0,0.04);
                        border-radius: 12px;
                        text-align: center;
                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
                    ">
                  
                        <div style="
                            font-size: 1rem;
                            font-weight: 600;
                            color: var(--color-text, #333333);
                            margin-bottom: 6px;
                        ">动态加载失败...</div>
                        
                        <div style="
                            font-size: 0.85rem;
                            color: var(--color-text-secondary, #777777);
                            line-height: 1.5;
                        ">可能被博主吃了<br>刷新页面试一下吧</div>
                    </div>
                `);
                }
            }

            initMasonry() {
                this.$grid = $('#status-list');
                if (!$('.gutter-sizer').length) {
                    this.$grid.prepend('<div class="gutter-sizer"></div>');
                }
            }


            initFancybox() {
                if (typeof Fancybox !== "undefined") {
                    Fancybox.bind('[data-fancybox^="gallery-"]', {
                        hideScrollbar: false,
                        lockScroll: false,
                        touch: false,
                        Hash: false, // 🚫 关键修复：禁止 Fancybox 修改浏览器 URL，彻底解决 favicon 重新加载的问题
                        transitionDuration: 200,
                        Carousel: {
                            Thumbs: true,
                            Toolbar: {
                                display: {
                                    left: [],
                                    middle: [],
                                    right: ["download"],
                                },
                            },
                            Zoomable: {
                                Panzoom: {
                                    maxScale: "cover",
                                    panMode: "mousemove",
                                    mouseMoveFactor: 1.1,
                                    friction: 0.9
                                },
                            },
                        },
                    });
                }
            }


            finalizeInit() {
                const self = this;

                this.msnry = this.$grid.masonry({
                    itemSelector: '.status-item',
                    columnWidth: '.grid-sizer',
                    gutter: '.gutter-sizer',
                    percentPosition: true,
                    transitionDuration: '0.3s',
                    stagger: 30,
                    hiddenStyle: {
                        opacity: 0,
                        transform: 'translateY(20px)'
                    },
                    visibleStyle: {
                        opacity: 1,
                        transform: 'translateY(0)'
                    }
                }).data('masonry');

                const $items = this.$grid.find('.status-item');
                $items.each(function(index) {
                    const $this = $(this);
                    setTimeout(() => {
                        $this.addClass('is-shown');
                    }, index * 80);
                });

                this.currentIndex = this.pageSize;

                this.$grid.find('.status-images a').each(function() {
                    self.bindImageLoad($(this));
                });


                if (this.currentIndex >= this.filteredStatuses.length) {
                    $('#load-more-btn').text('🎉 已经到底啦').prop('disabled', true).show();
                } else {
                    $('#load-more-btn').text('📜 上滑加载更多').prop('disabled', false).show();
                }

                // ✅ 筛选弹窗事件
                $('#filterToggle').on('click', function(e) {
                    e.stopPropagation();
                    $('#filterModal').addClass('show');
                });
                $('#filterModalClose').on('click', function() {
                    $('#filterModal').removeClass('show');
                });
                $('#filterModal').on('click', function(e) {
                    if (e.target === this) $(this).removeClass('show');
                });

            }

            renderFirstBatch() {
                const firstBatch = this.filteredStatuses.slice(0, this.pageSize);
                const $fragment = $(document.createDocumentFragment());

                $.each(firstBatch, (i, status) => {
                    const $item = this.createStatusElement(status);
                    $fragment.append($item);
                });

                this.$grid.append($fragment);
                this.currentIndex = this.pageSize;
            }

            bindEvents() {
                const self = this;

                let scrollTimer;
                $(window).on('scroll', () => {
                    if (scrollTimer) clearTimeout(scrollTimer);
                    scrollTimer = setTimeout(() => {
                        if (!self.initialLoadComplete) return;
                        if (!self.isLoading && self.isNearBottom()) {
                            self.render();
                        }
                    }, 150);
                });

                let resizeTimer;
                $(window).on('resize', () => {
                    if (resizeTimer) clearTimeout(resizeTimer);
                    self.$grid.find('.status-item').css('transition', 'none');
                    if (self.msnry) self.msnry.layout();
                    resizeTimer = setTimeout(() => {
                        self.$grid.find('.status-item').css('transition', '');
                        if (self.msnry) self.msnry.layout();
                    }, 500);
                });

                $(document).on('click', (e) => {
                    if (!$(e.target).closest('.custom-select-wrapper').length) {
                        $('.custom-select-wrapper').removeClass('open');
                    }
                });

                $('#load-more-btn').on('click', function() {
                    if ($(this).prop('disabled')) return;
                    if (!self.initialLoadComplete) return;
                    if (!self.isLoading) self.render();
                });

                // ============重置筛选==========
                $('#refreshBtn').on('click', function() {
                    // 重置筛选
                    self.currentFilters = {
                        year: 'all',
                        month: 'all',
                        location: 'all'
                    };

                    // 重置下拉框显示
                    $('#filter-year .select-trigger').text('年份');
                    $('#filter-month .select-trigger').text('月份');
                    $('#filter-location .select-trigger').text('地点');

                    // 重新应用筛选（恢复全部数据）
                    self.applyFilters();

                    // 地图回到初始视角
                    if (self.map) {
                        self.map.setView([37.87, 112.55], 3);
                    }
                });

            }

            isNearBottom() {
                const scrollTop = $(window).scrollTop();
                const windowHeight = $(window).height();
                const documentHeight = $(document).height();
                return scrollTop + windowHeight >= documentHeight - 300;
            }

            initFilters() {
                const years = new Set(),
                    months = new Set(),
                    locations = new Set();

                $.each(this.allStatuses, (i, s) => {
                    const date = new Date(s.date);
                    if (!isNaN(date)) {
                        years.add(date.getFullYear());
                        months.add(date.getMonth() + 1);
                    }
                    if (s.location) {
                        const locKey = s.location.split(' · ').pop().trim();
                        if (locKey) locations.add(locKey);
                    }
                });

                this.buildCustomSelect('filter-year', years, '年份', 'year', (a, b) => b - a);
                this.buildCustomSelect('filter-month', months, '月份', 'month', (a, b) => a - b);
                this.buildCustomSelect('filter-location', locations, '地点', 'location');
            }

            buildCustomSelect(id, items, label, type, sortFn) {
                const $wrapper = $(`#${id}`);
                const self = this;

                let optionsHtml = `<div class="option-item" data-value="all">全部${label}</div>`;
                const sortedItems = Array.from(items).sort(sortFn);
                $.each(sortedItems, (i, val) => {
                    optionsHtml += `<div class="option-item" data-value="${val}">${val}</div>`;
                });

                $wrapper.html(`
                <div class="select-trigger">${label}</div>
                <div class="options-menu">${optionsHtml}</div>
            `);

                $wrapper.find('.select-trigger').on('click', function(e) {
                    e.stopPropagation();
                    const $parent = $(this).parent();
                    const isOpen = $parent.hasClass('open');
                    $('.custom-select-wrapper').removeClass('open');
                    if (!isOpen) $parent.addClass('open');
                });

                $wrapper.find('.option-item').on('click', function() {
                    const val = $(this).data('value');
                    $wrapper.find('.select-trigger').text(val === 'all' ? label : val);
                    $wrapper.removeClass('open');

                    self.currentFilters[type] = val.toString();
                    if (type === 'location') self.syncMapToLocation(val.toString());
                    self.applyFilters();
                });
            }

            syncMapToLocation(locationValue) {
                if (!this.map) return;

                if (locationValue === 'all') {
                    // 不自动拟合，回到初始视角
                    this.map.setView([37.87, 112.55], 3);
                    return;
                }

                const marker = this.markersMap[locationValue];
                if (marker) {
                    this.map.setView(marker.getLatLng(), 10, {
                        animate: true
                    });
                    marker.openPopup();
                }
            }

            selectLocationFilter(locationValue) {
                const $wrapper = $('#filter-location');
                if (!$wrapper.length) return;

                $wrapper.find('.select-trigger').text(locationValue === 'all' ? '地点' : locationValue);
                this.currentFilters.location = locationValue;
                this.syncMapToLocation(locationValue);
                this.applyFilters();
            }

            applyFilters() {
                const {
                    year,
                    month,
                    location
                } = this.currentFilters;

                this.filteredStatuses = [];

                $.each(this.allStatuses, (i, s) => {
                    const date = new Date(s.date);
                    const matchYear = (year === 'all' || date.getFullYear().toString() === year);
                    const matchMonth = (month === 'all' || (date.getMonth() + 1).toString() === month);

                    let matchLoc = true;
                    if (location !== 'all') {
                        const locKey = s.location ? s.location.split(' · ').pop().trim() : '';
                        matchLoc = locKey === location;
                    }

                    if (matchYear && matchMonth && matchLoc) {
                        this.filteredStatuses.push(s);
                    }
                });

                this.currentIndex = 0;
                this.initialLoadComplete = false;

                if (this.msnry) this.msnry.destroy();

                this.$grid.empty().append('<div class="grid-sizer"></div><div class="gutter-sizer"></div>');
                this.renderFirstBatch();

                const self = this;

                this.msnry = this.$grid.masonry({
                    itemSelector: '.status-item',
                    columnWidth: '.grid-sizer',
                    gutter: '.gutter-sizer',
                    percentPosition: true,
                    transitionDuration: '0.3s',
                    stagger: 30,
                    hiddenStyle: {
                        opacity: 0,
                        transform: 'translateY(20px)'
                    },
                    visibleStyle: {
                        opacity: 1,
                        transform: 'translateY(0)'
                    }
                }).data('masonry');

                const $items = this.$grid.find('.status-item');
                $items.each(function(index) {
                    const $this = $(this);
                    setTimeout(() => {
                        $this.addClass('is-shown');
                    }, index * 80);
                });

                this.currentIndex = this.pageSize;

                this.$grid.find('.status-images a').each(function() {
                    self.bindImageLoad($(this));
                });

                if (this.currentIndex >= this.filteredStatuses.length) {
                    $('#load-more-btn').text('🎉 已经到底啦').prop('disabled', true).show();
                } else {
                    $('#load-more-btn').text('📜 上滑加载更多').prop('disabled', false).show(); // ✅ show 而不是 hide
                }

                this.$grid.imagesLoaded(() => {
                    this.initialLoadComplete = true;
                    if (this.msnry) this.msnry.layout();
                    this.preloadMusicInfo(); // ✅ 加这行
                });

                $('html, body').animate({
                    scrollTop: 0
                }, 300);
            }

            initMap(statuses) {
                const self = this;

                if (this.map) {
                    this.map.remove();
                    this.map = null;
                }

                this.map = L.map('status-map', {
                    zoomControl: true,
                    scrollWheelZoom: false,
                    doubleClickZoom: false,
                    touchZoom: false,
                    dragging: false,
                    boxZoom: false,
                    keyboard: false,
                    attributionControl: false
                }).setView([37.87, 112.55], 3);

                L.tileLayer(window.STATUS_MAP_TILE_URL, {
                    attribution: '<img src="https://webapi.amap.com/theme/v2.0/logo@2x.png" style="height:20px; vertical-align:middle;">',
                    maxZoom: 7,
                    minZoom: 3
                }).addTo(this.map);

                this.markerCluster = L.markerClusterGroup({
                    chunkedLoading: true, // 分块加载，性能优化
                    maxClusterRadius: 27, // 聚合半径50像素
                    spiderfyOnMaxZoom: false, // 最大缩放时不展开蜘蛛网效果
                    showCoverageOnHover: true, // 悬停时不显示覆盖范围
                    zoomToBoundsOnClick: true, // 点击聚合点缩放到边界
                    disableClusteringAtZoom: 8, // 缩放级别≥8时禁用聚合
                    iconCreateFunction: function(cluster) {
                        const count = cluster.getChildCount();
                        let size = 'small';
                        if (count > 10) size = 'medium';
                        if (count > 20) size = 'large';

                        return L.divIcon({
                            html: `<div class="cluster-icon cluster-${size}"><span>${count}</span></div>`,
                            className: 'custom-cluster',
                            iconSize: L.point(40, 40)
                        });
                    }
                });

                const groups = {},
                    latLngs = [];

                $.each(statuses, (i, s) => {
                    if (s.coords && s.coords.length === 2) {
                        const k = s.coords.join(',');
                        const locName = s.location ? s.location.split(' · ').pop().trim() : '未知';

                        if (!groups[k]) {
                            groups[k] = {
                                name: s.location || '未知',
                                shortName: locName,
                                count: 0,
                                coords: s.coords
                            };
                            latLngs.push(s.coords);
                        }
                        groups[k].count++;
                    }
                });

                this.markersMap = {};
                const markers = [];

                $.each(groups, (k, group) => {
                    const marker = L.marker(group.coords, {
                        riseOnHover: true
                    }).bindPopup(`<b>${group.name}</b><br>共 ${group.count} 条动态`, {
                        closeButton: false
                    });

                    markers.push(marker);

                    if (group.shortName && group.shortName !== '未知') {
                        this.markersMap[group.shortName] = marker;
                    }

                    marker.on('click', () => {
                        if (group.shortName && group.shortName !== '未知') {
                            self.selectLocationFilter(group.shortName);
                        }
                    });
                });

                this.markerCluster.addLayers(markers);
                this.map.addLayer(this.markerCluster);
            }

            formatDate(dateString) {
                const date = new Date(dateString);
                const now = new Date();

                const diffMs = now - date;
                const diffMinutes = Math.floor(diffMs / 60000);
                const diffHours = Math.floor(diffMs / 3600000);

                const targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
                const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

                const diffDays = Math.floor((today - targetDay) / 86400000);
                const diffWeeks = Math.floor(diffDays / 7);
                const diffMonths = Math.floor(diffDays / 30);
                const diffYears = Math.floor(diffDays / 365);

                if (diffMinutes < 1) return '刚刚';
                if (diffMinutes < 60) return `${diffMinutes}分钟前`;
                if (diffHours < 24) return `${diffHours}小时前`;
                if (diffDays === 0) return '今天';
                if (diffDays === 1) return '昨天';
                if (diffDays === 2) return '前天';
                if (diffDays > 2 && diffDays < 7) return `${diffDays}天前`;
                if (diffWeeks === 1) return '1周前';
                if (diffWeeks > 1 && diffWeeks < 4) return `${diffWeeks}周前`;
                if (diffMonths === 1) return '1个月前';
                if (diffMonths > 1 && diffMonths < 12) return `${diffMonths}个月前`;
                if (diffYears === 1) return '1年前';
                if (diffYears > 1) return `${diffYears}年前`;

                return date.toLocaleDateString('zh-CN');
            }


            createStatusElement(status) {
            const lowerDevice = (status.device || '').toLowerCase();
            const icon = MOBILE_DEVICE_KEYWORDS.some(keyword => lowerDevice.includes(keyword)) ? '📱' : '💻';

                const pinned = status.pinned || 0;
                const $item = $(`
                <div class="status-item" id="${status.id}" ${pinned > 0 ? `data-pinned="${pinned}"` : ''}>
                    ${pinned > 0 ? '<div class="status-pin-badge">📌 置顶</div>' : ''}
                    ${(new URLSearchParams(window.location.search).get('id') === status.id || window.location.hash === '#' + status.id) ? '<div class="status-anchor-badge">🔗  定位</div>' : ''}
                    <div class="status-content">
                        ${status.content
                            .replace(/</g, "&lt;")
                            .replace(/>/g, "&gt;")
                            .replace(/\n/g, "<br>")
                            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")  // **粗体** → <strong>
                            .replace(/\*(.*?)\*/g, "<em>$1</em>")              // *斜体* → <em>
                        }
                    </div>

${status.music ? `
<div class="status-music is-playlist" data-music-link="${status.music.replace(/"/g, '&quot;')}">
    <div class="status-music-cover-wrap" onclick="window._statusMusicPlayer.toggle(this.querySelector('.status-music-btn'), '${status.music.replace(/'/g, "\\'")}')">
        <img class="music-cover-img" alt="" style="width:100%;height:100%;object-fit:cover;background:var(--color-background-overlay,#e8e8e8);">
        <button class="status-music-btn">
            <svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
        </button>
    </div>
    <div class="music-lrc-overlay"><div class="music-lrc-text"></div></div>

<div class="status-music-info">
    <div class="music-info-row">
        <div class="music-info-text">
            
            <div style="display: flex; align-items: center; min-width: 0;">

                <svg class="music-single-icon" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" style="display: none; width: 16px; height: 16px; margin: -3px 0px 0px -3px; flex-shrink: 0; color: #ff9800;">
                    <ellipse cx="90" cy="220" rx="45" ry="35" fill="currentColor"/>
                    <rect x="125" y="40" width="18" height="170" fill="currentColor"/>
                    <path d="M143 40 C143 70, 190 70, 190 120 C190 150, 175 170, 170 180 C185 160, 195 135, 195 110 C195 60, 155 50, 143 40Z" fill="currentColor"/>
                </svg>

                <svg class="music-playlist-icon" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" style="display: none; width: 16px; height: 16px; margin:-3px 3px 0px 0px; flex-shrink: 0; color: #ff9800;">
                    <ellipse cx="80" cy="220" rx="45" ry="35" fill="currentColor"/>
                    <rect x="115" y="40" width="18" height="170" fill="currentColor"/>
                    <path d="M133 40 C133 70, 180 70, 180 120 C180 150, 165 170, 160 180 C175 160, 185 135, 185 110 C185 60, 145 50, 133 40Z" fill="currentColor"/>
                    <rect x="160" y="150" width="110" height="12" rx="6" fill="currentColor"/>
                    <rect x="160" y="185" width="110" height="12" rx="6" fill="currentColor"/>
                    <rect x="160" y="220" width="110" height="12" rx="6" fill="currentColor"/>
                </svg>
                <div class="status-music-name">加载中...</div>
            </div>
            
            <div class="status-music-artist">点击播放获取</div>
        </div>
        <div class="music-dice-btn" onclick="window._statusMusicPlayer.rollDice(this, event)" ontouchstart="event.stopPropagation();" style="display:none;">
            <svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="7" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>
        </div>
    </div>
</div>

</div>` : ''}
                    ${status.images && status.images.length ? `
                        <div class="status-images">
                            ${status.images.map(img => `<a href="${img}" data-fancybox="gallery-${status.id || status.date || Math.random()}"><img src="${img}" loading="lazy"></a>`).join('')}
                        </div>
                    ` : ''}
                    
                    <div class="meta-drawer">


<div class="status-actions">
    <button class="status-comment-toggle" data-id="${status.id}" onclick="window._statusActions.toggleComments('${status.id}', this)">
        ${ICON_COMMENT}
        评论
    </button>
</div>



                        <div class="status-meta">
                            <span>📍 ${status.location || '未知'}</span>
                            <span>📅 ${status.date ? this.formatDate(status.date) : '未知'}</span>
                            <span>${icon} ${status.device || '未知'}</span>
                        </div>
                    </div>
                </div>
            `);

                return $item;
            }

            // ===== 极简图片加载：只监听 load，失败不处理，shimmer 永远转 =====
            bindImageLoad($link) {
                const $img = $link.find('img');
                if (!$img.length) return;
                const self = this;
                const src = $img.attr('src');
                let loaded = false;

                function markLoaded() {
                    if (loaded) return;
                    loaded = true;
                    $link.addClass('loaded');
                    // $img.css('content-visibility', 'auto');  // 会让离开视口的元素被浏览器回收内存，回来时需要重新渲染, 省内存但卡白屏
                    if (self.msnry) self.msnry.layout();
                }

                if ($img[0].complete && $img[0].naturalWidth > 0) {
                    markLoaded();
                    return;
                }

                $img.one('load', markLoaded);

                $img[0].onerror = function() {
                    if (loaded) return;
                    // 隐藏裂图，静默重试
                    this.style.opacity = '0';
                    setTimeout(function() {
                        if (!loaded) {
                            $img.attr('src', '');
                            setTimeout(function() {
                                $img.attr('src', src + '?r=' + Date.now());
                            }, 50);
                        }
                    }, 5000);
                };
            }


            preloadMusicInfo() {
                const self = this;
                const musicPlayer = new MusicPlayer();
                this.$grid.find('.status-music').each(function() {
                    const $card = $(this);
                    const link = $card.data('music-link');
                    if (!link) return;

                    // 匹配当前播放
                    if (window._statusMusicPlayer._currentLink === link) {
                        window._statusMusicPlayer._resumeCard(this);
                        return;
                    }

                    // ✅ 查缓存
                    const cached = window._statusMusicPlayer._songCache[link];
                    if (cached) {
                        const song = cached[0];
                        const $cover = $card.find('.music-cover-img');
                        const $name = $card.find('.status-music-name');
                        const $artist = $card.find('.status-music-artist');
                        const $type = $card.find('.status-music-type');
                        if (song.cover) {
                            $cover.attr('src', song.cover).addClass('loaded');
                            $card.find('.status-music-cover-wrap').addClass('loaded');
                        }
                        if ($name.length) $name.text(song.name || '未知');
                        if ($artist.length) $artist.text(song.artist || '未知');
                        if ($type.length) $type.text(cached.length > 1 ? '📋 歌单' : '🎵 单曲');
                        // 原有的代码...
                        if (cached.length > 1) {
                            $card.find('.music-dice-btn').show();
                            $card.find('.music-playlist-icon').show(); // 歌单：显示歌单图标
                            $card.find('.music-single-icon').hide(); // 歌单：隐藏单曲图标
                        } else {
                            $card.find('.music-dice-btn').hide();
                            $card.find('.music-playlist-icon').hide(); // 单曲：隐藏歌单图标
                            $card.find('.music-single-icon').show(); // 单曲：显示单曲图标
                        }
                        $card.data('songs', cached);
                        return;
                    }

                    musicPlayer.load(link).then(songs => {
                        window._statusMusicPlayer._songCache[link] = songs; // ✅ 存缓存
                        if (!songs || songs.length === 0) return;
                        const song = songs[0];
                        const $cover = $card.find('.music-cover-img');
                        const $name = $card.find('.status-music-name');
                        const $artist = $card.find('.status-music-artist');
                        const $type = $card.find('.status-music-type');

                        if (song.cover) {
                            $cover.attr('src', song.cover);
                            $cover.on('load', function() {
                                $(this).addClass('loaded');
                                $card.find('.status-music-cover-wrap').addClass('loaded');
                            });
                            $cover.on('error', function() {
                                $(this).hide();
                                $card.find('.status-music-cover-wrap').addClass('loaded');
                            });
                        }
                        if ($name.length) $name.text(song.name || '未知');
                        if ($artist.length) $artist.text(song.artist || '未知');
                        if ($type.length) $type.text(songs.length > 1 ? '📋 歌单' : '🎵 单曲');
                        // 原有的代码...
                        if (songs.length > 1) {
                            $card.find('.music-dice-btn').show();
                            $card.find('.music-playlist-icon').show(); // 歌单：显示歌单图标
                            $card.find('.music-single-icon').hide(); // 歌单：隐藏单曲图标
                        } else {
                            $card.find('.music-dice-btn').hide();
                            $card.find('.music-playlist-icon').hide(); // 单曲：隐藏歌单图标
                            $card.find('.music-single-icon').show(); // 单曲：显示单曲图标
                        }
                        $card.data('songs', songs);
                    }).catch(() => {});
                });
            }

            render() {
                if (this.currentIndex >= this.filteredStatuses.length) {
                    if (this.currentIndex === 0) {
                        this.$grid.append('<div class="loading">无匹配动态。</div>');
                    } else {
                        $('#load-more-btn').text('🎉 已经到底啦').show();
                    }
                    return;
                }

                if (this.isLoading) return;

                this.isLoading = true;
                const $btn = $('#load-more-btn');
                $btn.text('⏳ 正在加载...').show();

                const self = this;

                setTimeout(() => {
                    const nextBatch = self.filteredStatuses.slice(self.currentIndex, self.currentIndex + self.pageSize);
                    const $fragment = $(document.createDocumentFragment());

                    $.each(nextBatch, (i, status) => {
                        const $item = self.createStatusElement(status);
                        $fragment.append($item);
                    });

                    self.$grid.append($fragment);
                    const $newItems = self.$grid.find('.status-item').slice(-nextBatch.length);

                    $newItems.each(function(index) {
                        const $this = $(this);
                        setTimeout(() => {
                            $this.addClass('is-shown');
                        }, index * 50);
                    });

                    self.$grid.find('.status-item').css('will-change', 'auto');
                    $newItems.css('will-change', 'transform');
                    self.msnry.appended($newItems.toArray());
                    self.msnry.layout();
                    $newItems.css('will-change', 'auto');
                    //$newItems.find('img').css('content-visibility', 'auto');  // 会让离开视口的元素被浏览器回收内存，回来时需要重新渲染, 省内存但卡白屏

                    $newItems.find('.status-images a').each(function() {
                        self.bindImageLoad($(this));
                    });


                    self.currentIndex += self.pageSize;

                    if (self.currentIndex >= self.filteredStatuses.length) {
                        $btn.text('🎉 已经到底啦').prop('disabled', true).show();
                    } else {
                        $btn.text('📜 上滑加载更多').prop('disabled', false).show();
                    }

                    self.preloadMusicInfo();

                    self.isLoading = false;

                }, 100);
            }

            loadCommentCounts() {
                if (typeof twikoo === 'undefined' || !twikoo.getCommentsCount) return;
                
                // 💡 批量请求路径改为 ?id=
                const urls = this.allStatuses.map(s => '/status/?id=' + s.id);
                
                twikoo.getCommentsCount({
                    envId: 'https://rakientwikoo.netlify.app/.netlify/functions/twikoo',
                    urls: urls,
                    includeReply: true
                }).then(res => {
                    res.forEach(item => {
                        // 💡 还原获取到的 statusId 时也改用 ?id= 替换
                        const statusId = item.url.replace('/status/?id=', '');
                        const $btn = document.querySelector(`.status-comment-toggle[data-id="${statusId}"]`);
                        if ($btn && item.count > 0) {
                            $btn.innerHTML = ICON_COMMENT + ' ' + item.count + '评论';
                        }
                    });
                }).catch(() => {});
            }


            checkHashAndScroll() {
                let targetId = '';
                
                // 💡 1. 优先从 URL 参数 ?id= 中获取卡片 ID
                const urlParams = new URLSearchParams(window.location.search);
                if (urlParams.has('id')) {
                    targetId = urlParams.get('id');
                } else {
                    // 💡 2. 兜底保留：兼容以前产生的老链接 #id
                    const hash = window.location.hash;
                    if (hash) {
                        const possibleId = hash.replace('#', '');
                        // 过滤掉 Twikoo 纯评论的 32 位 MD5 锚点，防止误判
                        if (possibleId && !/^[a-f0-9]{32}$/.test(possibleId)) {
                            targetId = possibleId;
                        }
                    }
                }

                if (!targetId) return;
                
                this._anchorId = targetId;
                
                // 💡 3. 从 allStatuses 中找到目标卡片
                const targetIndex = this.allStatuses.findIndex(s => s.id === targetId);
                if (targetIndex === -1) return;
                
                // 把目标卡片移到第一位
                const [targetStatus] = this.allStatuses.splice(targetIndex, 1);
                this.allStatuses.unshift(targetStatus);
                
                // 重新应用筛选（会重新渲染整个列表）
                this.applyFilters();
                
                // 渲染完成后滚动到顶部并闪烁目标卡片
                setTimeout(() => {
                    const el = document.getElementById(targetId);
                    if (el) {
                        // 先滚动到顶部
                        window.scrollTo({ top: 0, behavior: 'smooth' });
                        // 延迟闪烁
                        setTimeout(() => {
                            el.classList.add('status-flash');
                            setTimeout(() => el.classList.remove('status-flash'), 1800);
                        }, 400);
                    }
                }, 800);
            }
        }

        const style = document.createElement('style');
        style.textContent = `
        .custom-cluster {
            background: transparent !important;
            border: none !important;
        }
        .cluster-icon {
            background: rgba(255, 152, 0, 0.9);
            border-radius: 50%;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            transition: all 0.3s;
        }
        .cluster-icon:hover {
            background: rgba(255, 152, 0, 1);
            transform: scale(1.1);
        }
        .cluster-small { width: 30px; height: 30px; font-size: 12px; }
        .cluster-medium { width: 40px; height: 40px; font-size: 14px; }
        .cluster-large { width: 50px; height: 50px; font-size: 16px; }
        .marker-cluster-small,
        .marker-cluster-medium,
        .marker-cluster-large {
            background-color: transparent !important;
        }
        .marker-cluster div {
            width: 30px;
            height: 30px;
            margin-left: 5px;
            margin-top: 5px;
            text-align: center;
            border-radius: 50%;
            background-color: rgba(255, 152, 0, 0.8);
            color: white;
            font-weight: bold;
            display: flex;
            align-items: center;
            justify-content: center;
        }
    `;
        document.head.appendChild(style);



        // ===== 全局音乐播放控制器 =====
        // ===== 全局音乐播放控制器 =====
        window._statusMusicPlayer = (function() {
            let currentAPlayer = null;
            let currentBtn = null;
            let card = null;
            let _currentLink = null;
            let _lastActiveLrcIndex = -1; // 💡 新增：全局记录当前唱到了哪一句
            const songCache = {};
            const musicPlayer = new MusicPlayer();

            // SVG 图标
            const ICON_PLAY = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>';
            const ICON_PAUSE = '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>';
            const ICON_LOADING = '<svg viewBox="0 0 24 24" style="animation:spin 1s linear infinite"><path d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2z" fill="none" stroke="currentColor" stroke-width="3"/></svg>';

            function setBtnIcon(btn, icon) {
                btn.innerHTML = icon;
            }

            function destroyCurrent() {
                if (currentAPlayer) {
                    try {
                        currentAPlayer.destroy();
                    } catch (e) {}
                    currentAPlayer = null;
                }
                const old = document.querySelector('.aplayer.aplayer-fixed');
                if (old) old.remove();
                if (currentBtn) {
                    currentBtn.classList.remove('playing');
                    setBtnIcon(currentBtn, ICON_PLAY);
                    currentBtn = null; // ✅ 加这行
                }
            }

            async function toggle(btn, link) {
                // 👇 新增：在函数最开头加上这段拦截代码，没加载完之前点击没有任何反应
                const targetCard = btn.closest('.status-music');
                const cachedSongs = songCache[link] || (targetCard ? $(targetCard).data('songs') : null);
                if (!cachedSongs || cachedSongs.length === 0) {
                    return; 
                }
                // 👆 新增结束
                // 💡 核心修复：记录这次点击时对应的独立按钮和链接，防止异步网络请求返回时覆盖错误卡片
                const clickedBtn = btn;
                const clickedLink = link;

                let lrcTimer = null;
                async function updateLrc() {
                    if (!currentAPlayer || !card) return;
                    const audio = currentAPlayer.audio;
                    if (!audio || audio.paused) return;
                    const currentTime = audio.currentTime;
                    const lrcEl = card.querySelector('.music-lrc-text');
                    if (!lrcEl) return;

                    const currentIndex = currentAPlayer.list.index;
                    const currentAudio = currentAPlayer.list.audios[currentIndex] || {};
                    let lrc = currentAudio.lrc || '';

                    /* ========================================================
                       💡 核心修复：如果自动切歌后，歌词还是一个 http 链接，自动去拉取它
                       ======================================================== */
                    if (lrc.startsWith('http')) {
                        // 1. 先用标志位锁住，防止 200ms 内发起无数个重复的 fetch 请求
                        if (currentAudio._isFetchingLrc) {
                            if (!lrcEl.innerHTML.includes('♪')) {
                                lrcEl.innerHTML = `
                            <span class="lrc-line l1">&nbsp;</span>
                            <span class="lrc-line l2">&nbsp;</span>
                            <span class="lrc-line l3" style="opacity:0.5; font-weight:700;">♪ 歌词加载中...</span>
                            <span class="lrc-line l4">&nbsp;</span>
                            <span class="lrc-line l5">&nbsp;</span>
                        `;
                            }
                            return;
                        }
                        currentAudio._isFetchingLrc = true;

                        if (!lrcEl.innerHTML.includes('♪')) {
                            lrcEl.innerHTML = `
                        <span class="lrc-line l1">&nbsp;</span>
                        <span class="lrc-line l2">&nbsp;</span>
                        <span class="lrc-line l3" style="opacity:0.5; font-weight:700;">♪ 歌词加载中...</span>
                        <span class="lrc-line l4">&nbsp;</span>
                        <span class="lrc-line l5">&nbsp;</span>
                    `;
                        }

                        try {
                            // 2. 调用已有的播放器方法异步拉取纯文本歌词
                            const textLrc = await musicPlayer.fetchLrc(lrc);
                            currentAudio.lrc = textLrc || '\n'; // 成功后覆盖原 URL
                        } catch (e) {
                            currentAudio.lrc = '\n'; // 失败则给空，防止死循环
                        } finally {
                            currentAudio._isFetchingLrc = false;
                        }
                        return; // 本次轮询退出，等待下一次 200ms 进来就能读到纯文本歌词了
                    }

                    // 如果确实没歌词
                    if (!lrc || lrc.trim() === '') {
                        lrcEl.innerHTML = '<span class="lrc-line l3" style="opacity:0.3;">♪ 纯音乐，请欣赏</span>';
                        return;
                    }

                    const lines = lrc.split('\n');
                    let activeIndex = -1;
                    for (let i = 0; i < lines.length; i++) {
                        const match = lines[i].match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
                        if (match) {
                            const t = parseInt(match[1]) * 60 + parseFloat(match[2]);
                            if (t <= currentTime) activeIndex = i;
                        }
                    }

                    // 前奏期间
                    if (activeIndex < 0) {
                        if (_lastActiveLrcIndex !== -2) { // 锁：防止前奏一直重绘
                            _lastActiveLrcIndex = -2;
                            lrcEl.innerHTML = `
                        <span class="lrc-line l1">&nbsp;</span>
                        <span class="lrc-line l2">&nbsp;</span>
                        <span class="lrc-line l3" style="opacity:0.3;">♪ 歌词加载中...</span>
                        <span class="lrc-line l4">&nbsp;</span>
                        <span class="lrc-line l5">&nbsp;</span>
                    `;
                        }
                        return;
                    }

                    if (activeIndex >= 0) {
                        // 💡 核心性能锁：只有当行数真的变了，才去动 DOM！
                        if (activeIndex !== _lastActiveLrcIndex) {
                            _lastActiveLrcIndex = activeIndex; // 更新记录
                            
                            const showLines = [];
                            for (let i = -2; i <= 2; i++) {
                                const idx = activeIndex + i;
                                const cls = 'l' + (i + 3);
                                if (idx >= 0 && idx < lines.length) {
                                    const text = lines[idx].replace(/\[.*?\]/g, '').trim();
                                    showLines.push(`<span class="lrc-line ${cls}">${text || '&nbsp;'}</span>`);
                                } else {
                                    showLines.push(`<span class="lrc-line ${cls}">&nbsp;</span>`);
                                }
                            }
                            lrcEl.innerHTML = showLines.join('');
                        }
                    }
                }

                if (currentBtn === btn && currentAPlayer) {
                    currentAPlayer.toggle();
                    const playing = !currentAPlayer.audio.paused;
                    btn.classList.toggle('playing', playing);
                    setBtnIcon(btn, playing ? ICON_PAUSE : ICON_PLAY);
                    return;
                }

                if (currentBtn) {
                    currentBtn.classList.remove('playing');
                    setBtnIcon(currentBtn, ICON_PLAY);
                }

                destroyCurrent();

                btn.disabled = true;
                setBtnIcon(btn, ICON_LOADING);
                currentBtn = btn;

                card = btn.closest('.status-music');
                _currentLink = link;

                try {
                    let songs = null;

                    // 先查缓存
                    if (songCache[link]) {
                        songs = songCache[link];
                    } else if (card) {
                        songs = $(card).data('songs');
                    }

                    if (!songs || !Array.isArray(songs)) {
                        songs = await musicPlayer.loadWithLrc(link);

                        /* ========================================================
                           💡 核心修复拦截：
                           如果当前请求返回时，用户已经迅速点击了别的音乐（_currentLink 变了），
                           或者当前激活的按钮已经不是发起请求时的按钮，直接退出！绝不篡改当前的 DOM。
                           ======================================================== */
                        if (_currentLink !== clickedLink || currentBtn !== clickedBtn) {
                            return;
                        }

                        songCache[link] = songs;
                        if (card) $(card).data('songs', songs);
                    }

                                    // ✅ 解析封面真实地址
                    if (songs && songs.length > 0 && songs[0].cover) {
                        songs[0].cover = await musicPlayer.resolveCover(songs[0].cover);
                    }
                    
                    if (!songs || songs.length === 0) throw new Error('无歌曲');

                    // ✅ 如果第一首歌词还是 URL，拉一下
                    if (songs[0].lrc && songs[0].lrc.startsWith('http')) {
                        try {
                            songs[0].lrc = await musicPlayer.fetchLrc(songs[0].lrc);
                        } catch (e) {
                            songs[0].lrc = '';
                        }

                        // 💡 再次拦截：网络请求第二步（拉取歌词文本）返回后，二次校验是否切歌
                        if (_currentLink !== clickedLink || currentBtn !== clickedBtn) {
                            return;
                        }
                    }

                    // 更新卡片信息
                    if (card && songs[0]) {
                        const coverImg = card.querySelector('.music-cover-img');
                        coverImg.src = songs[0].cover || '';

                        // 【体验优化】图标和骰子的显示状态不再等待图片下载，点击切歌瞬间判定，拒绝慢半拍的闪烁
                        const isPlaylist = (currentAPlayer && currentAPlayer.list && currentAPlayer.list.audios.length > 1) || songs.length > 1;

                        // 1. 骰子控制
                        const diceBtn = card.querySelector('.music-dice-btn');
                        if (diceBtn) diceBtn.style.display = isPlaylist ? '' : 'none';

                        // 2. 控制单曲与歌单图标的二选一状态
                        const playlistIcon = card.querySelector('.music-playlist-icon');
                        const singleIcon = card.querySelector('.music-single-icon');

                        if (playlistIcon) playlistIcon.style.display = isPlaylist ? '' : 'none';
                        if (singleIcon) singleIcon.style.display = isPlaylist ? 'none' : '';

                        // 图片加载成功的处理（纯粹处理皮肤淡入动画）
                        coverImg.onload = () => {
                            coverImg.classList.add('loaded');
                            const coverWrap = card.querySelector('.status-music-cover-wrap');
                            if (coverWrap) coverWrap.classList.add('loaded'); // 👈 补回你原本丢失的这句，确保封面能亮起来
                        };

                        // 图片加载失败的处理
                        coverImg.onerror = () => {
                            coverImg.style.display = 'none';
                            const coverWrap = card.querySelector('.status-music-cover-wrap');
                            if (coverWrap) coverWrap.classList.add('loaded');
                        };

                        // 渲染歌名和歌手文本
                        card.querySelector('.status-music-name').textContent = songs[0].name || '未知';
                        card.querySelector('.status-music-artist').textContent = songs[0].artist || '未知';
                    }



                    // 创建容器
                    let container = document.getElementById('aplayer-fixed-container');
                    if (!container) {
                        container = document.createElement('div');
                        container.id = 'aplayer-fixed-container';
                        document.body.appendChild(container);
                    }

                    currentAPlayer = new APlayer({
                        container: container,
                        fixed: true,
                        mini: true, // ✅ 收起时只显示小条
                        listFolded: true, // ✅ 歌单默认折叠
                        autoplay: true,
                        preload: 'none', // 限制 APlayer 音频预加载
                        audio: songs.map(s => ({
                            name: s.name || '未知',
                            artist: s.artist || '未知',
                            url: s.url,
                            cover: s.cover || '',
                            lrc: s.lrc || ''
                        }))
                    });


                // ===== 👇 新增：注册 Media Session 系统级控制与进度条 👇 =====
                    if ('mediaSession' in navigator) {
                        // 1. 基础控制与进度条拖拽控制
                        navigator.mediaSession.setActionHandler('play', () => { if (currentAPlayer) currentAPlayer.play(); });
                        navigator.mediaSession.setActionHandler('pause', () => { if (currentAPlayer) currentAPlayer.pause(); });
                        navigator.mediaSession.setActionHandler('previoustrack', () => { if (currentAPlayer) currentAPlayer.skipBack(); });
                        navigator.mediaSession.setActionHandler('nexttrack', () => { if (currentAPlayer) currentAPlayer.skipForward(); });
                        navigator.mediaSession.setActionHandler('seekto', (details) => {
                            if (currentAPlayer && details.seekTime !== undefined) {
                                currentAPlayer.seek(details.seekTime);
                            }
                        });

                        // 2. 进度条同步器：告诉系统总时长和当前进度
                        const syncPosition = () => {
                            if (currentAPlayer && currentAPlayer.audio) {
                                const audio = currentAPlayer.audio;
                                if (!isNaN(audio.duration) && audio.duration > 0) {
                                    try {
                                        navigator.mediaSession.setPositionState({
                                            duration: audio.duration,
                                            playbackRate: audio.playbackRate || 1,
                                            position: audio.currentTime || 0
                                        });
                                    } catch (e) {}
                                }
                            }
                        };

                        // 3. 全局监听音频进度状态变化（此处只绑定一次，防止内存泄漏）
                        currentAPlayer.on('loadedmetadata', syncPosition);
                        currentAPlayer.on('canplay', syncPosition);
                        currentAPlayer.on('seeked', syncPosition);
                    }
                    // ===== 👆 新增结束 👆 =====






                    btn.classList.add('playing');
                    setBtnIcon(btn, ICON_PAUSE);

                    currentAPlayer.on('play', () => {
                        _lastActiveLrcIndex = -1; // 💡 新增：每次播放或切歌时，重置状态
                        btn.classList.add('playing');
                        setBtnIcon(btn, ICON_PAUSE);
                        if (card) {
                            card.querySelector('.status-music-cover-wrap').classList.add('playing-state');

                            /* ========================================================
                               💡 核心修改：自动切歌时，先把歌词状态调成“加载中”，给 fetch 争取时间
                               ======================================================== */
                            const lrcEl = card.querySelector('.music-lrc-text');
                            if (lrcEl) {
                                lrcEl.innerHTML = `
                            <span class="lrc-line l1">&nbsp;</span>
                            <span class="lrc-line l2">&nbsp;</span>
                            <span class="lrc-line l3" style="opacity:0.5; font-weight:700;">♪ 歌词加载中...</span>
                            <span class="lrc-line l4">&nbsp;</span>
                            <span class="lrc-line l5">&nbsp;</span>
                        `;
                            }

                            const currentIndex = currentAPlayer.list.index;
                            const currentAudio = currentAPlayer.list.audios[currentIndex];

                            if (currentAudio) {
                            // ===== 👇 新增：向手机系统推送“封面、歌名、歌手” 👇 =====
                                if ('mediaSession' in navigator) {
                                    navigator.mediaSession.metadata = new MediaMetadata({
                                        title: currentAudio.name || '未知歌名',
                                        artist: currentAudio.artist || '未知歌手',
                                        album: '网页原声', 
                                        artwork: [
                                            { src: currentAudio.cover || '', sizes: '96x96', type: 'image/jpeg' },
                                            { src: currentAudio.cover || '', sizes: '128x128', type: 'image/jpeg' },
                                            { src: currentAudio.cover || '', sizes: '192x192', type: 'image/jpeg' },
                                            { src: currentAudio.cover || '', sizes: '256x256', type: 'image/jpeg' },
                                            { src: currentAudio.cover || '', sizes: '384x384', type: 'image/jpeg' },
                                            { src: currentAudio.cover || '', sizes: '512x512', type: 'image/jpeg' }
                                        ]
                                    });

                                    // 每次切歌播放时，强制刷新一次进度条起点
                                    if (currentAPlayer.audio && !isNaN(currentAPlayer.audio.duration) && currentAPlayer.audio.duration > 0) {
                                        try {
                                            navigator.mediaSession.setPositionState({
                                                duration: currentAPlayer.audio.duration,
                                                playbackRate: currentAPlayer.audio.playbackRate || 1,
                                                position: currentAPlayer.audio.currentTime || 0
                                            });
                                        } catch (e) {}
                                    }
                                }
                                // ===== 👆 新增结束 👆 =====


                                // 2. 刷新封面图
                                const coverImg = card.querySelector('.music-cover-img');
                                if (coverImg && currentAudio.cover && coverImg.src !== currentAudio.cover) {
                                    coverImg.src = currentAudio.cover;
                                    coverImg.classList.remove('loaded');
                                    coverImg.onload = () => coverImg.classList.add('loaded');
                                }

                                // 3. 刷新歌名
                                const nameEl = card.querySelector('.status-music-name');
                                if (nameEl) {
                                    const typeBadge = nameEl.querySelector('.status-music-type');
                                    const badgeHtml = typeBadge ? typeBadge.outerHTML : '';
                                    nameEl.innerHTML = `${currentAudio.name || '未知'}${badgeHtml}`;
                                }

                                // 4. 刷新歌手
                                const artistEl = card.querySelector('.status-music-artist');
                                if (artistEl) {
                                    artistEl.textContent = currentAudio.artist || '未知';
                                }
                            }
                        }

                        // 清理并重启歌词轮询器
                        clearInterval(lrcTimer);
                        lrcTimer = setInterval(updateLrc, 200);
                    });

                    currentAPlayer.on('pause', () => {
                        btn.classList.remove('playing');
                        setBtnIcon(btn, ICON_PLAY);
                        if (card) card.querySelector('.status-music-cover-wrap').classList.remove('playing-state');
                        clearInterval(lrcTimer);
                    });
                    currentAPlayer.on('destroy', () => {
                        clearInterval(lrcTimer);
                        if (card) card.querySelector('.status-music-cover-wrap').classList.remove('playing-state');
                        if (currentBtn === btn) {
                            currentBtn.classList.remove('playing');
                            setBtnIcon(currentBtn, ICON_PLAY);
                        }
                    });

                } catch (err) {
                    console.error('音乐加载失败:', err);
                    // 💡 失败捕获时也做一次安全校验，防止把别人正在加载的 loading 图标改回播放图
                    if (currentBtn === clickedBtn) {
                        setBtnIcon(btn, ICON_PLAY);
                    }
                } finally {
                    // 💡 只有确实是当前正在活跃的按钮，才执行解禁
                    if (currentBtn === clickedBtn) {
                        btn.disabled = false;
                    }
                }
            }

            function rollDice(diceElement, event) {
                if (event) event.stopPropagation();

                // 1. 防止重复连点（骰子翻滚动画状态控制）
                if (diceElement.classList.contains('rolling')) return;
                diceElement.classList.add('rolling');
                setTimeout(() => diceElement.classList.remove('rolling'), 600);

                const targetCard = diceElement.closest('.status-music');
                if (!targetCard) return;
                const link = targetCard.getAttribute('data-music-link');
                const songs = $(targetCard).data('songs') || songCache[link];
                if (!songs || songs.length <= 1) return;

                let randomIndex = Math.floor(Math.random() * songs.length);
                let pickedSongName = '未知曲目';

                // 2. 执行随机切歌核心逻辑
                if (currentAPlayer && _currentLink === link) {
                    // 如果当前这首歌正在放，进行随机切歌，并防止连续摇到同一首
                    const currentIndex = currentAPlayer.list.index;
                    if (randomIndex === currentIndex && songs.length > 1) {
                        randomIndex = (randomIndex + 1) % songs.length;
                    }
                    currentAPlayer.list.switch(randomIndex);
                    currentAPlayer.play();

                    // 抓取切完之后的正确歌名
                    const nextAudio = currentAPlayer.list.audios[randomIndex];
                    if (nextAudio) pickedSongName = nextAudio.name;
                } else {
                    // 如果还没播放过此卡片，直接把抽中的歌重排到第一位并触发播放
                    const picked = songs[randomIndex];
                    pickedSongName = picked.name || '未知曲目';
                    const rearranged = [picked, ...songs.filter((_, i) => i !== randomIndex)];
                    songCache[link] = rearranged;
                    $(targetCard).data('songs', rearranged);

                    const playBtn = targetCard.querySelector('.status-music-btn');
                    toggle(playBtn, link);
                }

                // 3. ✨ 【智能传送带容器】寻找或创建右上角专用的常驻通知容器
                let container = document.getElementById('music-toast-container');
                if (!container) {
                    container = document.createElement('div');
                    container.id = 'music-toast-container';
                    document.body.appendChild(container);
                }

                // 创建单条独立的通知卡片
                const toast = document.createElement('div');
                toast.className = 'music-toast-notice';
                toast.innerHTML = `
        <span style="color: #ff9800; font-size: 1.1rem; line-height: 1;">🎲</span>
        <div style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;">
            <span style="color: var(--color-text-secondary, #777777); margin-right: 4px;">本歌单随机一首:</span>
            <strong style="font-weight: 600; color: #ff9800;">${pickedSongName}</strong>
        </div>
    `;

                // 塞入传送带容器（由于 CSS 设置了反向 Flex，新弹窗会自动靠最下方排列）
                container.appendChild(toast);

                // 🔥 核心启动器：零延迟点亮卡片，触发 CSS 里的 active 动画
                setTimeout(() => {
                    toast.classList.add('active');
                }, 10);

                // 3秒后自动触发独立高度塌陷与淡出动画
                setTimeout(() => {
                    toast.classList.remove('active');
                    toast.classList.add('fade-out');

                    // 等待 500ms 动画播放完毕后，彻底从 DOM 树中移除元素
                    setTimeout(() => {
                        toast.remove();
                        // 如果所有的弹窗都消失了，把空容器也顺便清理干净
                        if (container.children.length === 0) {
                            container.remove();
                        }
                    }, 500);
                }, 3000);
            }


            return {
                toggle,
                rollDice,
                getAPlayer: function() {
                    return currentAPlayer;
                },
                _songCache: songCache,
                get _currentLink() {
                    return _currentLink;
                },
                set _currentLink(v) {
                    _currentLink = v;
                },
                _resumeCard: function(c) {
                    card = c;
                    if (!currentAPlayer) return;

                    const idx = currentAPlayer.list.index;
                    const audio = currentAPlayer.list.audios[idx] || {};
                    const isPlaying = !currentAPlayer.audio.paused;

                    // 用 APlayer 当前歌曲数据恢复卡片
                    if (audio.cover) {
                        const coverImg = card.querySelector('.music-cover-img');
                        if (coverImg) {
                            coverImg.src = audio.cover;
                            coverImg.classList.add('loaded');
                        }
                        card.querySelector('.status-music-cover-wrap').classList.add('loaded');
                    }
                    const nameEl = card.querySelector('.status-music-name');
                    if (nameEl) nameEl.textContent = audio.name || '';
                    const artistEl = card.querySelector('.status-music-artist');
                    if (artistEl) artistEl.textContent = audio.artist || '';

                    // 恢复播放状态
                    if (isPlaying) {
                        card.querySelector('.status-music-cover-wrap').classList.add('playing-state');
                        const btn = card.querySelector('.status-music-btn');
                        if (btn) {
                            btn.classList.add('playing');
                            btn.innerHTML = ICON_PAUSE;
                            currentBtn = btn; // ✅ 加这行
                        }
                    }
                },
                get ICON_PAUSE() {
                    return ICON_PAUSE;
                }
            };

               })();

    // =================== 评论功能 ===================
window._statusActions = {
    currentId: null,

    toggleComments: function(statusId, btn) {
        if (this.currentId === statusId) {
            this.closeCommentModal();
            return;
        }
        this.currentId = statusId;

        const overlay = document.getElementById('commentModalOverlay');
        const body = document.getElementById('commentModalBody');
        body.innerHTML = '<div id="twikoo-' + statusId + '"></div>';
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

twikoo.init({
    envId: 'https://rakientwikoo.netlify.app/.netlify/functions/twikoo',
    el: '#twikoo-' + statusId,
    // 💡 将 # 替换为 ?id= 传给 Twikoo 后台
    path: '/status/?id=' + statusId,
    href: window.location.origin + window.location.pathname + '?id=' + statusId,
    lang: 'zh-CN',
    onCommentLoaded: function() {
        twikoo.getCommentsCount({
            envId: 'https://rakientwikoo.netlify.app/.netlify/functions/twikoo',
            // 💡 这里的请求路径同步修改
            urls: ['/status/?id=' + statusId],
            includeReply: false
        }).then(res => {
            // ... 原有更新气泡评论数逻辑保持原样 ...
        }).catch(() => {});
    }
});
    },

    closeCommentModal: function() {
        document.getElementById('commentModalOverlay').classList.remove('active');
        document.body.style.overflow = '';
        this.currentId = null;
    },

    closeModal: function(e) {
        // 记录鼠标按下的位置
        if (e.type === 'mousedown') {
            this._mousedownTarget = e.target;
            this._mousedownPos = { x: e.clientX, y: e.clientY };
            return;
        }
        // mouseup 时判断：必须是同一位置、同一元素才算真正的点击
        if (e.type === 'mouseup') {
            const isSameTarget = e.target === e.currentTarget && this._mousedownTarget === e.currentTarget;
            const dx = Math.abs(e.clientX - this._mousedownPos.x);
            const dy = Math.abs(e.clientY - this._mousedownPos.y);
            const isNotDrag = dx < 5 && dy < 5; // 移动小于5px不算拖拽
            
            if (isSameTarget && isNotDrag) {
                this.closeCommentModal();
            }
        }
    }
};

    $(document).ready(() => {
        new StatusManager();
    });
})(jQuery);