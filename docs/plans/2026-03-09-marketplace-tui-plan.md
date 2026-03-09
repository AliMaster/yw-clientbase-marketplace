# Marketplace TUI 工具实施计划

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** 构建一个 TypeScript + Ink TUI 工具，通过 `init`/`add`/`generate` 三个子命令管理 Claude Code 插件市场配置并生成 `marketplace.json`。

**Architecture:** Commander.js 做命令路由，Ink (React) 渲染 TUI 交互界面，utils 层处理 git 操作、配置读写和 source 字段转换。配置存储在项目根目录 `sources.json`，生成结果输出到 `.claude-plugin/marketplace.json`。

**Tech Stack:** TypeScript, Ink 5.x, React 18, Commander.js, simple-git, tsx

---

### Task 1: 项目脚手架搭建

**Files:**
- Create: `tools/package.json`
- Create: `tools/tsconfig.json`
- Create: `tools/.gitignore`

**Step 1: 创建 tools 目录结构**

```bash
mkdir -p tools/src/{commands,components,utils}
```

**Step 2: 创建 package.json**

```json
{
  "name": "marketplace-cli",
  "version": "1.0.0",
  "type": "module",
  "bin": {
    "marketplace": "./src/index.tsx"
  },
  "scripts": {
    "start": "tsx src/index.tsx",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "chalk": "^5.3.0",
    "commander": "^13.1.0",
    "ink": "^5.1.0",
    "ink-select-input": "^6.0.0",
    "ink-spinner": "^5.0.0",
    "ink-text-input": "^6.0.0",
    "react": "^18.3.1",
    "simple-git": "^3.27.0"
  },
  "devDependencies": {
    "@types/react": "^18.3.12",
    "tsx": "^4.19.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  }
}
```

**Step 3: 创建 tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true
  },
  "include": ["src"]
}
```

**Step 4: 创建 .gitignore**

```
node_modules/
dist/
```

**Step 5: 安装依赖**

```bash
cd tools && npm install
```

**Step 6: 提交**

```bash
git add tools/package.json tools/tsconfig.json tools/.gitignore tools/package-lock.json
git commit -m "feat: 初始化 TUI 工具项目脚手架"
```

---

### Task 2: 工具函数 — config.ts（配置文件读写）

**Files:**
- Create: `tools/src/utils/config.ts`
- Create: `tools/src/utils/config.test.ts`

**Step 1: 编写 config.ts 测试**

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readConfig, writeConfig, type SourcesConfig } from "./config.js";

describe("config", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-test-"));
    configPath = path.join(tmpDir, "sources.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("readConfig returns null when file does not exist", () => {
    const result = readConfig(configPath);
    expect(result).toBeNull();
  });

  it("writeConfig creates file and readConfig reads it back", () => {
    const config: SourcesConfig = {
      marketplace: {
        name: "test-marketplace",
        owner: { name: "test", email: "" },
        metadata: { description: "test desc", version: "" },
      },
      sources: [],
      categories: [],
    };
    writeConfig(configPath, config);
    const result = readConfig(configPath);
    expect(result).toEqual(config);
  });

  it("writeConfig preserves existing data on update", () => {
    const config: SourcesConfig = {
      marketplace: {
        name: "test",
        owner: { name: "test", email: "" },
        metadata: { description: "desc", version: "" },
      },
      sources: [
        {
          url: "https://github.com/example/repo.git",
          plugins: [{ name: "plugin-a", description: "A", category: "dev" }],
        },
      ],
      categories: [{ name: "dev", description: "Development" }],
    };
    writeConfig(configPath, config);

    config.sources[0].plugins.push({
      name: "plugin-b",
      description: "B",
      category: "dev",
    });
    writeConfig(configPath, config);

    const result = readConfig(configPath);
    expect(result!.sources[0].plugins).toHaveLength(2);
  });
});
```

**Step 2: 运行测试确认失败**

```bash
cd tools && npx vitest run src/utils/config.test.ts
```

Expected: FAIL — module not found

**Step 3: 实现 config.ts**

