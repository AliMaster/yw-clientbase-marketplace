import React, { useState, useEffect, useMemo } from "react";
import { Box, Text, useInput, useStdout } from "ink";
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
import { getConfigPath, getProjectRoot } from "../utils/paths.js";
import { scanLocalPlugins } from "../utils/local.js";

/**
 * 插件管理流程的状态机。
 *
 * Phase 流转：
 *   manage (默认) ──→ choose-source ──→ input-url ──→ cloning ──→ select-plugin
 *                 ──→ select-local ──→ edit-plugin ──→ saved ──→ manage
 *                 ──→ plugin-action ──→ edit-plugin / confirm-delete ──→ deleted ──→ manage
 */
type Phase =
  | "manage"
  | "choose-source"
  | "input-url"
  | "cloning"
  | "select-plugin"
  | "select-local"
  | "plugin-action"
  | "edit-plugin"
  | "confirm-delete"
  | "deleted"
  | "saved"
  | "error";

export function AddFlow({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("manage");
  const [url, setUrl] = useState("");
  const [error, setError] = useState("");
  const [repoPlugins, setRepoPlugins] = useState<Record<string, unknown>[]>([]);
  const [selectedPlugin, setSelectedPlugin] = useState<Record<string, unknown> | null>(null);
  const [config, setConfig] = useState<SourcesConfig | null>(null);
  // 记住上次在管理页面选中的插件，用于返回时恢复光标
  const [lastSelectedKey, setLastSelectedKey] = useState<string | null>(null);

  const configPath = getConfigPath();

  useInput((_ch, key) => {
    if (key.escape && (phase === "input-url" || phase === "cloning")) {
      setPhase("manage");
    }
  });

  useEffect(() => {
    const c = readConfig(configPath);
    if (!c) {
      setError("未找到 marketplace-config.json，请先创建配置");
      setPhase("error");
      return;
    }
    setConfig(c);
  }, []);

  const reloadConfig = () => {
    const c = readConfig(configPath);
    if (c) setConfig(c);
  };

  const isImported = (pluginName: string): boolean => {
    if (!config) return false;
    return config.sources.some((s) =>
      s.plugins.some((p) => p.name === pluginName)
    );
  };

  const getImportedOverrides = (pluginName: string): PluginEntry | null => {
    if (!config) return null;
    for (const s of config.sources) {
      const found = s.plugins.find((p) => p.name === pluginName);
      if (found) return found;
    }
    return null;
  };

  const loadRepo = async (repoUrl: string) => {
    setUrl(repoUrl);
    setPhase("cloning");
    try {
      const repoDir = await cloneOrPull(repoUrl);
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

  /** 从 Git 仓库选中的插件列表（select-plugin phase 使用） */
  const handlePluginSelect = (plugin: { name: string; imported: boolean }) => {
    const full = repoPlugins.find((p) => p.name === plugin.name) || null;
    setSelectedPlugin(full);
    if (plugin.imported) {
      setPhase("plugin-action");
    } else {
      setPhase("edit-plugin");
    }
  };

  /** 管理页面中切换插件的必装状态 */
  const handleToggleRecommended = (pluginName: string, category: string) => {
    if (!config) return;
    const cat = config.categories.find((c) => c.name === category);
    if (!cat) return;
    if (!cat.recommendPlugins) cat.recommendPlugins = [];
    const inList = cat.recommendPlugins.includes(pluginName);
    if (inList) {
      cat.recommendPlugins = cat.recommendPlugins.filter((n) => n !== pluginName);
    } else {
      cat.recommendPlugins.push(pluginName);
    }
    writeConfig(configPath, config);
    setConfig({ ...config });
  };

  /** 管理页面中选中已导入插件，进入编辑/删除操作 */
  const handleManagePluginSelect = (pluginName: string, sourceUrl: string) => {
    setUrl(sourceUrl);
    setLastSelectedKey(`${sourceUrl}::${pluginName}`);
    // 从 config 中找到该插件的原始数据
    const source = config?.sources.find((s) => s.url === sourceUrl);
    const entry = source?.plugins.find((p) => p.name === pluginName);
    if (entry) {
      setSelectedPlugin({
        name: entry.name,
        description: entry.description,
        category: entry.category,
      });
      setPhase("plugin-action");
    }
  };

  const handleDelete = () => {
    if (!config || !selectedPlugin) return;
    const pluginName = selectedPlugin.name as string;
    const source = config.sources.find((s) => s.url === url);
    if (source) {
      source.plugins = source.plugins.filter((p) => p.name !== pluginName);
      if (source.plugins.length === 0) {
        config.sources = config.sources.filter((s) => s.url !== url);
      }
    }
    // 从所有分组的 recommendPlugins 中移除
    for (const cat of config.categories) {
      if (cat.recommendPlugins) {
        cat.recommendPlugins = cat.recommendPlugins.filter((n) => n !== pluginName);
      }
    }
    writeConfig(configPath, config);
    setConfig({ ...config });
    setPhase("deleted");
  };

  const handleSave = (description: string, category: string) => {
    if (!config) return;

    let source = config.sources.find((s) => s.url === url);
    if (!source) {
      source = { url, plugins: [] };
      config.sources.push(source);
    }

    const pluginName = (selectedPlugin as Record<string, unknown>).name as string;
    const existing = source.plugins.findIndex((p) => p.name === pluginName);
    const entry: PluginEntry = { name: pluginName, description, category };

    if (existing >= 0) {
      source.plugins[existing] = entry;
    } else {
      source.plugins.push(entry);
    }

    if (category && !config.categories.find((c) => c.name === category)) {
      config.categories.push({ name: category });
    }

    // 如果分类变了，将 recommendPlugins 从旧分类迁移到新分类
    for (const c of config.categories) {
      if (c.name !== category && c.recommendPlugins?.includes(pluginName)) {
        c.recommendPlugins = c.recommendPlugins.filter((n) => n !== pluginName);
        // 迁移到新分类
        const newCat = config.categories.find((nc) => nc.name === category);
        if (newCat) {
          if (!newCat.recommendPlugins) newCat.recommendPlugins = [];
          if (!newCat.recommendPlugins.includes(pluginName)) {
            newCat.recommendPlugins.push(pluginName);
          }
        }
      }
    }

    writeConfig(configPath, config);
    setConfig({ ...config });
    setPhase("saved");
  };

  /** 本地插件选中后，设置 url 为本地路径（如 ./plugins/pyright），进入编辑 */
  const handleLocalPluginSelect = (plugin: { name: string; version?: string; description?: string; path: string }) => {
    setUrl(plugin.path);
    setSelectedPlugin({
      name: plugin.name,
      version: plugin.version,
      description: plugin.description,
    });
    setPhase("edit-plugin");
  };

  // 管理页面：展示所有已配置插件 + 顶部添加入口
  if (phase === "manage") {
    return (
      <ManageView
        config={config}
        onAddFromGit={() => setPhase("choose-source")}
        onAddFromLocal={() => setPhase("select-local")}
        onSelectPlugin={handleManagePluginSelect}
        onToggleRecommended={handleToggleRecommended}
        onCancel={onDone}
        restoreKey={lastSelectedKey}
      />
    );
  }

  // 选择来源：已有仓库 or 新仓库
  if (phase === "choose-source") {
    const existingSources = (config?.sources || []).filter((s) => !s.url.startsWith("./"));
    return (
      <SourceChooser
        sources={existingSources.map((s) => ({
          url: s.url,
          pluginCount: s.plugins.length,
        }))}
        onSelectExisting={(sourceUrl) => loadRepo(sourceUrl)}
        onSelectNew={() => setPhase("input-url")}
        onCancel={() => setPhase("manage")}
      />
    );
  }

  if (phase === "input-url") {
    return (
      <Box flexDirection="column" paddingLeft={2}>
        <Box marginBottom={1}>
          <Text bold color="yellow">  添加插件</Text>
          <Text dimColor>  (Esc 返回)</Text>
        </Box>
        <Box>
          <Text bold>  Git 仓库地址: </Text>
        </Box>
        <Box>
          <Text color="cyan">  › </Text>
          <TextInput value={url} onChange={setUrl} onSubmit={(v) => loadRepo(v)} />
        </Box>
      </Box>
    );
  }

  if (phase === "cloning") {
    return (
      <Box paddingLeft={2}>
        <Text color="green">  <Spinner type="dots" /></Text>
        <Text> 正在克隆仓库...</Text>
      </Box>
    );
  }

  if (phase === "error") {
    return <ErrorView error={error} onBack={() => setPhase("manage")} />;
  }

  if (phase === "select-local") {
    return (
      <LocalPluginChooser
        onSelect={handleLocalPluginSelect}
        onCancel={() => setPhase("manage")}
      />
    );
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
      <Box flexDirection="column" paddingLeft={2}>
        <Box marginBottom={1}>
          <Text bold color="yellow">  选择插件</Text>
          <Text dimColor>  来自 {url}</Text>
        </Box>
        <PluginList
          plugins={items}
          onSelect={handlePluginSelect}
          onCancel={() => setPhase("choose-source")}
        />
      </Box>
    );
  }

  if (phase === "plugin-action" && selectedPlugin) {
    return (
      <PluginActionChooser
        pluginName={selectedPlugin.name as string}
        onEdit={() => setPhase("edit-plugin")}
        onDelete={() => setPhase("confirm-delete")}
        onCancel={() => setPhase("manage")}
      />
    );
  }

  if (phase === "confirm-delete" && selectedPlugin) {
    return (
      <ConfirmDelete
        pluginName={selectedPlugin.name as string}
        onConfirm={handleDelete}
        onCancel={() => setPhase("plugin-action")}
      />
    );
  }

  if (phase === "deleted") {
    return (
      <DeletedPhase
        pluginName={(selectedPlugin as Record<string, unknown>).name as string}
        onContinue={() => { reloadConfig(); setPhase("manage"); }}
        onBack={() => { reloadConfig(); setPhase("manage"); }}
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
        onCancel={() => setPhase("manage")}
      />
    );
  }

  if (phase === "saved") {
    return (
      <SavedPhase
        pluginName={(selectedPlugin as Record<string, unknown>).name as string}
        onContinue={() => { reloadConfig(); setPhase("manage"); }}
        onBack={() => { reloadConfig(); setPhase("manage"); }}
      />
    );
  }

  return null;
}

// 管理视图：顶部添加入口 + 按分组展示已配置插件
function ManageView({
  config,
  onAddFromGit,
  onAddFromLocal,
  onSelectPlugin,
  onToggleRecommended,
  onCancel,
  restoreKey,
}: {
  config: SourcesConfig | null;
  onAddFromGit: () => void;
  onAddFromLocal: () => void;
  onSelectPlugin: (pluginName: string, sourceUrl: string) => void;
  onToggleRecommended: (pluginName: string, category: string) => void;
  onCancel: () => void;
  restoreKey: string | null;
}) {
  // 判断插件是否在其分组的 recommendPlugins 中
  const isRecommendedPlugin = (pluginName: string, category: string): boolean => {
    const cat = config?.categories.find((c) => c.name === category);
    return cat?.recommendPlugins?.includes(pluginName) || false;
  };

  // 汇总所有已导入插件
  const allPlugins = useMemo(() => {
    if (!config) return [];
    const result: { name: string; description: string; category: string; sourceUrl: string; recommended: boolean }[] = [];
    for (const source of config.sources) {
      for (const plugin of source.plugins) {
        result.push({
          name: plugin.name,
          description: plugin.description,
          category: plugin.category,
          sourceUrl: source.url,
          recommended: isRecommendedPlugin(plugin.name, plugin.category),
        });
      }
    }
    return result;
  }, [config]);

  // 分组 tab 列表：全部 + config 中定义的分类
  const tabs = useMemo(() => {
    const categoryNames = (config?.categories || []).map((c) => c.name);
    return ["全部", ...categoryNames];
  }, [config]);

  const [activeTab, setActiveTab] = useState(0);
  const [onlyRecommended, setOnlyRecommended] = useState(false);
  const [cursor, setCursor] = useState(() => {
    // 初始光标：尝试恢复到上次选中的插件
    if (!restoreKey) return 0;
    // 初始 tab=0 即"全部"，filteredPlugins = allPlugins
    const initItems = [
      { key: "__git__" }, { key: "__local__" },
      ...allPlugins.map((p) => ({ key: `${p.sourceUrl}::${p.name}` })),
    ];
    const idx = initItems.findIndex((it) => it.key === restoreKey);
    if (idx >= 0) return idx;
    // 被删除：回到上一项或最后一个插件
    if (initItems.length > 2) return initItems.length - 1;
    return 0;
  });
  const { stdout } = useStdout();
  const termWidth = stdout?.columns || 120;

  // 当前分组 + 必装筛选下的插件
  const filteredPlugins = useMemo(() => {
    let result = allPlugins;
    if (activeTab > 0) {
      const category = tabs[activeTab];
      result = result.filter((p) => p.category === category);
    }
    if (onlyRecommended) {
      result = result.filter((p) => p.recommended);
    }
    return result;
  }, [allPlugins, activeTab, tabs, onlyRecommended]);

  const totalCount = allPlugins.length;

  // 列表项：2 个添加入口 + 过滤后的插件（统一为一个可导航列表）
  type ListItem =
    | { type: "action"; key: string; label: string; action: () => void }
    | { type: "plugin"; key: string; name: string; description: string; category: string; sourceUrl: string; recommended: boolean };

  const items: ListItem[] = useMemo(() => [
    { type: "action" as const, key: "__git__", label: "从 Git 仓库添加", action: onAddFromGit },
    { type: "action" as const, key: "__local__", label: "从本地目录添加", action: onAddFromLocal },
    ...filteredPlugins.map((p) => ({
      type: "plugin" as const,
      key: `${p.sourceUrl}::${p.name}`,
      name: p.name,
      description: p.description,
      category: p.category,
      sourceUrl: p.sourceUrl,
      recommended: p.recommended,
    })),
  ], [filteredPlugins, onAddFromGit, onAddFromLocal]);

  // 列宽计算
  const nameColWidth = useMemo(() => {
    const maxName = Math.max(...allPlugins.map((p) => p.name.length), 10);
    return Math.min(maxName, 30);
  }, [allPlugins]);

  // 切换 tab 或筛选时，保持光标在有效范围内
  useEffect(() => {
    setCursor((c) => Math.min(c, items.length - 1));
  }, [activeTab, onlyRecommended, items.length]);

  useInput((ch, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.tab) {
      setOnlyRecommended((v) => !v);
      return;
    }
    // 空格键：切换当前选中插件的必装状态
    if (ch === " " && items.length > 0) {
      const item = items[cursor];
      if (item.type === "plugin") {
        onToggleRecommended(item.name, item.category);
      }
      return;
    }
    if (key.upArrow) {
      setCursor((c) => (c > 0 ? c - 1 : items.length - 1));
    }
    if (key.downArrow) {
      setCursor((c) => (c < items.length - 1 ? c + 1 : 0));
    }
    if (key.leftArrow) {
      setActiveTab((t) => (t > 0 ? t - 1 : tabs.length - 1));
    }
    if (key.rightArrow) {
      setActiveTab((t) => (t < tabs.length - 1 ? t + 1 : 0));
    }
    if (key.return && items.length > 0) {
      const item = items[cursor];
      if (item.type === "action") {
        item.action();
      } else {
        onSelectPlugin(item.name, item.sourceUrl);
      }
    }
  });

  const descColWidth = Math.max(termWidth - nameColWidth - 20, 20);
  const sepWidth = Math.min(termWidth - 6, 60);

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box marginBottom={1}>
        <Text bold color="yellow">  管理插件</Text>
        <Text dimColor>  ({totalCount} 个插件)</Text>
      </Box>

      {/* 添加入口 */}
      {items.filter((it) => it.type === "action").map((item, i) => {
        const globalIdx = i;
        const active = globalIdx === cursor;
        return (
          <Box key={item.key}>
            <Text color={active ? "cyan" : "gray"}>
              {active ? "  ❯ " : "    "}
            </Text>
            <Text color={active ? "green" : undefined} bold={active}>
              + {(item as { label: string }).label}
            </Text>
          </Box>
        );
      })}

      {/* 分组 tab + 必装筛选 + 操作提示 */}
      <Box marginTop={1}>
        <Text>  </Text>
        <Text color={onlyRecommended ? "yellow" : "gray"} bold={onlyRecommended}>
          {onlyRecommended ? "[x]" : "[ ]"} 仅必装
        </Text>
        <Text dimColor>  </Text>
        {tabs.map((tab, i) => {
          const isActive = i === activeTab;
          const count = i === 0
            ? totalCount
            : allPlugins.filter((p) => p.category === tab).length;
          return (
            <React.Fragment key={tab}>
              {i > 0 && <Text dimColor> | </Text>}
              <Text color={isActive ? "cyan" : "gray"} bold={isActive}>
                {tab}({count})
              </Text>
            </React.Fragment>
          );
        })}
      </Box>
      <Box>
        <Text dimColor>  ↑/↓ 选择  ←/→ 切换分组  空格 切换必装  Tab 筛选必装  Enter 确认  Esc 返回</Text>
      </Box>

      {/* 分隔线 */}
      <Box>
        <Text dimColor>  {"─".repeat(sepWidth)}</Text>
      </Box>

      {/* 插件列表 */}
      {items.filter((it) => it.type === "plugin").map((item, i) => {
        const globalIdx = i + 2; // 前面 2 个 action
        const active = globalIdx === cursor;
        const pi = item as { name: string; description: string; category: string; sourceUrl: string; key: string; recommended: boolean };
        const nameTrunc = pi.name.length > nameColWidth
          ? pi.name.slice(0, nameColWidth - 1) + "~"
          : pi.name;
        const namePad = nameTrunc.padEnd(nameColWidth);
        const desc = pi.description
          + (pi.category ? ` [${pi.category}]` : "");
        const descTrunc = desc.length > descColWidth
          ? desc.slice(0, descColWidth - 1) + "~"
          : desc;

        return (
          <Box key={pi.key}>
            <Text color={active ? "cyan" : "gray"}>
              {active ? "  ❯ " : "    "}
            </Text>
            <Text color="yellow">{pi.recommended ? "★" : " "}</Text>
            <Text color="green">[x]</Text>
            <Text> </Text>
            <Text color={active ? "white" : "cyan"} bold>{namePad}</Text>
            <Text>  </Text>
            <Text color={active ? undefined : "gray"}>{descTrunc || "无描述"}</Text>
          </Box>
        );
      })}

      {filteredPlugins.length === 0 && totalCount > 0 && (
        <Box>
          <Text dimColor>  当前分组下暂无插件</Text>
        </Box>
      )}

      {totalCount === 0 && (
        <Box>
          <Text dimColor>  暂无已配置的插件，请选择上方入口添加</Text>
        </Box>
      )}
    </Box>
  );
}

