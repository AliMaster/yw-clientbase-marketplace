import fs from "node:fs";
import path from "node:path";

export interface LocalPluginInfo {
  name: string;
  version?: string;
  description?: string;
  path: string;
}

/**
 * 扫描 rootDir 下一级子目录，找到包含 .claude-plugin/plugin.json 的目录
 */
export function scanLocalPlugins(rootDir: string): LocalPluginInfo[] {
  const results: LocalPluginInfo[] = [];

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;

    const pluginJsonPath = path.join(
      rootDir,
      entry.name,
      ".claude-plugin",
      "plugin.json"
    );

    if (!fs.existsSync(pluginJsonPath)) continue;

    try {
      const raw = fs.readFileSync(pluginJsonPath, "utf-8");
      const data = JSON.parse(raw) as Record<string, unknown>;
      results.push({
        name: (data.name as string) || entry.name,
        version: data.version as string | undefined,
        description: data.description as string | undefined,
        path: `./${entry.name}`,
      });
    } catch {
      // plugin.json 解析失败，跳过
    }
  }

  return results;
}
