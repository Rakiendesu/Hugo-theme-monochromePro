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

# Hugo 配置文件说明

> 复制以下配置到你的 `hugo.toml`，根据注释填写你自己的信息即可。

```toml
# ============================================================
# 网站基本信息
# ============================================================
title = "你的网站名"
theme = "monochrome"
defaultContentLanguage = "zh"
baseURL = "https://你的域名"

# 第三方服务（不用的留空）
[services]
  [services.disqus] shortname = ""
  [services.googleAnalytics] id = ""

# ============================================================
# 全局参数
# ============================================================
[params]
  navbar_title = ""               # 导航栏标题，留空则用 title
  footer = "你的页脚文字"          # 页面底部文字
  favicon = "favicon.ico"         # 浏览器标签页图标
  enable_toc = true               # 文章目录
  enable_collapsible_toc = false  # 折叠目录
  enable_collapsible_changelogs = true
  enable_header_anchor = true     # 标题锚点链接
  enable_math = false             # 数学公式
  enable_zooming_js = false       # 图片缩放
  enable_site_search = true       # 站内搜索
  author = "你的名字"
  enable_open_graph = false
  enable_twitter_cards = false
  color_scheme = "light"          # 默认主题 light / dark
  og_image = "https://你的头像地址"  # 分享时显示的图片
  primaryColor = "#ff9800"        # 全局主题色

  [params.list_layout]
    enable_group_by_year = true   # 文章列表按年份分组
    enable_show_date = true       # 显示日期
    enable_pagination = true      # 分页

# ============================================================
# 导航菜单
# ============================================================
[[menu.navbar]]
  identifier = "home"
  name = "🏠 首页"
  url = "/"
  weight = 1

[[menu.navbar]]
  identifier = "status"
  name = "💬 动态"
  url = "/status/"
  weight = 2

[[menu.navbar]]
  identifier = "post"
  name = "✏️ 文章"
  url = "/post/"
  weight = 3

[[menu.navbar]]
  identifier = "fenlei"
  name = "💼 分类"
  url = "/fenlei/"
  weight = 5

[[menu.navbar]]
  identifier = "gallery"
  name = "🖼️ 相册"
  url = "/gallery/"
  weight = 10

[[menu.navbar]]
  identifier = "about"
  name = "🍼 关于"
  url = "/about/"
  weight = 20

[outputs]
  home = ["HTML", "RSS", "JSON"]

# ============================================================
# 动态页面
# ============================================================
[params.status]
  status_api_url = "https://gist.githubusercontent.com/你的用户名/你的GistID/raw/你的文件名.json"
  filter = true       # 筛选按钮
  add = true          # 添加按钮
  music = true        # 音乐
  comment = true      # 评论
  location = true     # 显示地点
  date = true         # 显示日期
  device = true       # 显示设备

# ============================================================
# 朋友圈
# ============================================================
[params.moments]
  filter = true       # 筛选按钮
  music = true        # 音乐
  comment = true      # 评论
  showme = false      # 是否同时显示自己的动态

[params.moments.map]
  enable = true       # 朋友圈地图开关

# ============================================================
# 地图配置（动态和朋友圈共用）
# ============================================================
[params.status.map]
  enable = true       # 动态页地图开关
  ############  地图配置（动态和朋友圈共用）#######
  js = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
  css = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
  tile_url = "https://webrd04.is.autonavi.com/appmaptile?lang=zh_cn&size=1&scale=1&style=8&x={x}&y={y}&z={z}"
  markerClusterJs = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/leaflet.markercluster.js"
  markerClusterCss = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.css"
  markerClusterDefaultCss = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css"
  ######### 地图初始状态（一般不用改）#########
  zoomControl = true
  scrollWheelZoom = false
  doubleClickZoom = false
  touchZoom = false
  dragging = false
  boxZoom = false
  keyboard = false
  attributionControl = false
  lat = 37.87
  lon = 112.55
  zoom = 3
  maxZoom = 7
  minZoom = 3

# ============================================================
# 评论系统
# ============================================================
[params.comments]
  enable = true

[params.twikoo]
  enable = true
  cdn = "https://cdn.jsdelivr.net/npm/twikoo@1.7.9/dist/twikoo.min.js"
  envId = "https://你的twikoo地址/.netlify/functions/twikoo"
  el = "#tcomment"
  region = "us-west-2"
  path = ""

[params.artalk]
  enable = false
  cdn = "https://cdnjs.cloudflare.com/ajax/libs/artalk/2.9.1/Artalk.js"
  el = "#artalkComments"
  pageKey = ""
  pageTitle = ""
  server = ""
  site = ""

# ============================================================
# 灯箱（图片点击放大）
# ============================================================
[params.fancybox]
  enable = true
  css_url = "https://cdn.jsdelivr.net/npm/@fancyapps/ui@6.1/dist/fancybox/fancybox.css"
  js_url = "https://cdn.jsdelivr.net/npm/@fancyapps/ui@6.1/dist/fancybox/fancybox.umd.js"

# ============================================================
# AOS 滚动动画（建议关闭）
# ============================================================
[params.aos]
  enable = false
  js_url = "https://unpkg.com/aos@2.3.1/dist/aos.js"
  effect = "zoom-in-up"

[params.aos.init]
  startEvent = "DOMContentLoaded"
  offset = 1
  duration = 800
  easing = "ease"
  once = true
  mirror = false
  anchorPlacement = "top-bottom"

# ============================================================
# 代码高亮
# ============================================================
[params.syntax_highlight]
  lib = "builtin"

[params.syntax_highlight.builtin]
  enable_code_copy = true

[markup.highlight]
  codeFences = true
  lineNos = false
  lineNumbersInTable = false
  noClasses = false
  tabWidth = 4

[markup.highlight.codeBlock]
  lineNos = true
  fold = "auto"
  foldLimit = 15

# ============================================================
# 网站统计（不用的留空 id）
# ============================================================
[params.google]
  enable = true
  id = ""                     # Google Analytics ID

[params.umami]
  enable = true
  src = "https://cloud.umami.is/script.js"
  id = ""                     # Umami Website ID

# ============================================================
# 瀑布流（不用的留空 id）
# ============================================================
[params.masonry]
  jsUrl = "https://unpkg.com/masonry-layout@4/dist/masonry.pkgd.min.js"
  imagesloaded = "https://unpkg.com/imagesloaded@5/imagesloaded.pkgd.min.js"
```