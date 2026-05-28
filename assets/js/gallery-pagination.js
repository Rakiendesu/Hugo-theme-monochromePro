$(document).ready(function() {
    var $gallery = $('.fullscreen-gallery');
    if (!$gallery.length) return;

    var totalImages = parseInt($gallery.data('total'));
    var perPage = parseInt($gallery.data('per-page'));
    var batchSize = parseInt($gallery.data('batch-size'));
    var allImages = $gallery.data('images');

    var currentIndex = perPage;
    var isLoading = false;

    function addMoreImages(startIdx, endIdx) {
        var urls = allImages.slice(startIdx, endIdx);
        var loadedCount = 0;
        var imagesData = [];

        if (urls.length === 0) return;

        urls.forEach(function(url, idx) {
            var img = new Image();
            img.onload = function() {
                // 图片加载完成，存储数据
                imagesData[idx] = {
                    url: url,
                    width: img.width,
                    height: img.height
                };
                loadedCount++;

                if (loadedCount === urls.length) {
                    // 所有图片加载完成，一次性添加到页面
                    var html = '';
                    for (var i = 0; i < imagesData.length; i++) {
                        var data = imagesData[i];
                        html += '<a href="' + data.url + '" data-fancybox="gallery" data-caption="gallery image">';
                        html += '<img src="' + data.url + '" style="opacity: 0;">';
                        html += '</a>';
                    }
                    
                    $('#gallery-container').append(html);
                    
                    // 让新图片淡入
                    $('#gallery-container a').slice(startIdx, endIdx).each(function() {
                        var $a = $(this);
                        var $img = $a.find('img');
                        // 给图片一点时间渲染
                        setTimeout(function() {
                            $img.css('transition', 'opacity 0.3s');
                            $img.css('opacity', '1');
                        }, 10);
                    });
                    
                    // 更新状态
                    currentIndex = endIdx;
                    isLoading = false;
                    var $btn = $('#load-more-btn');
                    $btn.prop('disabled', false);
                    if (currentIndex >= totalImages) {
                        $btn.prop('disabled', true).text('没有更多了');
                    } else {
                        $btn.text('加载更多 (' + (totalImages - currentIndex) + ' 张剩余)');
                    }
                }
            };
            img.src = url;
        });
    }

    $('#load-more-btn').on('click', function() {
        if (isLoading || currentIndex >= totalImages) return;

        isLoading = true;
        $(this).prop('disabled', true).text('加载中...');

        var endIndex = Math.min(currentIndex + batchSize, totalImages);
        addMoreImages(currentIndex, endIndex);
    });
});