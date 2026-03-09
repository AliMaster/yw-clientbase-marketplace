import simpleGit from "simple-git";
import fs from "node:fs";
import path from "node:path";
import { getBuildDir } from "./paths.js";

export function getRepoDir(repoUrl: string): string {
  const parts = repoUrl.replace(/\.git$/, "").split("/");
  const repoName = parts.slice(-2).join("_");
  return path.join(getBuildDir(), repoName);
}

export async function cloneOrPull(repoUrl: string): Promise<string> {
  const repoDir = getRepoDir(repoUrl);

  // Always do a fresh shallow clone for simplicity
  if (fs.existsSync(repoDir)) {
    fs.rmSync(repoDir, { recursive: true, force: true });
  }

  fs.mkdirSync(getBuildDir(), { recursive: true });
  const git = simpleGit();
  await git.clone(repoUrl, repoDir, ["--depth", "1"]);
  return repoDir;
}

export function readRepoMarketplace(
  repoDir: string
): Record<string, unknown> | null {
  const marketplacePath = path.join(
    repoDir,
    ".claude-plugin",
    "marketplace.json"
  );
  if (!fs.existsSync(marketplacePath)) return null;
  const raw = fs.readFileSync(marketplacePath, "utf-8");
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
