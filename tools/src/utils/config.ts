import fs from "node:fs";

export interface PluginEntry {
  name: string;
  description: string;
  category: string;
}

export interface SourceEntry {
  url: string;
  plugins: PluginEntry[];
}

export interface CategoryEntry {
  name: string;
  description: string;
}

export interface SourcesConfig {
  marketplace: {
    name: string;
    owner: { name: string; email: string };
    metadata: { description: string; version: string };
  };
  sources: SourceEntry[];
  categories: CategoryEntry[];
}

export function readConfig(configPath: string): SourcesConfig | null {
  if (!fs.existsSync(configPath)) return null;
  const raw = fs.readFileSync(configPath, "utf-8");
  const data = JSON.parse(raw);
  if (!data.marketplace || !Array.isArray(data.sources)) {
    throw new Error("Invalid marketconfig.json format");
  }
  return data as SourcesConfig;
}

export function writeConfig(
  configPath: string,
  config: SourcesConfig
): void {
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n", "utf-8");
}
