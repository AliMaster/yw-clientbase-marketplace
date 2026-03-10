# ccmarket

私有 Claude Code 插件市场定制、管理工具。

A TUI-based CLI tool for customizing and managing private Claude Code plugin marketplaces.

## Features

- 交互式 TUI 界面，基于 React + Ink 构建
- 创建和编辑市场配置（`marketplace-config.json`）
- 从 Git 仓库添加、编辑、删除插件
- 一键生成 `marketplace.json` 发布文件
- 支持多仓库插件来源管理

## Install

```bash
npm install -g ccmarket
```

## Usage

```bash
ccmarket
```

启动后进入交互式菜单：

1. **创建配置** — 初始化 `marketplace-config.json`
2. **编辑市场配置** — 修改市场基本信息（名称、描述等）
3. **管理市场插件** — 查看、添加、编辑或删除插件
4. **生成市场文件** — 生成最终的 `marketplace.json`

## Requirements

- Node.js >= 18.0.0

## License

[MIT](./LICENSE)
