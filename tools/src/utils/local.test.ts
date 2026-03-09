import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { scanLocalPlugins } from "./local.js";

describe("scanLocalPlugins", () => {
  let tmpDir: string;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "local-plugins-test-"));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("returns empty array when no plugins found", () => {
    fs.mkdirSync(path.join(tmpDir, "empty-dir"));
    const result = scanLocalPlugins(tmpDir);
    expect(result).toEqual([]);
  });

  it("returns empty array when rootDir does not exist", () => {
    const result = scanLocalPlugins(path.join(tmpDir, "nonexistent"));
    expect(result).toEqual([]);
  });

  it("finds a plugin in a first-level subdirectory", () => {
    const pluginDir = path.join(tmpDir, "my-plugin", ".claude-plugin");
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, "plugin.json"),
      JSON.stringify({ name: "my-plugin", version: "1.0.0", description: "A test plugin" })
    );

    const result = scanLocalPlugins(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "my-plugin",
      version: "1.0.0",
      description: "A test plugin",
      path: "./my-plugin",
    });
  });

  it("finds a plugin in a second-level subdirectory (e.g. plugins/pyright)", () => {
    const pluginDir = path.join(tmpDir, "plugins", "pyright", ".claude-plugin");
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, "plugin.json"),
      JSON.stringify({ name: "pyright", version: "2.0.0", description: "Pyright LSP" })
    );

    const result = scanLocalPlugins(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      name: "pyright",
      version: "2.0.0",
      description: "Pyright LSP",
      path: "./plugins/pyright",
    });
  });

  it("finds plugins at both levels simultaneously", () => {
    // First level
    const dir1 = path.join(tmpDir, "top-plugin", ".claude-plugin");
    fs.mkdirSync(dir1, { recursive: true });
    fs.writeFileSync(
      path.join(dir1, "plugin.json"),
      JSON.stringify({ name: "top-plugin", version: "1.0.0" })
    );

    // Second level
    const dir2 = path.join(tmpDir, "plugins", "nested", ".claude-plugin");
    fs.mkdirSync(dir2, { recursive: true });
    fs.writeFileSync(
      path.join(dir2, "plugin.json"),
      JSON.stringify({ name: "nested", version: "3.0.0" })
    );

    const result = scanLocalPlugins(tmpDir);

    expect(result).toHaveLength(2);
    const names = result.map((r) => r.name);
    expect(names).toContain("top-plugin");
    expect(names).toContain("nested");
  });

  it("skips directories starting with a dot", () => {
    const pluginDir = path.join(tmpDir, ".hidden", ".claude-plugin");
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, "plugin.json"),
      JSON.stringify({ name: "hidden-plugin" })
    );

    const result = scanLocalPlugins(tmpDir);
    expect(result).toEqual([]);
  });

  it("skips directories without plugin.json", () => {
    fs.mkdirSync(path.join(tmpDir, "no-plugin", ".claude-plugin"), { recursive: true });
    // no plugin.json inside
    const result = scanLocalPlugins(tmpDir);
    expect(result).toEqual([]);
  });

  it("uses directory name as fallback when plugin.json has no name", () => {
    const pluginDir = path.join(tmpDir, "fallback-name", ".claude-plugin");
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(
      path.join(pluginDir, "plugin.json"),
      JSON.stringify({ version: "1.0.0", description: "No name field" })
    );

    const result = scanLocalPlugins(tmpDir);

    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("fallback-name");
  });

  it("skips plugin.json that cannot be parsed as JSON", () => {
    const pluginDir = path.join(tmpDir, "bad-json", ".claude-plugin");
    fs.mkdirSync(pluginDir, { recursive: true });
    fs.writeFileSync(path.join(pluginDir, "plugin.json"), "not valid json {{{");

    const result = scanLocalPlugins(tmpDir);
    expect(result).toEqual([]);
  });
});
