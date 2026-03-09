# Marketplace TUI 工具设计文档

## 概述

构建一个 TUI 工具，用于管理 Claude Code 插件市场的配置。通过交互式界面从第三方 Git 仓库导入插件，并根据配置文件生成最终的 `marketplace.json`。

## 技术栈

- **语言：** TypeScript
- **TUI 框架：** Ink (React for CLI)
- **命令路由：** Commander.js
- **Git 操作：** simple-git
- **运行时：** tsx

## 项目结构

```
yw-clientbase-marketplace/
├── .claude-plugin/
│   └── marketplace.json          # 最终生成的输出文件
├── build/
│   └── repos/                    # clone 下来的仓库缓存
├── sources.json                  # 配置文件（marketplace 信息 + 插件源 + 分类）
├── tools/                        # TUI 工具代码
│   ├── package.json
│   ├── tsconfig.json
│   ├── src/
│   │   ├── index.tsx             # 入口，命令解析
│   │   ├── commands/
│   │   │   ├── init.tsx          # init 子命令
│   │   │   ├── add.tsx           # add 子命令
│   │   │   └── generate.ts       # generate 子命令
│   │   ├── components/
│   │   │   ├── PluginList.tsx    # 插件列表选择组件（带搜索过滤）
│   │   │   └── PluginEditor.tsx  # description/category 编辑组件（对比展示）
│   │   └── utils/
│   │       ├── git.ts            # git clone/pull 操作
│   │       ├── config.ts         # sources.json 读写
│   │       └── transform.ts      # source 字段转换逻辑
│   └── .gitignore
└── .gitignore
```

## 配置文件格式 (sources.json)

```json
{
  "marketplace": {
    "name": "yuewen-clientbase-marketplace",
    "owner": {
      "name": "caojianwei",
      "email": "caojianwei@yuewen.com"
    },
    "metadata": {
      "description": "阅文通用终端 Claude Code 插件市场",
      "version": ""
    }
  },
  "sources": [
    {
      "url": "https://github.com/boostvolt/claude-code-lsps.git",
      "plugins": [
        {
          "name": "dart-analyzer",
          "description": "Dart/Flutter language server",
          "category": "development"
        }
      ]
    }
  ],
  "categories": [
    { "name": "developer", "description": "开发者必装插件合集" },
    { "name": "android", "description": "Android 开发者必装插件合集" }
  ]
}
```

## 子命令设计

### 1. `init` — 初始化配置

```
npx marketplace init
```

**交互流程：**
1. 输入 marketplace name（必填）
2. 输入 owner name（必填）
3. 输入 owner email（选填，可跳过）
4. 输入 metadata description（必填）
5. 生成初始 `sources.json` 文件

`metadata.version` 留空，在 `generate` 时自动填写。

### 2. `add` — 交互式添加插件

```
npx marketplace add
```

**交互流程：**

1. **输入 Git 仓库 URL** — 文本输入框
2. **Clone 仓库** — 显示加载动画，clone 到 `./build/repos/<repo-name>/`
3. **读取并解析** — 读取仓库中的 `.claude-plugin/marketplace.json`，解析 `plugins` 数组
4. **展示插件列表（带搜索过滤）：**
   - 顶部搜索框，输入关键字实时过滤（匹配 name / description / tags）
   - 已导入的插件显示 `[已导入]` 标记（绿色高亮）
   - 未导入的插件正常显示
   - 每个插件展示 name、version、description、category
5. **编辑字段（对比展示）：**
   - 选择已导入插件 → 进入编辑模式
   - 选择未导入插件 → 进入新增模式
   - 左侧展示原始市场信息（只读）
   - 右侧展示配置文件中的值（可编辑 description 和 category）
   - category 支持从已有分类下拉选择或输入新分类
6. **确认并保存** — 追加/更新到 `sources.json`
7. **继续添加** — 保存后提示是否继续从同一仓库添加其他插件

**错误处理：**
- Clone 失败 → 提示错误信息，可重新输入 URL
- 未找到 `.claude-plugin/marketplace.json` → 提示该仓库不是有效的插件仓库
- 插件已存在于配置中 → 提示已存在，询问是否覆盖

### 3. `generate` — 生成 marketplace.json

```
npx marketplace generate
```

**处理流程：**

1. **读取 `sources.json`** — 获取 marketplace 信息和所有 source 配置
2. **逐个处理 source：**
   - 如果 `./build/repos/<repo-name>` 不存在 → clone
   - 如果已存在 → `git pull` 更新到最新
   - 读取该仓库的 `.claude-plugin/marketplace.json`
3. **对于每个配置的 plugin：**
   - 从原始 marketplace.json 中找到对应的 plugin 完整数据
   - 用配置文件中的 `description` 和 `category` 覆盖原始值
   - **source 字段转换规则：**
     - 原始 `source` 是字符串且以 `./` 开头 → `{ "source": "git-subdir", "url": "<仓库URL>", "path": "<去掉./的路径>" }`
     - 原始 `source` 已经是对象 → 保持不变
     - 原始 `source` 是不以 `./` 开头的字符串 → `{ "source": "url", "url": "<原始值>" }`
4. **组装最终 marketplace.json：**
   - 顶层字段来自 `sources.json` 的 `marketplace` 配置
   - `metadata.version` 自动填写
   - `plugins` 数组 = 所有处理后的插件汇总
5. **写入 `.claude-plugin/marketplace.json`**
6. **输出统计信息** — 共处理 N 个源，M 个插件

## 输出格式示例

### 原始插件（source 为 `./` 字符串）

输入：
```json
{
  "name": "dart-analyzer",
  "version": "1.0.0",
  "source": "./dart-analyzer",
  "description": "Dart/Flutter language server",
  "category": "development",
  "tags": ["dart", "flutter", "lsp"],
  "author": { "name": "Jan Kott" }
}
```

输出：
```json
{
  "name": "dart-analyzer",
  "version": "1.0.0",
  "source": {
    "source": "git-subdir",
    "url": "https://github.com/boostvolt/claude-code-lsps.git",
    "path": "dart-analyzer"
  },
  "description": "配置文件中的描述",
  "category": "配置文件中的分类",
  "tags": ["dart", "flutter", "lsp"],
  "author": { "name": "Jan Kott" }
}
```

### 原始插件（source 为 URL 字符串）

输入：
```json
{
  "name": "superpowers",
  "source": "https://github.com/obra/superpowers.git"
}
```

输出：
```json
{
  "name": "superpowers",
  "source": {
    "source": "url",
    "url": "https://github.com/obra/superpowers.git"
  }
}
```

### 原始插件（source 已经是对象）

保持不变，仅覆盖 description 和 category。