// 本地插件选择器
function LocalPluginChooser({
  onSelect,
  onCancel,
}: {
  onSelect: (plugin: { name: string; version?: string; description?: string; path: string }) => void;
  onCancel: () => void;
}) {
  const plugins = useMemo(() => scanLocalPlugins(getProjectRoot()), []);
  const [cursor, setCursor] = useState(0);

  useInput((_ch, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.upArrow) {
      setCursor((c) => (c > 0 ? c - 1 : Math.max(plugins.length - 1, 0)));
    }
    if (key.downArrow) {
      setCursor((c) => (c < plugins.length - 1 ? c + 1 : 0));
    }
    if (key.return && plugins.length > 0) {
      onSelect(plugins[cursor]);
    }
  });

  if (plugins.length === 0) {
    return (
      <Box flexDirection="column" paddingLeft={2}>
        <Box marginBottom={1}>
          <Text bold color="yellow">  从本地目录添加</Text>
        </Box>
        <Text dimColor>  未找到包含 .claude-plugin/plugin.json 的本地子目录</Text>
        <Text dimColor>  按 Esc 返回</Text>
      </Box>
    );
  }

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box marginBottom={1}>
        <Text bold color="yellow">  从本地目录添加</Text>
        <Text dimColor>  (↑/↓ 选择, Enter 确认, Esc 返回)</Text>
      </Box>

      {plugins.map((p, i) => {
        const active = i === cursor;
        return (
          <Box key={p.path}>
            <Text color={active ? "cyan" : "gray"}>
              {active ? "  ❯ " : "    "}
            </Text>
            <Text bold={active} color={active ? "white" : "cyan"}>
              {p.name}
            </Text>
            {p.version && (
              <Text dimColor>  {p.version}</Text>
            )}
            {p.description && (
              <Text color={active ? undefined : "gray"}>  {p.description}</Text>
            )}
          </Box>
        );
      })}

      <Box marginTop={1}>
        <Text dimColor>  扫描路径: {getProjectRoot()}</Text>
      </Box>
    </Box>
  );
}

