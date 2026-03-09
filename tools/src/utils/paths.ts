import { execSync } from "node:child_process";
import path from "node:path";

let _projectRoot: string | null = null;

export function getProjectRoot(): string {
  if (_projectRoot) return _projectRoot;
  try {
    _projectRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
    }).trim();
    return _projectRoot;
  } catch {
    // fallback: 工具代码在 tools/ 下，根目录是上一级
    _projectRoot = path.resolve(import.meta.dirname, "..", "..", "..");
    return _projectRoot;
  }
}

export function getConfigPath(): string {
  return path.join(getProjectRoot(), "sources.json");
}

export function getBuildDir(): string {
  return path.join(getProjectRoot(), "build", "repos");
}

export function getOutputPath(): string {
  return path.join(getProjectRoot(), ".claude-plugin", "marketplace.json");
}
