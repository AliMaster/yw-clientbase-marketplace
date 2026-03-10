import { execSync } from "node:child_process";
import path from "node:path";

let _projectRoot: string | null = null;

export function getProjectRoot(): string {
  if (_projectRoot) return _projectRoot;
  try {
    _projectRoot = execSync("git rev-parse --show-toplevel", {
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"],
    }).trim();
    return _projectRoot;
  } catch {
    // 不在 git 仓库中时，使用当前工作目录
    _projectRoot = process.cwd();
    return _projectRoot;
  }
}

export function getConfigPath(): string {
  return path.join(getProjectRoot(), "marketplace-config.json");
}

export function getBuildDir(): string {
  return path.join(getProjectRoot(), "build", "repos");
}

export function getOutputPath(): string {
  return path.join(getProjectRoot(), ".claude-plugin", "marketplace.json");
}
