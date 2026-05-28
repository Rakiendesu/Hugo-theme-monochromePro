(function() {
    const PASSWORD = '123456';
    if (sessionStorage.getItem('admin_auth') === 'true') return;
    const input = prompt('请输入管理密码：');
    if (input === PASSWORD) {
        sessionStorage.setItem('admin_auth', 'true');
    } else {
        document.body.innerHTML =
            '<div style="text-align:center;padding:100px;font-family:system-ui;">🔒 密码错误，无权访问</div>';
        throw new Error('Unauthorized');
    }
})();

const DEFAULT_TOKEN = '';
const GIST_ID = '';
const FILE_NAME = '';
const DEFAULT_API_KEY = '';

const MOBILE_DEVICE_KEYWORDS = ['iphone', 'ipad', 'android', '黑鲨', 'black shark', '谷歌', 'google', 'pixel', '荣耀', 'honor', '华为', 'huawei', '魅族', 'meizu', '小米', 'xiaomi', 'mi', '红米', 'redmi', '一加', 'oneplus', 'oppo', 'vivo', '真我', 'realme', '三星', 'samsung', 'galaxy', '坚果', 'smartisan', '索尼', 'sony', 'xperia'];

let currentPage = 1;
let currentYear = null;
let currentMonth = null;
let currentLocation = null;
let searchQuery = '';
let filteredStatuses = [];
let currentStatuses = [];
let uploadedImagesMap = new Map();
let selectedIds = new Set();
const PAGE_SIZE = 10;

// ==================== 城市数据缓存 ====================
let chinaData = null;
let globalData = null;

function getConfig() {
    return {
        gistId: document.getElementById('gistId').value.trim(),
        filename: document.getElementById('filename').value.trim()
    };
}

function updateLocationUI(lat, lon, name = null) {
    const coordInput = document.getElementById('coordsDisplay');
    if (lat !== null && lon !== null && lat !== 0 && lon !== 0) {
        coordInput.value = `${lat}, ${lon}`;
    } else {
        coordInput.value = '';
    }
    if (name !== null) {
        document.getElementById('location').value = name;
    }
}

// ==================== 城市经纬度查询 ====================

async function loadCityData() {
    if (chinaData && globalData) return;
    try {
        const [chinaRes, globalRes] = await Promise.all([
            fetch('/json/city.json'),
            fetch('/json/global.json')
        ]);
        chinaData = await chinaRes.json();
        globalData = await globalRes.json();
    } catch (e) {
        console.error('加载城市数据失败:', e);
        showToast('❌ 加载城市数据失败', 'error');
    }
}

async function searchCoords() {
    const query = document.getElementById('location').value.trim();
    if (!query) {
        showToast('请先输入城市名', 'error');
        return;
    }
    await loadCityData();
    if (!chinaData && !globalData) return;
    if (chinaData && chinaData[query]) {
        updateLocationUI(chinaData[query].lat, chinaData[query].lng);
        showToast(`✅ 已定位：${query}`, 'success');
        return;
    }
    if (globalData && globalData[query]) {
        updateLocationUI(globalData[query].lat, globalData[query].lng);
        showToast(`✅ 已定位：${query}`, 'success');
        return;
    }
    const allData = {
        ...(chinaData || {}),
        ...(globalData || {})
    };
    const q = query.toLowerCase();
    for (const [name, coords] of Object.entries(allData)) {
        if (name.toLowerCase().includes(q)) {
            updateLocationUI(coords.lat, coords.lng);
            showToast(`✅ 已定位：${name}`, 'success');
            return;
        }
    }
    showToast('❌ 未找到匹配的城市', 'error');
}

async function editSearchCoords() {
    const query = document.getElementById('editLocation').value.trim();
    const coordInput = document.getElementById('editCoordsDisplay');
    if (!query) {
        showToast('请先输入地点名称', 'error');
        return;
    }
    await loadCityData();
    const allData = {
        ...(chinaData || {}),
        ...(globalData || {})
    };
    if (allData[query]) {
        coordInput.value = `${allData[query].lat}, ${allData[query].lng}`;
        showToast(`✅ 已定位：${query}`, 'success');
        return;
    }
    const q = query.toLowerCase();
    for (const [name, coords] of Object.entries(allData)) {
        if (name.toLowerCase().includes(q)) {
            coordInput.value = `${coords.lat}, ${coords.lng}`;
            showToast(`✅ 已定位：${name}`, 'success');
            return;
        }
    }
    showToast('❌ 未找到匹配的城市', 'error');
}

async function batchSearchCoords() {
    const query = document.getElementById('batchLocationInput').value
.trim();
    const coordInput = document.getElementById('batchCoordsDisplay');
    if (!query) {
        showToast('请先输入地点名称', 'error');
        return;
    }
    await loadCityData();
    const allData = {
        ...(chinaData || {}),
        ...(globalData || {})
    };
    if (allData[query]) {
        coordInput.value = `${allData[query].lat}, ${allData[query].lng}`;
        showToast(`✅ 已定位：${query}`, 'success');
        return;
    }
    const q = query.toLowerCase();
    for (const [name, coords] of Object.entries(allData)) {
        if (name.toLowerCase().includes(q)) {
            coordInput.value = `${coords.lat}, ${coords.lng}`;
            showToast(`✅ 已定位：${name}`, 'success');
            return;
        }
    }
    showToast('❌ 未找到匹配的城市', 'error');
}

// ==================== 设备检测 ====================

function detectDevice() {
    const ua = navigator.userAgent;
    if (/iPhone/i.test(ua)) return 'iPhone';
    if (/iPad/i.test(ua)) return 'iPad';
    if (/Android/i.test(ua)) return 'Android';
    if (/Mac/i.test(ua)) return 'Mac';
    if (/Windows/i.test(ua)) return 'Windows PC';
    if (/Linux/i.test(ua)) return 'Linux';
    return '';
}

// ==================== Toast ====================

let toastTimer = null;

function showToast(message, type, persistent = false) {
    const toast = document.getElementById('toast');
    if (!toast) return;
    if (toastTimer) clearTimeout(toastTimer);
    toast.textContent = message;
    if (type === 'loading') {
        toast.style.background = '#007aff';
    } else {
        toast.style.background = type === 'error' ? '#dc3545' : '#28a745';
    }
    toast.classList.add('show');
    if (!persistent) {
        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 3000);
    }
}

function hideToast() {
    const toast = document.getElementById('toast');
    if (!toast) return;
    if (toastTimer) clearTimeout(toastTimer);
    toast.classList.remove('show');
}

// ==================== HTML 转义 ====================

function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// ==================== 日期格式化 ====================

function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')} ${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}`;
}

function formatDateForInput(dateString) {
    const date = new Date(dateString);
    return date.toISOString().slice(0, 16);
}

// ==================== 图床删除 ====================

async function deleteFromImageHost(deleteUrl, apiKey) {
    if (!deleteUrl || !apiKey) return false;
    try {
        const response = await fetch(deleteUrl, {
            method: 'GET',
            headers: {
                'Authorization': apiKey
            }
        });
        return response.ok;
    } catch (e) {
        console.error('删除图床文件失败:', e);
        return false;
    }
}

window.removeImageWithHost = async function(imageUrl, deleteUrl) {
    const apiKey = document.getElementById('apiKey').value;
    if (!apiKey) {
        showToast('请先填写图床 API Key', 'error');
        return false;
    }
    if (deleteUrl) {
        const deleted = await deleteFromImageHost(deleteUrl, apiKey);
        if (!deleted) {
            showToast('删除图床文件失败，请重试', 'error');
            return false;
        }
    }
    const imagesInput = document.getElementById('images');
    let urls = imagesInput.value.trim().split(/\s+/).filter(u => u &&
        u !== imageUrl);
    imagesInput.value = urls.join(' ');
    imagesInput.dispatchEvent(new Event('input', {
        bubbles: true
    }));
    const previewItems = document.querySelectorAll(
        '.image-preview-item');
    for (let item of previewItems) {
        const img = item.querySelector('img');
        if (img && img.src === imageUrl) {
            item.remove();
            break;
        }
    }
    uploadedImagesMap.delete(imageUrl);
    return true;
};


// ==================== 图床状态检测 ====================

