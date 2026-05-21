# 滚动截图工具

一个浏览器插件，用于对当前正在浏览的网页进行滚动截图，支持Windows和macOS平台。

## 功能特性

- 📷 支持对整个网页进行滚动截图
- 💾 自动下载PNG格式的截图文件
- 🌐 支持Chrome、Edge等基于Chromium的浏览器
- 💻 兼容Windows和macOS平台
- 🎨 简洁易用的界面

## 安装方法

### 开发模式安装

1. 克隆或下载本项目到本地
2. 打开浏览器，进入扩展管理页面
   - Chrome: `chrome://extensions/`
   - Edge: `edge://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择本项目的根目录
6. 插件安装完成，即可在浏览器工具栏看到截图图标

## 使用方法

1. 打开需要截图的网页
2. 点击浏览器工具栏中的截图图标
3. 在弹出的窗口中点击"开始截图"按钮
4. 等待插件自动完成滚动和截图
5. 截图文件将自动下载到您的默认下载目录

## 技术实现

- 使用WebExtension API开发
- 基于Manifest V3
- 使用Canvas进行截图拼接
- 支持现代浏览器

## 项目结构

```
滚动截图工具/
├── icons/                 # 图标文件
│   ├── icon16.svg        # 16x16图标
│   ├── icon48.svg        # 48x48图标
│   └── icon128.svg       # 128x128图标
├── background.js         # 后台服务worker
├── manifest.json         # 插件配置文件
├── popup.html            # 弹出页面
├── popup.js              # 弹出页面逻辑
└── README.md             # 说明文档
```

## 浏览器兼容性

- Chrome 88+
- Edge 88+
- Firefox (即将支持)

## 许可协议

MIT License