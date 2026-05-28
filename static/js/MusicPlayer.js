/**
 * MusicPlayer - 音乐链接解析 & 数据获取工具
 * 基于 MetingJS 源码二次开发
 * 现已支持自动获取网易云音乐歌词文本
 */
class MusicPlayer {
  constructor(apiUrl = 'https://api.i-meto.com/meting/api') {
    this.apiUrl = apiUrl;
    this.patterns = [
      // netease
      [/music\.163\.com.*song.*id=(\d+)/, 'netease', 'song'],
      [/music\.163\.com.*album.*id=(\d+)/, 'netease', 'album'],
      [/music\.163\.com.*artist.*id=(\d+)/, 'netease', 'artist'],
      [/music\.163\.com.*playlist.*id=(\d+)/, 'netease', 'playlist'],
      // tencent - 注意：songDetail 规则放在 song 前面
      [/y\.qq\.com.*songDetail\/(\w+)/, 'tencent', 'song'],
      [/y\.qq\.com.*song\/(\w+)\.html/, 'tencent', 'song'],
      [/y\.qq\.com.*album\/(\w+)\.html/, 'tencent', 'album'],
      [/y\.qq\.com.*singer\/(\w+)\.html/, 'tencent', 'artist'],
      [/y\.qq\.com.*playlist\/(\d+)/, 'tencent', 'playlist'], 
      [/y\.qq\.com.*playsquare\/(\w+)\.html/, 'tencent', 'playlist'],
      [/y\.qq\.com.*playlist\/(\w+)\.html/, 'tencent', 'playlist'],
      // xiami
      [/xiami\.com.*song\/(\w+)/, 'xiami', 'song'],
      [/xiami\.com.*album\/(\w+)/, 'xiami', 'album'],
      [/xiami\.com.*artist\/(\w+)/, 'xiami', 'artist'],
      [/xiami\.com.*collect\/(\w+)/, 'xiami', 'playlist'],
    ];
  }

  parseLink(link) {
    for (let [regex, server, type] of this.patterns) {
      const match = link.match(regex);
      if (match) {
        return { server, type, id: match[1] };
      }
    }
    return null;
  }

  /**
   * 获取歌词文本（lrc 字段是 URL 时需要请求）
   * @param {string} lrcUrl - 歌词链接或纯文本
   * @returns {Promise<string>} 歌词文本
   */
  async fetchLrc(lrcUrl) {
    if (!lrcUrl) return '';
    // 如果已经是纯文本（不以 http 开头），直接返回
    if (!lrcUrl.startsWith('http')) return lrcUrl;
    try {
      const res = await fetch(lrcUrl);
      if (!res.ok) return ''; // 401/404 等直接返回空字符串
      return await res.text();
    } catch(e) {
      return '';
    }
  }

  /**
   * 批量获取歌曲的歌词文本 - 每次只请求2首
   * @param {Array} songs - 格式化后的歌曲数组
   * @returns {Promise<Array>} 补充歌词后的歌曲数组
   */
async enrichLrc(songs) {
    const results = [];
    for (let i = 0; i < songs.length; i += 2) {
        const batch = songs.slice(i, i + 2);
        const batchResults = await Promise.all(batch.map(async (song) => {
            if (song.lrc && song.lrc.startsWith('http')) {
                try {
                    song.lrc = await this.fetchLrc(song.lrc);
                } catch(e) {
                    song.lrc = '';
                }
            }
            return song;
        }));
        results.push(...batchResults);
    }
    return results;
}

  async fetchData(server, type, id) {
    const url = `${this.apiUrl}?server=${server}&type=${type}&id=${id}&r=${Math.random()}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API 请求失败: ${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    return await this.formatSongs(data, server, type);
  }

async formatSongs(rawData, server, type) {
    const supportedTypes = ['song', 'playlist', 'album'];
    if (!supportedTypes.includes(type)) {
        console.warn(`不支持的 type: ${type}`);
        return [];
    }
    
    if (type === 'song') {
        const songData = Array.isArray(rawData) ? rawData[0] : rawData;
        return [this.formatSingleSong(songData)];  // 不调 enrichLrc
    }
    if (type === 'playlist' || type === 'album') {
        if (!Array.isArray(rawData)) return [];
        return rawData.map(item => this.formatSingleSong(item));  // 不调 enrichLrc
    }
    return [];
}

// 新增：只加载第一首歌的歌词
async loadWithLrc(link) {
    const songs = await this.load(link);
    if (songs.length > 0 && songs[0].lrc && songs[0].lrc.startsWith('http')) {
        try {
            await new Promise(r => setTimeout(r, 300));
            songs[0].lrc = await this.fetchLrc(songs[0].lrc);
        } catch(e) {
            songs[0].lrc = '';
        }
    }
    return songs;
}

/**
 * 获取真实封面图片地址（跟随重定向）
 * @param {string} picUrl - API 返回的 pic 代理链接
 * @returns {Promise<string>} 真实图片直链，失败则返回原链接
 */
async resolveCover(picUrl) {
    if (!picUrl || !picUrl.includes('type=pic')) return picUrl;
    try {
        const resp = await fetch(picUrl, { method: 'HEAD', redirect: 'follow' });
        // 重定向后的真实地址
        if (resp.url && resp.url !== picUrl) {
            let realUrl = resp.url;
            // 强制 http → https
            if (realUrl.startsWith('http://')) {
                realUrl = realUrl.replace('http://', 'https://');
            }
            return realUrl;
        }
    } catch(e) {}
    return picUrl;
}

  formatSingleSong(item) {
    return {
      name: item.title || item.name || '未知歌曲',
      artist: item.author || item.artist || '未知艺术家',
      url: item.url || '',
      cover: item.pic || item.cover || '',
      lrc: item.lrc || item.lyric || '',
    };
  }

  async load(link) {
    const info = this.parseLink(link);
    if (!info) throw new Error('无法识别的音乐链接');
    return await this.fetchData(info.server, info.type, info.id);
  }
}