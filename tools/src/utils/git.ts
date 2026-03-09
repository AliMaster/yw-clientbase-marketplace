import simpleGit from "simple-git";
import fs from "node:fs";
import path from "node:path";

const BUILD_DIR = path.resolve(process.cwd(), "build", "repos");

export function getRepoDir(repoUrl: string): string {
  const repoName = repoUrl
    .replace(/\.git$/, "")
    .split("/")
    .pop()!;
  return path.join(BUILD_DIR, repoName);
}

export async function cloneOrPull(repoUrl: string): Promise<string> {
  const repoDir = getRepoDir(repoUrl);

  if (fs.existsSync(path.join(repoDir, ".git"))) {
    const git = simpleGit(repoDir);
    await git.pull();
    return repoDir;
  }

  fs.mkdirSync(BUILD_DIR, { recursive: true });
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
  return JSON.parse(raw);
}
