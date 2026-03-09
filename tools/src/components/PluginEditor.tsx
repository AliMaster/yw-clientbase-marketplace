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

export type { PluginData };

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
    if (key.upArrow) {
      setField("description");
    }
    if (key.downArrow) {
      setField("category");
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
              <Text bold color="yellow">Description</Text>
              <Text>{": "}</Text>
              <TextInput
                value={description}
                onChange={setDescription}
                onSubmit={handleSubmit}
              />
            </Box>
          ) : (
            <Box>
              <Text>Description</Text>
              <Text>{": "}</Text>
              <Text>{description}</Text>
            </Box>
          )}

          {field === "category" ? (
            <Box flexDirection="column">
              <Box>
                <Text bold color="yellow">Category</Text>
                <Text>{": "}</Text>
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
            <Box>
              <Text>Category</Text>
              <Text>{": "}</Text>
              <Text>{category || "-"}</Text>
            </Box>
          )}
        </Box>
      </Box>

      <Box marginTop={1}>
        <Text dimColor>
          ↑/↓ 切换字段  Enter 确认  Esc 取消
        </Text>
      </Box>
    </Box>
  );
}
