// ==================== moments.js ====================
(function($) {
    'use strict';

    var ICONS = window.STATUS_ICONS;
    var MOBILE_KEYWORDS = window.MOBILE_DEVICE_KEYWORDS;

    var STAGGER_DELAY = 80;
    var FRIEND_PAGE_SIZE = 5;   // 每人每次加载5条
    var PER_PERSON_LIMIT = 10;  // 每人最多10条

    var MomentsManager = (function() {
        function MomentsManager() {
            this.baseUrl = window.STATUS_API_URL;
            this.allStatuses = [];       // 所有人的动态
            this.filteredStatuses = [];
            this.currentIndex = 0;
            this.pageSize = 6;
            this.isLoading = false;
            this.initialLoadComplete = false;
            this.currentFilters = { year: 'all', month: 'all', location: 'all', author: 'all' };
            this._mapInstance = null;
            this.map = null;
            this.markersMap = {};
            this.$grid = null;
            this.msnry = null;

            // 数据源管理
            this.myData = null;          // 自己的 JSON
            this.friendDataMap = {};     // { slug: { data, loaded: Number, setting: {} } }
            this.friendQueue = [];       // 加载队列 [{ slug, name, avatar, domain, json_url, setting }]
            this.allFriendsLoaded = false;

            this.init();
        }

        MomentsManager.prototype.init = async function() {
            var self = this;
            try {
                // 1. 加载自己的 JSON
                var myResponse = await fetch(this.baseUrl + '?t=' + Date.now());
                this.myData = await myResponse.json();

                // 2. 构建朋友队列（slug 用数组索引兜底）
                var friends = this.myData.friends || [];
                var mySetting = (this.myData.setting || {});
                var globalFriendsLimit = mySetting.friends_limit || PER_PERSON_LIMIT;

                this.friendQueue = friends.map(function(f, i) {
                    return {
                        json_url: f.json_url,
                        dataLoaded: 0
                    };
                });

                // 3. 把自己先加进去（根据配置决定）
                this.allStatuses = [];
                if (window.MOMENTS_SHOW_ME !== false) {
                    var myItems = (this.myData.statuses || []).slice(0, globalFriendsLimit);
                    myItems.forEach(function(s) {
                        s._author = this.myData.site.name || '';
                        s._avatar = this.myData.site.avatar || '';
                        s._domain = this.myData.site.domain || '';
                        s._isMine = true;
                        s._setting = { device: true, location: true };
                    }, this);
                    this.allStatuses = myItems.slice(0, 200); // 裁剪
                }

// 先加载所有朋友的基本信息（只取 site，不取动态）
await this.loadAllFriendsSite();

// 再加载首屏动态
if (this.friendQueue.length > 0) {
    await this.loadFriendBatch(0);
}

                // 5. 全部按日期排序
                this.sortAllStatuses();

                // 6. 初始化渲染
                this.filteredStatuses = this.allStatuses.slice();
                this.initMasonry();
                this.initFilters();
                this.renderFirstBatch();
                this.finalizeInit();

                if (window._initStatusMap) {
                    setTimeout(function() {
                        var mapStatuses = self.allStatuses.filter(function(s) {
                            return s._setting && s._setting.location !== false;
                        });
                        self._mapInstance = window._initStatusMap('status-map', mapStatuses, {
                            onLocationClick: function(locName) {
                                self.selectLocationFilter(locName);
                            }
                        });
                        self.map = self._mapInstance.map;
                        self.markersMap = self._mapInstance.markersMap;
                    }, 300);
                }

                this.initialLoadComplete = true;
                this.renderAvatarBar();

                this.$grid.imagesLoaded(function() {
                    if (self.msnry) self.msnry.layout();
                });

                this.loadCommentCounts();
                this.checkHashAndScroll();
                this.preloadMusicInfo();
                this.bindEvents();
                this.initFancybox();

            } catch (error) {
                console.error(error);
                $('#status-list').html('<div style="max-width:400px;margin:40px auto;padding:24px 20px;background:var(--color-background-card,#fff);border:1px solid rgba(255,152,0,0.2);box-shadow:0 4px 16px rgba(0,0,0,0.04);border-radius:12px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif"><div style="font-size:1rem;font-weight:600;color:var(--color-text,#333);margin-bottom:6px">动态加载失败...</div><div style="font-size:0.85rem;color:var(--color-text-secondary,#777);line-height:1.5">可能被博主吃了<br>刷新页面试一下吧</div></div>');
            }
        };

        // ========== 加载一批朋友的数据 ==========
        MomentsManager.prototype.loadFriendBatch = async function(startIndex) {
            var self = this;
            var batchSize = 100; // 每次加载2个朋友
            var endIndex = Math.min(startIndex + batchSize, this.friendQueue.length);

            for (var i = startIndex; i < endIndex; i++) {
                var friend = this.friendQueue[i];
                try {
                    var res = await fetch(friend.json_url + '?t=' + Date.now());
                    var friendData = await res.json();

                    friend.domain = (friendData.site && friendData.site.domain) || '';
                    var friendSetting = friendData.setting || {};
                    var limit = friend.limit || PER_PERSON_LIMIT;
                    var items = (friendData.statuses || []).slice(0, limit);

                    items.forEach(function(s) {
                    s._author = (friendData.site && friendData.site.name) || '';
                    s._avatar = (friendData.site && friendData.site.avatar) || '';
                    s._domain = (friendData.site && friendData.site.domain) || '';
                        s._isMine = false;
                        s._setting = {
                            device: friendSetting.device !== false,
                            location: friendSetting.location !== false
                        };
                        self.allStatuses.push(s);
                    });

                    // 只保留最新的 200 条，多余的扔掉
                    if (self.allStatuses.length > 200) {
                        self.allStatuses.sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
                        self.allStatuses = self.allStatuses.slice(0, 200);
                    }

                    friend.dataLoaded = items.length;

                    } catch (e) {
                    console.error('加载朋友 ' + (i + 1) + ' 失败:', e);
                }
            }

            this.sortAllStatuses();

            // 检查是否所有人的数据都加载完了
            this.allFriendsLoaded = this.friendQueue.every(function(f) {
                return f.dataLoaded > 0 || f.dataLoaded === 0;
            });
        };

MomentsManager.prototype.loadAllFriendsSite = async function() {
    var self = this;
    for (var i = 0; i < this.friendQueue.length; i++) {
        var friend = this.friendQueue[i];
        try {
            var res = await fetch(friend.json_url + '?t=' + Date.now());
            var friendData = await res.json();
            friend.name = (friendData.site && friendData.site.name) || ('朋友' + (i + 1));
            friend.avatar = (friendData.site && friendData.site.avatar) || '';
            friend.domain = (friendData.site && friendData.site.domain) || '';
            friend.siteLoaded = true;
        } catch (e) {
            friend.name = '朋友' + (i + 1);
            friend.avatar = '';
            friend.domain = '';
        }
    }
};


        // ========== 加载更多（从尚未加载的朋友数据中取） ==========
        MomentsManager.prototype.loadMoreFriends = async function() {
            var self = this;
            var remaining = this.friendQueue.filter(function(f) {
                return f.dataLoaded === 0;
            });

            if (remaining.length === 0) {
                this.allFriendsLoaded = true;
                return;
            }

            // 找到第一个未加载的朋友的索引
            var firstUnloaded = -1;
            for (var i = 0; i < this.friendQueue.length; i++) {
                if (this.friendQueue[i].dataLoaded === 0) {
                    firstUnloaded = i;
                    break;
                }
            }

            if (firstUnloaded >= 0) {
                await this.loadFriendBatch(firstUnloaded);
            }
        };

        MomentsManager.prototype.sortAllStatuses = function() {
            this.allStatuses.sort(function(a, b) {
                return new Date(b.date) - new Date(a.date);
            });
            this.filteredStatuses = this.allStatuses.slice();
        };

        // ====== 以下方法基本复用 status.js ======

        MomentsManager.prototype.initMasonry = function() {
            this.$grid = $('#status-list');
            if (!$('.gutter-sizer').length) {
                this.$grid.prepend('<div class="gutter-sizer"></div>');
            }
        };

        MomentsManager.prototype.initFancybox = function() {
            if (typeof Fancybox !== 'undefined') {
                Fancybox.bind('[data-fancybox^="gallery-"]', {
                    hideScrollbar: false, lockScroll: false, touch: false, Hash: false,
                    transitionDuration: 200,
                    Carousel: {
                        Thumbs: true,
                        Toolbar: { display: { left: [], middle: [], right: ['download'] } },
                        Zoomable: { Panzoom: { maxScale: 'cover', panMode: 'mousemove', mouseMoveFactor: 1.1, friction: 0.9 } }
                    }
                });
            }
        };

        MomentsManager.prototype.finalizeInit = function() {
            var self = this;
            this.msnry = this.$grid.masonry({
                itemSelector: '.status-item',
                columnWidth: '.grid-sizer',
                gutter: '.gutter-sizer',
                percentPosition: true,
                transitionDuration: '0.3s',
                stagger: 30,
                hiddenStyle: { opacity: 0, transform: 'translateY(20px)' },
                visibleStyle: { opacity: 1, transform: 'translateY(0)' }
            }).data('masonry');

            var $items = this.$grid.find('.status-item');
            $items.each(function(index) {
                var $this = $(this);
                setTimeout(function() { $this.addClass('is-shown'); }, index * STAGGER_DELAY);
            });

            this.currentIndex = this.pageSize;

            this.$grid.find('.status-images a').each(function() { self.bindImageLoad($(this)); });

            if (this.currentIndex >= this.filteredStatuses.length && this.allFriendsLoaded) {
                $('#load-more-btn').text('🎉 已经到底啦').prop('disabled', true).show();
            } else {
                $('#load-more-btn').text('📜 上滑加载更多').prop('disabled', false).show();
            }

            $('#filterToggle').on('click', function(e) { e.stopPropagation(); $('#filterModal').addClass('show'); });
            $('#filterModalClose').on('click', function() { $('#filterModal').removeClass('show'); });
            $('#filterModal').on('click', function(e) { if (e.target === this) $(this).removeClass('show'); });
        };

        MomentsManager.prototype.renderFirstBatch = function() {
            var firstBatch = this.filteredStatuses.slice(0, this.pageSize);
            var $fragment = $(document.createDocumentFragment());
            var self = this;
            $.each(firstBatch, function(i, status) {
                $fragment.append(self.createStatusElement(status));
            });
            this.$grid.append($fragment);
            this.currentIndex = this.pageSize;
        };

        MomentsManager.prototype.bindEvents = function() {
            var self = this;
            var scrollTimer;
            $(window).on('scroll', function() {
                if (scrollTimer) clearTimeout(scrollTimer);
                scrollTimer = setTimeout(function() {
                    if (!self.initialLoadComplete) return;
                    if (!self.isLoading && self.isNearBottom()) self.render();
                }, 150);
            });

            var resizeTimer;
            $(window).on('resize', function() {
                if (resizeTimer) clearTimeout(resizeTimer);
                self.$grid.find('.status-item').css('transition', 'none');
                if (self.msnry) self.msnry.layout();
                resizeTimer = setTimeout(function() {
                    self.$grid.find('.status-item').css('transition', '');
                    if (self.msnry) self.msnry.layout();
                }, 500);
            });

            $(document).on('click', function(e) {
                if (!$(e.target).closest('.custom-select-wrapper').length) {
                    $('.custom-select-wrapper').removeClass('open');
                }
            });

            $('#load-more-btn').on('click', function() {
                if ($(this).prop('disabled')) return;
                if (!self.initialLoadComplete) return;
                if (!self.isLoading) self.render();
            });

            $('#refreshBtn').on('click', function() {
                self.currentFilters = { year: 'all', month: 'all', location: 'all' };
                $('#filter-year .select-trigger').text('年份');
                $('#filter-month .select-trigger').text('月份');
                $('#filter-location .select-trigger').text('地点');
                self.applyFilters();
                if (self._mapInstance) self._mapInstance.resetView();
            });
        };

        MomentsManager.prototype.isNearBottom = function() {
            var scrollTop = $(window).scrollTop();
            var windowHeight = $(window).height();
            var documentHeight = $(document).height();
            return scrollTop + windowHeight >= documentHeight - 300;
        };

        MomentsManager.prototype.initFilters = function() {
            var years = new Set();
            var months = new Set();
            var locations = new Set();
            var self = this;
            $.each(this.allStatuses, function(i, s) {
                var date = new Date(s.date);
                if (!isNaN(date)) {
                    years.add(date.getFullYear());
                    months.add(date.getMonth() + 1);
                }
                if (s.location && s._setting && s._setting.location !== false) {
                    var locKey = s.location.split(' · ').pop().trim();
                    if (locKey) locations.add(locKey);
                }
            });
            this.buildCustomSelect('filter-year', years, '年份', 'year', function(a, b) { return b - a; });
            this.buildCustomSelect('filter-month', months, '月份', 'month', function(a, b) { return a - b; });
            this.buildCustomSelect('filter-location', locations, '地点', 'location');
        };

        MomentsManager.prototype.buildCustomSelect = function(id, items, label, type, sortFn) {
            var $wrapper = $('#' + id);
            var self = this;
            var optionsHtml = '<div class="option-item" data-value="all">全部' + label + '</div>';
            var sortedItems = Array.from(items).sort(sortFn);
            $.each(sortedItems, function(i, val) {
                optionsHtml += '<div class="option-item" data-value="' + val + '">' + val + '</div>';
            });
            $wrapper.html('<div class="select-trigger">' + label + '</div><div class="options-menu">' + optionsHtml + '</div>');
            $wrapper.find('.select-trigger').on('click', function(e) {
                e.stopPropagation();
                var $parent = $(this).parent();
                var isOpen = $parent.hasClass('open');
                $('.custom-select-wrapper').removeClass('open');
                if (!isOpen) $parent.addClass('open');
            });
            $wrapper.find('.option-item').on('click', function() {
                var val = $(this).data('value');
                $wrapper.find('.select-trigger').text(val === 'all' ? label : val);
                $wrapper.removeClass('open');
                self.currentFilters[type] = val.toString();
                if (type === 'location') self.syncMapToLocation(val.toString());
                self.applyFilters();
            });
        };

        MomentsManager.prototype.syncMapToLocation = function(locationValue) {
            if (!this._mapInstance) return;
            if (locationValue === 'all') {
                this._mapInstance.resetView();
                return;
            }
            this._mapInstance.flyToMarker(locationValue);
        };

        MomentsManager.prototype.selectLocationFilter = function(locationValue) {
            var $wrapper = $('#filter-location');
            if (!$wrapper.length) return;
            $wrapper.find('.select-trigger').text(locationValue === 'all' ? '地点' : locationValue);
            this.currentFilters.location = locationValue;
            this.syncMapToLocation(locationValue);
            this.applyFilters();
        };


        MomentsManager.prototype.renderAvatarBar = function() {
            var self = this;
            var $track = $('#moments-avatar-track');
            var $left = $('#moments-avatar-left');
            var $right = $('#moments-avatar-right');
            
            var authorMap = {};

// 自己
if (window.MOMENTS_SHOW_ME !== false && this.myData && this.myData.site) {
    var myLatest = '';
    this.allStatuses.forEach(function(s) {
        if (s._isMine && (!myLatest || new Date(s.date) > new Date(myLatest))) {
            myLatest = s.date;
        }
    });
    authorMap['__self__'] = {
        name: this.myData.site.name || '我',
        avatar: this.myData.site.avatar || '',
        domain: this.myData.site.domain || '',
        date: myLatest || new Date().toISOString(),
        isMine: true
    };
}

// 朋友
this.friendQueue.forEach(function(f) {
    if (!f.siteLoaded) return;
    var key = f.json_url;  // 用 json_url 做唯一 key
    var latestDate = '';
    self.allStatuses.forEach(function(s) {
        if (s._author === f.name && (!latestDate || new Date(s.date) > new Date(latestDate))) {
            latestDate = s.date;
        }
    });
    authorMap[key] = {
        name: f.name,
        avatar: f.avatar,
        domain: f.domain,
        date: latestDate || new Date().toISOString(),
        isMine: false
    };
});

            
            var authors = Object.values(authorMap).sort(function(a, b) { return new Date(b.date) - new Date(a.date); });
            if (authors.length === 0) { $track.html(''); return; }
            
            var html = '';
            authors.forEach(function(a) {
                html += '<div class="moments-avatar-item" data-author="' + a.name + '" title="' + a.name + '"><img src="' + (a.avatar || '') + '" onerror="this.style.display=\'none\'"><span>' + a.name + '</span></div>';
            });
            $track.html(html);
            
$track.find('.moments-avatar-item').on('click', function() {
    var authorName = $(this).data('author');
    var wasSelected = $(this).hasClass('active');
    $track.find('.moments-avatar-item').removeClass('active');
    if (wasSelected) { self.currentFilters.author = 'all'; }
    else { $(this).addClass('active'); self.currentFilters.author = authorName; }
    
    // 重置年份月份，防止"无数据"
// 重置所有筛选
self.currentFilters.year = 'all';
self.currentFilters.month = 'all';
self.currentFilters.location = 'all';
$('#filter-year .select-trigger').text('年份');
$('#filter-month .select-trigger').text('月份');
$('#filter-location .select-trigger').text('地点');
    
    self.applyFilters();
    
    if (self._mapInstance) { self._mapInstance.destroy(); }
    if (window._initStatusMap) {
        var filteredForMap = self.allStatuses.filter(function(s) {
            var matchAuthor = (self.currentFilters.author === 'all' || s._author === self.currentFilters.author);
            return matchAuthor && s._setting && s._setting.location !== false && s.coords && s.coords.length === 2;
        });
        self._mapInstance = window._initStatusMap('status-map', filteredForMap, {
            onLocationClick: function(locName) { self.selectLocationFilter(locName); }
        });
        self.map = self._mapInstance.map;
        self.markersMap = self._mapInstance.markersMap;
    }
});
            
            var checkArrows = function() {
                var trackEl = $track[0];
                var scrollLeft = trackEl.scrollLeft;
                var maxScroll = trackEl.scrollWidth - trackEl.clientWidth;
                $left.toggle(scrollLeft > 5);
                $right.toggle(scrollLeft < maxScroll - 5);
            };
            checkArrows();
            
            $left.off('click').on('click', function() { $track.animate({ scrollLeft: $track.scrollLeft() - 200 }, 300, checkArrows); });
            $right.off('click').on('click', function() { $track.animate({ scrollLeft: $track.scrollLeft() + 200 }, 300, checkArrows); });
            $track.off('scroll').on('scroll', checkArrows);
            $(window).off('resize.avatarBar').on('resize.avatarBar', checkArrows);
            
            var isDown = false, startX, scrollStart;
            $('#moments-avatar-bar').off('mousedown').on('mousedown', function(e) {
    isDown = true;
    startX = e.pageX;
    scrollStart = $track.scrollLeft();
    $track.addClass('dragging');
    e.preventDefault(); // 阻止图片拖拽和文字选中
});
            $(document).off('mouseup.avatarBar').on('mouseup.avatarBar', function() { isDown = false; $track.removeClass('dragging'); });
            $(document).off('mousemove.avatarBar').on('mousemove.avatarBar', function(e) { if (!isDown) return; $track.scrollLeft(scrollStart - (e.pageX - startX)); });
            
            var originalApply = this.applyFilters;
            this.applyFilters = function() {
                this.filteredStatuses = [];
                var self2 = this;
                $.each(this.allStatuses, function(i, s) {
                    if (self2.currentFilters.author && self2.currentFilters.author !== 'all' && s._author !== self2.currentFilters.author) return;
                    var date = new Date(s.date);
                    var y = self2.currentFilters.year, m = self2.currentFilters.month, l = self2.currentFilters.location;
                    if (y && y !== 'all' && date.getFullYear().toString() !== y) return;
                    if (m && m !== 'all' && (date.getMonth() + 1).toString() !== m) return;
                    if (l && l !== 'all') {
                        var lk = s.location ? s.location.split(' · ').pop().trim() : '';
                        if (lk !== l) return;
                        if (s._setting && s._setting.location === false) return;
                    }
                    self2.filteredStatuses.push(s);
                });
                this.currentIndex = 0;
                this.initialLoadComplete = false;
                if (this.msnry) this.msnry.destroy();
                this.$grid.empty().append('<div class="grid-sizer"></div><div class="gutter-sizer"></div>');
                this.renderFirstBatch();
                this.msnry = this.$grid.masonry({ itemSelector: '.status-item', columnWidth: '.grid-sizer', gutter: '.gutter-sizer', percentPosition: true, transitionDuration: '0.3s', stagger: 30, hiddenStyle: { opacity: 0, transform: 'translateY(20px)' }, visibleStyle: { opacity: 1, transform: 'translateY(0)' } }).data('masonry');
                var $its = this.$grid.find('.status-item');
                var s3 = this;
                $its.each(function(idx) { var $t = $(this); setTimeout(function() { $t.addClass('is-shown'); }, idx * STAGGER_DELAY); });
                this.currentIndex = this.pageSize;
                this.$grid.find('.status-images a').each(function() { s3.bindImageLoad($(this)); });
                if (this.currentIndex >= this.filteredStatuses.length && this.allFriendsLoaded) { $('#load-more-btn').text('🎉 已经到底啦').prop('disabled', true).show(); }
                else { $('#load-more-btn').text('📜 上滑加载更多').prop('disabled', false).show(); }
                this.$grid.imagesLoaded(function() { s3.initialLoadComplete = true; if (s3.msnry) s3.msnry.layout(); s3.preloadMusicInfo(); });
                $('html, body').animate({ scrollTop: 0 }, 300);
            };
        };


        MomentsManager.prototype.formatDate = function(dateString) {
            var date = new Date(dateString);
            var now = new Date();
            var diffMs = now - date;
            var diffMinutes = Math.floor(diffMs / 60000);
            var diffHours = Math.floor(diffMs / 3600000);
            var targetDay = new Date(date.getFullYear(), date.getMonth(), date.getDate());
            var today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            var diffDays = Math.floor((today - targetDay) / 86400000);
            var diffWeeks = Math.floor(diffDays / 7);
            var diffMonths = Math.floor(diffDays / 30);
            var diffYears = Math.floor(diffDays / 365);

            if (diffMinutes < 1) return '刚刚';
            if (diffMinutes < 60) return diffMinutes + '分钟前';
            if (diffHours < 24) return diffHours + '小时前';
            if (diffDays === 0) return '今天';
            if (diffDays === 1) return '昨天';
            if (diffDays === 2) return '前天';
            if (diffDays > 2 && diffDays < 7) return diffDays + '天前';
            if (diffWeeks === 1) return '1周前';
            if (diffWeeks > 1 && diffWeeks < 4) return diffWeeks + '周前';
            if (diffMonths === 1) return '1个月前';
            if (diffMonths > 1 && diffMonths < 12) return diffMonths + '个月前';
            if (diffYears === 1) return '1年前';
            if (diffYears > 1) return diffYears + '年前';
            return date.toLocaleDateString('zh-CN');
        };

        // ========== 核心：创建动态卡片（头像+名字，评论/转到，setting 控制） ==========
        MomentsManager.prototype.createStatusElement = function(status) {
            var lowerDevice = (status.device || '').toLowerCase();
            var deviceIcon = MOBILE_KEYWORDS.some(function(k) { return lowerDevice.indexOf(k) !== -1; }) ? '📱' : '💻';
            var isMine = status._isMine === true;
            var author = status._author || '';
            var avatar = status._avatar || '';
            var domain = status._domain || '';
            var setting = status._setting || { device: true, location: true };

            // 头像 + 名字栏
            var authorHtml = '';
            if (author) {
                authorHtml = '<div class="moments-author" style="display:flex;align-items:center;gap:8px;margin-bottom:15px;">' +
                    '<a href="https://' + domain + '" target="_blank" style="display:flex;align-items:center;gap:8px;text-decoration:none;color:inherit;">' +
                    (avatar ? '<img src="' + avatar + '" style="width:28px;height:28px;border-radius:50%;object-fit:cover;" onerror="this.style.display=\'none\'">' : '') +
                    '<span style="font-size:0.85rem;font-weight:600;color:var(--color-text-secondary);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block;">' + author + '</span>' +
                    '</a>' +
                    '</div>';
            }

            // 音乐 HTML
            var musicHtml = '';
            if (status.music && window.STATUS_STATUS_MUSIC) {
                var musicLinkEscaped = status.music.replace(/"/g, '&quot;');
                var musicLinkSingleEscaped = status.music.replace(/'/g, "\\'");
                musicHtml = '<div class="status-music is-playlist" data-music-link="' + musicLinkEscaped + '">' +
                    '<div class="status-music-cover-wrap" onclick="window._statusMusicPlayer.toggle(this.querySelector(\'.status-music-btn\'), \'' + musicLinkSingleEscaped + '\')">' +
                    '<img class="music-cover-img" alt="" style="width:100%;height:100%;object-fit:cover;background:var(--color-background-overlay,#e8e8e8);">' +
                    '<button class="status-music-btn">' + ICONS.cardPlay + '</button></div>' +
                    '<div class="music-lrc-overlay"><div class="music-lrc-text"></div></div>' +
                    '<div class="status-music-info"><div class="music-info-row"><div class="music-info-text">' +
                    '<div style="display:flex;align-items:center;min-width:0;">' +
                    ICONS.musicSingle + ICONS.musicPlaylist +
                    '<div class="status-music-name">加载中...</div></div>' +
                    '<div class="status-music-artist">点击播放获取</div></div>' +
                    '<div class="music-dice-btn" onclick="window._statusMusicPlayer.rollDice(this, event)" ontouchstart="event.stopPropagation();" style="display:none;">' +
                    ICONS.dice + '</div></div></div></div>';
            }

            // 图片
            var imagesHtml = '';
            if (status.images && status.images.length) {
                imagesHtml = '<div class="status-images">' +
                    status.images.map(function(img) {
                        return '<a href="' + img + '" data-fancybox="gallery-' + (status.id || status.date || Math.random()) + '"><img src="' + img + '" loading="lazy"></a>';
                    }).join('') + '</div>';
            }

            // 评论/转到按钮
            var actionHtml = '';
            if (isMine && window.STATUS_STATUS_COMMENT) {
                actionHtml = '<div class="status-actions">' +
                    '<button class="status-comment-toggle" data-id="' + status.id + '" onclick="window._statusActions.toggleComments(\'' + status.id + '\', this)">' +
                    ICONS.comment + '评论</button></div>';
            } else if (!isMine) {
                var targetUrl = 'https://' + domain + '/status/?id=' + status.id;
                actionHtml = '<div class="status-actions">' +
                    '<a href="' + targetUrl + '" target="_blank" class="status-comment-toggle" style="text-decoration:none;">跳转' +
                    ICONS.jump + '</a></div>';
            }

            // Meta 信息（根据 setting 控制）
            var metaHtml = '<div class="status-meta">';
            if (isMine) {
                metaHtml += (window.STATUS_STATUS_LOCATION ? '<span>📍 ' + (status.location || '未知') + '</span>' : '');
                metaHtml += (window.STATUS_STATUS_DATE ? '<span>📅 ' + (status.date ? this.formatDate(status.date) : '未知') + '</span>' : '');
                metaHtml += (window.STATUS_STATUS_DEVICE ? '<span>' + deviceIcon + ' ' + (status.device || '未知') + '</span>' : '');
            } else {
                metaHtml += (setting.location !== false ? '<span>📍 ' + (status.location || '未知') + '</span>' : '');
                metaHtml += '<span>📅 ' + (status.date ? this.formatDate(status.date) : '未知') + '</span>';
                metaHtml += (setting.device !== false ? '<span>' + deviceIcon + ' ' + (status.device || '未知') + '</span>' : '');
            }
            metaHtml += '</div>';

            var anchorBadge = '';
            if (new URLSearchParams(window.location.search).get('id') === status.id || window.location.hash === '#' + status.id) {
                anchorBadge = '<div class="status-anchor-badge">🔗 定位</div>';
            }

            var html = '<div class="status-item" id="' + status.id + '">' +
                anchorBadge +
                authorHtml +
                '<div class="status-content">' +
                status.content
                    .replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/\n/g, '<br>')
                    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                    .replace(/\*(.*?)\*/g, '<em>$1</em>') +
                '</div>' +
                (window.STATUS_STATUS_MUSIC ? musicHtml : '') +
                imagesHtml +
                '<div class="meta-drawer">' +
                actionHtml +
                metaHtml +
                '</div></div>';

            return $(html);
        };

        // ========== 渲染/加载更多 ==========
        MomentsManager.prototype.render = async function() {
            var self = this;

            // 如果当前已展示的数据到末尾了，且还有朋友没加载
            if (this.currentIndex >= this.filteredStatuses.length) {
                if (!this.allFriendsLoaded) {
                    this.isLoading = true;
                    var $btn = $('#load-more-btn');
                    $btn.text('⏳ 加载中...').show();
                    await this.loadMoreFriends();
                    this.filteredStatuses = this.allStatuses.slice();
                    this.currentIndex = this.filteredStatuses.length > 0 ? Math.min(this.currentIndex, this.filteredStatuses.length) : 0;
                    this.initFilters();
                    this.isLoading = false;
                }

                if (this.currentIndex >= this.filteredStatuses.length) {
                    if (this.currentIndex === 0) this.$grid.append('<div class="loading">无匹配动态。</div>');
                    else $('#load-more-btn').text('🎉 已经到底啦').prop('disabled', true).show();
                    return;
                }
            }

            if (this.isLoading) return;
            this.isLoading = true;
            var $btn = $('#load-more-btn');
            $btn.text('⏳ 正在加载...').show();

            setTimeout(function() {
                var nextBatch = self.filteredStatuses.slice(self.currentIndex, self.currentIndex + self.pageSize);
                var $fragment = $(document.createDocumentFragment());
                $.each(nextBatch, function(i, status) { $fragment.append(self.createStatusElement(status)); });
                self.$grid.append($fragment);
                var $newItems = self.$grid.find('.status-item').slice(-nextBatch.length);
                $newItems.each(function(index) {
                    var $this = $(this);
                    setTimeout(function() { $this.addClass('is-shown'); }, index * 50);
                });
                self.$grid.find('.status-item').css('will-change', 'auto');
                $newItems.css('will-change', 'transform');
                self.msnry.appended($newItems.toArray());
                self.msnry.layout();
                $newItems.css('will-change', 'auto');
                $newItems.find('.status-images a').each(function() { self.bindImageLoad($(this)); });
                self.currentIndex += self.pageSize;

                if (self.currentIndex >= self.filteredStatuses.length && self.allFriendsLoaded) {
                    $btn.text('🎉 已经到底啦').prop('disabled', true).show();
                } else {
                    $btn.text('📜 上滑加载更多').prop('disabled', false).show();
                }
                self.preloadMusicInfo();
                self.isLoading = false;
            }, 100);
        };

        // ====== 以下方法不变 ======

        MomentsManager.prototype.bindImageLoad = function($link) {
            var $img = $link.find('img');
            if (!$img.length) return;
            var self = this;
            var src = $img.attr('src');
            var loaded = false;

            function markLoaded() {
                if (loaded) return;
                loaded = true;
                $link.addClass('loaded');
                if (self.msnry) self.msnry.layout();
            }

            if ($img[0].complete && $img[0].naturalWidth > 0) {
                markLoaded();
                return;
            }
            $img.one('load', markLoaded);
            $img[0].onerror = function() {
                if (loaded) return;
                this.style.opacity = '0';
                setTimeout(function() {
                    if (!loaded) {
                        $img.attr('src', '');
                        setTimeout(function() { $img.attr('src', src + '?r=' + Date.now()); }, 50);
                    }
                }, 5000);
            };
        };

        MomentsManager.prototype.preloadMusicInfo = function() {
            if (!window.STATUS_STATUS_MUSIC) return;
            var self = this;
            var musicPlayer = new MusicPlayer();
            this.$grid.find('.status-music').each(function() {
                var $card = $(this);
                var link = $card.data('music-link');
                if (!link) return;

                if (window._statusMusicPlayer._currentLink === link) {
                    window._statusMusicPlayer._resumeCard(this);
                    return;
                }

                var cached = window._statusMusicPlayer._songCache[link];
                if (cached) {
                    var song = cached[0];
                    var $cover = $card.find('.music-cover-img');
                    if (song.cover) {
                        $cover.attr('src', song.cover).addClass('loaded');
                        $card.find('.status-music-cover-wrap').addClass('loaded');
                    }
                    $card.find('.status-music-name').text(song.name || '未知');
                    $card.find('.status-music-artist').text(song.artist || '未知');
                    if (cached.length > 1) {
                        $card.find('.music-dice-btn').show();
                        $card.find('.music-playlist-icon').show();
                        $card.find('.music-single-icon').hide();
                    } else {
                        $card.find('.music-dice-btn').hide();
                        $card.find('.music-playlist-icon').hide();
                        $card.find('.music-single-icon').show();
                    }
                    $card.data('songs', cached);
                    return;
                }

                musicPlayer.load(link).then(function(songs) {
                    window._statusMusicPlayer._songCache[link] = songs;
                    if (!songs || songs.length === 0) return;
                    var song = songs[0];
                    var $cover = $card.find('.music-cover-img');
                    if (song.cover) {
                        $cover.attr('src', song.cover);
                        $cover.on('load', function() { $(this).addClass('loaded'); $card.find('.status-music-cover-wrap').addClass('loaded'); });
                        $cover.on('error', function() { $(this).hide(); $card.find('.status-music-cover-wrap').addClass('loaded'); });
                    }
                    $card.find('.status-music-name').text(song.name || '未知');
                    $card.find('.status-music-artist').text(song.artist || '未知');
                    if (songs.length > 1) {
                        $card.find('.music-dice-btn').show();
                        $card.find('.music-playlist-icon').show();
                        $card.find('.music-single-icon').hide();
                    } else {
                        $card.find('.music-dice-btn').hide();
                        $card.find('.music-playlist-icon').hide();
                        $card.find('.music-single-icon').show();
                    }
                    $card.data('songs', songs);
                }).catch(function() {});
            });
        };

        MomentsManager.prototype.loadCommentCounts = function() {
            if (!window.STATUS_STATUS_COMMENT) return;
            if (typeof twikoo === 'undefined' || !twikoo.getCommentsCount) return;
            // 只加载自己的动态评论数
            var myUrls = this.allStatuses.filter(function(s) { return s._isMine; }).map(function(s) { return '/status/?id=' + s.id; });
            if (myUrls.length === 0) return;
            twikoo.getCommentsCount({
                envId: 'https://rakientwikoo.netlify.app/.netlify/functions/twikoo',
                urls: myUrls,
                includeReply: true
            }).then(function(res) {
                res.forEach(function(item) {
                    var statusId = item.url.replace('/status/?id=', '');
                    var $btn = document.querySelector('.status-comment-toggle[data-id="' + statusId + '"]');
                    if ($btn && item.count > 0) {
                        $btn.innerHTML = ICONS.comment + ' ' + item.count + '评论';
                    }
                });
            }).catch(function() {});
        };

        MomentsManager.prototype.checkHashAndScroll = function() {
            var targetId = '';
            var urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('id')) {
                targetId = urlParams.get('id');
            } else {
                var hash = window.location.hash;
                if (hash) {
                    var possibleId = hash.replace('#', '');
                    if (possibleId && !/^[a-f0-9]{32}$/.test(possibleId)) targetId = possibleId;
                }
            }
            if (!targetId) return;
            var self = this;
            var targetIndex = this.allStatuses.findIndex(function(s) { return s.id === targetId; });
            if (targetIndex === -1) return;
            var targetStatus = this.allStatuses.splice(targetIndex, 1)[0];
            this.allStatuses.unshift(targetStatus);
            this.filteredStatuses = this.allStatuses.slice();
            this.applyFilters();
            setTimeout(function() {
                var el = document.getElementById(targetId);
                if (el) {
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                    setTimeout(function() {
                        el.classList.add('status-flash');
                        setTimeout(function() { el.classList.remove('status-flash'); }, 1800);
                    }, 400);
                }
            }, 800);
        };

        return MomentsManager;
    })();

    $(document).ready(function() {
        new MomentsManager();
    });

})(jQuery);