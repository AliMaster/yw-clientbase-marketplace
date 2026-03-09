import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
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

export function AddFlow({ onDone }: { onDone: () => void }) {
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
      setError("未找到 marketconfig.json，请先创建配置");
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

  const getImportedOverrides = (pluginName: string): PluginEntry | null => {
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
    const entry: PluginEntry = { name: pluginName, description, category };

    if (existing >= 0) {
      source.plugins[existing] = entry;
    } else {
      source.plugins.push(entry);
    }

    if (category && !config.categories.find((c) => c.name === category)) {
      config.categories.push({ name: category });
    }

    writeConfig(configPath, config);
    setConfig({ ...config });
    setPhase("saved");
  };

  if (phase === "input-url") {
    return (
      <Box flexDirection="column" paddingLeft={2}>
        <Box marginBottom={1}>
          <Text bold color="yellow">  添加插件</Text>
        </Box>
        <Box>
          <Text bold>  Git 仓库地址: </Text>
        </Box>
        <Box>
          <Text color="cyan">  › </Text>
          <TextInput value={url} onChange={setUrl} onSubmit={handleUrlSubmit} />
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
    return <ErrorView error={error} onBack={onDone} />;
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
          onCancel={onDone}
        />
      </Box>
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
      <SavedPhase
        pluginName={(selectedPlugin as Record<string, unknown>).name as string}
        onContinue={() => setPhase("select-plugin")}
        onBack={onDone}
      />
    );
  }

  return null;
}

function ErrorView({ error, onBack }: { error: string; onBack: () => void }) {
  useInput((_ch, key) => {
    if (key.return || key.escape) onBack();
  });
  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Text color="red">  {error}</Text>
      <Text dimColor>  按 Enter 返回主菜单</Text>
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
      <Text dimColor>  Enter 继续添加  |  Esc 返回主菜单</Text>
    </Box>
  );
}
