# Hugo-theme-monochrome魔改版

***还没写使用方法, 反响好的话写***

[原主题: hugo-theme-monochrome](https://github.com/kaiiiz/hugo-theme-monochrome)

[魔改版演示/Demo](https://rakien.netlify.app)

***主要添加功能***

* 文章后台管理
* 动态后台管理
* 图床后台管理
* 配置好后可完全脱离设备直接在网络上完成发布工作

## hugo版本：0.128.0

## 魔改版特色

我最喜欢的脱离指定设备更新文章和动态的方式, 做后台,通过key和token进行管理.

## 功能预览

<div class="feature-grid">

### 📝 可配置文章发布后台

<img src="https://github.com/user-attachments/assets/82903a59-ed7c-42bb-9c47-9872167b39f3" alt="文章后台" width="600" />

### 📍 动态 & 图床后台管理

<div class="screenshots">
  <img src="https://github.com/user-attachments/assets/3a8a7c6d-6666-44ff-8caa-976236ef6876" alt="后台1" width="600" />
  <div class="screenshots-row">
    <img src="https://github.com/user-attachments/assets/b9b4372a-913f-4958-bc74-901a63fc9723" alt="后台2" width="290" />
    <img src="https://github.com/user-attachments/assets/3f193924-a9a2-4a9a-95c0-989e77b541ce" alt="后台3" width="290" />
  </div>
  <div class="screenshots-row">
    <img src="https://github.com/user-attachments/assets/e7e629e5-5931-4bf0-b370-b50a7cd00236" alt="后台4" width="290" />
    <img src="https://github.com/user-attachments/assets/5ca62039-d332-4b58-bd5a-c730f878f1b2" alt="后台5" width="290" />
  </div>
  <div class="screenshots-row">
    <img src="https://github.com/user-attachments/assets/8947c8e4-ffe7-4802-91ed-435f5dab8690" alt="后台6" width="290" />
    <img src="https://github.com/user-attachments/assets/180b6974-1a25-45b0-969a-07b124653277" alt="后台7" width="290" />
  </div>
</div>

### 🎵 动态音乐功能

<div class="screenshots-row">
  <img src="https://github.com/user-attachments/assets/9c30e70a-fcc0-4183-8ee7-887f5b529c2b" alt="音乐1" width="290" />
  <img src="https://github.com/user-attachments/assets/68267932-d4a0-4c75-8f87-04bb7ab297f6" alt="音乐2" width="290" />
</div>

### 🗺️ 地图分类动态

<img src="https://github.com/user-attachments/assets/40acba15-1598-4403-a17b-cbae45a231c2" alt="地图动态" width="600" />

### 🖼️ 瀑布流相册

<div class="screenshots-row">
  <img src="https://github.com/user-attachments/assets/0dafeca5-8f28-4114-9e07-c85dec7cfe15" alt="相册1" width="290" />
  <img src="https://github.com/user-attachments/assets/8c66c741-1165-4762-bf15-bc1863cce64a" alt="相册2" width="290" />
</div>

</div>

<style>
.feature-grid {
  max-width: 100%;
}

.feature-grid h3 {
  margin: 24px 0 12px 0;
  padding-bottom: 6px;
  border-bottom: 2px solid #eaecef;
}

.screenshots {
  margin: 12px 0;
}

.screenshots-row {
  display: flex;
  gap: 16px;
  margin: 12px 0;
  flex-wrap: wrap;
}

.screenshots-row img {
  border-radius: 8px;
  border: 1px solid #e1e4e8;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.screenshots-row img:hover {
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
}

.feature-grid > p > img {
  border-radius: 8px;
  border: 1px solid #e1e4e8;
  margin: 12px 0;
  box-shadow: 0 1px 3px rgba(0,0,0,0.08);
}
</style>
## 必备!!

先每个链接打开试试. 如果能进GitHub, 那<基础功能>和<动态功能>是能搞定的, <评论功能>的MangoDB如果打不开, 或者不会配置就算了.

***<基础>***

1. [GitHub账户]([github](https://github.com/)
2. [Netlify注册](https://app.netlify.com/)
3. [S.EE图床(免费5g)](https://s.ee)

***开启<动态>必备***

1. [Github的Gist](https://gist.github.com/)
2. [获取一个Gist的Token](https://github.com/settings/tokens)

***开启<评论功能>必备***

1. [搭建Twikoo 1.7.9版 (Netlify免费部署)](https://twikoo.js.org/)
2. [MongoDB数据库(免费)](https://www.mongodb.com/)

## 一键部署

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/integration/start/deploy?repository=https://github.com/Rakiendesu/Hugo-theme-monochromePro)

***部署后去github修改根目录的hugo.toml配置文件.***

# 我的hugo.toml配置文件

```toml
title = "Rakien"
theme = "monochrome"
defaultContentLanguage = "zh"
baseURL = "https://rakien.netlify.app"

[services]
  [services.disqus]
    shortname = ""
  [services.googleAnalytics]
    id = ""

[params]
  navbar_title = "" #网站名
  footer = "我心单单向明月🌙" #页脚
  favicon = "favicon.ico" #网站小图标
  enable_toc = true
  enable_collapsible_toc = false
  enable_collapsible_changelogs = true
  enable_header_anchor = true
  enable_math = false
  enable_zooming_js = false
  enable_site_search = true
  author = "Rakien"
  enable_open_graph = false
  enable_twitter_cards = false
  color_scheme = "light"
  og_image = "https://files.seeusercontent.com/2026/05/16/Gst8/avatar.jpg" #微信/qq等聊天软件分享时识别出的图片
  primaryColor = "#ff9800" #统一主题颜色修改

  [params.list_layout]
    enable_group_by_year = true
    enable_show_date = true
    enable_pagination = true



[[menu.navbar]]
  identifier = "home"
  name = "🏠 首页"
  title = "home"
  url = "/"
  weight = 1

[[menu.navbar]]
  identifier = "status"
  name = "💬 动态"
  title = "status"
  url = "/status/"
  weight = 2

[[menu.navbar]]
  identifier = "post"
  name = "✏️ 文章"
  title = "post"
  url = "/post/"
  weight = 3

[[menu.navbar]]
  identifier = "fenlei"
  name = "💼 分类"
  title = "fenlei"
  url = "/fenlei/"
  weight = 5

[[menu.navbar]]
  identifier = "gallery"
  name = "🖼️ 相册"
  title = "gallery"
  url = "/gallery/"
  weight = 10

[[menu.navbar]]
  identifier = "about"
  name = "🍼 关于"
  title = "about"
  url = "/about/"
  weight = 20

[outputs]
  home = ["HTML", "RSS", "JSON"]


#########⬇️⬇️⬇️⬇️⬇️⬇️动态页面配置⬇️⬇️⬇️⬇️⬇️⬇️##########
[params.status]
  # 动态数据源 *
  status_api_url = "https://gist.githubusercontent.com/你的用户名/你的GistID/raw/你的文件名.json" # 你gist创建的json文件
  filter = true #筛选动态按钮
  add = true #添加动态按钮
  music = true #音乐功能
  comment = true #评论功能
  location = true #显示发布地点
  date = true #显示发布日期
  device = true #显示发布设备

# 地图模块和地图瓦片
[params.status.map]
  enable = true # 动态页地图总开关
  js = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  css = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  tile_url = "https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}" # 地图瓦片地址 这是高德地图
  markerClusterJs = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"
  markerClusterCss = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css"
  markerClusterDefaultCss = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css"##

#####################评论功能##################
[params.comments]
  enable = true  # 控制所有文章评论开关

[params.twikoo]
  enable = true  # Twikoo独立开关
  cdn = "https://cdn.jsdelivr.net/npm/twikoo@1.7.9/dist/twikoo.min.js"  # CDN地址可配置
  envId = ""
  el = "#tcomment"
  region = "us-west-2"  # 默认区域
  path = ""

[params.artalk]
  enable = false  # Artalk独立开关
  cdn = "https://cdnjs.cloudflare.com/ajax/libs/artalk/2.9.1/Artalk.js"  # CDN地址可配置
  el = "#artalkComments"
  pageKey = ""  # 固定链接
  pageTitle = ""  # 页面标题
  server = ""  # 后端地址
  site = "Rakien's Blog"

######################灯箱功能####################
#灯箱配置
[params.fancybox]
  enable = true #全局开启和关闭
  css_url = "https://cdn.jsdelivr.net/npm/@fancyapps/ui@6.1/dist/fancybox/fancybox.css"
  js_url = "https://cdn.jsdelivr.net/npm/@fancyapps/ui@6.1/dist/fancybox/fancybox.umd.js"

######################还是不要开了#################
#~~~~~~~~AOS滚动渐入动画配置~~~~~~~~~~~~
[params.aos]
enable = false  # AOS 动画总开关
js_url = "https://unpkg.com/aos@2.3.1/dist/aos.js"  # AOS JS 地址
effect = "zoom-in-up"  # 默认动画效果

[params.aos.init]
startEvent = "DOMContentLoaded"
offset = 1
duration = 800
# delay = 0 #延迟毫秒
easing = "ease" #动画进入感觉
once = true #只执行一次
mirror = false 
anchorPlacement = "top-bottom"

################代码块 重写过,尽量不要动了#############

[params.syntax_highlight]
lib = "builtin"      # 使用内置 Chroma
  [params.syntax_highlight.builtin]
    enable_code_copy = true  # 启用复制按钮 已无效

# 启用 Hugo 内置的 Chroma 高亮
[markup.highlight]
codeFences = true      # 必须为 true
lineNos = false         # 显示行号(重写了行号, 这个不好用, 不要开)
lineNumbersInTable = false
noClasses = false
tabWidth = 4

# 添加代码块折叠配置
[markup.highlight.codeBlock]
lineNos = true
fold = "auto"          # 自动折叠长代码块
foldLimit = 15         # 超过15行自动折叠

######################网站统计####################
#谷歌统计
[params.google]
  enable = true
  id = ""

#umami统计
[params.umami]
  enable = true
  src = "https://cloud.umami.is/script.js"
  id = ""
################################################

######################瀑布流js地址#################
# masonry瀑布流总配置
[params.masonry]
  jsUrl = "https://unpkg.com/masonry-layout@4/dist/masonry.pkgd.min.js"
  imagesloaded = "https://unpkg.com/imagesloaded@5/imagesloaded.pkgd.min.js"
################################################
```



