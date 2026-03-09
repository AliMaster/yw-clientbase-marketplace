export interface PluginOverrides {
  description: string;
  category: string;
}

export function transformSource(
  source: string | Record<string, unknown>,
  repoUrl: string
): Record<string, unknown> {
  if (typeof source === "object") return source;
  if (source.startsWith("./")) {
    return {
      source: "git-subdir",
      url: repoUrl,
      path: source.slice(2),
    };
  }
  return { source: "url", url: source };
}

export function transformPlugin(
  plugin: Record<string, unknown>,
  repoUrl: string,
  overrides: PluginOverrides
): Record<string, unknown> {
  return {
    ...plugin,
    source: transformSource(
      plugin.source as string | Record<string, unknown>,
      repoUrl
    ),
    description: overrides.description,
    category: overrides.category,
  };
}
