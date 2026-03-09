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

export type { PluginItem };

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
