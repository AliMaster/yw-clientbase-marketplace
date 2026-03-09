import React, { useState } from "react";
import { Box, Text } from "ink";
import { Header } from "./components/Header.js";
import { Menu, type MenuItem } from "./components/Menu.js";
import { InitFlow } from "./commands/init.js";
import { AddFlow } from "./commands/add.js";
import { GenerateFlow } from "./commands/generate.js";
import { ConfigView } from "./commands/config-view.js";
import { readConfig } from "./utils/config.js";
import { getConfigPath } from "./utils/paths.js";

type View = "menu" | "init" | "edit-config" | "add" | "generate";

export function App() {
  const [view, setView] = useState<View>("menu");
  const config = readConfig(getConfigPath());
  const hasConfig = config !== null;

  const pluginCount = config
    ? config.sources.reduce((n, s) => n + s.plugins.length, 0)
    : 0;

  const menuItems: MenuItem[] = [];

  if (!hasConfig) {
    menuItems.push({
      key: "init",
      label: "创建配置",
      description: "初始化 marketconfig.json",
      icon: "◆",
      color: "green",
    });
  } else {
    menuItems.push({
      key: "edit-config",
      label: "修改我的市场配置",
      description: `编辑我的市场基本信息 (${config!.marketplace.name})`,
      icon: "✎",
      color: "yellow",
    });
    menuItems.push({
      key: "add",
      label: "管理插件",
      description: "查看、添加、编辑或删除插件",
      icon: "+",
      color: "green",
    });
    if (pluginCount > 0) {
      menuItems.push({
        key: "generate",
        label: "更新我的市场插件",
        description: `生成 marketplace.json (${pluginCount} 个插件)`,
        icon: "▶",
        color: "cyan",
      });
    }
  }

  menuItems.push({
    key: "exit",
    label: "退出",
    description: "",
    icon: "✕",
    color: "gray",
  });

  const handleMenuSelect = (key: string) => {
    if (key === "exit") {
      process.exit(0);
    }
    setView(key as View);
  };

  return (
    <Box flexDirection="column">
      <Header />

      {hasConfig && view === "menu" && (
        <Box paddingLeft={2} marginBottom={1} flexDirection="column">
          <Text bold color="yellow">  当前状态</Text>
          <Text>  <Text dimColor>市场名称:</Text> {config!.marketplace.name}</Text>
          <Text>  <Text dimColor>插件数量:</Text> {pluginCount}</Text>
          <Text>  <Text dimColor>插件来源:</Text> {config!.sources.length} 个仓库</Text>
        </Box>
      )}

      {view === "menu" && (
        <Menu items={menuItems} onSelect={handleMenuSelect} />
      )}

      {view === "init" && (
        <InitFlow onDone={() => setView("menu")} />
      )}

      {view === "edit-config" && config && (
        <ConfigView config={config} onDone={() => setView("menu")} />
      )}

      {view === "add" && (
        <AddFlow onDone={() => setView("menu")} />
      )}

      {view === "generate" && (
        <GenerateFlow onDone={() => setView("menu")} />
      )}
    </Box>
  );
}