```typescript
import fs from "node:fs";

export interface PluginEntry {
  name: string;
  description: string;
  category: string;
}

export interface SourceEntry {
  url: string;
  plugins: PluginEntry[];
}

export interface CategoryEntry {
  name: string;
  description: string;
}

export interface SourcesConfig {
  marketplace: {
    name: string;
    owner: { name: string; email: string };
    metadata: { description: string; version: string };
  };
  sources: SourceEntry[];
  categories: CategoryEntry[];
}

export function readConfig(configPath: string): SourcesConfig | null {
  if (!fs.existsSync(configPath)) return null;
  const raw = fs.readFileSync(configPath, "utf-8");
  return JSON.parse(raw) as SourcesConfig;
}

export function writeConfig(
  configPath: string,
  config: SourcesConfig
): void {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
```

**Step 4: 运行测试确认通过**

```bash
cd tools && npx vitest run src/utils/config.test.ts
```

Expected: PASS

**Step 5: 提交**

```bash
git add tools/src/utils/config.ts tools/src/utils/config.test.ts
git commit -m "feat: 添加 sources.json 配置文件读写工具"
```

---

### Task 3: 工具函数 — transform.ts（source 字段转换）

**Files:**
- Create: `tools/src/utils/transform.ts`
- Create: `tools/src/utils/transform.test.ts`

**Step 1: 编写 transform.ts 测试**

```typescript
import { describe, it, expect } from "vitest";
import { transformPlugin } from "./transform.js";

describe("transformPlugin", () => {
  const repoUrl = "https://github.com/boostvolt/claude-code-lsps.git";

  it("converts ./path source to git-subdir object", () => {
    const plugin = {
      name: "dart-analyzer",
      version: "1.0.0",
      source: "./dart-analyzer",
      description: "Original desc",
      category: "original",
      tags: ["dart"],
      author: { name: "Jan" },
    };
    const overrides = { description: "Custom desc", category: "development" };

    const result = transformPlugin(plugin, repoUrl, overrides);

    expect(result.source).toEqual({
      source: "git-subdir",
      url: repoUrl,
      path: "dart-analyzer",
    });
    expect(result.description).toBe("Custom desc");
    expect(result.category).toBe("development");
    expect(result.tags).toEqual(["dart"]);
    expect(result.author).toEqual({ name: "Jan" });
  });

  it("converts URL string source to url object", () => {
    const plugin = {
      name: "superpowers",
      source: "https://github.com/obra/superpowers.git",
      description: "Skills",
      version: "4.0.0",
    };
    const overrides = { description: "Custom", category: "tools" };

    const result = transformPlugin(plugin, repoUrl, overrides);

    expect(result.source).toEqual({
      source: "url",
      url: "https://github.com/obra/superpowers.git",
    });
  });

  it("keeps object source unchanged", () => {
    const sourceObj = {
      source: "git-subdir",
      url: "https://example.com/repo.git",
      path: "sub",
    };
    const plugin = {
      name: "test",
      source: sourceObj,
      description: "d",
      version: "1.0.0",
    };
    const overrides = { description: "new", category: "c" };

    const result = transformPlugin(plugin, repoUrl, overrides);

    expect(result.source).toEqual(sourceObj);
  });

  it("does not modify fields other than source/description/category", () => {
    const plugin = {
      name: "test",
      version: "2.0.0",
      source: "./test",
      description: "old",
      tags: ["a", "b"],
      strict: true,
    };
    const overrides = { description: "new", category: "cat" };

    const result = transformPlugin(plugin, repoUrl, overrides);

    expect(result.name).toBe("test");
    expect(result.version).toBe("2.0.0");
    expect(result.tags).toEqual(["a", "b"]);
    expect(result.strict).toBe(true);
  });
});
```

**Step 2: 运行测试确认失败**

```bash
cd tools && npx vitest run src/utils/transform.test.ts
```

Expected: FAIL

**Step 3: 实现 transform.ts**

```typescript
export interface PluginOverrides {
  description: string;
  category: string;
}

export function transformSource(
  source: string | Record<string, unknown>,
  repoUrl: string
): Record<string, unknown> {
  if (typeof source === "object") return source;
  if (source.startsWith("./")) {
    return {
      source: "git-subdir",
      url: repoUrl,
      path: source.slice(2),
    };
  }
  return { source: "url", url: source };
}

export function transformPlugin(
  plugin: Record<string, unknown>,
  repoUrl: string,
  overrides: PluginOverrides
): Record<string, unknown> {
  return {
    ...plugin,
    source: transformSource(
      plugin.source as string | Record<string, unknown>,
      repoUrl
    ),
    description: overrides.description,
    category: overrides.category,
  };
}
```

