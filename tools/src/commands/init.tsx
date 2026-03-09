import React, { useState } from "react";
import { render, Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { writeConfig, type SourcesConfig } from "../utils/config.js";
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

function Header() {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {`
   _____ ____ __  __            _        _
  / ____/ ___|  \\/  | __ _ _ __| | _____| |_
 | |   | |   | |\\/| |/ _\` | '__| |/ / _ \\ __|
 | |___| |___| |  | | (_| | |  |   <  __/ |_
  \\_____\\____|_|  |_|\\__,_|_|  |_|\\_\\___|\\__|
`}
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text>  Claude Code 插件市场管理工具</Text>
        <Text dimColor>  轻松管理、组合来自社区和团队的 Claude Code 插件</Text>
      </Box>

      <Box flexDirection="column" paddingLeft={2} marginBottom={1}>
        <Text bold color="yellow">  可用命令</Text>
        <Text>  <Text color="green" bold>init    </Text> <Text dimColor>-</Text> 初始化市场配置文件</Text>
        <Text>  <Text color="green" bold>add     </Text> <Text dimColor>-</Text> 从 Git 仓库导入插件</Text>
        <Text>  <Text color="green" bold>generate</Text> <Text dimColor>-</Text> 生成最终 marketplace.json</Text>
      </Box>

      <Box flexDirection="column" paddingLeft={2} marginBottom={1}>
        <Text bold color="yellow">  工作流程</Text>
        <Text dimColor>  1. ccmarket init       创建 marketconfig.json</Text>
        <Text dimColor>  2. ccmarket add        选择并导入插件</Text>
        <Text dimColor>  3. ccmarket generate   生成发布文件</Text>
      </Box>
    </Box>
  );
}

function CompletedField({
  field,
  value,
  active,
  onEdit,
}: {
  field: Field;
  value: string;
  active: boolean;
  onEdit: () => void;
}) {
  const { label } = FIELD_CONFIG[field];
  const display = value || (field === "ownerEmail" ? "(跳过)" : "");
  return (
    <Box>
      <Text color="green">  ✓ </Text>
      <Text dimColor>{label}: </Text>
      <Text>{display}</Text>
      {active && <Text dimColor>  ← 当前编辑</Text>}
      {!active && <Text dimColor>  </Text>}
    </Box>
  );
}

function ActiveField({
  field,
  value,
  onChange,
  onSubmit,
}: {
  field: Field;
  value: string;
  onChange: (v: string) => void;
  onSubmit: (v: string) => void;
}) {
  const { label, hint } = FIELD_CONFIG[field];
  return (
    <Box flexDirection="column">
      <Box>
        <Text color="cyan" bold>  › </Text>
        <Text bold>{label}</Text>
        <Text dimColor>  {hint}</Text>
      </Box>
      <Box>
        <Text>    </Text>
        <TextInput value={value} onChange={onChange} onSubmit={onSubmit} />
      </Box>
    </Box>
  );
}

function DoneView({ values }: { values: Record<Field, string> }) {
  return (
    <Box flexDirection="column" marginTop={1}>
      <Box marginBottom={1}>
        <Text color="green" bold>  ✓ marketconfig.json 已创建！</Text>
      </Box>
      <Box flexDirection="column" paddingLeft={2} marginBottom={1}>
        <Text>  <Text dimColor>Name:       </Text> {values.name}</Text>
        <Text>  <Text dimColor>Owner:      </Text> {values.ownerName}{values.ownerEmail ? ` <${values.ownerEmail}>` : ""}</Text>
        <Text>  <Text dimColor>Description:</Text> {values.description}</Text>
      </Box>
      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <Text dimColor>下一步: 运行 <Text color="white" bold>ccmarket add</Text> 来添加插件</Text>
      </Box>
    </Box>
  );
}

function InitApp() {
  const [started, setStarted] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const [done, setDone] = useState(false);
  const [values, setValues] = useState<Record<Field, string>>({
    name: "",
    ownerName: "",
    ownerEmail: "",
    description: "",
  });
  const [input, setInput] = useState("");

  // 欢迎页按 Enter 开始
  useInput((_ch, key) => {
    if (!started && key.return) {
      setStarted(true);
      return;
    }
    if (started && !done) {
      // ↑ 回到上一个已填字段编辑
      if (key.upArrow && activeIndex > 0) {
        // 保存当前输入
        const currentField = FIELDS[activeIndex];
        setValues((v) => ({ ...v, [currentField]: input }));
        const prevIndex = activeIndex - 1;
        setActiveIndex(prevIndex);
        setInput(values[FIELDS[prevIndex]]);
      }
    }
  });

  const handleSubmit = (value: string) => {
    const currentField = FIELDS[activeIndex];
    const newValues = { ...values, [currentField]: value };
    setValues(newValues);

    if (activeIndex < FIELDS.length - 1) {
      // 还有下一个字段
      const nextIndex = activeIndex + 1;
      setActiveIndex(nextIndex);
      setInput(newValues[FIELDS[nextIndex]]);
    } else {
      // 全部填完，写入文件
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
    <Box flexDirection="column">
      <Header />

      {!started && (
        <Box borderStyle="round" borderColor="gray" paddingX={1}>
          <Text dimColor>按 <Text color="white" bold>Enter</Text> 开始配置</Text>
        </Box>
      )}

      {started && (
        <Box flexDirection="column">
          <Box marginBottom={1}>
            <Text bold color="yellow">  配置信息</Text>
            {!done && (
              <Text dimColor>  (↑ 回到上一项修改)</Text>
            )}
          </Box>

          {/* 已完成的字段 */}
          {FIELDS.slice(0, activeIndex).map((f) => (
            <CompletedField
              key={f}
              field={f}
              value={values[f]}
              active={false}
              onEdit={() => {}}
            />
          ))}

          {/* 当前正在编辑的字段 */}
          {!done && (
            <ActiveField
              field={activeField}
              value={input}
              onChange={setInput}
              onSubmit={handleSubmit}
            />
          )}

          {/* done 状态下展示全部字段 + 完成信息 */}
          {done && (
            <>
              {FIELDS.map((f) => (
                <CompletedField
                  key={f}
                  field={f}
                  value={values[f]}
                  active={false}
                  onEdit={() => {}}
                />
              ))}
              <DoneView values={values} />
            </>
          )}
        </Box>
      )}
    </Box>
  );
}

export function initCommand() {
  const configPath = getConfigPath();
  if (fs.existsSync(configPath)) {
    console.error("marketconfig.json 已存在。如需重新初始化，请先手动删除该文件。");
    process.exit(1);
  }
  render(<InitApp />);
}
