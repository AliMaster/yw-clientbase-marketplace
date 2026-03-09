import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readConfig, writeConfig, type SourcesConfig } from "./config.js";

describe("config", () => {
  let tmpDir: string;
  let configPath: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "marketplace-test-"));
    configPath = path.join(tmpDir, "marketconfig.json");
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("readConfig returns null when file does not exist", () => {
    const result = readConfig(configPath);
    expect(result).toBeNull();
  });

  it("writeConfig creates file and readConfig reads it back", () => {
    const config: SourcesConfig = {
      marketplace: {
        name: "test-marketplace",
        owner: { name: "test", email: "" },
        metadata: { description: "test desc", version: "" },
      },
      sources: [],
      categories: [],
    };
    writeConfig(configPath, config);
    const result = readConfig(configPath);
    expect(result).toEqual(config);
  });

  it("writeConfig preserves existing data on update", () => {
    const config: SourcesConfig = {
      marketplace: {
        name: "test",
        owner: { name: "test", email: "" },
        metadata: { description: "desc", version: "" },
      },
      sources: [
        {
          url: "https://github.com/example/repo.git",
          plugins: [{ name: "plugin-a", description: "A", category: "dev" }],
        },
      ],
      categories: [{ name: "dev", description: "Development" }],
    };
    writeConfig(configPath, config);

    config.sources[0].plugins.push({
      name: "plugin-b",
      description: "B",
      category: "dev",
    });
    writeConfig(configPath, config);

    const result = readConfig(configPath);
    expect(result!.sources[0].plugins).toHaveLength(2);
  });
});