**Step 4: 运行测试确认通过**

```bash
cd tools && npx vitest run src/utils/transform.test.ts
```

Expected: PASS

**Step 5: 提交**

```bash
git add tools/src/utils/transform.ts tools/src/utils/transform.test.ts
git commit -m "feat: 添加 source 字段转换逻辑"
```

---

### Task 4: 工具函数 — git.ts（Git 操作）

**Files:**
- Create: `tools/src/utils/git.ts`

**Step 1: 实现 git.ts**

```typescript
import simpleGit from "simple-git";
import fs from "node:fs";
import path from "node:path";

const BUILD_DIR = path.resolve(process.cwd(), "build", "repos");

export function getRepoDir(repoUrl: string): string {
  const repoName = repoUrl
    .replace(/\.git$/, "")
    .split("/")
    .pop()!;
  return path.join(BUILD_DIR, repoName);
}

export async function cloneOrPull(repoUrl: string): Promise<string> {
  const repoDir = getRepoDir(repoUrl);

  if (fs.existsSync(path.join(repoDir, ".git"))) {
    const git = simpleGit(repoDir);
    await git.pull();
    return repoDir;
  }

  fs.mkdirSync(BUILD_DIR, { recursive: true });
  const git = simpleGit();
  await git.clone(repoUrl, repoDir, ["--depth", "1"]);
  return repoDir;
}

export function readRepoMarketplace(
  repoDir: string
): Record<string, unknown> | null {
  const marketplacePath = path.join(
    repoDir,
    ".claude-plugin",
    "marketplace.json"
  );
  if (!fs.existsSync(marketplacePath)) return null;
  const raw = fs.readFileSync(marketplacePath, "utf-8");
  return JSON.parse(raw);
}
```

**Step 2: 提交**

```bash
git add tools/src/utils/git.ts
git commit -m "feat: 添加 git clone/pull 工具函数"
```

---

### Task 5: 命令入口 — index.tsx + init 命令

**Files:**
- Create: `tools/src/index.tsx`
- Create: `tools/src/commands/init.tsx`

**Step 1: 创建 index.tsx 入口**

```tsx
#!/usr/bin/env npx tsx
import { program } from "commander";
import { initCommand } from "./commands/init.js";
import { addCommand } from "./commands/add.js";
import { generateCommand } from "./commands/generate.js";

program
  .name("marketplace")
  .description("Claude Code 插件市场管理工具");

program
  .command("init")
  .description("初始化 marketplace 配置")
  .action(initCommand);

program
  .command("add")
  .description("从 Git 仓库添加插件")
  .action(addCommand);

program
  .command("generate")
  .description("根据配置生成 marketplace.json")
  .action(generateCommand);

program.parse();
```

**Step 2: 创建 init.tsx**

```tsx
import React, { useState } from "react";
import { render, Box, Text } from "ink";
import TextInput from "ink-text-input";
import { writeConfig, type SourcesConfig } from "../utils/config.js";
import path from "node:path";

type Step = "name" | "ownerName" | "ownerEmail" | "description" | "done";

function InitApp() {
  const [step, setStep] = useState<Step>("name");
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [input, setInput] = useState("");

  const handleSubmit = (value: string) => {
    switch (step) {
      case "name":
        setName(value);
        setInput("");
        setStep("ownerName");
        break;
      case "ownerName":
        setOwnerName(value);
        setInput("");
        setStep("ownerEmail");
        break;
      case "ownerEmail":
        setOwnerEmail(value);
        setInput("");
        setStep("description");
        break;
      case "description": {
        setDescription(value);
        const config: SourcesConfig = {
          marketplace: {
            name: name,
            owner: { name: ownerName, email: ownerEmail },
            metadata: { description: value, version: "" },
          },
          sources: [],
          categories: [],
        };
        const configPath = path.resolve(process.cwd(), "sources.json");
        writeConfig(configPath, config);
        setStep("done");
        break;
      }
    }
  };

  if (step === "done") {
    return (
      <Box flexDirection="column">
        <Text color="green">sources.json 已创建！</Text>
        <Text>  name: {name}</Text>
        <Text>  owner: {ownerName} {ownerEmail ? `<${ownerEmail}>` : ""}</Text>
        <Text>  description: {description}</Text>
      </Box>
    );
  }

  const labels: Record<string, string> = {
    name: "Marketplace 名称",
    ownerName: "Owner 名称",
    ownerEmail: "Owner Email（可选，回车跳过）",
    description: "描述",
  };

  return (
    <Box flexDirection="column">
      <Text bold>{labels[step]}:</Text>
      <Box>
        <Text color="cyan">&gt; </Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
}

export function initCommand() {
  render(<InitApp />);
}
```

