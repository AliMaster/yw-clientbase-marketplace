import React, { useState } from "react";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import {
  readConfig,
  writeConfig,
  type SourcesConfig,
} from "../utils/config.js";
import { getConfigPath } from "../utils/paths.js";
import fs from "node:fs";

const FIELDS = ["name", "ownerName", "ownerEmail", "description"] as const;
type Field = (typeof FIELDS)[number];

const FIELD_CONFIG: Record<Field, { label: string; hint: string }> = {
  name: { label: "Marketplace 名称", hint: "例如: my-team-marketplace" },
  ownerName: { label: "Owner 名称", hint: "例如: your-name" },
  ownerEmail: { label: "Owner Email", hint: "可选，回车跳过" },
  description: { label: "市场描述", hint: "简短介绍这个插件市场的用途" },
};

export function InitFlow({ onDone }: { onDone: () => void }) {
  const configPath = getConfigPath();
  const existing = fs.existsSync(configPath);

  if (existing) {
    return <AlreadyExists onBack={onDone} />;
  }

  return <InitForm onDone={onDone} />;
}

function AlreadyExists({ onBack }: { onBack: () => void }) {
  useInput((_ch, key) => {
    if (key.return || key.escape) onBack();
  });
  return (
    <Box paddingLeft={2} flexDirection="column">
      <Text color="yellow">  marketconfig.json 已存在，请使用「编辑市场配置」来编辑。</Text>
      <Text dimColor>  按 Enter 或 Esc 返回</Text>
    </Box>
  );
}

function InitForm({ onDone }: { onDone: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [values, setValues] = useState<Record<Field, string>>({
    name: "",
    ownerName: "",
    ownerEmail: "",
    description: "",
  });
  const [input, setInput] = useState("");

  useInput((_ch, key) => {
    if (done) {
      if (key.return || key.escape) onDone();
      return;
    }
    if (key.escape) {
      if (activeIndex > 0) {
        // Esc 回到上一项
        const currentField = FIELDS[activeIndex];
        setValues((v) => ({ ...v, [currentField]: input }));
        const prevIndex = activeIndex - 1;
        setActiveIndex(prevIndex);
        setInput(values[FIELDS[prevIndex]]);
      } else {
        // 第一项时 Esc 返回主菜单
        onDone();
      }
      return;
    }
    if (key.upArrow && activeIndex > 0) {
      const currentField = FIELDS[activeIndex];
      setValues((v) => ({ ...v, [currentField]: input }));
      const prevIndex = activeIndex - 1;
      setActiveIndex(prevIndex);
      setInput(values[FIELDS[prevIndex]]);
    }
  });

  const handleSubmit = (value: string) => {
    const currentField = FIELDS[activeIndex];
    const newValues = { ...values, [currentField]: value };
    setValues(newValues);

    if (activeIndex < FIELDS.length - 1) {
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
      setInput(newValues[FIELDS[nextIndex]]);
    } else {
      const config: SourcesConfig = {
        marketplace: {
          name: newValues.name,
          owner: { name: newValues.ownerName, email: newValues.ownerEmail },
          metadata: { description: newValues.description, version: "" },
        },
        sources: [],
        categories: [],
      };
      writeConfig(getConfigPath(), config);
      setDone(true);
    }
  };

  const activeField = FIELDS[activeIndex];

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box marginBottom={1}>
        <Text bold color="yellow">  创建配置</Text>
        {!done && <Text dimColor>  (↑/Esc 上一项, Enter 下一项)</Text>}
      </Box>

      {FIELDS.slice(0, activeIndex).map((f) => (
        <Box key={f}>
          <Text color="green">  ✓ </Text>
          <Text color="cyan">{FIELD_CONFIG[f].label}: </Text>
          <Text>{values[f] || (f === "ownerEmail" ? "(跳过)" : "")}</Text>
        </Box>
      ))}

      {!done && (
        <Box flexDirection="column">
          <Box>
            <Text color="green" bold>  › </Text>
            <Text bold>{FIELD_CONFIG[activeField].label}</Text>
            <Text dimColor>  {FIELD_CONFIG[activeField].hint}</Text>
          </Box>
          <Box>
            <Text>    </Text>
            <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
          </Box>
        </Box>
      )}

      {done && (
        <>
          {FIELDS.map((f) => (
            <Box key={f}>
              <Text color="green">  ✓ </Text>
              <Text color="cyan">{FIELD_CONFIG[f].label}: </Text>
              <Text>{values[f] || (f === "ownerEmail" ? "(跳过)" : "")}</Text>
            </Box>
          ))}
          <Box marginTop={1}>
            <Text color="green" bold>  ✓ marketconfig.json 已创建！</Text>
          </Box>
          <Text dimColor>  按 Enter 或 Esc 返回主菜单</Text>
        </>
      )}
    </Box>
  );
}
