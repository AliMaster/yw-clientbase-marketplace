# yw-clientbase-marketplace

阅文通用终端 Claude Code 插件市场 — 从社区精选和团队自研的优秀插件，统一管理和分发。

## 项目简介

本项目用于维护阅文团队的私有 Claude Code 插件市场。通过配置文件 `marketplace-config.json` 管理插件来源，支持从 Git 仓库和本地目录导入插件，最终生成标准的 `marketplace.json` 供 Claude Code 消费。

## 项目结构

```
yw-clientbase-marketplace/
├── packages/
│   └── ccmarket/          # CLI 管理工具（npm 包）
├── docs/                  # 架构文档
├── marketplace-config.json # 市场配置文件
└── .claude-plugin/
    └── marketplace.json   # 生成的市场发布文件
```

## 快速开始

### 安装依赖

```bash
npm install
```

### 使用 CLI 工具

```bash
npm run ccmarket
```

或全局安装后直接使用：

```bash
npm install -g ccmarket
ccmarket
```

### 生成市场文件

在 CLI 交互界面中选择「生成市场文件」，或在配置完成后由 CLI 自动输出 `.claude-plugin/marketplace.json`。

## 当前插件来源

| 来源 | 插件 | 分类 |
|------|------|------|
| [claude-code-lsps](https://github.com/boostvolt/claude-code-lsps) | dart-analyzer | flutter |
| [superpowers-marketplace](https://github.com/obra/superpowers-marketplace) | superpowers | workflow |

## Packages

| 包名 | 说明 |
|------|------|
| [ccmarket](./packages/ccmarket/) | 私有 Claude Code 插件市场定制、管理 CLI 工具 |

## License

[MIT](./packages/ccmarket/LICENSE)
