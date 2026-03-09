import React from "react";
import { Box, Text } from "ink";

export function Header() {
  return (
    <Box flexDirection="column">
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {`
   _____ ____ __  __            _        _
  / ____/ ___|  \\/  | __ _ _ __| | _____| |_
 | |   | |   | |\\/| |/ _\` | '__| |/ / _ \\ __|
 | |___| |___| |  | | (_| | |  |   <  __/ |_
  \\_____\\____|_|  |_|\\__,_|_|  |_|\\_\\___|\\__|
`}
        </Text>
      </Box>

      <Box marginBottom={1} flexDirection="column">
        <Text>  Claude Code 插件市场管理工具</Text>
        <Text dimColor>  轻松管理、组合来自社区和团队的 Claude Code 插件</Text>
      </Box>
    </Box>
  );
}