// ==================== 图床状态检测 ====================
// ==================== 图床状态检测 ====================
async function checkImageHostStatus() {
    const apiKey = document.getElementById('apiKey').value.trim();
    const statusEl = document.getElementById('imageHostStatus');
    
    if (!apiKey) {
        statusEl.innerHTML = '<span style="color:#999;">⚪ 未填写 API Key</span>';
        statusEl.style.display = 'block';
        return false;
    }
    
    statusEl.innerHTML = '<span style="color:#ff9800;">⏳ 图床连接检测中...</span>';
    statusEl.style.display = 'block';
    
    try {
        const res = await fetch('https://s.ee/api/v1/usage', {
            method: 'GET',
            headers: {
                'Authorization': apiKey
            }
        });
        
        if (!res.ok) {
            statusEl.innerHTML = '<span style="color:#dc3545;">❌ 图床连接失败 (HTTP ' + res.status + ')</span>';
            return false;
        }
        
        const data = await res.json();
        
        // ⚠️ 关键修复：兼容 code 为 0 或 200，或者只要有 data.data 数据就算成功
        if ((data.code === 0 || data.code === 200) && data.data) {
            const d = data.data;
            const usedMB = parseFloat(d.storage_usage_mb) || 0;
            const limitMB = parseFloat(d.storage_usage_limit_mb) || 0;
            const storagePercent = limitMB > 0 ? Math.round((usedMB / limitMB) * 100) : 0;
            
            // ✅ 美化的图床数据面板
            statusEl.innerHTML = `
                <div style="
                    background: linear-gradient(135deg, #f0fdf4, #dcfce7);
                    border: 1px solid #bbf7d0;
                    border-radius: 10px;
                    padding: 14px 16px;
                    margin-top: 10px;
                    font-size: 13px;
                    line-height: 1.8;
                    color: #166534;
                    box-shadow: 0 2px 8px rgba(34,197,94,0.1);
                ">
                    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px;font-weight:600;font-size:14px;">
                        <span>🖼️</span> s.ee 图床状态 · 已连接
                        <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:#22c55e;animation:pulse 2s infinite;"></span>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;">
                        <div style="background:rgba(255,255,255,0.7);border-radius:8px;padding:8px 10px;box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <div style="color:#065f46;font-size:11px;margin-bottom:2px;">📤 本日上传</div>
                            <div style="font-weight:600;font-size:15px;">${d.upload_count_day || 0}<span style="font-weight:400;font-size:11px;color:#166534;"> / ${d.upload_count_day_limit || 0}</span></div>
                        </div>
                        <div style="background:rgba(255,255,255,0.7);border-radius:8px;padding:8px 10px;box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <div style="color:#065f46;font-size:11px;margin-bottom:2px;">📅 本月上传</div>
                            <div style="font-weight:600;font-size:15px;">${d.upload_count_month || 0}<span style="font-weight:400;font-size:11px;color:#166534;"> / ${d.upload_count_month_limit || 0}</span></div>
                        </div>
                        <div style="background:rgba(255,255,255,0.7);border-radius:8px;padding:8px 10px;box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <div style="color:#065f46;font-size:11px;margin-bottom:2px;">📁 累计文件数</div>
                            <div style="font-weight:600;font-size:15px;">${d.file_count || 0}</div>
                        </div>
                        <div style="background:rgba(255,255,255,0.7);border-radius:8px;padding:8px 10px;box-shadow: 0 1px 3px rgba(0,0,0,0.05);">
                            <div style="color:#065f46;font-size:11px;margin-bottom:2px;">💾 存储空间</div>
                            <div style="font-weight:600;font-size:14px;">${usedMB.toFixed(1)}<span style="font-weight:400;font-size:11px;"> / ${limitMB.toFixed(0)} MB</span></div>
                            <div style="margin-top:4px;height:4px;background:rgba(0,0,0,0.1);border-radius:2px;overflow:hidden;">
                                <div style="width:${storagePercent}%;height:100%;background:${storagePercent > 80 ? '#ef4444' : storagePercent > 50 ? '#f59e0b' : '#22c55e'};border-radius:2px;transition:width 0.5s ease;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            return true;
        } else {
            // 这里为了以后好排查，顺便把 code 也打印出来
            statusEl.innerHTML = '<span style="color:#dc3545;">❌ API 返回异常: ' + (data.message || '未知错误') + ' (Code: ' + data.code + ')</span>';
            return false;
        }
    } catch (e) {
        statusEl.innerHTML = '<span style="color:#dc3545;">❌ 网络错误，请检查 API Key 格式</span>';
        return false;
    }
}

// ==================== 呼吸灯动画 ====================
const pulseStyle = document.createElement('style');
pulseStyle.textContent = `
    @keyframes pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.4; }
    }
`;
document.head.appendChild(pulseStyle);

// ==================== 图片上传 ====================

function addImageToUI(imageUrl, deleteUrl) {
    const imagesInput = document.getElementById('images');
    const current = imagesInput.value.trim();
    // 追加链接，不清空原有内容
    imagesInput.value = current ? `${current}\n${imageUrl}` : imageUrl;
    // 手动触发 input 事件，让 Markdown 框同步更新
    // 手动更新 Markdown 框，不触发 rawInput 的 input 事件（避免重复添加绿X预览）
    const currentUrls = imagesInput.value.trim().split(/\s+/).filter(url => url.startsWith('http'));
    mdOutput.value = currentUrls.map(url => `![](${url})`).join('\n');
    // 记录图床信息
    uploadedImagesMap.set(imageUrl, deleteUrl);
    // 添加红色X预览
    addRedPreview(imageUrl);
}

// 图片链接 ↔ Markdown 双向转换
const rawInput = document.getElementById('images');
const mdOutput = document.getElementById('images_markdown');
// =============当输入框内容变化时，同步更新图片预览===============
let isMdUpdating = false;

rawInput.addEventListener('input', function() {
    if (isMdUpdating) return;
    
    const content = this.value.trim();
    
    // 更新 Markdown 框
    if (!content) {
        mdOutput.value = '';
    } else {
        const urls = content.split(/\s+/).filter(url => url.startsWith('http'));
        mdOutput.value = urls.map(url => `![](${url})`).join('\n');
    }
    
    // 同步预览区：只保留有对应链接的预览
    const currentUrls = content ? content.split(/\s+/).filter(url => url.startsWith('http')) : [];
    const previewContainer = document.getElementById('imagePreview');
    const existingPreviews = [...previewContainer.querySelectorAll('.image-preview-item')];
    
    existingPreviews.forEach(item => {
        const img = item.querySelector('img');
        if (img && !currentUrls.includes(img.src)) {
            item.remove();
        }
    });
    
    // 为新增的链接添加绿X预览（手动输入的只删链接）
    currentUrls.forEach(url => {
        if (![...previewContainer.querySelectorAll('img')].some(img => img.src === url)) {
            addGreenPreview(url);
        }
    });
});

mdOutput.addEventListener('input', function() {
    isMdUpdating = true;
    
    const content = this.value.trim();
    if (!content) {
        rawInput.value = '';
        isMdUpdating = false;
        // 清空预览
        document.getElementById('imagePreview').innerHTML = '';
        return;
    }
    
    const regex = /!\[.*?\]\((https?:\/\/[^\s)]+)\)/g;
    const urls = [];
    let match;
    while ((match = regex.exec(content)) !== null) {
        urls.push(match[1]);
    }
    rawInput.value = urls.join('\n');
    
    isMdUpdating = false;
    
    // 手动触发 rawInput 的 input 事件来更新预览
    rawInput.dispatchEvent(new Event('input', { bubbles: true }));
});

// ==================== 置顶 ====================

function buildPinnedOptions(currentPinnedValue, selectId, hintId) {
    const select = document.getElementById(selectId);
    if (!select) return;
    const usedMap = {};
    currentStatuses.forEach(s => {
        const p = s.pinned || 0;
        if (p > 0) {
            if (!usedMap[p]) usedMap[p] = [];
            usedMap[p].push(s.content);
        }
    });
    let html = '<option value="0">0 - 不置顶</option>';
    for (let i = 1; i <= 10; i++) {
        const used = usedMap[i];
        const isCurrent = (currentPinnedValue === i);
        const disabled = used && !isCurrent;
        html +=
            `<option value="${i}" ${disabled ? 'disabled' : ''} ${isCurrent ? 'selected' : ''}>${used ? `${i} ❌ ${used[0].substring(0, 15)}...` : `${i} ✅`}</option>`;
    }
    select.innerHTML = html;
}

// ==================== 图片压缩 ====================

function getCompressConfig() {
    const qualityRadio = document.querySelector(
        'input[name="compressQuality"]:checked');
    const quality = qualityRadio ? parseFloat(qualityRadio.value) : 0.95;
    const isOriginal = quality >= 1.0;
    return {
        quality,
        isOriginal,
        minSizeKB: isOriginal ? 0 : (parseInt(document.getElementById(
            'compressMinSize').value) || 450),
        maxWidth: isOriginal ? 0 : (parseInt(document.getElementById(
            'compressMaxWidth').value) || 1200)
    };
}

function compressImage(file) {
    return new Promise((resolve, reject) => {
        const config = getCompressConfig();
        if (config.isOriginal) {
            resolve(file);
            return;
        }
        if (file.size < config.minSizeKB * 1024) {
            resolve(file);
            return;
        }
        const reader = new FileReader();
        reader.onload = function(e) {
            const img = new Image();
            img.onload = function() {
                let width = img.width,
                    height = img.height;
                if (width > config.maxWidth) {
                    height = (config.maxWidth / width) * height;
                    width = config.maxWidth;
                }
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(img, 0, 0, width, height);
                canvas.toBlob(function(blob) {
                    resolve(new File([blob], file.name
                        .replace(/\.\w+$/,
                            '.jpg'), {
                            type: 'image/jpeg'
                        }));
                }, 'image/jpeg', config.quality);
            };
            img.onerror = reject;
            img.src = e.target.result;
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

async function uploadImages(files) {
    const apiKey = document.getElementById('apiKey').value;
    if (!apiKey) {
        showToast('请先填写图床 API Key', 'error');
        return [];
    }
    const progressSpan = document.getElementById('uploadProgress');
    let successCount = 0;
    for (let i = 0; i < files.length; i++) {
        progressSpan.textContent = `正在压缩 ${i+1}/${files.length}...`;
        const compressedFile = await compressImage(files[i]);
        progressSpan.textContent = `正在上传 ${i+1}/${files.length}...`;
        const formData = new FormData();
        formData.append('file', compressedFile);
        try {
            const response = await fetch(
            'https://s.ee/api/v1/file/upload', {
                method: 'POST',
                headers: {
                    'Authorization': apiKey
                },
                body: formData
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const result = await response.json();
            if (result.code === 200 && result.data && result.data.url) {
                addImageToUI(result.data.url, result.data.delete);
                successCount++;
            }
        } catch (err) {
            console.error('上传失败:', err);
            showToast(`上传失败: ${files[i].name}`, 'error');
        }
        if (i < files.length - 1) await new Promise(r => setTimeout(r,
        500));
    }
    progressSpan.textContent = '';
    if (successCount > 0) showToast(`✅ 成功上传 ${successCount} 张图片`,
    'success');
    return successCount;
}

// ==================== 音乐 ====================

async function preloadMusicInfoForAdmin() {
    const mp = new MusicPlayer();
    const musicCache = {};
    for (const s of currentStatuses) {
        if (s.music && !musicCache[s.music]) {
            try {
                musicCache[s.music] = (await mp.load(s.music)).slice(0, 3);
            } catch (e) {
                musicCache[s.music] = null;
            }
        }
    }
    window._adminMusicCache = musicCache;
}

// ==================== 加载动态与配置校验 ====================
async function loadStatuses() {
    const token = document.getElementById('githubToken').value;
    const apiKey = document.getElementById('apiKey').value;
    const gistId = getConfig().gistId;

    if (!token || !apiKey || !gistId) {
        document.getElementById('statusList').innerHTML = '<div style="color:#dc3545;">缺少核心配置参数，请在上方完成配置</div>';
        return;
    }

    showToast('🔄 正在校验配置并加载...', 'loading', true);
    
    try {
        // 1. 强制校验图床 (返回 true 才算成功)
        const isImageHostOk = await checkImageHostStatus();
        if (!isImageHostOk) {
            throw new Error('图床 API Key 校验失败，请检查');
        }

        // 2. 校验 Gist 和 GitHub Token
        const res = await fetch(`https://api.github.com/gists/${gistId}`, {
            headers: {
                'Authorization': `token ${token}`,
                'User-Agent': 'Status-Manager'
            }
        });
        
        if (!res.ok) {
            throw new Error('GitHub Token 或 Gist ID 连接失败');
        }

        const gist = await res.json();
        const data = JSON.parse(gist.files[getConfig().filename].content);
        currentStatuses = data.statuses || [];
        
        // 排序处理
        currentStatuses.sort((a, b) => {
            const pa = a.pinned || 0, pb = b.pinned || 0;
            if (pa > 0 && pb > 0) return pa - pb;
            if (pa > 0) return -1;
            if (pb > 0) return 1;
            return new Date(b.date) - new Date(a.date);
        });
        currentYear = null; currentMonth = null; currentPage = 1;
        window._adminMusicCache = {};
        
        updateFilteredStatuses();
        buildFilters();
        buildPinnedOptions(0, 'pinnedSelect', 'pinnedHint');
        preloadMusicInfoForAdmin().then(() => {
            updateFilteredStatuses();
            buildFilters();
        }).catch(() => {});
        
        hideToast();
        showToast('✅ 配置校验全部通过，加载完成', 'success');

        // ✅ 只有全部校验成功，才自动折叠配置区，并展示两个绿色标志
        const configSection = document.getElementById('configSection');
        if (configSection) configSection.classList.add('collapsed');

        const configBadge = document.getElementById('configBadge');
        if (configBadge) {
            configBadge.textContent = getConfig().filename;
            configBadge.style.display = 'inline';
        }
        
        const imgHostBadge = document.getElementById('imgHostBadge');
        if (imgHostBadge) {
            imgHostBadge.textContent = 'S.EE图床';
            imgHostBadge.style.display = 'inline';
        }

        const countBadge = document.getElementById('countBadge');
        if (countBadge) {
            countBadge.textContent = currentStatuses.length + ' 条';
            countBadge.style.display = 'inline';
        }

    } catch (e) {
        console.error(e);
        document.getElementById('statusList').innerHTML = `<div style="color:#dc3545;text-align:center;padding:20px;">加载失败：${e.message}</div>`;
        hideToast();
        showToast(`❌ 加载失败: ${e.message}`, 'error');

        // ❌ 如果其中任何一个连不上：强制展开配置面板，折叠发布面板
        const configSection = document.getElementById('configSection');
        const publishSection = document.getElementById('publishSection');
        if (configSection) configSection.classList.remove('collapsed');
        if (publishSection) publishSection.classList.add('collapsed');
        
        // 隐藏顶部通过的徽章
        if (document.getElementById('configBadge')) document.getElementById('configBadge').style.display = 'none';
        if (document.getElementById('imgHostBadge')) document.getElementById('imgHostBadge').style.display = 'none';
    }
}

