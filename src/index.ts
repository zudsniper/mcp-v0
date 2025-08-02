#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "v0-sdk";

// Create v0 client
const v0 = createClient({
  apiKey: process.env.V0_API_KEY,
});

// Create MCP server
const server = new Server(
  {
    name: "mcp-v0",
    version: "1.3.1",
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Define the generateComponent tool handler
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  
  if (name === "generateComponent") {
    const { prompt } = args as { prompt: string };
    
    try {
      // Using v0 SDK to generate component
      const result = await v0.chats.create({
        message: prompt,
        responseMode: "sync",
      });
      
      // Extract the code from the result
      const code = result.latestVersion?.files?.[0]?.content || "No code generated";
      
      return {
        content: [
          {
            type: "text" as const,
            text: code,
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error generating component: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }
  
  throw new Error(`Unknown tool: ${name}`);
});

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: "generateComponent",
        description: "Generate a React component using v0",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description: "Description of the component to generate",
            },
          },
          required: ["prompt"],
        },
      },
    ],
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP v0 server running on stdio");
}

main().catch(console.error);


