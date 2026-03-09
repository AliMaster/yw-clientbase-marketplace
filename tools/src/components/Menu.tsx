import React, { useState } from "react";
import { Box, Text, useInput } from "ink";

export interface MenuItem {
  key: string;
  label: string;
  description: string;
  icon: string;
  color: string;
}

interface Props {
  items: MenuItem[];
  onSelect: (key: string) => void;
}

export function Menu({ items, onSelect }: Props) {
  const [cursor, setCursor] = useState(0);

  useInput((_input, key) => {
    if (key.upArrow) {
      setCursor((c) => (c > 0 ? c - 1 : items.length - 1));
    }
    if (key.downArrow) {
      setCursor((c) => (c < items.length - 1 ? c + 1 : 0));
    }
    if (key.return) {
      onSelect(items[cursor].key);
    }
  });

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box marginBottom={1}>
        <Text bold color="yellow">  请选择操作</Text>
        <Text dimColor>  (↑/↓ 选择, Enter 确认)</Text>
      </Box>
      {items.map((item, i) => {
        const active = i === cursor;
        return (
          <Box key={item.key}>
            <Text color={active ? "cyan" : "gray"}>
              {active ? "  ❯ " : "    "}
            </Text>
            <Text color={active ? (item.color as any) : undefined} bold={active}>
              {item.icon} {item.label}
            </Text>
            {item.description && (
              <Text dimColor>  {item.description}</Text>
            )}
          </Box>
        );
      })}
    </Box>
  );
}