**Step 3: 创建占位文件（add.tsx 和 generate.ts），以便 index.tsx 可以编译**

`tools/src/commands/add.tsx`:
```tsx
export function addCommand() {
  console.log("add command - TODO");
}
```

`tools/src/commands/generate.ts`:
```typescript
export function generateCommand() {
  console.log("generate command - TODO");
}
```

**Step 4: 手动测试 init 命令**

```bash
cd tools && npx tsx src/index.tsx init
```

Expected: 显示交互式表单，输入后生成 `../sources.json`

**Step 5: 提交**

```bash
git add tools/src/index.tsx tools/src/commands/
git commit -m "feat: 添加 CLI 入口和 init 命令"
```

---

### Task 6: add 命令 — PluginList 组件（带搜索过滤）

**Files:**
- Create: `tools/src/components/PluginList.tsx`

**Step 1: 实现 PluginList 组件**

```tsx
import React, { useState, useMemo } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

interface PluginItem {
  name: string;
  version?: string;
  description?: string;
  category?: string;
  tags?: string[];
  imported: boolean;
}

interface Props {
  plugins: PluginItem[];
  onSelect: (plugin: PluginItem) => void;
  onCancel: () => void;
}

export function PluginList({ plugins, onSelect, onCancel }: Props) {
  const [search, setSearch] = useState("");
  const [cursor, setCursor] = useState(0);

  const filtered = useMemo(() => {
    if (!search) return plugins;
    const lower = search.toLowerCase();
    return plugins.filter(
      (p) =>
        p.name.toLowerCase().includes(lower) ||
        (p.description?.toLowerCase().includes(lower)) ||
        (p.tags?.some((t) => t.toLowerCase().includes(lower)))
    );
  }, [plugins, search]);

  useInput((input, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.upArrow) {
      setCursor((c) => Math.max(0, c - 1));
    }
    if (key.downArrow) {
      setCursor((c) => Math.min(filtered.length - 1, c + 1));
    }
    if (key.return && filtered.length > 0) {
      onSelect(filtered[cursor]);
    }
  });

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>搜索: </Text>
        <TextInput value={search} onChange={(v) => { setSearch(v); setCursor(0); }} />
      </Box>
      <Text dimColor>↑/↓ 选择  Enter 确认  Esc 退出</Text>
      <Box flexDirection="column" marginTop={1}>
        {filtered.map((p, i) => (
          <Box key={p.name}>
            <Text color={i === cursor ? "cyan" : undefined} bold={i === cursor}>
              {i === cursor ? "❯ " : "  "}
            </Text>
            {p.imported && <Text color="green">[已导入] </Text>}
            <Text bold={i === cursor}>{p.name}</Text>
            <Text dimColor> v{p.version || "?"}</Text>
            <Text> - {p.description || "无描述"}</Text>
            {p.category && <Text color="yellow"> [{p.category}]</Text>}
          </Box>
        ))}
        {filtered.length === 0 && <Text dimColor>无匹配结果</Text>}
      </Box>
    </Box>
  );
}
```

**Step 2: 提交**

```bash
git add tools/src/components/PluginList.tsx
git commit -m "feat: 添加插件列表搜索过滤组件"
```

---

### Task 7: add 命令 — PluginEditor 组件（对比编辑）

**Files:**
- Create: `tools/src/components/PluginEditor.tsx`

**Step 1: 实现 PluginEditor 组件**

