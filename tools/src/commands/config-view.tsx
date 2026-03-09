import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { writeConfig, type SourcesConfig } from "../utils/config.js";
import { getConfigPath } from "../utils/paths.js";

const FIELDS = ["name", "ownerName", "ownerEmail", "description"] as const;
type Field = (typeof FIELDS)[number];

const FIELD_LABELS: Record<Field, string> = {
  name: "Marketplace 名称",
  ownerName: "Owner 名称",
  ownerEmail: "Owner Email",
  description: "市场描述",
};

function getFieldValue(config: SourcesConfig, field: Field): string {
  switch (field) {
    case "name": return config.marketplace.name;
    case "ownerName": return config.marketplace.owner.name;
    case "ownerEmail": return config.marketplace.owner.email;
    case "description": return config.marketplace.metadata.description;
  }
}

function setFieldValue(config: SourcesConfig, field: Field, value: string): SourcesConfig {
  const c = structuredClone(config);
  switch (field) {
    case "name": c.marketplace.name = value; break;
    case "ownerName": c.marketplace.owner.name = value; break;
    case "ownerEmail": c.marketplace.owner.email = value; break;
    case "description": c.marketplace.metadata.description = value; break;
  }
  return c;
}

export function ConfigView({
  config: initialConfig,
  onDone,
}: {
  config: SourcesConfig;
  onDone: () => void;
}) {
  const [config, setConfig] = useState(initialConfig);
  const [cursor, setCursor] = useState(0);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState("");

  useInput((_ch, key) => {
    if (editing) return;
    if (key.escape) {
      onDone();
      return;
    }
    if (key.upArrow) {
      setCursor((c) => (c > 0 ? c - 1 : FIELDS.length - 1));
    }
    if (key.downArrow) {
      setCursor((c) => (c < FIELDS.length - 1 ? c + 1 : 0));
    }
    if (key.return) {
      setEditValue(getFieldValue(config, FIELDS[cursor]));
      setEditing(true);
    }
  });

  const handleEditSubmit = (value: string) => {
    const field = FIELDS[cursor];
    const newConfig = setFieldValue(config, field, value);
    setConfig(newConfig);
    writeConfig(getConfigPath(), newConfig);
    setEditing(false);
  };

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box marginBottom={1}>
        <Text bold color="yellow">  修改配置</Text>
        <Text dimColor>  (↑/↓ 选择, Enter 编辑, Esc 返回)</Text>
      </Box>

      {FIELDS.map((f, i) => {
        const active = i === cursor;
        const value = getFieldValue(config, f);

        if (active && editing) {
          return (
            <Box key={f} flexDirection="column">
              <Box>
                <Text color="cyan" bold>  › </Text>
                <Text bold>{FIELD_LABELS[f]}: </Text>
              </Box>
              <Box>
                <Text>    </Text>
                <TextInput
                  value={editValue}
                  onChange={setEditValue}
                  onSubmit={handleEditSubmit}
                />
              </Box>
            </Box>
          );
        }

        return (
          <Box key={f}>
            <Text color={active ? "cyan" : "gray"}>
              {active ? "  ❯ " : "    "}
            </Text>
            <Text dimColor>{FIELD_LABELS[f]}: </Text>
            <Text bold={active}>{value || "(空)"}</Text>
          </Box>
        );
      })}
    </Box>
  );
}
