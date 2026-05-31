// ==================== status-constants.js ====================
(function() {
    'use strict';

    // ========== SVG 图标 ==========

    // 评论气泡图标
    window.STATUS_ICONS = {
        comment: '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>',

        // 播放按钮
        play: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>',

        // 暂停按钮
        pause: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',

        // 加载中旋转图标
        loading: '<svg viewBox="0 0 24 24" style="animation:spin 1s linear infinite"><path d="M12 2a10 10 0 1 0 10 10h-2a8 8 0 1 1-8-8V2z" fill="none" stroke="currentColor" stroke-width="3"/></svg>',

        // 单曲图标
        musicSingle: '<svg class="music-single-icon" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" style="display: none; width: 16px; height: 16px; margin: -3px 0px 0px -3px; flex-shrink: 0; color: #ff9800;"><ellipse cx="90" cy="220" rx="45" ry="35" fill="currentColor"/><rect x="125" y="40" width="18" height="170" fill="currentColor"/><path d="M143 40 C143 70, 190 70, 190 120 C190 150, 175 170, 170 180 C185 160, 195 135, 195 110 C195 60, 155 50, 143 40Z" fill="currentColor"/></svg>',

        // 歌单图标
        musicPlaylist: '<svg class="music-playlist-icon" viewBox="0 0 300 300" xmlns="http://www.w3.org/2000/svg" style="display: none; width: 16px; height: 16px; margin:-3px 3px 0px 0px; flex-shrink: 0; color: #ff9800;"><ellipse cx="80" cy="220" rx="45" ry="35" fill="currentColor"/><rect x="115" y="40" width="18" height="170" fill="currentColor"/><path d="M133 40 C133 70, 180 70, 180 120 C180 150, 165 170, 160 180 C175 160, 185 135, 185 110 C185 60, 145 50, 133 40Z" fill="currentColor"/><rect x="160" y="150" width="110" height="12" rx="6" fill="currentColor"/><rect x="160" y="185" width="110" height="12" rx="6" fill="currentColor"/><rect x="160" y="220" width="110" height="12" rx="6" fill="currentColor"/></svg>',

        // 骰子图标
        dice: '<svg viewBox="0 0 24 24" fill="currentColor"><rect x="2" y="2" width="20" height="20" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="7" cy="7" r="2"/><circle cx="17" cy="7" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/></svg>',

        // 音乐卡片封面上的播放按钮
        cardPlay: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',

        //跳转图标
        jump: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="feather feather-corner-right-up"><polyline points="10 9 15 4 20 9"></polyline><path d="M4 20h7a4 4 0 0 0 4-4V4"></path></svg>'
    };

    // ========== 移动设备关键词 ==========
    window.MOBILE_DEVICE_KEYWORDS = [
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

    // ========== 地图聚合样式 ==========
    const clusterStyle = document.createElement('style');
    clusterStyle.textContent = `
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
    document.head.appendChild(clusterStyle);

    // ========== 动画关键帧 ==========
    const pulseKeyframes = document.createElement('style');
    pulseKeyframes.textContent = `
        @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
        }
    `;
    document.head.appendChild(pulseKeyframes);

})();