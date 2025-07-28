#!/usr/bin/env node

import { spawn } from 'child_process';
import { writeFileSync, unlinkSync } from 'fs';
import { join } from 'path';

// Simple MCP client to test our server
async function testMCPServer() {
  console.log('🔍 Testing MCP Server Implementation...\n');
  
  const serverProcess = spawn('node', ['dist/index.js'], {
    stdio: ['pipe', 'pipe', 'pipe']
  });
  
  let responseData = '';
  let errorData = '';
  
  serverProcess.stdout.on('data', (data) => {
    responseData += data.toString();
  });
  
  serverProcess.stderr.on('data', (data) => {
    errorData += data.toString();
    console.log('Server stderr:', data.toString());
  });
  
  // Send initialize request
  const initRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: "test-client",
        version: "1.0.0"
      }
    }
  };
  
  console.log('📤 Sending initialize request...');
  serverProcess.stdin.write(JSON.stringify(initRequest) + '\n');
  
  // Wait for response
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Send tools/list request
  const toolsRequest = {
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  };
  
  console.log('📤 Sending tools/list request...');
  serverProcess.stdin.write(JSON.stringify(toolsRequest) + '\n');
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  serverProcess.kill();
  
  console.log('📥 Server Response:');
  console.log(responseData);
  
  if (errorData.includes('MCP server running')) {
    console.log('✅ Server started successfully');
  } else {
    console.log('❌ Server may have issues');
  }
}

testMCPServer().catch(console.error);
