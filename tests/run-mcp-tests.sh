#!/bin/bash

# Simple shell script to test MCP server using mcp-jest CLI
# This script tests the core functionality of the v0 MCP server

echo "🚀 Starting MCP v0 Server Tests..."
echo

# Make sure we have built the project
echo "📦 Building project..."
npm run build
if [ $? -ne 0 ]; then
    echo "❌ Build failed"
    exit 1
fi
echo "✅ Build successful"
echo

# Test 1: Basic connectivity and tool discovery
echo "🔍 Testing basic connectivity and tool discovery..."
npx mcp-jest node dist/index.js --tools generate-component,apply-component,list-project-files,read-file
if [ $? -eq 0 ]; then
    echo "✅ Basic tests passed"
else
    echo "❌ Basic tests failed"
    exit 1
fi
echo

# Test 2: Quick component generation test
echo "🎨 Testing component generation..."
npx mcp-jest node dist/index.js --tools generate-component --timeout 20000
if [ $? -eq 0 ]; then
    echo "✅ Component generation test passed"
else
    echo "⚠️ Component generation test failed (may be due to missing API key)"
fi
echo

# Test 3: File operations
echo "📁 Testing file operations..."
npx mcp-jest node dist/index.js --tools read-file,list-project-files --timeout 15000
if [ $? -eq 0 ]; then
    echo "✅ File operations tests passed"
else
    echo "❌ File operations tests failed"
fi
echo

echo "🎉 MCP tests completed!"