async function updateGist(token) {
    try {
        const data = {
            statuses: currentStatuses
        };
        const updateRes = await fetch(
            `https://api.github.com/gists/${getConfig().gistId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `token ${token}`,
                    'Content-Type': 'application/json',
                    'User-Agent': 'Status-Manager'
                },
                body: JSON.stringify({
                    files: {
                        [getConfig().filename]: {
                            content: JSON.stringify(data, null,
                                2)
                        }
                    }
                })
            });
        if (!updateRes.ok) {
            console.error('Gist 更新失败:', updateRes.status);
            return false;
        }
        return true;
    } catch (e) {
        console.error('updateGist 错误:', e);
        return false;
    }
}

// ==================== 筛选与分页 ====================

function updateFilteredStatuses() {
    let filtered = [...currentStatuses];
    if (currentYear) filtered = filtered.filter(s => new Date(s.date)
        .getFullYear() === currentYear);
    if (currentMonth) filtered = filtered.filter(s => new Date(s.date)
    .getMonth() + 1 === currentMonth);
    if (currentLocation) filtered = filtered.filter(s => (s.location || '')
        .split(' · ').pop().trim() === currentLocation);
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        filtered = filtered.filter(s => (s.content || '').toLowerCase()
            .includes(q) || (s.location || '').toLowerCase().includes(q) ||
            (s.device || '').toLowerCase().includes(q));
    }
    filteredStatuses = filtered;
    renderPagination();
    renderStatusList();
    updateStats();
}

function renderPagination() {
    const total = Math.ceil(filteredStatuses.length / PAGE_SIZE);
    const start = (currentPage - 1) * PAGE_SIZE + 1,
        end = Math.min(currentPage * PAGE_SIZE, filteredStatuses.length);
    document.getElementById('statsInfo').innerHTML =
        `共 ${filteredStatuses.length} 条动态，显示第 ${start}-${end} 条`;
    if (total <= 1) {
        document.getElementById('pagination').innerHTML = '';
        document.getElementById('paginationBottom').innerHTML = '';
        return;
    }
    let html =
        `<button class="page-btn" onclick="goToPage(1)" ${currentPage===1?'disabled':''}>首页</button><button class="page-btn" onclick="goToPage(${currentPage-1})" ${currentPage===1?'disabled':''}>上一页</button>`;
    let startPage = Math.max(1, currentPage - 3),
        endPage = Math.min(total, currentPage + 3);
    if (startPage > 1) html += `<span class="page-info">...</span>`;
    for (let i = startPage; i <= endPage; i++) html +=
        `<button class="page-btn ${currentPage===i?'active':''}" onclick="goToPage(${i})">${i}</button>`;
    if (endPage < total) html += `<span class="page-info">...</span>`;
    html +=
        `<button class="page-btn" onclick="goToPage(${currentPage+1})" ${currentPage===total?'disabled':''}>下一页</button><button class="page-btn" onclick="goToPage(${total})" ${currentPage===total?'disabled':''}>末页</button>`;
    document.getElementById('pagination').innerHTML = html;
    document.getElementById('paginationBottom').innerHTML = html;
}

window.goToPage = function(page) {
    const total = Math.ceil(filteredStatuses.length / PAGE_SIZE);
    if (page < 1 || page > total) return;
    currentPage = page;
    renderPagination();
    renderStatusList();
};

function renderMusicInfo(musicData, musicUrl) {
    if (!musicData)
    return '<div class="status-music-info-card music-loading">🎵 加载中...</div>';
    const songs = Array.isArray(musicData) ? musicData : [musicData];
    const isPlaylist = songs.length > 1;
    const displaySongs = songs.slice(0, 3);
    const linkLine = musicUrl ?
        `<div class="music-stack-name" style="opacity:0.6;font-size:0.65rem;margin-top:2px;word-break:break-all;">🔗 ${musicUrl}</div>` :
        '';
    if (isPlaylist) {
        const covers = displaySongs.map((s, i) =>
            `<img src="${s.cover || ''}" class="music-stack-cover" style="position:absolute;top:${i*8}px;left:${i*8}px;z-index:${3-i};" onerror="this.style.display='none'">`
            ).join('');
        const names = displaySongs.map(s =>
            `<div class="music-stack-name">${s.name || ''} - ${s.artist || ''}</div>`
            ).join('');
        return `<div class="status-music-info-card"><div class="music-card-covers">${covers}<div class="music-card-overlay"></div><svg class="music-card-icon" viewBox="0 0 300 300"><ellipse cx="80" cy="220" rx="45" ry="35" fill="white"/><rect x="115" y="40" width="18" height="170" fill="white"/><path d="M133 40 C133 70, 180 70, 180 120 C180 150, 165 170, 160 180 C175 160, 185 135, 185 110 C185 60, 145 50, 133 40Z" fill="white"/><rect x="160" y="150" width="110" height="12" rx="6" fill="white"/><rect x="160" y="185" width="110" height="12" rx="6" fill="white"/><rect x="160" y="220" width="110" height="12" rx="6" fill="white"/></svg></div><div class="music-card-names">${linkLine}${names}</div></div>`;
    } else {
        const song = songs[0];
        return `<div class="status-music-info-card"><div class="music-card-covers"><img src="${song.cover || ''}" class="music-stack-cover single" onerror="this.style.display='none'"><div class="music-card-overlay"></div><svg class="music-card-icon single-icon" viewBox="0 0 300 300"><ellipse cx="90" cy="220" rx="45" ry="35" fill="white"/><rect x="125" y="40" width="18" height="170" fill="white"/><path d="M143 40 C143 70, 190 70, 190 120 C190 150, 175 170, 170 180 C185 160, 195 135, 195 110 C195 60, 155 50, 143 40Z" fill="white"/></svg></div><div class="music-card-names">${linkLine}<div class="music-stack-name">${song.name || ''} - ${song.artist || ''}</div></div></div>`;
    }
}

async function loadMusicForCurrentPage(pageItems) {
    const mp = new MusicPlayer();
    window._adminMusicCache = window._adminMusicCache || {};
    for (const s of pageItems) {
        if (!s.music || window._adminMusicCache[s.music] !== undefined)
            continue;
        window._adminMusicCache[s.music] = null;
        try {
            window._adminMusicCache[s.music] = (await mp.load(s.music))
                .slice(0, 3);
        } catch (e) {
            window._adminMusicCache[s.music] = null;
        }
        refreshMusicCard(s.id);
    }
}

function refreshMusicCard(statusId) {
    const status = currentStatuses.find(s => s.id === statusId);
    if (!status || !status.music) return;
    const musicSongs = window._adminMusicCache?.[status.music];
    if (!musicSongs) return;
    const card = document.querySelector(`.status-item[data-id="${statusId}"]`);
    if (!card) return;
    let musicEl = card.querySelector('.status-music-info-card');
    if (!musicEl) {
        musicEl = document.createElement('div');
        const contentEl = card.querySelector('.status-content');
        if (contentEl) contentEl.after(musicEl);
    }
    musicEl.outerHTML = renderMusicInfo(musicSongs, status.music);
}

function renderStatusList() {
    const start = (currentPage - 1) * PAGE_SIZE,
        pageItems = filteredStatuses.slice(start, start + PAGE_SIZE);
    if (!pageItems.length) {
        document.getElementById('statusList').innerHTML =
            '<div style="color:#999;text-align:center;padding:40px;">暂无动态</div>';
        return;
    }
    const html = pageItems.map(s => {
        const musicSongs = s.music ? (window._adminMusicCache?.[s
            .music] || null) : null;
        const idx = currentStatuses.findIndex(x => x.id === s.id);
        return `<div class="status-item" ${s.pinned ? `data-pinned="${s.pinned}"` : ''} data-id="${s.id}"><div style="position:relative;"><input type="checkbox" class="status-checkbox" data-id="${s.id}" style="accent-color: #007aff;">${s.pinned ? `<div class="pinned-weight">📌 置顶 · 权重 ${s.pinned}</div>` : ''}<div class="status-content">${s.content.replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/\n/g, "<br>").replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(/\*(.*?)\*/g, "<em>$1</em>")}</div>${musicSongs ? renderMusicInfo(musicSongs, s.music) : ''}${s.images?.length ? `<div class="status-images">${s.images.map(img => `<a href="${img}" data-fancybox="gallery-${s.id}"><img src="${img}"></a>`).join('')}</div>` : ''}<div class="status-meta"><span>📍 ${s.location ? escapeHtml(s.location) : '山西'}</span><span>📅 ${formatDate(s.date)}</span>${s.device ? `<span>${(() => { const d = (s.device || '').toLowerCase(); return MOBILE_DEVICE_KEYWORDS.some(k => d.includes(k)) ? '📱' : '💻'; })()} ${escapeHtml(s.device)}</span>` : ''}<span style="margin-left:auto;display:flex;gap:6px;"><button class="edit-btn" onclick="editStatus(${idx})">✏️ 编辑</button><button class="delete-btn" onclick="deleteStatusByOriginalIndex(${idx})">删除</button></span></div></div></div>`;
    }).join('');
    document.getElementById('statusList').innerHTML = html;
    loadMusicForCurrentPage(pageItems);
    if (typeof Fancybox !== "undefined") {
        Fancybox.bind('[data-fancybox]', {
            hideScrollbar: false,
            lockScroll: false,
            touch: false,
            transitionDuration: 200,
            Carousel: {
                Thumbs: false,
                Toolbar: {
                    display: {
                        left: [],
                        middle: [],
                        right: ["download"]
                    }
                },
                Zoomable: {
                    pinchToZoom: false,
                    doubleTapToZoom: false,
                    Panzoom: {
                        maxScale: "cover",
                        panMode: "mousemove",
                        mouseMoveFactor: 1.1,
                        friction: 0.9
                    }
                }
            }
        });
    }
}

window.deleteStatusByOriginalIndex = async function(originalIndex) {
    if (!confirm('确定删除这条动态吗？')) return;
    const token = document.getElementById('githubToken').value;
    if (!token) {
        showToast('请先输入 GitHub Token', 'error');
        return;
    }
    const deleted = currentStatuses.splice(originalIndex, 1)[0];
    if (await updateGist(token)) {
        showToast('✅ 删除成功', 'success');
        await loadStatuses();
    } else {
        currentStatuses.splice(originalIndex, 0, deleted);
        showToast('❌ 删除失败', 'error');
    }
};

window.editStatus = function(originalIndex) {
    const status = currentStatuses[originalIndex];
    if (!status) return;
    const existing = document.querySelector('.modal-overlay');
    if (existing) existing.remove();
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';
    overlay.innerHTML = `
    <div class="modal-box">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;"><h3 style="margin:0;">✏️ 编辑动态</h3><button id="editCloseTop" style="width:28px;height:28px;border-radius:50%;border:none;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#999;font-size:18px;">✕</button></div>
        <div class="form-group">
            <label>动态内容</label>
            <textarea id="editContent" rows="4">${escapeHtml(status.content)}</textarea>
            <div id="editContentPreview" style="font-size:17px;color:#666;margin-top:8px;padding:8px 10px;background:#f5f5f5;border-radius:6px;border-left:3px solid #ff9800;word-wrap:break-word;min-height:100px;">
                <span id="editPreviewText"></span>
            </div>
            <div style="display:flex; gap:6px; margin: 8px 0;">
                <button type="button" id="editBoldBtn" style="display:inline-flex;align-items:center;gap:4px;padding:8px 20px;background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;"><strong>B</strong> 加粗</button>
                <button type="button" id="editItalicBtn" style="display:inline-flex;align-items:center;gap:4px;padding:8px 20px;background:linear-gradient(135deg,#f093fb,#f5576c);color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-style:italic;"><em>I</em> 斜体</button>
            </div>
        </div>
        <div class="form-group"><label>日期时间</label><input type="datetime-local" id="editDate" value="${formatDateForInput(status.date)}"></div>
        <div class="form-group"><label>地点</label><input type="text" id="editLocation" value="${escapeHtml(status.location || '')}"><div style="display: flex; gap: 8px; margin-top: 8px;"><input type="text" id="editCoordsDisplay" placeholder="经纬度 (Lat, Lon)" readonly style="flex: 1; background: #f8f8f8; color: #666; font-size: 12px;" value="${status.coords && status.coords.length === 2 ? status.coords[0] + ', ' + status.coords[1] : ''}"><button type="button" id="editGetCoords" class="location-btn" style="margin-top:0;">🔍 获取经纬度</button><button type="button" id="editClearLocation" class="location-btn" style="margin-top:0; background:#ffebee; color:#d32f2f;">❌ 清除</button></div></div>
        <div class="form-group"><label>🎵 音乐链接（可选）</label><input type="text" id="editMusic" value="${escapeHtml(status.music || '')}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;"></div>
        <div class="form-group"><label>设备</label><input type="text" id="editDevice" value="${escapeHtml(status.device || '')}"></div>
        <div class="form-group"><label>📌 置顶权重</label><select id="editPinned" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;"></select><small style="color:#666;" id="editPinnedHint"></small></div>
        <div class="form-group"><label>图片链接（空格分隔）</label><textarea id="editImages" rows="3">${(status.images || []).join(' ')}</textarea></div>
        <div class="modal-buttons"><button class="cancel-btn" id="editCancel">取消</button><button class="save-btn" id="editSave">💾 保存</button></div>
    </div>`;
    document.body.appendChild(overlay);
    buildPinnedOptions(status.pinned || 0, 'editPinned', 'editPinnedHint');

    document.getElementById('editBoldBtn').onclick   = () => applyBold(document.getElementById('editContent'));
    document.getElementById('editItalicBtn').onclick = () => applyItalic(document.getElementById('editContent'));

    const editContentTa = document.getElementById('editContent');
    const editPreviewSpan = document.getElementById('editPreviewText');
    function updateEditPreview() {
        let text = editContentTa.value;
        if (!text) { editPreviewSpan.innerHTML = ''; return; }
        editPreviewSpan.innerHTML = text
            .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
            .replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")
            .replace(/\*(.*?)\*/g, "<em>$1</em>")
            .replace(/\n/g, "<br>");
    }
    editContentTa.addEventListener('input', updateEditPreview);
    updateEditPreview();

    document.getElementById('editGetCoords').onclick = editSearchCoords;
    document.getElementById('editClearLocation').onclick = () => {
        document.getElementById('editCoordsDisplay').value = '';
    };
    document.getElementById('editCloseTop').onclick = () => overlay
.remove();
    document.getElementById('editCancel').onclick = () => overlay.remove();
    document.getElementById('editSave').onclick = async () => {
        const token = document.getElementById('githubToken').value;
        if (!token) {
            showToast('请先输入 GitHub Token', 'error');
            return;
        }
        const newContent = document.getElementById('editContent')
            .value.trim();
        if (!newContent) {
            showToast('内容不能为空', 'error');
            return;
        }
        status.content = newContent;
        status.location = document.getElementById('editLocation')
            .value.trim();
        status.device = document.getElementById('editDevice').value
            .trim();
        status.date = new Date(document.getElementById('editDate').value).toISOString();
        const coordsStr = document.getElementById(
            'editCoordsDisplay').value.trim();
        if (coordsStr) {
            const parts = coordsStr.split(',').map(s => parseFloat(s
                .trim()));
            status.coords = (parts.length === 2 && !isNaN(parts[
                0]) && !isNaN(parts[1])) ? parts : null;
        } else {
            status.coords = null;
        }
        status.pinned = parseInt(document.getElementById(
            'editPinned').value) || 0;
        const imgsStr = document.getElementById('editImages').value
            .trim();
        status.images = imgsStr ? imgsStr.split(/\s+/).filter(u => u
            .startsWith('http')) : [];
        status.music = document.getElementById('editMusic').value
            .trim() || null;
        if (await updateGist(token)) {
            showToast('✅ 编辑成功', 'success');
            overlay.remove();
            currentStatuses.sort((a, b) => {
                const pa = a.pinned || 0,
                    pb = b.pinned || 0;
                if (pa > 0 && pb > 0) return pa - pb;
                if (pa > 0) return -1;
                if (pb > 0) return 1;
                return new Date(b.date) - new Date(a.date);
            });
            updateFilteredStatuses();
            buildFilters();
        } else {
            showToast('❌ 编辑失败，请重试', 'error');
        }
    };
};

function buildFilters() {
    let baseForFilters = [...currentStatuses];
    if (searchQuery) {
        const q = searchQuery.toLowerCase();
        baseForFilters = baseForFilters.filter(s => (s.content || '')
            .toLowerCase().includes(q) || (s.location || '').toLowerCase()
            .includes(q) || (s.device || '').toLowerCase().includes(q));
    }
    let dataForYears = [...baseForFilters];
    if (currentLocation) {
        dataForYears = dataForYears.filter(s => (s.location || '').split(' · ')
            .pop().trim() === currentLocation);
    }
    const years = [...new Set(dataForYears.map(s => new Date(s.date)
        .getFullYear()))].sort((a, b) => b - a);
    const yearContainer = document.getElementById('yearButtons');
    if (!years.length && !searchQuery && !currentLocation) {
        yearContainer.innerHTML = '';
        document.getElementById('filterBar').style.display = 'none';
        return;
    }
    let yearHtml =
        `<button class="filter-btn ${currentYear===null?'active':''}" data-year="all">全部动态</button>`;
    years.forEach(y => {
        yearHtml +=
            `<button class="filter-btn ${currentYear===y?'active':''}" data-year="${y}">${y}年</button>`;
    });
    yearContainer.innerHTML = yearHtml;
    document.querySelectorAll('[data-year]').forEach(btn => {
        btn.onclick = () => {
            currentYear = btn.dataset.year === 'all' ? null :
                parseInt(btn.dataset.year);
            currentMonth = null;
            currentPage = 1;
            updateFilteredStatuses();
            buildFilters();
        };
    });
    const locationGroup = document.getElementById('locationGroup');
    let dataForLoc = [...baseForFilters];
    if (currentYear) dataForLoc = dataForLoc.filter(s => new Date(s.date)
        .getFullYear() === currentYear);
    if (currentMonth) dataForLoc = dataForLoc.filter(s => new Date(s.date)
        .getMonth() + 1 === currentMonth);
    const locations = [...new Set(dataForLoc.map(s => (s.location || '').split(
        ' · ').pop().trim()).filter(l => l))].sort();
    if (locations.length) {
        locationGroup.style.display = 'block';
        let locHtml =
            `<button class="filter-btn ${currentLocation===null?'active':''}" data-location="all">全部地区</button>`;
        locations.forEach(l => {
            locHtml +=
                `<button class="filter-btn ${currentLocation===l?'active':''}" data-location="${l}">${l}</button>`;
        });
        document.getElementById('locationButtons').innerHTML = locHtml;
        document.querySelectorAll('#locationButtons [data-location]').forEach(
            btn => {
                btn.onclick = () => {
                    currentLocation = btn.dataset.location === 'all' ?
                        null : btn.dataset.location;
                    currentPage = 1;
                    updateFilteredStatuses();
                    buildFilters();
                };
            });
    } else {
        locationGroup.style.display = 'none';
        currentLocation = null;
    }
    const monthGroup = document.getElementById('monthGroup');
    if (currentYear) {
        let dataForMonths = [...baseForFilters].filter(s => new Date(s.date)
            .getFullYear() === currentYear);
        if (currentLocation) {
            dataForMonths = dataForMonths.filter(s => (s.location || '').split(
                ' · ').pop().trim() === currentLocation);
        }
        const months = [...new Set(dataForMonths.map(s => new Date(s.date)
            .getMonth() + 1))].sort((a, b) => b - a);
        if (months.length) {
            monthGroup.style.display = 'block';
            let monthHtml =
                `<button class="filter-btn ${currentMonth===null?'active':''}" data-month="all">全部</button>`;
            months.forEach(m => {
                monthHtml +=
                    `<button class="filter-btn ${currentMonth===m?'active':''}" data-month="${m}">${m}月</button>`;
            });
            document.getElementById('monthButtons').innerHTML = monthHtml;
            document.querySelectorAll('[data-month]').forEach(btn => {
                btn.onclick = () => {
                    currentMonth = btn.dataset.month === 'all' ?
                        null : parseInt(btn.dataset.month);
                    currentPage = 1;
                    updateFilteredStatuses();
                    buildFilters();
                };
            });
        } else monthGroup.style.display = 'none';
    } else {
        monthGroup.style.display = 'none';
        currentMonth = null;
    }
    document.getElementById('filterBar').style.display = 'block';
}

function updateStats() {
    const years = [...new Set(currentStatuses.map(s => new Date(s.date)
        .getFullYear()))];
    document.getElementById('statsInfo').innerHTML =
        `📊 总计 ${currentStatuses.length} 条动态 | 📅 覆盖年份：${years.join('、')}`;
}

// ==================== 发布 ====================

async function publishStatus() {
    const publishBtn = document.getElementById('publishBtn'),
        token = document.getElementById('githubToken').value;
    if (!token) {
        showToast('请先输入 GitHub Token', 'error');
        return;
    }
    const content = document.getElementById('content').value.trim();
    if (!content) {
        showToast('请填写动态内容', 'error');
        return;
    }
    publishBtn.disabled = true;
    publishBtn.textContent = '⏳ 发布中...';
    try {
        const imagesInput = document.getElementById('images').value.trim(),
            images = imagesInput ? imagesInput.split(/\s+/).filter(url =>
                url.startsWith('http')) : [];
        const coordsStr = document.getElementById('coordsDisplay').value
            .trim();
        let coords = null;
        if (coordsStr) {
            const parts = coordsStr.split(',').map(s => parseFloat(s
            .trim()));
            if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1]))
                coords = parts;
        }
        const newStatus = {
            id: `${Date.now()}_${Math.random().toString(36).substr(2,6)}`,
            content,
            images,
            music: document.getElementById('musicInput').value.trim() ||
                null,
            date: new Date().toISOString(),
            device: document.getElementById('device').value.trim() ||
                '',
            location: document.getElementById('location').value
            .trim() || '未知',
            coords,
            pinned: parseInt(document.getElementById('pinnedSelect')
                .value) || 0
        };
        currentStatuses.unshift(newStatus);
        if (await updateGist(token)) {
            showToast('✅ 发布成功', 'success');
            localStorage.removeItem('draft_content');
            document.getElementById('content').value = '';
            document.getElementById('images').value = '';
            document.getElementById('images_markdown').value = '';
            document.getElementById('images').dispatchEvent(new Event('input'));
            document.getElementById('musicInput').value = '';
            document.getElementById('imagePreview').innerHTML = '';
            uploadedImagesMap.clear();
            document.getElementById('device').value = detectDevice();
            // ✅ 隐藏草稿标签
            const draftBadge2 = document.getElementById('draftBadge');
            if (draftBadge2) draftBadge2.style.display = 'none';
            // ✅ 不再调用 autoLocation()
            await loadStatuses();
            buildPinnedOptions(0, 'pinnedSelect', 'pinnedHint');
        } else {
            currentStatuses.shift();
            showToast('❌ 发布失败', 'error');
        }
    } catch (err) {
        console.error('发布出错:', err);
        currentStatuses.shift();
        showToast('❌ 发布出错', 'error');
    } finally {
        publishBtn.disabled = false;
        publishBtn.textContent = '📤 发布动态';
    }
}

// ==================== 批量操作栏 ====================

function updateBatchBar() {
    const bar = document.getElementById('batchBar'),
        deleteBtn = document.getElementById('batchDeleteBtn');
    if (selectedIds.size > 0) {
        bar.classList.add('show');
        document.getElementById('batchInfo').textContent =
            `已选 ${selectedIds.size} 条`;
        deleteBtn.textContent = `🗑 批量删除 (${selectedIds.size})`;
        deleteBtn.disabled = false;
    } else {
        bar.classList.remove('show');
    }
}

// 折叠/展开配置区域
window.toggleSection = function(sectionId) {
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.toggle('collapsed');
    }
};

// ==================== 初始化 ====================

(function init() {
    // 确认配置按钮 - 保存并刷新
    document.getElementById('refreshConfigBtn').onclick = () => {
        const token = document.getElementById('githubToken').value.trim();
        if (!token) {
            showToast('❌ 请先填写 Token', 'error');
            return;
        }
        localStorage.setItem('github_token', token);
        localStorage.setItem('gist_id', document.getElementById('gistId').value.trim());
        localStorage.setItem('gist_filename', document.getElementById('filename').value.trim());
        localStorage.setItem('api_key', document.getElementById('apiKey').value.trim());
        location.reload();
    };
    // 恢复配置
    if (localStorage.getItem('github_token')) document.getElementById(
        'githubToken').value = localStorage.getItem('github_token');
    else {
        document.getElementById('githubToken').value = DEFAULT_TOKEN;
        localStorage.setItem('github_token', DEFAULT_TOKEN);
    }
    if (localStorage.getItem('gist_id')) document.getElementById('gistId')
        .value = localStorage.getItem('gist_id');
    else {
        document.getElementById('gistId').value = GIST_ID;
        localStorage.setItem('gist_id', GIST_ID);
    }
    if (localStorage.getItem('gist_filename')) document.getElementById(
        'filename').value = localStorage.getItem('gist_filename');
    else {
        document.getElementById('filename').value = FILE_NAME;
        localStorage.setItem('gist_filename', FILE_NAME);
            // ✅ 更新配置标签
        const configBadge1 = document.getElementById('configBadge');
        if (configBadge1) {
            configBadge1.textContent = localStorage.getItem('gist_filename') || FILE_NAME;
            configBadge1.style.display = 'inline';
        }
    }
    if (localStorage.getItem('api_key')) document.getElementById('apiKey')
        .value = localStorage.getItem('api_key');
    else {
        document.getElementById('apiKey').value = DEFAULT_API_KEY;
        localStorage.setItem('api_key', DEFAULT_API_KEY);
    }

    document.getElementById('githubToken').onchange = e => localStorage
        .setItem('github_token', e.target.value);
    document.getElementById('gistId').onchange = e => localStorage.setItem(
        'gist_id', e.target.value);
    document.getElementById('filename').onchange = e => localStorage
        .setItem('gist_filename', e.target.value);
    document.getElementById('apiKey').onchange = e => localStorage.setItem(
        'api_key', e.target.value);



    // 在 init 函数内，apiKey 恢复之后添加：
    // ✅ 只创建 imageHostStatus 元素（供 checkImageHostStatus 使用），不监听输入框变化
    const imageHostStatus = document.createElement('div');
    imageHostStatus.id = 'imageHostStatus';
    imageHostStatus.style.display = 'none';
    const apiKeyInput = document.getElementById('apiKey');
    apiKeyInput.parentNode.appendChild(imageHostStatus);





    // 设备按钮
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.onclick = () => document.getElementById('device')
            .value = btn.dataset.device;
    });

    // 常用地点按钮（未知 / 地球）
    document.querySelectorAll('#locationShortcuts .location-btn').forEach(
        btn => {
            btn.onclick = () => {
                const name = btn.dataset.location;
                if (name === '未知' || name === '地球') {
                    document.getElementById('location').value =
                    name;
                    document.getElementById('coordsDisplay').value =
                        '';
                }
            };
        });

    // 获取经纬度按钮
    const getCoordsBtn = document.getElementById('getCoordsBtn');
    if (getCoordsBtn) getCoordsBtn.onclick = searchCoords;

    // 回车触发搜索
    const locInput = document.getElementById('location');
    if (locInput) {
        locInput.addEventListener('keydown', function(e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                searchCoords();
            }
        });
    }

    // 清除坐标
    document.getElementById('clearLocation').onclick = () => {
        document.getElementById('coordsDisplay').value = '';
        showToast('已清除坐标', 'success');
    };

    // ✅ 删除了 document.getElementById('regetLocation').onclick 和 autoLocation() 调用

    // 上传
    document.getElementById('uploadBtn').onclick = () => document
        .getElementById('fileInput').click();
    document.getElementById('fileInput').onchange = async e => {
        if (e.target.files.length) {
            await uploadImages(Array.from(e.target.files));
            e.target.value = '';
        }
    };

    // 发布
    document.getElementById('publishBtn').onclick = publishStatus;
    document.getElementById('githubToken').oninput = () => loadStatuses();
    document.getElementById('device').value = detectDevice();

    // 内容预览
    const contentTextarea = document.getElementById('content'),
        previewSpan = document.getElementById('previewText');
    const savedContent = localStorage.getItem('draft_content');
    if (savedContent) contentTextarea.value = savedContent;
    contentTextarea.addEventListener('input', function() {
        localStorage.setItem('draft_content', this.value);
    });
    if (contentTextarea && previewSpan) {
        function updatePreview() {
            let text = contentTextarea.value;
            if (!text) {
                previewSpan.innerHTML = '';
                return;
            }
            previewSpan.innerHTML = text.replace(/&/g, "&amp;").replace(
                /</g, "&lt;").replace(/>/g, "&gt;").replace(
                /\*\*(.*?)\*\*/g, "<strong>$1</strong>").replace(
                /\*(.*?)\*/g, "<em>$1</em>").replace(/\n/g, "<br>");
        }
        contentTextarea.addEventListener('input', updatePreview);
        updatePreview();
                // ✅ 草稿标签更新
        const draftBadge = document.getElementById('draftBadge');
        if (draftBadge && contentTextarea) {
            const updateDraftBadge = () => {
                if (contentTextarea.value.trim()) {
                    draftBadge.textContent = '📝 有草稿';
                    draftBadge.style.display = 'inline';
                } else {
                    draftBadge.style.display = 'none';
                }
            };
            contentTextarea.addEventListener('input', updateDraftBadge);
            updateDraftBadge();
        }
    }

    // 在 init 函数里，和其他按钮绑定放一起
    const imgMgrBtn = document.getElementById('imgMgrBtn');
    if (imgMgrBtn) {
        imgMgrBtn.onclick = () => {
            window.open('/admin/see.html', '_blank');
        };
    }

    // 搜索
    let searchTimer;
    document.getElementById('searchInput').oninput = function() {
        if (searchTimer) clearTimeout(searchTimer);
        searchTimer = setTimeout(() => {
            searchQuery = this.value.trim();
            currentPage = 1;
            updateFilteredStatuses();
            buildFilters();
        }, 300);
    };

    // ✅ 加载动态 - 延迟执行确保 DOM 完全加载
    setTimeout(() => {
        if (document.getElementById('githubToken')?.value) {
            loadStatuses();
        } else {
            // 没有 token，展开配置，折叠发布
            const configSection = document.getElementById('configSection');
            const publishSection = document.getElementById('publishSection');
            if (configSection) configSection.classList.remove('collapsed');
            if (publishSection) publishSection.classList.add('collapsed');
        }
    }, 100);

    // 批量操作
    document.getElementById('selectAllBtn').addEventListener('click',
() => {
        document.querySelectorAll('.status-checkbox').forEach(
        cb => {
            cb.checked = true;
            selectedIds.add(cb.dataset.id);
        });
        updateBatchBar();
    });
    document.getElementById('invertBtn').addEventListener('click', () => {
        document.querySelectorAll('.status-checkbox').forEach(
        cb => {
            cb.checked = !cb.checked;
            if (cb.checked) selectedIds.add(cb.dataset.id);
            else selectedIds.delete(cb.dataset.id);
        });
        updateBatchBar();
    });
    document.getElementById('batchCancelBtn').addEventListener('click',
    () => {
            selectedIds.clear();
            document.querySelectorAll('.status-checkbox').forEach(cb =>
                cb.checked = false);
            updateBatchBar();
        });
    document.addEventListener('change', (e) => {
        if (e.target.classList.contains('status-checkbox')) {
            if (e.target.checked) selectedIds.add(e.target.dataset
                .id);
            else selectedIds.delete(e.target.dataset.id);
            updateBatchBar();
        }
    });

    document.getElementById('batchDeleteBtn').addEventListener('click',
        async () => {
            if (selectedIds.size === 0) return;
            if (!confirm(`确定删除选中的 ${selectedIds.size} 条动态吗？`))
                return;
            const token = document.getElementById('githubToken')
                .value;
            if (!token) {
                showToast('请先输入 GitHub Token', 'error');
                return;
            }
            const deleteBtn = document.getElementById(
                'batchDeleteBtn');
            deleteBtn.disabled = true;
            deleteBtn.textContent = '⏳ 删除中...';
            const before = currentStatuses.length;
            currentStatuses = currentStatuses.filter(s => !
                selectedIds.has(s.id));
            if (await updateGist(token)) {
                showToast(
                    `✅ 成功删除 ${before - currentStatuses.length} 条动态`,
                    'success');
                selectedIds.clear();
                updateBatchBar();
                await loadStatuses();
            } else {
                showToast('❌ 删除失败', 'error');
            }
            deleteBtn.disabled = false;
            deleteBtn.textContent = '🗑 批量删除';
        });

    document.getElementById('batchResetPinnedBtn').addEventListener('click',
        async () => {
            if (selectedIds.size === 0) return;
            if (!confirm(`确定重置选中的 ${selectedIds.size} 条置顶吗？`))
                return;
            const token = document.getElementById('githubToken')
                .value;
            if (!token) {
                showToast('请先输入 GitHub Token', 'error');
                return;
            }
            const btn = document.getElementById(
                'batchResetPinnedBtn');
            btn.disabled = true;
            btn.textContent = '⏳ 重置中...';
            let count = 0;
            currentStatuses.forEach(s => {
                if (selectedIds.has(s.id) && s.pinned) {
                    s.pinned = 0;
                    count++;
                }
            });
            if (count === 0) {
                showToast('选中的动态没有置顶项', 'error');
                btn.disabled = false;
                btn.textContent = '📌 重置置顶';
                return;
            }
            if (await updateGist(token)) {
                showToast(`✅ 成功重置 ${count} 条置顶`, 'success');
                selectedIds.clear();
                document.querySelectorAll('.status-checkbox')
                    .forEach(cb => cb.checked = false);
                updateBatchBar();
                await loadStatuses();
            } else {
                showToast('❌ 重置失败', 'error');
            }
            btn.disabled = false;
            btn.textContent = '📌 重置置顶';
        });

    // 批量改地址
    document.getElementById('batchLocationBtn').addEventListener('click', () => {
        if (selectedIds.size === 0) return;
        document.getElementById('batchLocationCount').textContent = `将修改选中的 ${selectedIds.size} 条动态`;
        // 直接让内容为空，打破所有缓存和默认值
        document.getElementById('batchLocationInput').value = '';
        document.getElementById('batchCoordsDisplay').value = '';
        
        document.getElementById('batchLocationModal').style.display = 'flex';
    });

    document.getElementById('batchLocationCancel').addEventListener('click',
        () => {
            document.getElementById('batchLocationModal').style
                .display = 'none';
        });
    document.querySelectorAll('.batch-loc-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.getElementById('batchLocationInput').value = btn.dataset.loc || '';
            document.getElementById('batchCoordsDisplay').value = btn.dataset.coords || '';
        });
    });



    // 批量清除坐标
    document.getElementById('batchClearLocation').addEventListener('click',
        () => {
            document.getElementById('batchCoordsDisplay').value = '';
        });

    // 批量保存
    document.getElementById('batchLocationSave').addEventListener('click',
        async () => {
            const newLocation = document.getElementById(
                'batchLocationInput').value.trim();
            if (!newLocation) {
                showToast('请输入新地址', 'error');
                return;
            }
            const coordsStr = document.getElementById(
                'batchCoordsDisplay').value.trim();
            let newCoords = null;
            if (coordsStr) {
                const parts = coordsStr.split(',').map(s =>
                    parseFloat(s.trim()));
                if (parts.length === 2 && !isNaN(parts[0]) && !
                    isNaN(parts[1])) newCoords = parts;
            }
            const token = document.getElementById('githubToken')
                .value;
            if (!token) {
                showToast('请先输入 GitHub Token', 'error');
                return;
            }
            const btn = document.getElementById(
            'batchLocationSave');
            btn.disabled = true;
            btn.textContent = '⏳ 修改中...';
            let count = 0;
            currentStatuses.forEach(s => {
                if (selectedIds.has(s.id)) {
                    s.location = newLocation;
                    if (newCoords) s.coords = newCoords;
                    count++;
                }
            });
            if (await updateGist(token)) {
                showToast(`✅ 成功修改 ${count} 条地址`, 'success');
                document.getElementById('batchLocationModal').style
                    .display = 'none';
                selectedIds.clear();
                document.querySelectorAll('.status-checkbox')
                    .forEach(cb => cb.checked = false);
                updateBatchBar();
                await loadStatuses();
            } else {
                showToast('❌ 修改失败', 'error');
            }
            btn.disabled = false;
            btn.textContent = '💾 批量修改';
        });
})();
// ==================== 格式按钮 ====================
// 通用加粗函数
function applyBold(ta) {
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd, text = ta.value;
    if (start !== end) {
        ta.value = text.substring(0, start) + '**' + text.substring(start, end) + '**' + text.substring(end);
        ta.selectionStart = start + 2;
        ta.selectionEnd = end + 2;
    } else {
        ta.value = text.substring(0, start) + '****' + text.substring(end);
        ta.selectionStart = ta.selectionEnd = start + 2;
    }
    ta.focus();
    ta.dispatchEvent(new Event('input'));
}

// 通用斜体函数
function applyItalic(ta) {
    if (!ta) return;
    const start = ta.selectionStart, end = ta.selectionEnd, text = ta.value;
    if (start !== end) {
        ta.value = text.substring(0, start) + '*' + text.substring(start, end) + '*' + text.substring(end);
        ta.selectionStart = start + 1;
        ta.selectionEnd = end + 1;
    } else {
        ta.value = text.substring(0, start) + '**' + text.substring(end);
        ta.selectionStart = ta.selectionEnd = start + 1;
    }
    ta.focus();
    ta.dispatchEvent(new Event('input'));
}

(function bindFormatButtons() {
    const boldBtn = document.getElementById('boldBtn'),
        italicBtn = document.getElementById('italicBtn');
    if (boldBtn) boldBtn.addEventListener('click', () => applyBold(document.getElementById('content')));
    if (italicBtn) italicBtn.addEventListener('click', () => applyItalic(document.getElementById('content')));
})();

// ==================== 压缩面板 ====================
(function initCompressPanel() {
    const qualityRadios = document.querySelectorAll(
            'input[name="compressQuality"]'),
        advancedDiv = document.getElementById('compressAdvanced'),
        minSizeInput = document.getElementById('compressMinSize'),
        maxWidthInput = document.getElementById('compressMaxWidth');

    function updateRadioStyles() {
        document.querySelectorAll('.quality-radio').forEach(label => {
            const radio = label.querySelector(
            'input[type="radio"]');
            if (radio.checked) {
                label.style.background = '#007aff';
                label.style.color = '#fff';
                label.style.fontWeight = '500';
            } else {
                label.style.background = 'transparent';
                label.style.color = '#666';
                label.style.fontWeight = 'normal';
            }
        });
    }

    function toggleAdvancedOptions() {
        advancedDiv.style.display = (document.querySelector(
                'input[name="compressQuality"]:checked')?.value >= 1.0) ?
            'none' : 'flex';
    }
    qualityRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            updateRadioStyles();
            toggleAdvancedOptions();
            localStorage.setItem('compress_quality', this
                .value);
        });
    });
    minSizeInput.addEventListener('change', function() {
        localStorage.setItem('compress_minSize', this.value);
    });
    maxWidthInput.addEventListener('change', function() {
        localStorage.setItem('compress_maxWidth', this.value);
    });
    const savedQuality = localStorage.getItem('compress_quality');
    if (savedQuality) {
        const r = document.querySelector(
            `input[name="compressQuality"][value="${savedQuality}"]`);
        if (r) r.checked = true;
    }
    const savedMinSize = localStorage.getItem('compress_minSize');
    if (savedMinSize) minSizeInput.value = savedMinSize;
    const savedMaxWidth = localStorage.getItem('compress_maxWidth');
    if (savedMaxWidth) maxWidthInput.value = savedMaxWidth;
    updateRadioStyles();
    toggleAdvancedOptions();
})();


// ==================== 图床图片选择器 ====================
(function initImagePicker() {
    const pickBtn = document.getElementById('pickImgBtn');
    const modal = document.getElementById('imagePickerModal');
    const closeBtn = document.getElementById('imgPickerClose');
    const statusEl = document.getElementById('imgPickerStatus');
    const gridEl = document.getElementById('imgPickerGrid');
    const countEl = document.getElementById('imgPickCount');
    const cancelBtn = document.getElementById('imgPickCancel');
    const confirmBtn = document.getElementById('imgPickConfirm');

    let allFiles = [];
    let selectedSet = new Set();
    let shownCount = 0;
    const INITIAL_LOAD = 12;
    const LOAD_MORE = 9;

    // 打开弹窗
    pickBtn.onclick = () => {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';   // 关闭后面的滚动条
        document.documentElement.style.overflow = 'hidden';  // 关闭后面的滚动条
        statusEl.textContent = '⏳ 加载中...';
        gridEl.innerHTML = '';
        shownCount = 0;
        selectedSet.clear();
        updateConfirmBtn();
        loadFiles();
    };

    // 关闭弹窗
    function closeModal() { 
        modal.style.display = 'none'; 
        document.body.style.overflow = '';
        document.documentElement.style.overflow = '';  // 关闭后面的滚动条
    }
    closeBtn.onclick = closeModal;
    cancelBtn.onclick = closeModal;
    modal.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });

    // 加载文件
    async function loadFiles() {
        const apiKey = document.getElementById('apiKey').value.trim();
        if (!apiKey) { statusEl.textContent = '❌ 请先填写图床 API Key'; return; }
        try {
            const res = await fetch('https://s.ee/api/v1/files', { method: 'GET', headers: { 'Authorization': apiKey } });
            const data = await res.json();
            if (data.success && data.data) {
                allFiles = data.data;
                if (!allFiles.length) { statusEl.textContent = '📭 图床暂无图片'; return; }
                statusEl.textContent = '';
                shownCount = 0;
                gridEl.innerHTML = '';
                if (window.innerWidth <= 550) {
                    gridEl.style.gridTemplateColumns = 'repeat(auto-fill, minmax(75px, 1fr))';
                    gridEl.style.gap = '4px';
                }
                renderMore();
            } else {
                statusEl.textContent = '❌ ' + (data.message || '加载失败');
            }
        } catch(e) {
            statusEl.textContent = '❌ 网络错误';
        }
    }

// 渲染更多 - 懒加载版
// 渲染更多 - 懒加载版
function renderMore() {
    const next = Math.min(shownCount + (shownCount === 0 ? INITIAL_LOAD : LOAD_MORE), allFiles.length);
    let html = '';
    for (let i = shownCount; i < next; i++) {
        const f = allFiles[i];
        const isSel = selectedSet.has(i);
        html += `
            <div class="img-picker-item" data-index="${i}" style="position:relative;border-radius:8px;overflow:hidden;cursor:pointer;border:3px solid ${isSel ? '#43a047' : 'transparent'};aspect-ratio:1;background:#eee;">
                <img data-src="${f.url}" style="width:100%;height:100%;object-fit:cover;display:block;opacity:0;transition:opacity .3s;" onerror="this.parentElement.style.display='none'">
                <div style="position:absolute;top:4px;left:4px;width:22px;height:22px;border-radius:4px;background:${isSel ? '#43a047' : 'rgba(0,0,0,.35)'};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;pointer-events:none;">${isSel ? '✓' : ''}</div>
            </div>
        `;
    }
    gridEl.insertAdjacentHTML('beforeend', html);

    // 懒加载这批图片
    const allItems = gridEl.querySelectorAll('.img-picker-item');
    for (let i = shownCount; i < next; i++) {
        const img = allItems[i].querySelector('img');
        if (img && img.dataset.src) {
            img.src = img.dataset.src;
            img.removeAttribute('data-src');
            img.onload = () => { img.style.opacity = '1'; };
            img.onerror = () => { img.parentElement.style.display = 'none'; };
        }
    }

    // 移除旧按钮（如果存在）
    const oldBtn = document.getElementById('imgLoadMoreBtn');
    if (oldBtn) oldBtn.remove();

    // 如果有更多图片，在网格后面（但在 actions 前面）添加按钮
    if (next < allFiles.length) {
        const btn = document.createElement('button');
        btn.id = 'imgLoadMoreBtn';
        btn.textContent = `📂 加载更多 (${allFiles.length - next} 张)`;
        btn.style.cssText = 'display:block;width:100%;padding:12px;margin-top:8px;border:1px solid #ddd;border-radius:8px;background:#f9f9f9;cursor:pointer;font-size:14px;color:#333;';
        btn.onclick = () => { 
            btn.textContent = '⏳ 加载中...'; 
            btn.disabled = true; 
            setTimeout(() => renderMore(), 100); 
        };
        // 关键修改：插入到网格和操作栏之间
        const actionsDiv = document.getElementById('imgPickerActions');
        gridEl.parentNode.insertBefore(btn, actionsDiv);
    }

    // 绑定点击
    gridEl.querySelectorAll('.img-picker-item').forEach(el => {
        if (el._bound) return;
        el._bound = true;
        el.onclick = () => {
            const idx = parseInt(el.dataset.index);
            if (selectedSet.has(idx)) selectedSet.delete(idx); 
            else selectedSet.add(idx);
            updateUI();
        };
    });

    shownCount = next;
    updateUI();
}

    function updateUI() {
        countEl.textContent = `已选 ${selectedSet.size} 张`;
        updateConfirmBtn();

        gridEl.querySelectorAll('.img-picker-item').forEach(el => {
            const idx = parseInt(el.dataset.index);
            const isSel = selectedSet.has(idx);
            el.style.borderColor = isSel ? '#43a047' : 'transparent';
            const badge = el.querySelector('div');
            badge.style.background = isSel ? '#43a047' : 'rgba(0,0,0,.35)';
            badge.textContent = isSel ? '✓' : '';
        });
    }

    function updateConfirmBtn() {
        if (selectedSet.size > 0) {
            confirmBtn.disabled = false;
            confirmBtn.style.opacity = '1';
            confirmBtn.style.cursor = 'pointer';
        } else {
            confirmBtn.disabled = true;
            confirmBtn.style.opacity = '0.5';
            confirmBtn.style.cursor = 'not-allowed';
        }
    }

    // 确认添加
    confirmBtn.onclick = () => {
        if (selectedSet.size === 0) return;
        const urls = [...selectedSet].map(i => allFiles[i].url);
        const imagesInput = document.getElementById('images');
        const current = imagesInput.value.trim();
        imagesInput.value = current ? current + '\n' + urls.join('\n') : urls.join('\n');
        imagesInput.dispatchEvent(new Event('input'));
        urls.forEach(url => {
            const previewContainer = document.getElementById('imagePreview');
            if (![...previewContainer.querySelectorAll('img')].some(img => img.src === url)) {
                addGreenPreview(url);
            }
        });
        closeModal();
    };

    updateConfirmBtn();
})();

// 红X预览：上传的图片，点击X同时删除链接和图床源文件
function addRedPreview(url) {
    const previewContainer = document.getElementById('imagePreview');
    if ([...previewContainer.querySelectorAll('img')].some(img => img.src === url)) return;
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview-item';
    previewDiv.innerHTML = `
        <img src="${url}" alt="预览" onclick="window.open('${url}','_blank')">
        <div class="remove-preview">×</div>
    `;
    previewDiv.querySelector('.remove-preview').onclick = function() {
        const deleteUrl = uploadedImagesMap.get(url);
        removeImageWithHost(url, deleteUrl);
    };
    previewContainer.appendChild(previewDiv);
}

// 绿X预览：图床选的 + 手动输入的链接，点击X只删链接不删图床
function addGreenPreview(url) {
    const previewContainer = document.getElementById('imagePreview');
    if ([...previewContainer.querySelectorAll('img')].some(img => img.src === url)) return;
    
    const previewDiv = document.createElement('div');
    previewDiv.className = 'image-preview-item picked';
    previewDiv.innerHTML = `
        <img src="${url}" alt="预览" onclick="window.open('${url}','_blank')">
        <div class="remove-preview" style="background:#43a047;color:#fff;" title="仅删除链接，不删图床">×</div>
    `;
    previewDiv.querySelector('.remove-preview').onclick = function() {
        const imagesInput = document.getElementById('images');
        let urls = imagesInput.value.trim().split(/\s+/).filter(u => u && u !== url);
        imagesInput.value = urls.join('\n');
        imagesInput.dispatchEvent(new Event('input', { bubbles: true }));
        previewDiv.remove();
    };
    previewContainer.appendChild(previewDiv);
}