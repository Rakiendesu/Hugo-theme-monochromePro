# Hugo-theme-monochrome魔改版

[演示/Demo](https://rakien.netlify.app)

***主要添加功能***

* 文章后台管理
* 动态后台管理
* 图床后台管理
* 配置好后可完全脱离设备直接在网络上完成发布工作

## hugo版本：0.128.0

## 必备!!

先每个链接打开试试. 如果能进GitHub, 那<基础功能>和<动态功能>是能搞定的, <评论功能>的MangoDB如果打不开, 或者不会配置就算了.

***<基础>***

1. [GitHub账户]([github](https://github.com/))
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

## 可配置文章发布后台

## 自带<动态><图床>后台管理

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
  navbar_title = "Rakien"
  footer = "我心单单向明月🌙"
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
  og_image = "https://files.seeusercontent.com/2026/05/16/Gst8/avatar.jpg"
  primaryColor = "#ff9800" #统一主题颜色

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
  status_api_url = "https://gist.githubusercontent.com/Rakiendesu/7124c7194835e7802a74e205dac37c57/raw/status.json"
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
  markerClusterDefaultCss = "https://unpkg.com/leaflet.markercluster@1.4.1/dist/MarkerCluster.Default.css"########⬆️⬆️⬆️⬆️⬆️⬆️动态页面配置⬆️⬆️⬆️⬆️⬆️⬆️###########

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
################################################

######################灯箱功能####################
#灯箱配置
[params.fancybox]
  enable = true #全局开启和关闭
  css_url = "https://cdn.jsdelivr.net/npm/@fancyapps/ui@6.1/dist/fancybox/fancybox.css"
  js_url = "https://cdn.jsdelivr.net/npm/@fancyapps/ui@6.1/dist/fancybox/fancybox.umd.js"
################################################

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
################################################

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
################################################

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



