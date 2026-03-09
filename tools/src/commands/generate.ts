import { readConfig } from "../utils/config.js";
import { cloneOrPull, readRepoMarketplace } from "../utils/git.js";
import { transformPlugin } from "../utils/transform.js";
import { getConfigPath, getOutputPath } from "../utils/paths.js";
import path from "node:path";
import fs from "node:fs";

export async function generateCommand() {
  const configPath = getConfigPath();
  const config = readConfig(configPath);

  if (!config) {
    console.error("未找到 marketconfig.json，请先运行 ccmarket init");
    process.exit(1);
    return;
  }

  const allPlugins: Record<string, unknown>[] = [];
  let sourceCount = 0;

  for (const source of config.sources) {
    sourceCount++;
    console.log(`处理源: ${source.url}`);

    let repoDir: string;
    try {
      repoDir = await cloneOrPull(source.url);
    } catch (e) {
      console.error(`  克隆/更新失败: ${(e as Error).message}`);
      continue;
    }

    const marketplace = readRepoMarketplace(repoDir);
    if (!marketplace || !Array.isArray(marketplace.plugins)) {
      console.error(`  未找到有效的 marketplace.json`);
      continue;
    }

    const repoPlugins = marketplace.plugins as Record<string, unknown>[];

    for (const pluginConfig of source.plugins) {
      const original = repoPlugins.find(
        (p) => p.name === pluginConfig.name
      );
      if (!original) {
        console.warn(`  插件 ${pluginConfig.name} 未在源仓库中找到，跳过`);
        continue;
      }

      const transformed = transformPlugin(original, source.url, {
        description: pluginConfig.description,
        category: pluginConfig.category,
      });

      allPlugins.push(transformed);
      console.log(`  添加插件: ${pluginConfig.name}`);
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

  console.log(
    `\n生成完成！共处理 ${sourceCount} 个源，${allPlugins.length} 个插件`
  );
  console.log(`输出: ${outputPath}`);
}
