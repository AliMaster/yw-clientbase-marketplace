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

  const maxNameLen = useMemo(() => {
    return Math.max(...plugins.map((p) => p.name.length), 10);
  }, [plugins]);

  const maxVerLen = useMemo(() => {
    return Math.max(...plugins.map((p) => (p.version || "?").length), 5);
  }, [plugins]);

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
      const safeCursor = Math.min(cursor, filtered.length - 1);
      onSelect(filtered[safeCursor]);
    }
  });

  // 光标列宽: "❯ " = 2, 状态列宽: "[已导入] " = 5+1=6 or "       " = 6
  const statusWidth = 6;

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>搜索: </Text>
        <TextInput value={search} onChange={(v) => { setSearch(v); setCursor(0); }} />
      </Box>
      <Text dimColor>↑/↓ 选择  Enter 确认  Esc 返回</Text>
      <Box flexDirection="column" marginTop={1}>
        {filtered.map((p, i) => {
          const active = i === cursor;
          const ver = p.version || "?";

          return (
            <Box key={p.name} flexDirection="row">
              {/* 光标 */}
              <Text color={active ? "cyan" : "gray"}>
                {active ? "❯ " : "  "}
              </Text>
              {/* 状态标签 - 固定宽度 */}
              <Box width={statusWidth}>
                {p.imported
                  ? <Text color="green">已导入</Text>
                  : <Text>      </Text>
                }
              </Box>
              {/* 插件名 - 固定宽度 */}
              <Box width={maxNameLen + 2}>
                <Text color={active ? "white" : "cyan"} bold>
                  {p.name}
                </Text>
              </Box>
              {/* 版本 - 固定宽度 */}
              <Box width={maxVerLen + 2}>
                <Text dimColor>{ver}</Text>
              </Box>
              {/* 描述 - 自然换行 */}
              <Box flexShrink={1}>
                <Text color={active ? undefined : "gray"}>
                  {p.description || "无描述"}
                </Text>
                {p.category && <Text color="yellow"> [{p.category}]</Text>}
              </Box>
            </Box>
          );
        })}
        {filtered.length === 0 && <Text dimColor>无匹配结果</Text>}
      </Box>
    </Box>
  );
}
