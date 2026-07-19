# 暮光河谷 · Three.js 地形实验

一个基于 Three.js 与 vinext 的浏览器地形实验，包含程序化地形、水面、植被、可行走角色、双人共享镜头和雷神 G30 WebHID 手柄控制。

该项目设计为 `smallnewer/vibegames` 仓库中的独立子目录，可以单独安装、测试和运行。

## 环境要求

- Node.js `>=22.13.0`
- npm
- 使用手柄时，浏览器需要提供 WebHID，并从安全上下文或 `localhost` 打开页面
- 重新生成角色源资产时需要 Blender；运行时和普通前端开发不需要 Blender

## 本地开发

```bash
npm install
npm run dev
```

开发服务器启动后，按终端显示的 Local 地址访问游戏。

## 常用命令

```bash
npm run dev
npm run build
npm test
npm run lint
npm run sanitize:assets
```

`sanitize:assets` 会删除角色预览 PNG 中的 EXIF、文本和 XMP 元数据，避免 Blender 写入本机绝对路径。重新生成角色预览后应执行一次。

## 目录结构

- `app/`：Three.js 场景、界面和 G30 WebHID 控制
- `public/`：游戏运行时使用的 GLB 与纹理
- `assets/`：可编辑的 Blender 文件、生成提示词、源纹理和预览图
- `scripts/`：角色与纹理资产处理脚本
- `tests/`：WebHID 解码和服务端渲染测试
- `.openai/hosting.json`：Sites 托管能力声明

`assets/**/*.blend` 是需要版本管理的角色源文件；Blender 自动生成的 `*.blend1` 备份不会提交。`docs/` 仅用于本地开发记录，也不会提交到集合仓库。
