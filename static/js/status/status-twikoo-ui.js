(function() {
    function upgradeCommentSystem() {
        const modalBody = document.getElementById('commentModalBody');
        if (!modalBody) return;

        const observer = new MutationObserver((mutations, obs) => {
            // 1. 隐藏网址输入框 — 只隐顶层提交框的，不碰回复框
            const topSubmit = modalBody.querySelector('.tk-comments > .tk-submit');
            if (topSubmit) {
                const linkInput = topSubmit.querySelector('input[name="link"]');
                if (linkInput) {
                    const wrapper = linkInput.closest('.el-input');
                    if (wrapper) wrapper.style.display = 'none';
                }
            }

            // 2. 单列布局
            const metaInputs = modalBody.querySelectorAll('.tk-meta-input');
            metaInputs.forEach(function(metaInput) {
                metaInput.style.display = 'grid';
                metaInput.style.gridTemplateColumns = '1fr';
                metaInput.style.gap = '12px';
            });

            // 3. 缩小评论输入框
            const textareas = modalBody.querySelectorAll('.el-textarea__inner');
            textareas.forEach(function(textarea) {
                textarea.style.minHeight = '60px';
                textarea.style.height = '60px';
            });
            // 4. 将主评论的“预览”按钮改成“取消”（关闭弹窗）
            const topSubmitForBtn = modalBody.querySelector('.tk-comments > .tk-submit');
            if (topSubmitForBtn) {
                const topPreviewBtn = topSubmitForBtn.querySelector('.tk-preview');
                // 判断条件，确保还没有改造过它（防止页面无限卡死）
                if (topPreviewBtn && !topPreviewBtn.dataset.modified) {
                    // 深度克隆节点，这一步非常重要！它能洗掉 Vue 框架原本绑定的“预览”功能
                    const newBtn = topPreviewBtn.cloneNode(true);
                    newBtn.dataset.modified = 'true'; // 加上自定义标记
                    
                    const span = newBtn.querySelector('span');
                    if (span) {
                        span.textContent = '取消';
                    } else {
                        newBtn.textContent = '取消';
                    }
                    
                    // 绑定我们自己的“关闭弹窗”功能
                    newBtn.addEventListener('click', function(e) {
                        e.preventDefault();
                        if (window._statusActions && window._statusActions.closeCommentModal) {
                            window._statusActions.closeCommentModal();
                        }
                    });
                    
                    // 将洗掉 Vue 事件并绑好新事件的按钮替换回去
                    topPreviewBtn.parentNode.replaceChild(newBtn, topPreviewBtn);
                }
            }

            // 5. 彻底隐藏所有子评论（回复）里的“预览”按钮
            const allPreviewBtns = modalBody.querySelectorAll('.tk-preview');
            allPreviewBtns.forEach(function(btn) {
                // 判断一下：如果这个预览按钮不在最顶层的框里（说明是在回复别人的框里）
                const isTop = btn.closest('.tk-comments > .tk-submit');
                if (!isTop) { 
                    btn.style.display = 'none'; // 直接隐藏掉
                }
            });
        });

        observer.observe(modalBody, {
            childList: true,
            subtree: true
        });
    }

    // ==================== 分享功能 (改为 ?id=) ====================
    window._statusActions.copyShareLink = function() {
        if (!this.currentId) return;

        // 💡 动态拼接带有 ?id= 的标准分享链接
        var url = window.location.origin + window.location.pathname + '?id=' + this.currentId;

        // 📱 手机端：如果支持原生分享，直接唤起系统分享
        if (navigator.share) {
            navigator.share({
                title: '分享一条动态',
                url: url
            }).catch(function() {});
        } else {
            // 💻 电脑端：触发复制链接逻辑
            var textarea = document.createElement('textarea');
            textarea.value = url;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            try {
                document.execCommand('copy');
                var btn = document.querySelector('.comment-share-btn');
                if (btn) {
                    btn.textContent = '✅ 已复制';
                    setTimeout(function() {
                        btn.textContent = '🔗 分享该动态';
                    }, 1500);
                }
            } catch (e) {}
            document.body.removeChild(textarea);
        }
    };


    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', upgradeCommentSystem);
    } else {
        upgradeCommentSystem();
    }
})();