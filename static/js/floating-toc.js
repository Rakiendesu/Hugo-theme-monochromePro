$(document).ready(function() {
    const $originalToc = $('.collapsible-menu-wrapper');
    const $realContent = $('#TableOfContents');
    if (!$realContent.length) return;

    // 1. 构造 HTML 结构 (新增了 toc-panel-header)
    const btnHtml = `
        <div class="toc-current-bubble" id="toc-bubble"></div>
        <svg class="toc-progress-svg" viewBox="0 0 66 66">
            <circle class="toc-progress-circle" cx="33" cy="33" r="30"></circle>
        </svg>
        <div class="floating-toc-icon">📜</div>
        <div class="toc-btn-text">目录</div>
    `;
    const panelHtml = `
        <div class="toc-panel-header">
            <span class="toc-panel-title">目录</span>
            <span class="toc-close-btn">&times;</span>
        </div>
        ${$realContent[0].outerHTML}
    `;
    // 在面板构造后添加遮罩层
    const $overlay = $('<div>', { id: 'toc-overlay' }).appendTo('body');

    const $btn = $('<div>', { id: 'floating-toc-btn', html: btnHtml }).appendTo('body');
    const $panel = $('<div>', { id: 'floating-toc-panel', html: panelHtml }).appendTo('body');
    const $tocContainer = $panel.find('#TableOfContents');
    const $tocLinks = $panel.find('a');

    let isVisible = false;
    let bubbleTimeout;

    // --- 统一管理面板打开和关闭状态 ---
    const openPanel = () => {
        updatePanelPosition();
        $panel.fadeIn(200).addClass('show');
        $overlay.fadeIn(200); // 显示遮罩层
        
        $panel.find('li').each(function(index) {
            $(this).css('transition-delay', (index * 0.04) + 's');
        });
        
        if ($(window).width() <= 550) {
            $('body').addClass('toc-locked');
        }
    };

    const closePanel = () => {
        if ($panel.hasClass('show')) {
            $panel.fadeOut(300).removeClass('show');
            $overlay.fadeOut(300); // 隐藏遮罩层
            $('body').removeClass('toc-locked');
        }
    };



    // --- 智能位置计算函数 ---
    function updatePanelPosition() {
        const winWidth = $(window).width();
        const winHeight = $(window).height();

        // 移动端交由 CSS 媒体查询控制
        if (winWidth <= 550) {
            $panel.css({ left: '', right: '', top: '', bottom: '' });
            return;
        }

        const btnRect = $btn[0].getBoundingClientRect();
        const gap = 15; 
        let cssObj = { left: 'auto', right: 'auto', top: 'auto', bottom: 'auto' };

        if (btnRect.left < winWidth / 2) {
            cssObj.left = Math.max(16, btnRect.left) + 'px';
        } else {
            cssObj.right = Math.max(16, winWidth - btnRect.right) + 'px';
        }

        if (btnRect.top < winHeight / 2) {
            cssObj.top = (btnRect.bottom + gap) + 'px';
        } else {
            cssObj.bottom = (winHeight - btnRect.top + gap) + 'px';
        }
        $panel.css(cssObj);
    }

    // 2. 滚动监听
    $(window).scroll(function() {
        const scrollTop = $(window).scrollTop();
        const docHeight = $(document).height() - $(window).height();
        const scrollPercent = docHeight > 0 ? scrollTop / docHeight : 0; 
        
        // 更新进度条圆环
        const offset = 188.5 - (scrollPercent * 188.5);
        $('.toc-progress-circle').css('stroke-dashoffset', offset);

        // 高亮追踪与气泡逻辑
        let currentHeadingId = '';
        let currentHeadingText = '';

        $tocLinks.each(function() {
            const href = $(this).attr('href');
            const target = $(decodeURIComponent(href));
            if (target.length && scrollTop >= target.offset().top - 120) {
                currentHeadingId = href;
                currentHeadingText = $(this).text().trim();
            }
        });

        if (currentHeadingId) {
            $tocLinks.removeClass('current-active');
            const $activeLink = $tocLinks.filter(`[href="${currentHeadingId}"]`);
            $activeLink.addClass('current-active');

            const $bubble = $('#toc-bubble');
            if (currentHeadingText !== $bubble.text()) {
                $bubble.text(currentHeadingText);
            }
            $bubble.addClass('has-text');

            clearTimeout(bubbleTimeout);
            bubbleTimeout = setTimeout(() => {
                $bubble.removeClass('has-text');
            }, 1500);

            if ($panel.hasClass('show') && $activeLink.length) {
                const linkPos = $activeLink.position().top;
                if (linkPos < 0 || linkPos > $tocContainer.height()) {
                    $tocContainer.stop().animate({
                        scrollTop: $tocContainer.scrollTop() + linkPos - 100
                    }, 200);
                }
            }
        } else {
            $('#toc-bubble').removeClass('has-text');
        }

        // 按钮显示隐藏逻辑
        // 按钮显示隐藏逻辑
        const triggerPos = $originalToc.length ? ($originalToc.offset().top + $originalToc.outerHeight()) : 200;
        if (scrollTop > triggerPos) {
            if (!isVisible) {
                $btn.addClass('active');
                isVisible = true;
                
                // 只在屏幕宽度 > 550px 时触发自动弹出
                if ($(window).width() > 566) {
                    setTimeout(function() {
                        $btn.trigger('click');
                        setTimeout(function() {
                            if ($panel.hasClass('show')) {
                                closePanel();
                            }
                        }, 1500);
                    }, 100);
                }
            }
        } else {
            if (isVisible) {
                $btn.removeClass('active');
                closePanel();
                $('#toc-bubble').removeClass('has-text');
                isVisible = false;
            }
        }
    });

    // 3. 拖拽功能逻辑
    let isDragging = false;
    let startX, startY, initialLeft, initialTop;

    $btn.on('mousedown touchstart', function(e) {
        if (e.type === 'touchstart' && e.originalEvent.touches.length > 1) return;

        const clientX = e.type === 'mousedown' ? e.clientX : e.originalEvent.touches[0].clientX;
        const clientY = e.type === 'mousedown' ? e.clientY : e.originalEvent.touches[0].clientY;

        startX = clientX;
        startY = clientY;

        const rect = $btn[0].getBoundingClientRect();
        initialLeft = rect.left;
        initialTop = rect.top;

        isDragging = false;

        $btn.css('transition', 'none');
        if ($panel.hasClass('show')) {
            $panel.css('transition', 'none'); 
        }

        $(document).on('mousemove.tocDrag touchmove.tocDrag', function(e) {
            const moveX = e.type === 'mousemove' ? e.clientX : e.originalEvent.touches[0].clientX;
            const moveY = e.type === 'mousemove' ? e.clientY : e.originalEvent.touches[0].clientY;

            const dx = moveX - startX;
            const dy = moveY - startY;

            if (Math.abs(dx) > 5 || Math.abs(dy) > 5) {
                isDragging = true;
            }

            if (isDragging) {
                e.preventDefault();

                let newLeft = initialLeft + dx;
                let newTop = initialTop + dy;

                const maxX = $(window).width() - $btn.outerWidth();
                const maxY = $(window).height() - $btn.outerHeight();

                newLeft = Math.max(0, Math.min(newLeft, maxX));
                newTop = Math.max(0, Math.min(newTop, maxY));

                $btn.css({ left: newLeft + 'px', top: newTop + 'px', right: 'auto', bottom: 'auto' });

                if ($panel.hasClass('show')) {
                    updatePanelPosition(); 
                }
            }
        });

        $(document).on('mouseup.tocDrag touchend.tocDrag', function() {
            $(document).off('.tocDrag');
            $btn.css('transition', '');
            $(window).on('resize', function() {
                closePanel();
                
                // 修正按钮位置，防止在窗口外
                var btnWidth = $btn.outerWidth();
                var btnHeight = $btn.outerHeight();
                var maxX = $(window).width() - btnWidth;
                var maxY = $(window).height() - btnHeight;
                
                var currentLeft = parseFloat($btn.css('left')) || 30;
                var currentTop = parseFloat($btn.css('top')) || 70;
                
                if (currentLeft > maxX) $btn.css('left', maxX + 'px');
                if (currentTop > maxY) $btn.css('top', maxY + 'px');
                if (currentLeft < 0) $btn.css('left', '0px');
                if (currentTop < 0) $btn.css('top', '0px');
            });
            setTimeout(() => { isDragging = false; }, 50);
        });
    });

    // 4. 点击交互逻辑
    $btn.on('click', function(e) {
        e.stopPropagation();
        if (isDragging) {
            e.preventDefault();
            return;
        }

        if ($panel.is(':visible')) {
            closePanel();
        } else {
            openPanel();
        }
    });
    // 同时绑定遮罩层的点击事件，实现“点外部关闭”
    $overlay.on('click', closePanel);
    // 点击外部、点X按钮、调整窗口大小时统一关闭
    $(document).on('click', closePanel);
    $(window).on('resize', closePanel);
    $panel.on('click', '.toc-close-btn', closePanel); // 绑定刚添加的关闭按钮事件

    $panel.on('click', (e) => e.stopPropagation());

    $panel.on('click', 'a', function(e) {
        e.preventDefault();
        const targetId = decodeURIComponent($(this).attr('href'));
        const $target = $(targetId);
        if ($target.length) {
            $('html, body').animate({ scrollTop: $target.offset().top - 80 }, 600);
            if ($(window).width() < 768) closePanel();
        }
    });
});