```tsx
import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";

interface PluginData {
  name: string;
  version?: string;
  description?: string;
  category?: string;
  tags?: string[];
}

interface Props {
  original: PluginData;
  current: { description: string; category: string } | null;
  categories: string[];
  onSave: (description: string, category: string) => void;
  onCancel: () => void;
}

type Field = "description" | "category";

export function PluginEditor({
  original,
  current,
  categories,
  onSave,
  onCancel,
}: Props) {
  const [field, setField] = useState<Field>("description");
  const [description, setDescription] = useState(
    current?.description ?? original.description ?? ""
  );
  const [category, setCategory] = useState(
    current?.category ?? original.category ?? ""
  );

  useInput((_input, key) => {
    if (key.escape) {
      onCancel();
    }
  });

  const handleSubmit = () => {
    if (field === "description") {
      setField("category");
    } else {
      onSave(description, category);
    }
  };

  return (
    <Box flexDirection="column">
      <Text bold color="cyan">
        编辑插件: {original.name} v{original.version || "?"}
      </Text>

      <Box marginTop={1} flexDirection="row" gap={4}>
        {/* 左侧 - 原始信息 */}
        <Box flexDirection="column" width="45%">
          <Text bold underline>原始信息</Text>
          <Text>Name: {original.name}</Text>
          <Text>Version: {original.version || "-"}</Text>
          <Text>Description: {original.description || "-"}</Text>
          <Text>Category: {original.category || "-"}</Text>
          {original.tags && <Text>Tags: {original.tags.join(", ")}</Text>}
        </Box>

        {/* 右侧 - 可编辑 */}
        <Box flexDirection="column" width="45%">
          <Text bold underline>配置值（可编辑）</Text>
          <Text>Name: {original.name} <Text dimColor>(不可修改)</Text></Text>
          <Text>Version: {original.version || "-"} <Text dimColor>(不可修改)</Text></Text>

          {field === "description" ? (
            <Box>
              <Text bold color="yellow">Description: </Text>
              <TextInput
                value={description}
                onChange={setDescription}
                onSubmit={handleSubmit}
              />
            </Box>
          ) : (
            <Text>Description: {description}</Text>
          )}

          {field === "category" ? (
            <Box flexDirection="column">
              <Box>
                <Text bold color="yellow">Category: </Text>
                <TextInput
                  value={category}
                  onChange={setCategory}
                  onSubmit={handleSubmit}
                />
              </Box>
              {categories.length > 0 && (
                <Text dimColor>
                  已有分类: {categories.join(", ")}
                </Text>
              )}
            </Box>
          ) : (
            <Text>Category: {category || "-"}</Text>
          )}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          {field === "description"
            ? "输入 description 后按 Enter 继续"
            : "输入 category 后按 Enter 保存  |  Esc 取消"}
        </Text>
      </Box>
    </Box>
  );
}
```

**Step 2: 提交**

```bash
git add tools/src/components/PluginEditor.tsx
git commit -m "feat: 添加插件对比编辑组件"
```

---

### Task 8: add 命令 — 完整流程实现

**Files:**
- Modify: `tools/src/commands/add.tsx`

**Step 1: 实现完整的 add 命令**

