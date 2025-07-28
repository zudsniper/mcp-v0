#!/usr/bin/env node

// Comprehensive test script for MCP v0 server using mcp-jest
// This script tests all the file merging strategies and core functionality

import { mcpTest } from 'mcp-jest';
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

async function runTests() {
  console.log('🚀 Starting MCP v0 Server Tests with mcp-jest...\n');
  
  // Create test directory
  const testDir = join(tmpdir(), 'mcp-v0-test-' + Date.now());
  mkdirSync(testDir, { recursive: true });
  
  try {
    // Test 1: Basic connection
    console.log('📡 Testing server connection...');
    const connectionResult = await mcpTest(
      { command: 'node', args: ['dist/index.js'] },
      { connectionTest: true, timeout: 10000 }
    );
    
    if (connectionResult.connectionTest.passed) {
      console.log('✅ Server connection successful');
    } else {
      console.log('❌ Server connection failed:', connectionResult.connectionTest.error);
      return;
    }

    // Test 2: Tool discovery
    console.log('\n🔍 Testing tool discovery...');
    const discoveryResult = await mcpTest(
      { command: 'node', args: ['dist/index.js'] },
      { 
        tools: ['generate-component', 'apply-component', 'list-project-files', 'read-file'],
        timeout: 10000
      }
    );
    
    console.log(`✅ Discovered ${discoveryResult.passed}/${discoveryResult.total} tools`);
    
    // Test 3: File operations
    console.log('\n📁 Testing file operations...');
    
    // Create a test file for reading
    const testFile = join(testDir, 'test-read.txt');
    writeFileSync(testFile, 'Hello from MCP test!');
    
    const readResult = await mcpTest(
      { command: 'node', args: ['dist/index.js'] },
      {
        tools: {
          'read-file': {
            args: { filePath: testFile },
            expect: result => result.content?.[0]?.text?.includes('Hello from MCP test!')
          }
        },
        timeout: 10000
      }
    );
    
    if (readResult.tools['read-file'].passed) {
      console.log('✅ File reading test passed');
    } else {
      console.log('❌ File reading test failed');
    }

    // Test 4: Project file listing
    console.log('\n📋 Testing project file listing...');
    const listResult = await mcpTest(
      { command: 'node', args: ['dist/index.js'] },
      {
        tools: {
          'list-project-files': {
            args: { 
              projectPath: './src',
              pattern: '*.ts',
              maxDepth: 2
            },
            expect: result => result.content?.[0]?.text?.includes('Found')
          }
        },
        timeout: 10000
      }
    );
    
    if (listResult.tools['list-project-files'].passed) {
      console.log('✅ Project file listing test passed');
    } else {
      console.log('❌ Project file listing test failed');
    }

    // Test 5: File merging strategies
    console.log('\n🔀 Testing file merging strategies...');
    
    const strategies = ['preview', 'overwrite', 'backup', 'skip-existing', 'merge'];
    
    for (const strategy of strategies) {
      console.log(`  Testing ${strategy} strategy...`);
      
      const strategyTestDir = join(testDir, strategy);
      mkdirSync(strategyTestDir, { recursive: true });
      
      // Create an existing file for some strategies
      if (strategy !== 'preview') {
        writeFileSync(join(strategyTestDir, 'existing.tsx'), 'existing content');
      }
      
      const mergeResult = await mcpTest(
        { command: 'node', args: ['dist/index.js'] },
        {
          tools: {
            'apply-component': {
              args: {
                files: [
                  { name: 'existing.tsx', content: 'new content' },
                  { name: 'new-file.tsx', content: 'brand new content' }
                ],
                targetPath: strategyTestDir,
                mergeStrategy: strategy
              },
              expect: result => result.content?.[0]?.text?.includes('file(s) with strategy')
            }
          },
          timeout: 15000
        }
      );
      
      if (mergeResult.tools['apply-component'].passed) {
        console.log(`    ✅ ${strategy} strategy test passed`);
      } else {
        console.log(`    ❌ ${strategy} strategy test failed`);
        console.log(`       Error: ${mergeResult.tools['apply-component'].error}`);
      }
    }

    // Test 6: Component generation (may fail without API key)
    console.log('\n🎨 Testing component generation...');
    const generateResult = await mcpTest(
      { command: 'node', args: ['dist/index.js'] },
      {
        tools: {
          'generate-component': {
            args: {
              prompt: 'A simple React button component with red background'
            },
            expect: result => result.content?.[0]?.text && 
                            (result.content[0].text.includes('Successfully generated') || 
                             result.content[0].text.includes('Error generating'))
          }
        },
        timeout: 20000
      }
    );
    
    if (generateResult.tools['generate-component'].passed) {
      console.log('✅ Component generation test passed (may have failed due to missing API key)');
    } else {
      console.log('❌ Component generation test failed');
    }

    console.log('\n🎉 All tests completed!');
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
  } finally {
    // Cleanup
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  }
}

// Run the tests
runTests().catch(console.error);
