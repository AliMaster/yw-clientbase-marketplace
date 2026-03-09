#!/usr/bin/env npx tsx
import { program } from "commander";
import { initCommand } from "./commands/init.js";
import { addCommand } from "./commands/add.js";
import { generateCommand } from "./commands/generate.js";

program
  .name("ccmarket")
  .description("Claude Code 插件市场管理工具");

program
  .command("init")
  .description("初始化 marketplace 配置")
  .action(initCommand);

program
  .command("add")
  .description("从 Git 仓库添加插件")
  .action(addCommand);

program
  .command("generate")
  .description("根据配置生成 marketplace.json")
  .action(generateCommand);

program.parse();