```tsx
import React, { useState, useEffect } from "react";
import { render, Box, Text } from "ink";
import TextInput from "ink-text-input";
import Spinner from "ink-spinner";
import { PluginList } from "../components/PluginList.js";
import { PluginEditor } from "../components/PluginEditor.js";
import {
  readConfig,
  writeConfig,
  type SourcesConfig,
  type PluginEntry,
} from "../utils/config.js";
import { cloneOrPull, readRepoMarketplace } from "../utils/git.js";
import path from "node:path";

type Phase =
  | "input-url"
  | "cloning"
  | "select-plugin"
  | "edit-plugin"
  | "saved"
  | "error";

function AddApp() {
  const [phase, setPhase] = useState<Phase>("input-url");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [repoPlugins, setRepoPlugins] = useState<Record<string, unknown>[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<Record<string, unknown> | null>(null);
  const [config, setConfig] = useState<SourcesConfig | null>(null);

  const configPath = path.resolve(process.cwd(), "sources.json");

  useEffect(() => {
    const c = readConfig(configPath);
    setConfig(c);
  }, []);

  const isImported = (pluginName: string): boolean => {
    if (!config) return false;
    return config.sources.some((s) =>
      s.plugins.some((p) => p.name === pluginName)
    );
  };

  const getImportedOverrides = (
    pluginName: string
  ): PluginEntry | null => {
    if (!config) return null;
    for (const s of config.sources) {
      const found = s.plugins.find((p) => p.name === pluginName);
      if (found) return found;
    }
    return null;
  };

  const handleUrlSubmit = async (inputUrl: string) => {
    setUrl(inputUrl);
    setPhase("cloning");

    try {
      const repoDir = await cloneOrPull(inputUrl);
      const marketplace = readRepoMarketplace(repoDir);
      if (!marketplace || !Array.isArray(marketplace.plugins)) {
        setError("该仓库中未找到有效的 .claude-plugin/marketplace.json");
        setPhase("error");
        return;
      }
      setRepoPlugins(marketplace.plugins as Record<string, unknown>[]);
      setPhase("select-plugin");
    } catch (e) {
      setError(`Clone 失败: ${(e as Error).message}`);
      setPhase("error");
    }
  };

  const handlePluginSelect = (plugin: { name: string }) => {
    const full = repoPlugins.find((p) => p.name === plugin.name) || null;
    setSelectedPlugin(full);
    setPhase("edit-plugin");
  };

  const handleSave = (description: string, category: string) => {
    if (!config) return;

    let source = config.sources.find((s) => s.url === url);
    if (!source) {
      source = { url, plugins: [] };
      config.sources.push(source);
    }

    const existing = source.plugins.findIndex(
      (p) => p.name === (selectedPlugin as Record<string, unknown>).name
    );
    const entry: PluginEntry = {
      name: (selectedPlugin as Record<string, unknown>).name as string,
      description,
      category,
    };

    if (existing >= 0) {
      source.plugins[existing] = entry;
    } else {
      source.plugins.push(entry);
    }

    // 如果 category 不在 categories 中，自动添加
    if (category && !config.categories.find((c) => c.name === category)) {
      config.categories.push({ name: category, description: "" });
    }

    writeConfig(configPath, config);
    setConfig({ ...config });
    setPhase("saved");
  };

  if (phase === "input-url") {
    return (
      <Box flexDirection="column">
        <Text bold>请输入 Git 仓库地址:</Text>
        <Box>
          <Text color="cyan">&gt; </Text>
          <TextInput
            value={url}
            onChange={setUrl}
            onSubmit={handleUrlSubmit}
          />
        </Box>
      </Box>
    );
  }

  if (phase === "cloning") {
    return (
      <Box>
        <Text color="green"><Spinner type="dots" /></Text>
        <Text> 正在克隆仓库...</Text>
      </Box>
    );
  }

  if (phase === "error") {
    return <Text color="red">{error}</Text>;
  }

  if (phase === "select-plugin") {
    const items = repoPlugins.map((p) => ({
      name: p.name as string,
      version: p.version as string | undefined,
      description: p.description as string | undefined,
      category: p.category as string | undefined,
      tags: p.tags as string[] | undefined,
      imported: isImported(p.name as string),
    }));

    return (
      <PluginList
        plugins={items}
        onSelect={handlePluginSelect}
        onCancel={() => process.exit(0)}
      />
    );
  }

  if (phase === "edit-plugin" && selectedPlugin) {
    const overrides = getImportedOverrides(selectedPlugin.name as string);

    return (
      <PluginEditor
        original={{
          name: selectedPlugin.name as string,
          version: selectedPlugin.version as string | undefined,
          description: selectedPlugin.description as string | undefined,
          category: selectedPlugin.category as string | undefined,
          tags: selectedPlugin.tags as string[] | undefined,
        }}
        current={overrides ? { description: overrides.description, category: overrides.category } : null}
        categories={config?.categories.map((c) => c.name) || []}
        onSave={handleSave}
        onCancel={() => setPhase("select-plugin")}
      />
    );
  }

  if (phase === "saved") {
    return (
      <Box flexDirection="column">
        <Text color="green">
          已保存 {(selectedPlugin as Record<string, unknown>).name as string} 到配置！
        </Text>
        <Text dimColor>按任意键继续添加，Ctrl+C 退出</Text>
      </Box>
    );
  }

  return null;
}

export function addCommand() {
  render(<AddApp />);
}
```

**Step 2: 手动测试 add 命令**

```bash
cd tools && npx tsx src/index.tsx add
```

Expected: 显示 URL 输入 → clone → 插件列表 → 编辑 → 保存

**Step 3: 提交**

```bash
git add tools/src/commands/add.tsx
git commit -m "feat: 实现 add 命令完整交互流程"
```

---

### Task 9: generate 命令实现

**Files:**
- Modify: `tools/src/commands/generate.ts`

**Step 1: 实现 generate 命令**

