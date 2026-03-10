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
        <Text dimColor>  轻松定制适合属于自己的 Claude Code 插件市场</Text>
      </Box>
    </Box>
  );
}
