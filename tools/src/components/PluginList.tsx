import React, { useState, useMemo } from "react";
import { Box, Text, useInput, useStdout } from "ink";
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

  const { stdout } = useStdout();
  const termWidth = stdout?.columns || 120;

  // 固定列宽: 光标(2) + 状态(6) + 版本(maxVer+2) + 间隔余量(2)
  // 插件名和描述分配剩余空间
  const maxVerLen = useMemo(() => {
    return Math.max(...plugins.map((p) => (p.version || "?").length), 5);
  }, [plugins]);

  // 前缀固定: "x [X] " = 7字符, 外层可能有 padding, 留余量
  const prefixLen = 7;
  const fixedCols = prefixLen + maxVerLen + 4 + 4; // +4 padding between cols, +4 safety margin
  const remaining = Math.max(termWidth - fixedCols, 40);
  // 插件名占 35%，描述占 65%
  const nameColWidth = Math.min(
    Math.max(...plugins.map((p) => p.name.length), 10),
    Math.floor(remaining * 0.35)
  );
  const descColWidth = remaining - nameColWidth;

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
          const ver = p.version || "?";
          // 前缀: "❯ [v] " / "  [v] " / "❯     " / "      " — 固定6字符
          const cursor_s = active ? ">" : " ";
          const status_s = p.imported ? "[x]" : "   ";
          const prefix = `${cursor_s} ${status_s} `;
          const nameTrunc = p.name.length > nameColWidth
            ? p.name.slice(0, nameColWidth - 1) + "~"
            : p.name;
          const namePad = nameTrunc.padEnd(nameColWidth);
          const verPad = ver.padEnd(maxVerLen + 2);
          const desc = (p.description || "")
            + (p.category ? ` [${p.category}]` : "");
          const descTrunc = desc.length > descColWidth
            ? desc.slice(0, descColWidth - 1) + "~"
            : desc;

          return (
            <Box key={p.name}>
              <Text>
                <Text color={active ? "cyan" : "gray"}>{cursor_s} </Text>
                <Text color="green">{status_s}</Text>
                <Text> </Text>
                <Text color={active ? "white" : "cyan"} bold>{namePad}</Text>
                <Text>  </Text>
                <Text dimColor>{verPad}</Text>
                <Text color={active ? undefined : "gray"}>{descTrunc || "无描述"}</Text>
              </Text>
            </Box>
          );
        })}
        {filtered.length === 0 && <Text dimColor>无匹配结果</Text>}
      </Box>
    </Box>
  );
}
