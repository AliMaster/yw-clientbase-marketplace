import React, { useState, useEffect } from "react";
import { render, Box, Text, useInput } from "ink";
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
import { getConfigPath } from "../utils/paths.js";

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

  const configPath = getConfigPath();

  useEffect(() => {
    const c = readConfig(configPath);
    if (!c) {
      setError("未找到 marketconfig.json，请先运行 ccmarket init");
      setPhase("error");
      return;
    }
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

    const pluginName = (selectedPlugin as Record<string, unknown>).name as string;
    const existing = source.plugins.findIndex((p) => p.name === pluginName);
    const entry: PluginEntry = {
      name: pluginName,
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
    return <SavedPhase onContinue={() => setPhase("select-plugin")} />;
  }

  return null;
}

function SavedPhase({ onContinue }: { onContinue: () => void }) {
  useInput((_input, key) => {
    if (key.return) {
      onContinue();
    }
    if (key.escape) {
      process.exit(0);
    }
  });

  return (
    <Box flexDirection="column">
      <Text color="green">已保存到配置！</Text>
      <Text dimColor>按 Enter 继续添加，Esc 退出</Text>
    </Box>
  );
}

export function addCommand() {
  render(<AddApp />);
}
