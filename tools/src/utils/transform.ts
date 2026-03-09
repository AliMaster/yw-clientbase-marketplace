/** 插件描述和分类的覆盖信息，由用户在编辑插件时填写 */
export interface PluginOverrides {
  description: string;
  category: string;
}

/**
 * 将插件的 source 字段转换为最终输出格式。
 *
 * 处理三种情况：
 * - 本地路径（repoUrl 以 "./" 开头）：直接返回 repoUrl 字符串，如 "./plugins/pyright"
 * - git 子目录（source 以 "./" 开头）：返回 { source: "git-subdir", url, path }
 * - URL 字符串：返回 { source: "url", url }
 * - 对象类型：原样返回
 */
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

/**
 * 将原始插件数据与用户覆盖信息合并，生成最终的 marketplace 插件条目。
 * source 字段通过 transformSource 转换，description/category 使用用户覆盖值。
 */
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
