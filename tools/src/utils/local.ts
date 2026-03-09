import fs from "node:fs";
import path from "node:path";

export interface LocalPluginInfo {
  name: string;
  version?: string;
  description?: string;
  path: string;
}

/**
 * 扫描 rootDir 下最多两级子目录，找到包含 .claude-plugin/plugin.json 的目录。
 * 例如同时能发现 ./pyright 和 ./plugins/pyright。
 */
export function scanLocalPlugins(rootDir: string): LocalPluginInfo[] {
  const results: LocalPluginInfo[] = [];
  const seen = new Set<string>();

  function tryAdd(dirPath: string, relativePath: string) {
    const pluginJsonPath = path.join(dirPath, ".claude-plugin", "plugin.json");
    if (!fs.existsSync(pluginJsonPath)) return;
    if (seen.has(relativePath)) return;
    seen.add(relativePath);

    try {
      const raw = fs.readFileSync(pluginJsonPath, "utf-8");
      const data = JSON.parse(raw) as Record<string, unknown>;
      results.push({
        name: (data.name as string) || path.basename(dirPath),
        version: data.version as string | undefined,
        description: data.description as string | undefined,
        path: relativePath,
      });
    } catch {
      // plugin.json 解析失败，跳过
    }
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(rootDir, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (entry.name.startsWith(".")) continue;

    const childDir = path.join(rootDir, entry.name);

    // 一级：直接检查该子目录
    tryAdd(childDir, `./${entry.name}`);

    // 二级：如果该子目录本身不是插件，扫描它的子目录
    let subEntries: fs.Dirent[];
    try {
      subEntries = fs.readdirSync(childDir, { withFileTypes: true });
    } catch {
      continue;
    }
    for (const sub of subEntries) {
      if (!sub.isDirectory()) continue;
      if (sub.name.startsWith(".")) continue;
      tryAdd(
        path.join(childDir, sub.name),
        `./${entry.name}/${sub.name}`
      );
    }
  }

  return results;
}
