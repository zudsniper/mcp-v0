// Jest setup file for MCP tests
import { beforeAll, afterAll } from '@jest/globals';

// Increase timeout for MCP tests as they involve starting servers
jest.setTimeout(30000);

// Global setup
beforeAll(async () => {
  console.log('Setting up MCP tests...');
});

afterAll(async () => {
  console.log('Cleaning up MCP tests...');
});
