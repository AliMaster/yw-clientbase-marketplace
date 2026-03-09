# 推荐必装插件功能设计

## 概述

在分组(category)级别维护推荐必装插件列表，编辑插件时可标记/取消必装，管理列表中可筛选仅显示必装插件。

## 数据模型

CategoryEntry 新增 recommendPlugins 字段：

```ts
export interface CategoryEntry {
  name: string;
  recommendPlugins?: string[]; // 该分组下必装插件名称
}
```

marketconfig.json 示例：
```json
"categories": [
  { "name": "workflow", "recommendPlugins": ["superpowers"] },
  { "name": "flutter", "recommendPlugins": ["dart-analyzer"] }
]
```

## 修改文件

### 1. config.ts
- CategoryEntry 增加 recommendPlugins?: string[]

### 2. PluginEditor
- 新增第三个字段"推荐必装"，Enter 切换 是/否
- onSave 签名增加 recommended: boolean 参数

### 3. add.tsx - handleSave
- 根据 recommended 参数，更新对应 category 的 recommendPlugins 数组
- recommended=true: 添加插件名到数组
- recommended=false: 从数组中移除

### 4. add.tsx - handleDelete
- 删除插件时，遍历 categories，从所有 recommendPlugins 中移除该插件名

### 5. add.tsx - ManageView
- 插件名前加 ★ 标记（如果在对应 category 的 recommendPlugins 中）
- Tab 键切换"仅显示必装"筛选
- 筛选与分组 tab 叠加生效

### 6. generate 不涉及
- marketplace.json 不写入 recommended 信息
