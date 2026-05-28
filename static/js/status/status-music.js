// ==================== status-music.js ====================
(function() {
    'use strict';

    var ICONS = window.STATUS_ICONS;

    window._statusMusicPlayer = (function() {
        var currentAPlayer = null;
        var currentBtn = null;
        var card = null;
        var _currentLink = null;
        var _lastActiveLrcIndex = -1;
        var songCache = {};
        var musicPlayer = new MusicPlayer();

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
            var old = document.querySelector('.aplayer.aplayer-fixed');
            if (old) old.remove();
            if (currentBtn) {
                currentBtn.classList.remove('playing');
                setBtnIcon(currentBtn, ICONS.play);
                currentBtn = null;
            }
        }

        function updateLrc() {
            if (!currentAPlayer || !card) return;
            var audio = currentAPlayer.audio;
            if (!audio || audio.paused) return;
            var currentTime = audio.currentTime;
            var lrcEl = card.querySelector('.music-lrc-text');
            if (!lrcEl) return;

            var currentIndex = currentAPlayer.list.index;
            var currentAudio = currentAPlayer.list.audios[currentIndex] || {};
            var lrc = currentAudio.lrc || '';

            // 歌词是 URL，去拉取
            if (lrc.startsWith('http')) {
                if (currentAudio._isFetchingLrc) {
                    if (lrcEl.innerHTML.indexOf('♪') === -1) {
                        lrcEl.innerHTML = '<span class="lrc-line l1">&nbsp;</span><span class="lrc-line l2">&nbsp;</span><span class="lrc-line l3" style="opacity:0.5; font-weight:700;">♪ 歌词加载中...</span><span class="lrc-line l4">&nbsp;</span><span class="lrc-line l5">&nbsp;</span>';
                    }
                    return;
                }
                currentAudio._isFetchingLrc = true;

                if (lrcEl.innerHTML.indexOf('♪') === -1) {
                    lrcEl.innerHTML = '<span class="lrc-line l1">&nbsp;</span><span class="lrc-line l2">&nbsp;</span><span class="lrc-line l3" style="opacity:0.5; font-weight:700;">♪ 歌词加载中...</span><span class="lrc-line l4">&nbsp;</span><span class="lrc-line l5">&nbsp;</span>';
                }

                musicPlayer.fetchLrc(lrc).then(function(textLrc) {
                    currentAudio.lrc = textLrc || '\n';
                }).catch(function() {
                    currentAudio.lrc = '\n';
                }).finally(function() {
                    currentAudio._isFetchingLrc = false;
                });
                return;
            }

            if (!lrc || lrc.trim() === '') {
                lrcEl.innerHTML = '<span class="lrc-line l3" style="opacity:0.3;">♪ 纯音乐，请欣赏</span>';
                return;
            }

            var lines = lrc.split('\n');
            var activeIndex = -1;
            for (var i = 0; i < lines.length; i++) {
                var match = lines[i].match(/\[(\d+):(\d+(?:\.\d+)?)\](.*)/);
                if (match) {
                    var t = parseInt(match[1]) * 60 + parseFloat(match[2]);
                    if (t <= currentTime) activeIndex = i;
                }
            }

            if (activeIndex < 0) {
                if (_lastActiveLrcIndex !== -2) {
                    _lastActiveLrcIndex = -2;
                    lrcEl.innerHTML = '<span class="lrc-line l1">&nbsp;</span><span class="lrc-line l2">&nbsp;</span><span class="lrc-line l3" style="opacity:0.3;">♪ 歌词加载中...</span><span class="lrc-line l4">&nbsp;</span><span class="lrc-line l5">&nbsp;</span>';
                }
                return;
            }

            if (activeIndex >= 0 && activeIndex !== _lastActiveLrcIndex) {
                _lastActiveLrcIndex = activeIndex;
                var showLines = [];
                for (var i = -2; i <= 2; i++) {
                    var idx = activeIndex + i;
                    var cls = 'l' + (i + 3);
                    if (idx >= 0 && idx < lines.length) {
                        var text = lines[idx].replace(/\[.*?\]/g, '').trim();
                        showLines.push('<span class="lrc-line ' + cls + '">' + (text || '&nbsp;') + '</span>');
                    } else {
                        showLines.push('<span class="lrc-line ' + cls + '">&nbsp;</span>');
                    }
                }
                lrcEl.innerHTML = showLines.join('');
            }
        }

        function toggle(btn, link) {
            var targetCard = btn.closest('.status-music');
            var cachedSongs = songCache[link] || (targetCard ? $(targetCard).data('songs') : null);
            if (!cachedSongs || cachedSongs.length === 0) {
                return;
            }

            var clickedBtn = btn;
            var clickedLink = link;
            var lrcTimer = null;

            // 同一个按钮，切换播放/暂停
            if (currentBtn === btn && currentAPlayer) {
                currentAPlayer.toggle();
                var playing = !currentAPlayer.audio.paused;
                btn.classList.toggle('playing', playing);
                setBtnIcon(btn, playing ? ICONS.pause : ICONS.play);
                return;
            }

            if (currentBtn) {
                currentBtn.classList.remove('playing');
                setBtnIcon(currentBtn, ICONS.play);
            }

            destroyCurrent();

            btn.disabled = true;
            setBtnIcon(btn, ICONS.loading);
            currentBtn = btn;
            card = targetCard;
            _currentLink = link;

            // 异步加载播放
            (async function() {
                try {
                    var songs = songCache[link] || (card ? $(card).data('songs') : null);

                    if (!songs || !Array.isArray(songs)) {
                        songs = await musicPlayer.loadWithLrc(link);

                        if (_currentLink !== clickedLink || currentBtn !== clickedBtn) return;

                        songCache[link] = songs;
                        if (card) $(card).data('songs', songs);
                    }

                    if (songs && songs.length > 0 && songs[0].cover) {
                        songs[0].cover = await musicPlayer.resolveCover(songs[0].cover);
                    }

                    if (!songs || songs.length === 0) throw new Error('无歌曲');

                    if (songs[0].lrc && songs[0].lrc.startsWith('http')) {
                        try {
                            songs[0].lrc = await musicPlayer.fetchLrc(songs[0].lrc);
                        } catch (e) {
                            songs[0].lrc = '';
                        }
                        if (_currentLink !== clickedLink || currentBtn !== clickedBtn) return;
                    }

                    // 更新卡片
                    if (card && songs[0]) {
                        var coverImg = card.querySelector('.music-cover-img');
                        coverImg.src = songs[0].cover || '';

                        var isPlaylist = songs.length > 1;
                        var diceBtn = card.querySelector('.music-dice-btn');
                        if (diceBtn) diceBtn.style.display = isPlaylist ? '' : 'none';

                        var playlistIcon = card.querySelector('.music-playlist-icon');
                        var singleIcon = card.querySelector('.music-single-icon');
                        if (playlistIcon) playlistIcon.style.display = isPlaylist ? '' : 'none';
                        if (singleIcon) singleIcon.style.display = isPlaylist ? 'none' : '';

                        coverImg.onload = function() {
                            coverImg.classList.add('loaded');
                            var coverWrap = card.querySelector('.status-music-cover-wrap');
                            if (coverWrap) coverWrap.classList.add('loaded');
                        };

                        coverImg.onerror = function() {
                            coverImg.style.display = 'none';
                            var coverWrap = card.querySelector('.status-music-cover-wrap');
                            if (coverWrap) coverWrap.classList.add('loaded');
                        };

                        card.querySelector('.status-music-name').textContent = songs[0].name || '未知';
                        card.querySelector('.status-music-artist').textContent = songs[0].artist || '未知';
                    }

                    var container = document.getElementById('aplayer-fixed-container');
                    if (!container) {
                        container = document.createElement('div');
                        container.id = 'aplayer-fixed-container';
                        document.body.appendChild(container);
                    }

                    currentAPlayer = new APlayer({
                        container: container,
                        fixed: true,
                        mini: true,
                        listFolded: true,
                        autoplay: true,
                        preload: 'none',
                        audio: songs.map(function(s) {
                            return {
                                name: s.name || '未知',
                                artist: s.artist || '未知',
                                url: s.url,
                                cover: s.cover || '',
                                lrc: s.lrc || ''
                            };
                        })
                    });

                    // Media Session
                    if ('mediaSession' in navigator) {
                        navigator.mediaSession.setActionHandler('play', function() { if (currentAPlayer) currentAPlayer.play(); });
                        navigator.mediaSession.setActionHandler('pause', function() { if (currentAPlayer) currentAPlayer.pause(); });
                        navigator.mediaSession.setActionHandler('previoustrack', function() { if (currentAPlayer) currentAPlayer.skipBack(); });
                        navigator.mediaSession.setActionHandler('nexttrack', function() { if (currentAPlayer) currentAPlayer.skipForward(); });
                        navigator.mediaSession.setActionHandler('seekto', function(details) {
                            if (currentAPlayer && details.seekTime !== undefined) {
                                currentAPlayer.seek(details.seekTime);
                            }
                        });

                        var syncPosition = function() {
                            if (currentAPlayer && currentAPlayer.audio) {
                                var audio = currentAPlayer.audio;
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

                        currentAPlayer.on('loadedmetadata', syncPosition);
                        currentAPlayer.on('canplay', syncPosition);
                        currentAPlayer.on('seeked', syncPosition);
                    }

                    btn.classList.add('playing');
                    setBtnIcon(btn, ICONS.pause);

                    currentAPlayer.on('play', function() {
                        _lastActiveLrcIndex = -1;
                        btn.classList.add('playing');
                        setBtnIcon(btn, ICONS.pause);
                        if (card) {
                            card.querySelector('.status-music-cover-wrap').classList.add('playing-state');

                            var lrcEl = card.querySelector('.music-lrc-text');
                            if (lrcEl) {
                                lrcEl.innerHTML = '<span class="lrc-line l1">&nbsp;</span><span class="lrc-line l2">&nbsp;</span><span class="lrc-line l3" style="opacity:0.5; font-weight:700;">♪ 歌词加载中...</span><span class="lrc-line l4">&nbsp;</span><span class="lrc-line l5">&nbsp;</span>';
                            }

                            var idx = currentAPlayer.list.index;
                            var currentAudio = currentAPlayer.list.audios[idx];

                            if (currentAudio) {
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

                                var coverImg2 = card.querySelector('.music-cover-img');
                                if (coverImg2 && currentAudio.cover && coverImg2.src !== currentAudio.cover) {
                                    coverImg2.src = currentAudio.cover;
                                    coverImg2.classList.remove('loaded');
                                    coverImg2.onload = function() { coverImg2.classList.add('loaded'); };
                                }

                                var nameEl = card.querySelector('.status-music-name');
                                if (nameEl) {
                                    var typeBadge = nameEl.querySelector('.status-music-type');
                                    var badgeHtml = typeBadge ? typeBadge.outerHTML : '';
                                    nameEl.innerHTML = (currentAudio.name || '未知') + badgeHtml;
                                }

                                var artistEl = card.querySelector('.status-music-artist');
                                if (artistEl) artistEl.textContent = currentAudio.artist || '未知';
                            }
                        }

                        clearInterval(lrcTimer);
                        lrcTimer = setInterval(updateLrc, 200);
                    });

                    currentAPlayer.on('pause', function() {
                        btn.classList.remove('playing');
                        setBtnIcon(btn, ICONS.play);
                        if (card) card.querySelector('.status-music-cover-wrap').classList.remove('playing-state');
                        clearInterval(lrcTimer);
                    });

                    currentAPlayer.on('destroy', function() {
                        clearInterval(lrcTimer);
                        if (card) card.querySelector('.status-music-cover-wrap').classList.remove('playing-state');
                        if (currentBtn === clickedBtn) {
                            currentBtn.classList.remove('playing');
                            setBtnIcon(currentBtn, ICONS.play);
                        }
                    });

                } catch (err) {
                    console.error('音乐加载失败:', err);
                    if (currentBtn === clickedBtn) {
                        setBtnIcon(btn, ICONS.play);
                    }
                } finally {
                    if (currentBtn === clickedBtn) {
                        btn.disabled = false;
                    }
                }
            })();
        }

        function rollDice(diceElement, event) {
            if (event) event.stopPropagation();

            if (diceElement.classList.contains('rolling')) return;
            diceElement.classList.add('rolling');
            setTimeout(function() { diceElement.classList.remove('rolling'); }, 600);

            var targetCard = diceElement.closest('.status-music');
            if (!targetCard) return;
            var link = targetCard.getAttribute('data-music-link');
            var songs = $(targetCard).data('songs') || songCache[link];
            if (!songs || songs.length <= 1) return;

            var randomIndex = Math.floor(Math.random() * songs.length);
            var pickedSongName = '未知曲目';

            if (currentAPlayer && _currentLink === link) {
                var currentIndex2 = currentAPlayer.list.index;
                if (randomIndex === currentIndex2 && songs.length > 1) {
                    randomIndex = (randomIndex + 1) % songs.length;
                }
                currentAPlayer.list.switch(randomIndex);
                currentAPlayer.play();
                var nextAudio = currentAPlayer.list.audios[randomIndex];
                if (nextAudio) pickedSongName = nextAudio.name;
            } else {
                var picked = songs[randomIndex];
                pickedSongName = picked.name || '未知曲目';
                var rearranged = [picked].concat(songs.filter(function(_, i) { return i !== randomIndex; }));
                songCache[link] = rearranged;
                $(targetCard).data('songs', rearranged);
                var playBtn = targetCard.querySelector('.status-music-btn');
                toggle(playBtn, link);
            }

            var container = document.getElementById('music-toast-container');
            if (!container) {
                container = document.createElement('div');
                container.id = 'music-toast-container';
                document.body.appendChild(container);
            }

            var toast = document.createElement('div');
            toast.className = 'music-toast-notice';
            toast.innerHTML = '<span style="color: #ff9800; font-size: 1.1rem; line-height: 1;">🎲</span><div style="flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 260px;"><span style="color: var(--color-text-secondary, #777777); margin-right: 4px;">本歌单随机一首:</span><strong style="font-weight: 600; color: #ff9800;">' + pickedSongName + '</strong></div>';

            container.appendChild(toast);

            setTimeout(function() { toast.classList.add('active'); }, 10);

            setTimeout(function() {
                toast.classList.remove('active');
                toast.classList.add('fade-out');
                setTimeout(function() {
                    toast.remove();
                    if (container.children.length === 0) container.remove();
                }, 500);
            }, 3000);
        }

        function resumeCard(c) {
            card = c;
            if (!currentAPlayer) return;

            var idx = currentAPlayer.list.index;
            var audio = currentAPlayer.list.audios[idx] || {};
            var isPlaying = !currentAPlayer.audio.paused;

            if (audio.cover) {
                var coverImg = card.querySelector('.music-cover-img');
                if (coverImg) {
                    coverImg.src = audio.cover;
                    coverImg.classList.add('loaded');
                }
                card.querySelector('.status-music-cover-wrap').classList.add('loaded');
            }
            var nameEl = card.querySelector('.status-music-name');
            if (nameEl) nameEl.textContent = audio.name || '';
            var artistEl = card.querySelector('.status-music-artist');
            if (artistEl) artistEl.textContent = audio.artist || '';

            if (isPlaying) {
                card.querySelector('.status-music-cover-wrap').classList.add('playing-state');
                var btn = card.querySelector('.status-music-btn');
                if (btn) {
                    btn.classList.add('playing');
                    btn.innerHTML = ICONS.pause;
                    currentBtn = btn;
                }
            }
        }

        return {
            toggle: toggle,
            rollDice: rollDice,
            getAPlayer: function() { return currentAPlayer; },
            _songCache: songCache,
            get _currentLink() { return _currentLink; },
            set _currentLink(v) { _currentLink = v; },
            _resumeCard: resumeCard,
            get ICON_PAUSE() { return ICONS.pause; }
        };

    })();

})();