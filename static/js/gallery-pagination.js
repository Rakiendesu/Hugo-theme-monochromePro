// 等待 DOM 加载完成
$(document).ready(function() {
    var $gallery = $('.fullscreen-gallery');
    if (!$gallery.length) return;
    
    // 读取配置
    var totalImages = parseInt($gallery.data('total'));
    var perPage = parseInt($gallery.data('per-page'));
    var batchSize = parseInt($gallery.data('batch-size'));
    var allImages = $gallery.data('images');
    
    // 当前已显示数量
    var currentIndex = 0;
    var isLoading = false;
    
    // 初始渲染
    loadMoreImages();
    
    // 加载更多按钮点击事件
    $('#load-more-btn').on('click', function() {
        if (isLoading) return;
        loadMoreImages();
    });
    
    function loadMoreImages() {
        if (currentIndex >= totalImages) {
            $('#load-more-btn').prop('disabled', true).text('没有更多了');
            return;
        }
        
        isLoading = true;
        $('#loading-spinner').show();
        $('#load-more-btn').prop('disabled', true).text('加载中...');
        
        // 模拟异步加载（让转圈圈可见）
        setTimeout(function() {
            // 计算本次要加载的数量
            var isFirstLoad = (currentIndex === 0);
            var batchCount = isFirstLoad ? perPage : batchSize;
            var endIndex = Math.min(currentIndex + batchCount, totalImages);
            
            // 获取本次要显示的图片
            var imagesToShow = allImages.slice(currentIndex, endIndex);
            
            // 生成 HTML
            var html = '';
            for (var i = 0; i < imagesToShow.length; i++) {
                html += '<img src="' + imagesToShow[i] + '" loading="lazy">';
            }
            
            // 追加到容器
            if (isFirstLoad) {
                $('#gallery-container').html(html);
            } else {
                $('#gallery-container').append(html);
            }
            
            // 更新索引
            currentIndex = endIndex;
            
            // 隐藏加载动画
            isLoading = false;
            $('#loading-spinner').hide();
            
            // 更新按钮状态
            if (currentIndex >= totalImages) {
                $('#load-more-btn').prop('disabled', true).text('没有更多了');
            } else {
                $('#load-more-btn').prop('disabled', false).text('加载更多 (' + (totalImages - currentIndex) + ' 张剩余)');
            }
        }, 300); // 延迟300ms，让转圈看得见，体验更好
    }
});