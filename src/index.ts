import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerV0Tools } from "./mcp/index.js";

async function main() {
  const server = new McpServer({
    name: "v0-dev-mcp-server",
    version: "1.0.0",
  });

  registerV0Tools(server);

  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("v0.dev MCP server running on stdio");
}

main().catch(console.error);


