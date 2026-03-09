import React, { useState, useEffect } from "react";
import { Box, Text, useInput } from "ink";
import Spinner from "ink-spinner";
import { readConfig } from "../utils/config.js";
import { cloneOrPull, readRepoMarketplace } from "../utils/git.js";
import { transformPlugin } from "../utils/transform.js";
import { getConfigPath, getOutputPath, getProjectRoot } from "../utils/paths.js";
import path from "node:path";
import fs from "node:fs";

type Phase = "running" | "done" | "error";

interface LogLine {
  text: string;
  color?: string;
}

export function GenerateFlow({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState<Phase>("running");
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [summary, setSummary] = useState("");

  const addLog = (text: string, color?: string) => {
    setLogs((prev) => [...prev, { text, color }]);
  };

  useInput((_ch, key) => {
    if (phase !== "running" && (key.return || key.escape)) {
      onDone();
    }
  });

  useEffect(() => {
    (async () => {
      try {
        const config = readConfig(getConfigPath());
        if (!config) {
          addLog("未找到 marketconfig.json", "red");
          setPhase("error");
          return;
        }

        const allPlugins: Record<string, unknown>[] = [];
        let sourceCount = 0;

        for (const source of config.sources) {
          sourceCount++;
          const isLocal = source.url.startsWith("./");

          if (isLocal) {
            // 本地插件：直接读取 plugin.json
            addLog(`处理本地源: ${source.url}`, "cyan");
            const pluginDir = path.join(getProjectRoot(), source.url);
            const pluginJsonPath = path.join(pluginDir, ".claude-plugin", "plugin.json");

            if (!fs.existsSync(pluginJsonPath)) {
              addLog(`  未找到 ${pluginJsonPath}`, "red");
              continue;
            }

            let pluginData: Record<string, unknown>;
            try {
              const raw = JSON.parse(fs.readFileSync(pluginJsonPath, "utf-8"));
              pluginData = {
                name: raw.name,
                description: raw.description,
                version: raw.version,
                author: raw.author,
                source: raw.source,
                category: raw.category,
              };
            } catch {
              addLog(`  plugin.json 解析失败`, "red");
              continue;
            }

            for (const pluginConfig of source.plugins) {
              if (pluginConfig.name !== pluginData.name) {
                addLog(`  跳过 ${pluginConfig.name} (名称不匹配)`, "yellow");
                continue;
              }

              const transformed = transformPlugin(pluginData, source.url, {
                description: pluginConfig.description,
                category: pluginConfig.category,
              });
              allPlugins.push(transformed);
              addLog(`  ✓ ${pluginConfig.name}`, "green");
            }
          } else {
            // Git 仓库：克隆/拉取后读取 marketplace.json
            addLog(`处理源: ${source.url}`, "cyan");

            let repoDir: string;
            try {
              repoDir = await cloneOrPull(source.url);
            } catch (e) {
              addLog(`  克隆失败: ${(e as Error).message}`, "red");
              continue;
            }

            const marketplace = readRepoMarketplace(repoDir);
            if (!marketplace || !Array.isArray(marketplace.plugins)) {
              addLog("  未找到有效的 marketplace.json", "red");
              continue;
            }

            const repoPlugins = marketplace.plugins as Record<string, unknown>[];

            for (const pluginConfig of source.plugins) {
              const original = repoPlugins.find((p) => p.name === pluginConfig.name);
              if (!original) {
                addLog(`  跳过 ${pluginConfig.name} (未在源仓库中找到)`, "yellow");
                continue;
              }

              const transformed = transformPlugin(original, source.url, {
                description: pluginConfig.description,
                category: pluginConfig.category,
              });
              allPlugins.push(transformed);
              addLog(`  ✓ ${pluginConfig.name}`, "green");
            }
          }
        }

        const output = {
          name: config.marketplace.name,
          owner: config.marketplace.owner,
          metadata: {
            ...config.marketplace.metadata,
            version: config.marketplace.metadata.version || "1.0.0",
          },
          plugins: allPlugins,
        };

        const outputPath = getOutputPath();
        fs.mkdirSync(path.dirname(outputPath), { recursive: true });
        fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + "\n", "utf-8");

        setSummary(`共处理 ${sourceCount} 个源，${allPlugins.length} 个插件`);
        setPhase("done");
      } catch (e) {
        addLog(`错误: ${(e as Error).message}`, "red");
        setPhase("error");
      }
    })();
  }, []);

  return (
    <Box flexDirection="column" paddingLeft={2}>
      <Box marginBottom={1}>
        <Text bold color="yellow">  更新插件</Text>
        {phase === "running" && (
          <>
            <Text> </Text>
            <Text color="green"><Spinner type="dots" /></Text>
          </>
        )}
      </Box>

      {logs.map((log, i) => (
        <Text key={i} color={log.color as any}> {log.text}</Text>
      ))}

      {phase === "done" && (
        <Box flexDirection="column" marginTop={1}>
          <Text color="green" bold>  ✓ 生成完成！{summary}</Text>
          <Text dimColor>  输出: .claude-plugin/marketplace.json</Text>
          <Text dimColor>  按 Enter 返回主菜单</Text>
        </Box>
      )}

      {phase === "error" && (
        <Box marginTop={1}>
          <Text dimColor>  按 Enter 返回主菜单</Text>
        </Box>
      )}
    </Box>
  );
}
