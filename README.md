# 📱 SubTracker — 订阅记账

> 一款专注于**月度固定支出管理**的 PWA 应用，帮你清晰掌握每月订阅和会员支出。

🔗 **在线使用**：[harokell.github.io/subtracker](https://harokell.github.io/subtracker/)

## 📸 界面预览

<p align="center">
  <img src="docs/dashboard.png" width="250" alt="仪表板" />
  &nbsp;&nbsp;
  <img src="docs/list.png" width="250" alt="订阅列表" />
  &nbsp;&nbsp;
  <img src="docs/stats.png" width="250" alt="支出统计" />
</p>

## ✨ 功能特性

- 📊 **仪表板** — 一眼看到每月总支出、活跃订阅数、年度预估
- 📅 **即将扣费** — 按日期排序，提前知道哪些快到期
- 📋 **订阅管理** — 添加、编辑、暂停、删除订阅
- 🔄 **扣费周期** — 支持月付、季付、年付，自动折算月均费用
- 🏷️ **分类筛选** — 娱乐、工具、生活、通讯、健身、教育等
- 📈 **支出统计** — 月度、日均、年度数据 + 排行
- 📱 **PWA 支持** — 可添加到手机桌面，离线可用
- 🔒 **隐私安全** — 数据仅存储在本地，不上传任何服务器

## 🛠️ 技术栈

| 技术 | 用途 |
|------|------|
| Vite | 构建工具 |
| Vanilla JS | 应用逻辑 |
| IndexedDB | 本地数据持久化 |
| vite-plugin-pwa | PWA 离线与安装支持 |
| GitHub Actions | 自动部署到 GitHub Pages |

## 📦 本地开发

```bash
# 克隆仓库
git clone https://github.com/harokell/subtracker.git
cd subtracker

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 构建生产版本
npm run build
```

## 📲 如何在手机上使用

### iPhone / iPad（Safari）

1. 用 **Safari** 打开 [harokell.github.io/subtracker](https://harokell.github.io/subtracker/)
2. 点击底部 **分享按钮** ⬆️
3. 选择 **"添加到主屏幕"**
4. 像原生 App 一样使用！

### 安卓手机（Chrome）

1. 用 **Chrome** 打开 [harokell.github.io/subtracker](https://harokell.github.io/subtracker/)
2. 点击右上角 **⋮ 菜单**
3. 选择 **"添加到主屏幕"** 或 **"安装应用"**
4. 确认安装，桌面会出现 App 图标
5. 像原生 App 一样使用！

> 💡 **提示**：安装后 App 支持离线使用，数据保存在手机本地，不会上传到服务器。

## 📄 License

MIT
