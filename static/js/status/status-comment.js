// ==================== status-comment.js ====================
(function() {
    'use strict';

    window._statusActions = {
        currentId: null,

        toggleComments: function(statusId, btn) {
            if (this.currentId === statusId) {
                this.closeCommentModal();
                return;
            }
            this.currentId = statusId;

            // ✅ 修改 URL，不刷新页面
            var url = new URL(window.location);
            url.searchParams.set('id', statusId);
            window.history.replaceState({}, '', url);

            var overlay = document.getElementById('commentModalOverlay');
            var body = document.getElementById('commentModalBody');
            body.innerHTML = '<div id="twikoo-' + statusId + '"></div>';
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';

            setTimeout(function() {
                body.scrollTop = 0;        //每次点开评论后, 评论里的滚动条要到最顶上去
            }, 300);

            twikoo.init({
                envId: 'https://rakientwikoo.netlify.app/.netlify/functions/twikoo',
                el: '#twikoo-' + statusId,
                path: '/status/?id=' + statusId,
                href: window.location.origin + window.location.pathname + '?id=' + statusId,
                lang: 'zh-CN',
                onCommentLoaded: function() {
                    twikoo.getCommentsCount({
                        envId: 'https://rakientwikoo.netlify.app/.netlify/functions/twikoo',
                        urls: ['/status/?id=' + statusId],
                        includeReply: false
                    }).then(function(res) {
                        if (res && res.length > 0) {
                            var count = res[0].count || 0;
                            var $btn = document.querySelector('.status-comment-toggle[data-id="' + statusId + '"]');
                            if ($btn) {
                                $btn.innerHTML = window.STATUS_ICONS.comment + ' ' + (count > 0 ? count + '评论' : '评论');
                            }
                        }
                    }).catch(function() {});
                }
            });
        },

        closeCommentModal: function() {
            document.getElementById('commentModalOverlay').classList.remove('active');
            document.body.style.overflow = '';
            this.currentId = null;

            // ✅ 删除 URL 里的 id 参数
            var url = new URL(window.location);
            url.searchParams.delete('id');
            window.history.replaceState({}, '', url);
        },

        closeModal: function(e) {
            if (e.type === 'mousedown') {
                this._mousedownTarget = e.target;
                this._mousedownPos = { x: e.clientX, y: e.clientY };
                return;
            }
            if (e.type === 'mouseup') {
                var isSameTarget = e.target === e.currentTarget && this._mousedownTarget === e.currentTarget;
                var dx = Math.abs(e.clientX - this._mousedownPos.x);
                var dy = Math.abs(e.clientY - this._mousedownPos.y);
                var isNotDrag = dx < 5 && dy < 5;

                if (isSameTarget && isNotDrag) {
                    this.closeCommentModal();
                }
            }
        },

        copyShareLink: function() {
            var url = window.location.origin + window.location.pathname + '?id=' + this.currentId;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(url).then(function() {
                    alert('链接已复制');
                });
            } else {
                var input = document.createElement('input');
                input.value = url;
                document.body.appendChild(input);
                input.select();
                document.execCommand('copy');
                document.body.removeChild(input);
                alert('链接已复制');
            }
        }
    };

})();