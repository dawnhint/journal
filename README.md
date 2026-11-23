# 月历手账

Vite + React + TypeScript 的本地手账应用。

![预览](docs/preview.png)

官方 React 插件：

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) 使用 [Oxc](https://oxc.rs)
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) 使用 [SWC](https://swc.rs/)

## 运行

```bash
pnpm dev      # 开发
pnpm build    # 类型检查并打包
pnpm preview  # 预览生产构建
pnpm lint     # ESLint
```

## 数据

记录只存在当前浏览器的 `localStorage`，按用户隔离：

- `journal:users` / `journal:active-user`：用户列表和当前用户
- `journal:entry:{userId}:{YYYY-MM-DD}`：日记
- `journal:summary:{userId}:{周一日期}`：周总结
- `journal:month-summary:{userId}:{YYYY-MM}`：月总结
