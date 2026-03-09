# ccmarket 架构文档

ccmarket 是一个基于 React + Ink 的终端 TUI 工具，用于管理 Claude Code 插件市场配置。

## 技术栈

- **Ink** — React for CLI（TUI 框架）
- **tsx** — TypeScript 直接执行，无需编译
- **simple-git** — Git 仓库克隆/拉取
- **vitest** — 测试框架

## 目录结构

```
packages/ccmarket/
├── package.json
├── tsconfig.json
└── src/
    ├── index.tsx              # 入口，渲染 App
    ├── App.tsx                # 主应用，视图路由与状态管理
    ├── commands/              # 命令流程（各功能页面）
    │   ├── init.tsx           # 初始化 marketconfig.json
    │   ├── add.tsx            # 添加/管理插件（最复杂）
    │   ├── generate.tsx       # 生成 marketplace.json
    │   └── config-view.tsx    # 编辑市场基本信息
    ├── components/            # 可复用 UI 组件
    │   ├── Header.tsx         # ASCII art 头部
    │   ├── Menu.tsx           # 通用菜单（键盘导航）
    │   ├── PluginList.tsx     # 可搜索的插件列表
    │   └── PluginEditor.tsx   # 插件信息编辑器（双栏对比）
    └── utils/                 # 工具函数
        ├── config.ts          # 配置文件读写 + 类型定义
        ├── paths.ts           # 路径解析（项目根、配置、输出）
        ├── git.ts             # Git 操作（克隆、读取仓库）
        ├── transform.ts       # 插件数据转换（source 字段标准化）
        └── local.ts           # 本地插件扫描
```

## 数据流

```
┌────────────┐
│  index.tsx │  入口
└─────┬──────┘
      ▼
┌────────────┐
│  App.tsx   │  视图路由 + 状态
└─────┬──────┘
      ▼
┌──────────────────────────────────────────────────┐
│                  Command Flows                    │
├───────────┬───────────┬─────────────┬────────────┤
│ InitFlow  │ AddFlow   │GenerateFlow │ ConfigView │
└───────────┴───────────┴─────────────┴────────────┘
      │             │             │
      ▼             ▼             ▼
┌───────────┐ ┌──────────┐ ┌──────────────┐
│ config.ts │ │ git.ts   │ │ transform.ts │
│ paths.ts  │ │ local.ts │ │              │
└───────────┘ └──────────┘ └──────────────┘
      │             │
      ▼             ▼
┌──────────────────────────────────────┐
│       marketconfig.json (读写)       │
└──────────────────────────────────────┘
      │
      ▼
┌──────────────────────────────────────┐
│  .claude-plugin/marketplace.json     │  最终输出
└──────────────────────────────────────┘
```

## 组件层级

```
App
├── Header
├── Menu
├── InitFlow
│   ├── AlreadyExists
│   └── InitForm
├── AddFlow
│   ├── ManageView          — 插件管理主界面（分组 tab + 必装筛选）
│   ├── SourceChooser       — 选择 Git 来源
│   ├── LocalPluginChooser  — 选择本地插件
│   ├── PluginList          — 从仓库选择插件
│   ├── PluginEditor        — 编辑插件描述/分类
│   ├── PluginActionChooser — 编辑 or 删除
│   ├── ConfirmDelete       — 删除确认
│   ├── SavedPhase          — 保存成功
│   ├── DeletedPhase        — 删除成功
│   └── ErrorView           — 错误提示
├── GenerateFlow
└── ConfigView
```

## 核心模块说明

### App.tsx — 视图路由

管理 5 个视图状态：`menu` | `init` | `edit-config` | `add` | `generate`。根据配置是否存在动态构建菜单项，记忆上次菜单光标位置。

### commands/add.tsx — 插件管理流程

最复杂的模块，采用**状态机**驱动多步流程：

```
manage ──→ choose-source ──→ input-url ──→ cloning ──→ select-plugin
       ──→ select-local ──→ edit-plugin ──→ saved ──→ manage
       ──→ plugin-action ──→ edit-plugin / confirm-delete ──→ manage
```

ManageView 功能：
- 按分组 tab 展示插件，括号中显示数量
- 空格键切换必装状态，实时刷新
- Tab 键筛选仅显示必装插件
- ←/→ 切换分组，↑/↓ 选择插件
- 返回时恢复光标位置

### commands/generate.tsx — 生成 marketplace.json

遍历所有 source，对 Git 来源执行 clone 并读取插件信息，对本地来源直接读取 plugin.json，合并用户覆盖后输出到 `.claude-plugin/marketplace.json`。

### utils/config.ts — 配置模型

```typescript
interface SourcesConfig {
  marketplace: { name; owner: { name; email }; metadata: { description; version } };
  sources: SourceEntry[];       // [{ url, plugins: PluginEntry[] }]
  categories: CategoryEntry[];  // [{ name, recommendPlugins?: string[] }]
}
```

### utils/transform.ts — Source 字段转换规则

| 原始 source 值 | 转换结果 |
|---|---|
| `"./"` 开头的本地路径 | 保持字符串 |
| `"./"` 开头 + 有 repoUrl | `{ source: "git-subdir", url, path }` |
| URL 字符串 | `{ source: "url", url }` |
| 对象 | 直接透传 |

### utils/git.ts — Git 操作

每次执行 shallow clone（`--depth 1`），从克隆目录读取 `.claude-plugin/marketplace.json`。缓存目录：`./build/repos/`。

### utils/local.ts — 本地插件扫描

从项目根目录向下扫描 2 层，查找包含 `.claude-plugin/plugin.json` 的目录。

## 依赖关系

```
App.tsx
├── commands/
│   ├── init.tsx         → config.ts, paths.ts
│   ├── add.tsx          → config.ts, git.ts, local.ts, paths.ts
│   │                    → PluginList, PluginEditor
│   ├── generate.tsx     → config.ts, git.ts, transform.ts, paths.ts
│   └── config-view.tsx  → config.ts, paths.ts
└── components/
    ├── Header.tsx       （无依赖）
    ├── Menu.tsx         （无依赖）
    ├── PluginList.tsx   （无依赖）
    └── PluginEditor.tsx （无依赖）
```

## 设计模式

- **状态机**：AddFlow 用 Phase 类型驱动多步交互流程
- **组件组合**：小粒度可复用 UI 组件（Menu、PluginList、PluginEditor）
- **配置驱动**：所有行为由 marketconfig.json 控制
- **光标记忆**：各级页面返回时恢复上次选中位置
