export interface PluginOverrides {
  description: string;
  category: string;
}

export function transformSource(
  source: string | Record<string, unknown> | undefined,
  repoUrl: string
): string | Record<string, unknown> {
  if (typeof source === "object" && source !== null) return source;
  // 本地路径：source 直接存为 "./xxx" 字符串
  if (repoUrl.startsWith("./")) {
    return repoUrl;
  }
  if (typeof source === "string") {
    if (source.startsWith("./")) {
      return {
        source: "git-subdir",
        url: repoUrl,
        path: source.slice(2),
      };
    }
    return { source: "url", url: source };
  }
  return { source: "url", url: repoUrl };
}

export function transformPlugin(
  plugin: Record<string, unknown>,
  repoUrl: string,
  overrides: PluginOverrides
): Record<string, unknown> {
  return {
    ...plugin,
    source: transformSource(
      plugin.source as string | Record<string, unknown> | undefined,
      repoUrl
    ),
    description: overrides.description,
    category: overrides.category,
  };
}
