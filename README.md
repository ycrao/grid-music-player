Grid Music Player
-----------------

>   受抖音音乐视频灵感启发，借助于 AI 驱动编码。一个支持 12 宫格展示与播放的音乐小应用。点击任意卡片会扩展为 2×2 大格显示，提供同步歌词动效、随机大字错位强化以及右下角音乐波形可视化（水平波形、带强拍增强）等功能。

### 功能特性

- 12 宫格布局，点击扩展为 2×2 大格，覆盖邻近卡片
- 播放控制：上一首 / 播放暂停 / 下一首
- LRC 歌词解析与时间同步，单行居中显示，随机入场动效
- 大字错位与异色渲染，自动避开小字行，减少重叠
- 音频波形可视化：右下角水平波形，随能量动态增强，强拍触发光晕与歌词脉冲
- 自适配移动端（栅格与卡片高度调整）

### 预览图

![grid-music-player](res/grid-music-player.png)

### 技术栈

- 前端框架：Vue 3
- 构建工具：Vite 5
- WebAudio：`AudioContext` + `AnalyserNode`

### 快速开始

- 安装依赖：
  ```bash
  npm i
  ```
- 本地预览：
  ```bash
  npm run dev
  # 打开 http://localhost:5173/
  ```
- 构建产物：
  ```bash
  npm run build
  npm run preview
  ```

### 目录结构

关键目录及文件如下：

```
proj1/
├─ src/
│  ├─ main.js            # 入口
│  └─ App.vue            # 主界面与交互逻辑
├─ res/                  # 音频、歌词与封面资源（当前放在根目录）
├─ index.html            # 挂载点与入口脚本引用
├─ style.css             # 全局样式（栅格、歌词、波形等）
├─ vite.config.js        # Vite 配置（启用 Vue 插件）
└─ package.json          # 依赖与脚本
```

### 资源准备

- 在 `res/` 目录放置：
  - 音频文件：`.mp3`
  - 歌词文件：`.lrc` 或含时间标签的 `.txt`
  - 封面图：建议使用 `.svg` 或 `.jpg/.png`
- 播放列表：`res/playlist.json`
  ```json
  [
    {
      "title": "九万字",
      "artist": "黄诗扶",
      "audio": "/res/jiuwanzi.mp3",
      "lyrics": "/res/jiuwanzi.txt",
      "cover": "/res/cover01.svg"
    }
  ]
  ```
- LRC 时间标签兼容：`[mm:ss]`、`[mm:ss.xx]`、`[mm:ss.xxx]`

### 使用说明

- 打开首页后，点击任意宫格开始播放；该卡扩展为 2×2，大格中居中显示当前行歌词
- 强拍时：右下角出现光晕闪烁，同时歌词行脉冲放大与轻微旋转
- 切换到另一格播放：之前格的歌词与波形被清理，避免干扰

### 自定义与参数

- 栅格大小：当前为 4 列×3 行；可在 `style.css` 的 `.grid` 规则中调整
- 扩展占位：默认 2×2，可在 `src/App.vue` 的 `expandTile` 中更改 `span`
- 歌词动效：效果集合定义在 `src/App.vue:57` 的 `effects`，可增删或调节延时
- 大字错位：避让与候选点逻辑在 `src/App.vue:58` 的 `placeOverlayChar`
- 波形样式：画布尺寸与阴影在 `style.css:35-37`，绘制逻辑在 `src/App.vue:59`

### 关键代码位置

- 栅格与扩展：`src/App.vue:46-53`
- 播放入口与状态切换：`src/App.vue:63`
- LRC 解析：`src/App.vue:49`
- 歌词渲染（单行、动效、避让）：`src/App.vue:56-58, 64`
- 水平波形绘制与强拍检测：`src/App.vue:59`
- 歌词脉冲联动：`src/App.vue:64`
- 样式与动画：`style.css:11, 18-37`

### 构建与部署建议

- 生产环境推荐将资源迁移到 `public/res/`，使其被打包产物直接静态提供；路径保持为 `/res/...`
- 如需基础路径（`base`）适配 CDN，修改 `vite.config.js` 的导出配置

### 常见问题

- 看不到歌词：检查 `res/playlist.json` 中 `lyrics` 路径是否存在，时间标签是否规范；开发环境下查看控制台网络请求是否 404
- 音频无法播放：确认 `audio` 路径正确；浏览器自动播放策略可能阻止播放，需用户点击触发
- 资源 404（构建后）：将 `res/` 迁移到 `public/`，或调整部署的静态资源目录

### 许可

- 本项目示例代码可自由用于学习与演示；音乐与歌词版权归其各自权利人所有，请勿用于商业发行。