```typescript
import { readConfig } from "../utils/config.js";
import { cloneOrPull, readRepoMarketplace } from "../utils/git.js";
import { transformPlugin } from "../utils/transform.js";
import path from "node:path";
import fs from "node:fs";

export async function generateCommand() {
  const configPath = path.resolve(process.cwd(), "sources.json");
  const config = readConfig(configPath);

  if (!config) {
    console.error("未找到 sources.json，请先运行 marketplace init");
    process.exit(1);
  }

  const allPlugins: Record<string, unknown>[] = [];
  let sourceCount = 0;

  for (const source of config.sources) {
    sourceCount++;
    console.log(`处理源: ${source.url}`);

    let repoDir: string;
    try {
      repoDir = await cloneOrPull(source.url);
    } catch (e) {
      console.error(`  克隆/更新失败: ${(e as Error).message}`);
      continue;
    }

    const marketplace = readRepoMarketplace(repoDir);
    if (!marketplace || !Array.isArray(marketplace.plugins)) {
      console.error(`  未找到有效的 marketplace.json`);
      continue;
    }

    const repoPlugins = marketplace.plugins as Record<string, unknown>[];

    for (const pluginConfig of source.plugins) {
      const original = repoPlugins.find(
        (p) => p.name === pluginConfig.name
      );
      if (!original) {
        console.warn(`  插件 ${pluginConfig.name} 未在源仓库中找到，跳过`);
        continue;
      }

      const transformed = transformPlugin(original, source.url, {
        description: pluginConfig.description,
        category: pluginConfig.category,
      });

      allPlugins.push(transformed);
      console.log(`  添加插件: ${pluginConfig.name}`);
    }
  }

  const output = {
    name: config.marketplace.name,
    owner: config.marketplace.owner,
    metadata: {
      ...config.marketplace.metadata,
      version: config.marketplace.metadata.version || "1.0.0",
    },
    plugins: allPlugins,
  };

  const outputPath = path.resolve(
    process.cwd(),
    ".claude-plugin",
    "marketplace.json"
  );
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", "utf-8");

  console.log(
    `\n生成完成！共处理 ${sourceCount} 个源，${allPlugins.length} 个插件`
  );
  console.log(`输出: ${outputPath}`);
}
```

**Step 2: 手动测试 generate 命令**

先确保 `sources.json` 存在（通过 init + add 创建），然后：

```bash
cd tools && npx tsx src/index.tsx generate
```

Expected: 输出处理日志，生成 `../.claude-plugin/marketplace.json`

**Step 3: 提交**

```bash
git add tools/src/commands/generate.ts
git commit -m "feat: 实现 generate 命令"
```

---

### Task 10: 集成测试与收尾

**Files:**
- Modify: `tools/package.json` — 确认 bin 和 scripts 正确
- Modify: `.gitignore` — 添加 `build/` 到忽略

**Step 1: 更新根目录 .gitignore**

在项目根目录 `.gitignore` 中添加：

```
build/
```

**Step 2: 端到端手动测试**

```bash
# 1. 初始化
cd tools && npx tsx src/index.tsx init
# 输入: test-marketplace / testuser / test@test.com / Test description

# 2. 添加插件
npx tsx src/index.tsx add
# 输入: https://github.com/boostvolt/claude-code-lsps.git
# 选择 dart-analyzer，编辑 description 和 category

# 3. 生成
npx tsx src/index.tsx generate
# 验证 ../.claude-plugin/marketplace.json 输出正确
```

**Step 3: 运行所有测试**

```bash
cd tools && npx vitest run
```

Expected: 所有测试通过

**Step 4: 提交**

```bash
git add .gitignore
git commit -m "chore: 添加 build/ 到 gitignore，集成测试完成"
```

---

## 任务总览

| Task | 描述 | 依赖 |
|------|------|------|
| 1 | 项目脚手架搭建 | 无 |
| 2 | config.ts 配置读写（含测试） | Task 1 |
| 3 | transform.ts source 转换（含测试） | Task 1 |
| 4 | git.ts Git 操作 | Task 1 |
| 5 | index.tsx 入口 + init 命令 | Task 2 |
| 6 | PluginList 搜索过滤组件 | Task 1 |
| 7 | PluginEditor 对比编辑组件 | Task 1 |
| 8 | add 命令完整流程 | Task 2, 4, 6, 7 |
| 9 | generate 命令 | Task 2, 3, 4 |
| 10 | 集成测试与收尾 | Task 5, 8, 9 |
