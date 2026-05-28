// ==================== status.js ====================
(function($) {
    'use strict';

    var ICONS = window.STATUS_ICONS;
    var MOBILE_KEYWORDS = window.MOBILE_DEVICE_KEYWORDS;

    var STAGGER_DELAY = 80;

    var StatusManager = (function() {
        function StatusManager() {
            this.baseUrl = window.STATUS_API_URL;
            this.dataUrl = this.baseUrl + '?t=' + Date.now();
            this.allStatuses = [];
            this.filteredStatuses = [];
            this.currentIndex = 0;
            this.pageSize = 6;
            this.isLoading = false;
            this.initialLoadComplete = false;
            this.currentFilters = { year: 'all', month: 'all', location: 'all' };
            this._mapInstance = null;
            this.map = null;
            this.markersMap = {};
            this.$grid = null;
            this.msnry = null;
            this.init();
        }

        StatusManager.prototype.init = async function() {
            var self = this;
            try {
                var response = await fetch(this.dataUrl);
                var data = await response.json();
                this.allStatuses = (data.statuses || []).sort(function(a, b) {
                    var pa = a.pinned || 0;
                    var pb = b.pinned || 0;
                    if (pa > 0 && pb > 0) return pa - pb;
                    if (pa > 0) return -1;
                    if (pb > 0) return 1;
                    return new Date(b.date) - new Date(a.date);
                });
                this.filteredStatuses = this.allStatuses.slice();

                this.initMasonry();
                this.initFilters();
                this.renderFirstBatch();
                this.finalizeInit();

                if (window._initStatusMap) {
                    setTimeout(function() {
                        self._mapInstance = window._initStatusMap('status-map', self.allStatuses, {
                            onLocationClick: function(locName) {
                                self.selectLocationFilter(locName);
                            }
                        });
                        self.map = self._mapInstance.map;
                        self.markersMap = self._mapInstance.markersMap;
                    }, 300);
                }

                this.initialLoadComplete = true;

                this.$grid.imagesLoaded(function() {
                    if (self.msnry) self.msnry.layout();
                });

                this.loadCommentCounts();
                this.checkHashAndScroll();
                this.preloadMusicInfo();
                this.bindEvents();
                this.initFancybox();

            } catch (error) {
                $('#status-list').html('<div style="max-width:400px;margin:40px auto;padding:24px 20px;background:var(--color-background-card,#fff);border:1px solid rgba(255,152,0,0.2);box-shadow:0 4px 16px rgba(0,0,0,0.04);border-radius:12px;text-align:center;font-family:-apple-system,BlinkMacSystemFont,\'Segoe UI\',Roboto,sans-serif"><div style="font-size:1rem;font-weight:600;color:var(--color-text,#333);margin-bottom:6px">动态加载失败...</div><div style="font-size:0.85rem;color:var(--color-text-secondary,#777);line-height:1.5">可能被博主吃了<br>刷新页面试一下吧</div></div>');
            }
        };

        StatusManager.prototype.initMasonry = function() {
            this.$grid = $('#status-list');
            if (!$('.gutter-sizer').length) {
                this.$grid.prepend('<div class="gutter-sizer"></div>');
            }
        };

        StatusManager.prototype.initFancybox = function() {
            if (typeof Fancybox !== 'undefined') {
                Fancybox.bind('[data-fancybox^="gallery-"]', {
                    hideScrollbar: false,
                    lockScroll: false,
                    touch: false,
                    Hash: false,
                    transitionDuration: 200,
                    Carousel: {
                        Thumbs: true,
                        Toolbar: { display: { left: [], middle: [], right: ['download'] } },
                        Zoomable: { Panzoom: { maxScale: 'cover', panMode: 'mousemove', mouseMoveFactor: 1.1, friction: 0.9 } }
                    }
                });
            }
        };

        StatusManager.prototype.finalizeInit = function() {
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

            if (this.currentIndex >= this.filteredStatuses.length) {
                $('#load-more-btn').text('🎉 已经到底啦').prop('disabled', true).show();
            } else {
                $('#load-more-btn').text('📜 上滑加载更多').prop('disabled', false).show();
            }

            $('#filterToggle').on('click', function(e) { e.stopPropagation(); $('#filterModal').addClass('show'); });
            $('#filterModalClose').on('click', function() { $('#filterModal').removeClass('show'); });
            $('#filterModal').on('click', function(e) { if (e.target === this) $(this).removeClass('show'); });
        };

        StatusManager.prototype.renderFirstBatch = function() {
            var firstBatch = this.filteredStatuses.slice(0, this.pageSize);
            var $fragment = $(document.createDocumentFragment());
            var self = this;
            $.each(firstBatch, function(i, status) {
                $fragment.append(self.createStatusElement(status));
            });
            this.$grid.append($fragment);
            this.currentIndex = this.pageSize;
        };

        StatusManager.prototype.bindEvents = function() {
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

        StatusManager.prototype.isNearBottom = function() {
            var scrollTop = $(window).scrollTop();
            var windowHeight = $(window).height();
            var documentHeight = $(document).height();
            return scrollTop + windowHeight >= documentHeight - 300;
        };

        StatusManager.prototype.initFilters = function() {
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
                if (s.location) {
                    var locKey = s.location.split(' · ').pop().trim();
                    if (locKey) locations.add(locKey);
                }
            });
            this.buildCustomSelect('filter-year', years, '年份', 'year', function(a, b) { return b - a; });
            this.buildCustomSelect('filter-month', months, '月份', 'month', function(a, b) { return a - b; });
            this.buildCustomSelect('filter-location', locations, '地点', 'location');
        };

        StatusManager.prototype.buildCustomSelect = function(id, items, label, type, sortFn) {
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

        StatusManager.prototype.syncMapToLocation = function(locationValue) {
            if (!this._mapInstance) return;
            if (locationValue === 'all') {
                this._mapInstance.resetView();
                return;
            }
            this._mapInstance.flyToMarker(locationValue);
        };

        StatusManager.prototype.selectLocationFilter = function(locationValue) {
            var $wrapper = $('#filter-location');
            if (!$wrapper.length) return;
            $wrapper.find('.select-trigger').text(locationValue === 'all' ? '地点' : locationValue);
            this.currentFilters.location = locationValue;
            this.syncMapToLocation(locationValue);
            this.applyFilters();
        };

        StatusManager.prototype.applyFilters = function() {
            var year = this.currentFilters.year;
            var month = this.currentFilters.month;
            var location = this.currentFilters.location;
            var self = this;

            this.filteredStatuses = [];
            $.each(this.allStatuses, function(i, s) {
                var date = new Date(s.date);
                var matchYear = (year === 'all' || date.getFullYear().toString() === year);
                var matchMonth = (month === 'all' || (date.getMonth() + 1).toString() === month);
                var matchLoc = true;
                if (location !== 'all') {
                    var locKey = s.location ? s.location.split(' · ').pop().trim() : '';
                    matchLoc = locKey === location;
                }
                if (matchYear && matchMonth && matchLoc) self.filteredStatuses.push(s);
            });

            this.currentIndex = 0;
            this.initialLoadComplete = false;
            if (this.msnry) this.msnry.destroy();
            this.$grid.empty().append('<div class="grid-sizer"></div><div class="gutter-sizer"></div>');
            this.renderFirstBatch();

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

            if (this.currentIndex >= this.filteredStatuses.length) {
                $('#load-more-btn').text('🎉 已经到底啦').prop('disabled', true).show();
            } else {
                $('#load-more-btn').text('📜 上滑加载更多').prop('disabled', false).show();
            }

            this.$grid.imagesLoaded(function() {
                self.initialLoadComplete = true;
                if (self.msnry) self.msnry.layout();
                self.preloadMusicInfo();
            });

            $('html, body').animate({ scrollTop: 0 }, 300);
        };

        StatusManager.prototype.formatDate = function(dateString) {
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

        StatusManager.prototype.createStatusElement = function(status) {
            var lowerDevice = (status.device || '').toLowerCase();
            var deviceIcon = MOBILE_KEYWORDS.some(function(k) { return lowerDevice.indexOf(k) !== -1; }) ? '📱' : '💻';
            var pinned = status.pinned || 0;

            var musicHtml = '';
            if (status.music) {
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

            var imagesHtml = '';
            if (status.images && status.images.length) {
                imagesHtml = '<div class="status-images">' +
                    status.images.map(function(img) {
                        return '<a href="' + img + '" data-fancybox="gallery-' + (status.id || status.date || Math.random()) + '"><img src="' + img + '" loading="lazy"></a>';
                    }).join('') +
                    '</div>';
            }

            var html = '<div class="status-item" id="' + status.id + '"' + (pinned > 0 ? ' data-pinned="' + pinned + '"' : '') + '>' +
                (pinned > 0 ? '<div class="status-pin-badge">📌 置顶</div>' : '') +
                ((new URLSearchParams(window.location.search).get('id') === status.id || window.location.hash === '#' + status.id) ? '<div class="status-anchor-badge">🔗 定位</div>' : '') +
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
                (window.STATUS_STATUS_COMMENT ?
                    '<div class="status-actions">' +
                    '<button class="status-comment-toggle" data-id="' + status.id + '" onclick="window._statusActions.toggleComments(\'' + status.id + '\', this)">' +
                    ICONS.comment + '评论</button></div>'
                    : '') +
                '<div class="status-meta">' +
                (window.STATUS_STATUS_LOCATION ? '<span>📍 ' + (status.location || '未知') + '</span>' : '') +
                (window.STATUS_STATUS_DATE ? '<span>📅 ' + (status.date ? this.formatDate(status.date) : '未知') + '</span>' : '') +
                (window.STATUS_STATUS_DEVICE ? '<span>' + deviceIcon + ' ' + (status.device || '未知') + '</span>' : '') +
                '</div></div></div>';

            return $(html);
        };

        StatusManager.prototype.bindImageLoad = function($link) {
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

        StatusManager.prototype.preloadMusicInfo = function() {
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

        StatusManager.prototype.render = function() {
            if (this.currentIndex >= this.filteredStatuses.length) {
                if (this.currentIndex === 0) this.$grid.append('<div class="loading">无匹配动态。</div>');
                else $('#load-more-btn').text('🎉 已经到底啦').show();
                return;
            }
            if (this.isLoading) return;
            this.isLoading = true;
            var $btn = $('#load-more-btn');
            $btn.text('⏳ 正在加载...').show();
            var self = this;

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
                if (self.currentIndex >= self.filteredStatuses.length) {
                    $btn.text('🎉 已经到底啦').prop('disabled', true).show();
                } else {
                    $btn.text('📜 上滑加载更多').prop('disabled', false).show();
                }
                self.preloadMusicInfo();
                self.isLoading = false;
            }, 100);
        };

        StatusManager.prototype.loadCommentCounts = function() {
            if (!window.STATUS_STATUS_WTIKOO) return;
            if (typeof twikoo === 'undefined' || !twikoo.getCommentsCount) return;
            var urls = this.allStatuses.map(function(s) { return '/status/?id=' + s.id; });
            twikoo.getCommentsCount({
                envId: 'https://rakientwikoo.netlify.app/.netlify/functions/twikoo',
                urls: urls,
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

        StatusManager.prototype.checkHashAndScroll = function() {
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

        return StatusManager;
    })();

    $(document).ready(function() {
        new StatusManager();
    });

})(jQuery);