// 来源选择器
function SourceChooser({
  sources,
  onSelectExisting,
  onSelectNew,
  onCancel,
}: {
  sources: { url: string; pluginCount: number }[];
  onSelectExisting: (url: string) => void;
  onSelectNew: () => void;
  onCancel: () => void;
}) {
  const items = [
    ...sources.map((s) => {
      const name = s.url.replace(/\.git$/, "").split("/").pop() || s.url;
      return { key: s.url, label: name, detail: `${s.pluginCount} 个已导入`, isNew: false };
    }),
    { key: "__new__", label: "输入新的 Git 仓库地址", detail: "", isNew: true },
  ];

  const [cursor, setCursor] = useState(0);

  useInput((_ch, key) => {
    if (key.escape) {
      onCancel();
      return;
    }
    if (key.upArrow) {
      setCursor((c) => (c > 0 ? c - 1 : items.length - 1));
    }
    if (key.downArrow) {
      setCursor((c) => (c < items.length - 1 ? c + 1 : 0));
    }
    if (key.return) {
      const item = items[cursor];
      if (item.key === "__new__") {
        onSelectNew();
      } else {
        onSelectExisting(item.key);
      }
    }
  });

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box marginBottom={1}>
        <Text bold color="yellow">  从 Git 仓库添加</Text>
        <Text dimColor>  (↑/↓ 选择, Enter 确认, Esc 返回)</Text>
      </Box>

      <Box marginBottom={1}>
        <Text dimColor>  选择插件来源:</Text>
      </Box>

      {items.map((item, i) => {
        const active = i === cursor;
        return (
          <Box key={item.key}>
            <Text color={active ? "cyan" : "gray"}>
              {active ? "  ❯ " : "    "}
            </Text>
            {item.isNew ? (
              <Text color={active ? "green" : undefined} bold={active}>
                + {item.label}
              </Text>
            ) : (
              <>
                <Text bold={active}>{item.label}</Text>
                <Text dimColor>  ({item.detail})</Text>
              </>
            )}
          </Box>
        );
      })}
    </Box>
  );
}

