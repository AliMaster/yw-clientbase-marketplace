import React, { useState } from "react";
import { render, Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { writeConfig, type SourcesConfig } from "../utils/config.js";
import { getConfigPath } from "../utils/paths.js";
import fs from "node:fs";

type Step = "welcome" | "name" | "ownerName" | "ownerEmail" | "description" | "done";

const TOTAL_STEPS = 4;

function stepIndex(step: Step): number {
  const map: Record<string, number> = { name: 1, ownerName: 2, ownerEmail: 3, description: 4 };
  return map[step] ?? 0;
}

function Welcome({ onStart }: { onStart: () => void }) {
  useInput((_input, key) => {
    if (key.return) onStart();
  });

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

      <Box borderStyle="round" borderColor="gray" paddingX={1}>
        <Text dimColor>按 <Text color="white" bold>Enter</Text> 开始配置</Text>
      </Box>
    </Box>
  );
}

function ProgressBar({ current, total }: { current: number; total: number }) {
  const filled = current;
  const empty = total - current;
  return (
    <Box marginBottom={1}>
      <Text dimColor>  [{current}/{total}] </Text>
      <Text color="green">{"█".repeat(filled)}</Text>
      <Text dimColor>{"░".repeat(empty)}</Text>
    </Box>
  );
}

function InitApp() {
  const [step, setStep] = useState<Step>("welcome");
  const [name, setName] = useState("");
  const [ownerName, setOwnerName] = useState("");
  const [ownerEmail, setOwnerEmail] = useState("");
  const [description, setDescription] = useState("");
  const [input, setInput] = useState("");

  const handleSubmit = (value: string) => {
    switch (step) {
      case "name":
        setName(value);
        setInput("");
        setStep("ownerName");
        break;
      case "ownerName":
        setOwnerName(value);
        setInput("");
        setStep("ownerEmail");
        break;
      case "ownerEmail":
        setOwnerEmail(value);
        setInput("");
        setStep("description");
        break;
      case "description": {
        setDescription(value);
        const config: SourcesConfig = {
          marketplace: {
            name: name,
            owner: { name: ownerName, email: ownerEmail },
            metadata: { description: value, version: "" },
          },
          sources: [],
          categories: [],
        };
        const configPath = getConfigPath();
        writeConfig(configPath, config);
        setStep("done");
        break;
      }
    }
  };

  if (step === "welcome") {
    return <Welcome onStart={() => setStep("name")} />;
  }

  if (step === "done") {
    return (
      <Box flexDirection="column" marginTop={1}>
        <Box marginBottom={1}>
          <Text color="green" bold> marketconfig.json 已创建！</Text>
        </Box>
        <Box flexDirection="column" paddingLeft={2} marginBottom={1}>
          <Text>  <Text dimColor>Name:       </Text> {name}</Text>
          <Text>  <Text dimColor>Owner:      </Text> {ownerName}{ownerEmail ? ` <${ownerEmail}>` : ""}</Text>
          <Text>  <Text dimColor>Description:</Text> {description}</Text>
        </Box>
        <Box borderStyle="round" borderColor="gray" paddingX={1}>
          <Text dimColor>下一步: 运行 <Text color="white" bold>ccmarket add</Text> 来添加插件</Text>
        </Box>
      </Box>
    );
  }

  const labels: Record<string, { title: string; hint?: string }> = {
    name: { title: "Marketplace 名称", hint: "例如: my-team-marketplace" },
    ownerName: { title: "Owner 名称", hint: "例如: your-name" },
    ownerEmail: { title: "Owner Email", hint: "可选，回车跳过" },
    description: { title: "市场描述", hint: "简短介绍这个插件市场的用途" },
  };

  const { title, hint } = labels[step];

  return (
    <Box flexDirection="column">
      <ProgressBar current={stepIndex(step)} total={TOTAL_STEPS} />
      <Box paddingLeft={2} flexDirection="column">
        <Text bold color="cyan">  {title}</Text>
        {hint && <Text dimColor>  {hint}</Text>}
        <Box marginTop={1}>
          <Text color="cyan">  › </Text>
          <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
        </Box>
      </Box>
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
