import { describe, it, expect } from "vitest";
import { transformPlugin, transformSource } from "./transform.js";

describe("transformSource", () => {
  it("returns repoUrl string for local source (repoUrl starts with ./)", () => {
    const result = transformSource(undefined, "./plugins/pyright");
    expect(result).toBe("./plugins/pyright");
  });

  it("returns repoUrl string for local even when source is a string", () => {
    const result = transformSource("./something", "./plugins/pyright");
    expect(result).toBe("./plugins/pyright");
  });

  it("returns object unchanged when source is an object", () => {
    const obj = { source: "git-subdir", url: "https://x.git", path: "sub" };
    const result = transformSource(obj, "https://x.git");
    expect(result).toEqual(obj);
  });

  it("converts ./path to git-subdir for git repoUrl", () => {
    const result = transformSource("./dart-analyzer", "https://github.com/repo.git");
    expect(result).toEqual({
      source: "git-subdir",
      url: "https://github.com/repo.git",
      path: "dart-analyzer",
    });
  });

  it("converts URL string to url object", () => {
    const result = transformSource("https://github.com/superpowers.git", "https://other.git");
    expect(result).toEqual({
      source: "url",
      url: "https://github.com/superpowers.git",
    });
  });

  it("falls back to repoUrl when source is undefined and repoUrl is not local", () => {
    const result = transformSource(undefined, "https://github.com/repo.git");
    expect(result).toEqual({
      source: "url",
      url: "https://github.com/repo.git",
    });
  });
});

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

  it("transforms local plugin (no source field) with local repoUrl", () => {
    const plugin = {
      name: "pyright",
      version: "1.0.0",
      description: "Original",
      author: { name: "Author" },
    };
    const overrides = { description: "Custom", category: "dev" };

    const result = transformPlugin(plugin, "./plugins/pyright", overrides);

    expect(result.source).toBe("./plugins/pyright");
    expect(result.description).toBe("Custom");
    expect(result.category).toBe("dev");
    expect(result.name).toBe("pyright");
    expect(result.author).toEqual({ name: "Author" });
  });
});