function ErrorView({ error, onBack }: { error: string; onBack: () => void }) {
  useInput((_ch, key) => {
    if (key.return || key.escape) onBack();
  });
  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Text color="red">  {error}</Text>
      <Text dimColor>  按 Enter 返回</Text>
    </Box>
  );
}

function SavedPhase({
  pluginName,
  onContinue,
  onBack,
}: {
  pluginName: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  useInput((_input, key) => {
    if (key.return) onContinue();
    if (key.escape) onBack();
  });
  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Text color="green" bold>  ✓ 已保存 {pluginName}</Text>
      <Text dimColor>  Enter 继续  |  Esc 返回</Text>
    </Box>
  );
}

function PluginActionChooser({
  pluginName,
  onEdit,
  onDelete,
  onCancel,
}: {
  pluginName: string;
  onEdit: () => void;
  onDelete: () => void;
  onCancel: () => void;
}) {
  const [cursor, setCursor] = useState(0);
  const actions = [
    { label: "编辑", action: onEdit },
    { label: "删除", action: onDelete },
  ];

  useInput((_ch, key) => {
    if (key.escape) onCancel();
    if (key.upArrow) setCursor((c) => (c > 0 ? c - 1 : actions.length - 1));
    if (key.downArrow) setCursor((c) => (c < actions.length - 1 ? c + 1 : 0));
    if (key.return) actions[cursor].action();
  });

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box marginBottom={1}>
        <Text bold color="cyan">  {pluginName}</Text>
        <Text dimColor>  (已导入)</Text>
      </Box>
      {actions.map((a, i) => (
        <Box key={a.label}>
          <Text color={i === cursor ? "cyan" : "gray"}>
            {i === cursor ? "  > " : "    "}
          </Text>
          <Text bold={i === cursor} color={a.label === "删除" ? "red" : undefined}>
            {a.label}
          </Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor>  ↑/↓ 选择  Enter 确认  Esc 返回</Text>
      </Box>
    </Box>
  );
}

function ConfirmDelete({
  pluginName,
  onConfirm,
  onCancel,
}: {
  pluginName: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  useInput((_ch, key) => {
    if (key.return) onConfirm();
    if (key.escape) onCancel();
  });

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Text bold color="red">
        {"  "}确认删除插件: {pluginName} ?
      </Text>
      <Text dimColor>  Enter 确认删除  |  Esc 取消</Text>
    </Box>
  );
}

function DeletedPhase({
  pluginName,
  onContinue,
  onBack,
}: {
  pluginName: string;
  onContinue: () => void;
  onBack: () => void;
}) {
  useInput((_ch, key) => {
    if (key.return) onContinue();
    if (key.escape) onBack();
  });

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Text color="green" bold>{"  "}已删除 {pluginName}</Text>
      <Text dimColor>  Enter 继续  |  Esc 返回</Text>
    </Box>
  );
}
