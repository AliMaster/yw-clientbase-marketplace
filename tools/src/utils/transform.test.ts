import { describe, it, expect } from "vitest";
import { transformPlugin } from "./transform.js";

describe("transformPlugin", () => {
  const repoUrl = "https://github.com/boostvolt/claude-code-lsps.git";

  it("converts ./path source to git-subdir object", () => {
    const plugin = {
      name: "dart-analyzer",
      version: "1.0.0",
      source: "./dart-analyzer",
      description: "Original desc",
      category: "original",
      tags: ["dart"],
      author: { name: "Jan" },
    };
    const overrides = { description: "Custom desc", category: "development" };

    const result = transformPlugin(plugin, repoUrl, overrides);

    expect(result.source).toEqual({
      source: "git-subdir",
      url: repoUrl,
      path: "dart-analyzer",
    });
    expect(result.description).toBe("Custom desc");
    expect(result.category).toBe("development");
    expect(result.tags).toEqual(["dart"]);
    expect(result.author).toEqual({ name: "Jan" });
  });

  it("converts URL string source to url object", () => {
    const plugin = {
      name: "superpowers",
      source: "https://github.com/obra/superpowers.git",
      description: "Skills",
      version: "4.0.0",
    };
    const overrides = { description: "Custom", category: "tools" };

    const result = transformPlugin(plugin, repoUrl, overrides);

    expect(result.source).toEqual({
      source: "url",
      url: "https://github.com/obra/superpowers.git",
    });
  });

  it("keeps object source unchanged", () => {
    const sourceObj = {
      source: "git-subdir",
      url: "https://example.com/repo.git",
      path: "sub",
    };
    const plugin = {
      name: "test",
      source: sourceObj,
      description: "d",
      version: "1.0.0",
    };
    const overrides = { description: "new", category: "c" };

    const result = transformPlugin(plugin, repoUrl, overrides);

    expect(result.source).toEqual(sourceObj);
  });

  it("does not modify fields other than source/description/category", () => {
    const plugin = {
      name: "test",
      version: "2.0.0",
      source: "./test",
      description: "old",
      tags: ["a", "b"],
      strict: true,
    };
    const overrides = { description: "new", category: "cat" };

    const result = transformPlugin(plugin, repoUrl, overrides);

    expect(result.name).toBe("test");
    expect(result.version).toBe("2.0.0");
    expect(result.tags).toEqual(["a", "b"]);
    expect(result.strict).toBe(true);
  });
});
