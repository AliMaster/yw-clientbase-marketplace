import React, { useState } from "react";
import { render, Box, Text } from "ink";
import TextInput from "ink-text-input";
import { writeConfig, type SourcesConfig } from "../utils/config.js";
import path from "node:path";

type Step = "name" | "ownerName" | "ownerEmail" | "description" | "done";

function InitApp() {
  const [step, setStep] = useState<Step>("name");
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
        const configPath = path.resolve(process.cwd(), "sources.json");
        writeConfig(configPath, config);
        setStep("done");
        break;
      }
    }
  };

  if (step === "done") {
    return (
      <Box flexDirection="column">
        <Text color="green">sources.json 已创建！</Text>
        <Text>  name: {name}</Text>
        <Text>  owner: {ownerName} {ownerEmail ? `<${ownerEmail}>` : ""}</Text>
        <Text>  description: {description}</Text>
      </Box>
    );
  }

  const labels: Record<string, string> = {
    name: "Marketplace 名称",
    ownerName: "Owner 名称",
    ownerEmail: "Owner Email（可选，回车跳过）",
    description: "描述",
  };

  return (
    <Box flexDirection="column">
      <Text bold>{labels[step]}:</Text>
      <Box>
        <Text color="cyan">&gt; </Text>
        <TextInput value={input} onChange={setInput} onSubmit={handleSubmit} />
      </Box>
    </Box>
  );
}

export function initCommand() {
  render(<InitApp />);
}
