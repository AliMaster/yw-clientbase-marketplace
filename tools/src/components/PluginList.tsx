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

  // 计算最长名字宽度用于对齐
  const maxNameLen = useMemo(() => {
    return Math.max(...plugins.map((p) => p.name.length), 10);
  }, [plugins]);

  // [已导入] 标签宽度
  const badgeWidth = 7; // "[已导入] " 占 7 个字符（含空格）
  const nameColWidth = maxNameLen + badgeWidth + 2; // +2 留余量

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
          const badge = p.imported ? "[已导入]" : "";
          const nameStr = `${badge}${badge ? " " : ""}${p.name}`;
          const padded = nameStr.padEnd(nameColWidth);

          return (
            <Box key={p.name} wrap="truncate">
              <Text color={active ? "cyan" : "gray"}>
                {active ? "❯ " : "  "}
              </Text>
              <Text wrap="truncate">
                {p.imported && <Text color="green" bold={active}>[已导入] </Text>}
                <Text color={active ? "white" : "cyan"} bold>
                  {p.name.padEnd(maxNameLen)}
                </Text>
                <Text dimColor> v{(p.version || "?").padEnd(8)}</Text>
                <Text color={active ? undefined : "gray"}> {p.description || "无描述"}</Text>
                {p.category && <Text color="yellow"> [{p.category}]</Text>}
              </Text>
            </Box>
          );
        })}
        {filtered.length === 0 && <Text dimColor>无匹配结果</Text>}
      </Box>
    </Box>
  );
}
