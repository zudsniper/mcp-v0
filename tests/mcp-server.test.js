import { mcpTest } from 'mcp-jest';
import { mkdirSync, writeFileSync, existsSync, readFileSync, rmSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';

describe('MCP v0 Server Tests', () => {
  let testDir;
  
  beforeAll(() => {
    // Create a temporary test directory
    testDir = join(tmpdir(), 'mcp-v0-test-' + Date.now());
    mkdirSync(testDir, { recursive: true });
  });
  
  afterAll(() => {
    // Cleanup test directory
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  test('should start server and connect successfully', async () => {
    const results = await mcpTest(
      { command: 'node', args: [join(process.cwd(), 'dist/index.js')] },
      {
        connectionTest: true,
        timeout: 10000
      }
    );

    expect(results.connectionTest.passed).toBe(true);
    expect(results.connectionTest.error).toBeUndefined();
  });

  test('should discover all expected tools', async () => {
    const results = await mcpTest(
      { command: 'node', args: [join(process.cwd(), 'dist/index.js')] },
      {
        tools: ['generate-component', 'apply-component', 'list-project-files', 'read-file']
      }
    );

    expect(results.passed).toBe(4);
    expect(results.total).toBe(4);
    expect(results.tools['generate-component'].discovered).toBe(true);
    expect(results.tools['apply-component'].discovered).toBe(true);
    expect(results.tools['list-project-files'].discovered).toBe(true);
    expect(results.tools['read-file'].discovered).toBe(true);
  });

  test('should handle read-file tool correctly', async () => {
    // Create a test file
    const testFile = join(testDir, 'test-read.txt');
    const testContent = 'Hello, MCP Jest testing!';
    writeFileSync(testFile, testContent);

    const results = await mcpTest(
      { command: 'node', args: [join(process.cwd(), 'dist/index.js')] },
      {
        tools: {
          'read-file': {
            args: { filePath: testFile },
            expect: (result) => {
              return result.content && 
                     result.content.length > 0 && 
                     result.content[0].text.includes(testContent);
            }
          }
        }
      }
    );

    expect(results.tools['read-file'].passed).toBe(true);
  });

  test('should handle read-file tool with non-existent file', async () => {
    const nonExistentFile = join(testDir, 'non-existent.txt');

    const results = await mcpTest(
      { command: 'node', args: [join(process.cwd(), 'dist/index.js')] },
      {
        tools: {
          'read-file': {
            args: { filePath: nonExistentFile },
            expect: (result) => {
              return result.content && 
                     result.content.length > 0 && 
                     result.content[0].text.includes('Error reading file');
            }
          }
        }
      }
    );

    expect(results.tools['read-file'].passed).toBe(true);
  });

  test('should list project files correctly', async () => {
    // Create some test files
    const subDir = join(testDir, 'src');
    mkdirSync(subDir, { recursive: true });
    writeFileSync(join(subDir, 'component.tsx'), 'export default function Component() {}');
    writeFileSync(join(testDir, 'package.json'), '{"name": "test"}');

    const results = await mcpTest(
      { command: 'node', args: [join(process.cwd(), 'dist/index.js')] },
      {
        tools: {
          'list-project-files': {
            args: { 
              projectPath: testDir,
              pattern: '*.tsx',
              maxDepth: 2
            },
            expect: (result) => {
              return result.content && 
                     result.content.length > 0 && 
                     result.content[0].text.includes('component.tsx');
            }
          }
        }
      }
    );

    expect(results.tools['list-project-files'].passed).toBe(true);
  });

  describe('apply-component tool file merging strategies', () => {
    test('should apply files with overwrite strategy', async () => {
      const targetPath = join(testDir, 'overwrite-test');
      mkdirSync(targetPath, { recursive: true });
      
      // Create existing file
      const existingFile = join(targetPath, 'existing.tsx');
      writeFileSync(existingFile, 'old content');

      const results = await mcpTest(
        { command: 'node', args: [join(process.cwd(), 'dist/index.js')] },
        {
          tools: {
            'apply-component': {
              args: {
                files: [
                  { name: 'existing.tsx', content: 'new content' },
                  { name: 'new-file.tsx', content: 'brand new content' }
                ],
                targetPath: targetPath,
                mergeStrategy: 'overwrite'
              },
              expect: (result) => {
                // Check if the result indicates successful overwrite
                return result.content && 
                       result.content.length > 0 && 
                       result.content[0].text.includes('Overwrote existing.tsx') &&
                       result.content[0].text.includes('Applied new-file.tsx');
              }
            }
          }
        }
      );

      expect(results.tools['apply-component'].passed).toBe(true);
      
      // Verify files were actually written
      expect(readFileSync(existingFile, 'utf-8')).toBe('new content');
      expect(readFileSync(join(targetPath, 'new-file.tsx'), 'utf-8')).toBe('brand new content');
    });

    test('should apply files with backup strategy', async () => {
      const targetPath = join(testDir, 'backup-test');
      mkdirSync(targetPath, { recursive: true });
      
      // Create existing file
      const existingFile = join(targetPath, 'existing.tsx');
      const originalContent = 'original content';
      writeFileSync(existingFile, originalContent);

      const results = await mcpTest(
        { command: 'node', args: [join(process.cwd(), 'dist/index.js')] },
        {
          tools: {
            'apply-component': {
              args: {
                files: [
                  { name: 'existing.tsx', content: 'updated content' }
                ],
                targetPath: targetPath,
                mergeStrategy: 'backup',
                backupSuffix: '.bak'
              },
              expect: (result) => {
                return result.content && 
                       result.content.length > 0 && 
                       result.content[0].text.includes('Backed up') &&
                       result.content[0].text.includes('Applied existing.tsx');
              }
            }
          }
        }
      );

      expect(results.tools['apply-component'].passed).toBe(true);
      
      // Verify backup was created and original content preserved
      expect(existsSync(join(targetPath, 'existing.tsx.bak'))).toBe(true);
      expect(readFileSync(join(targetPath, 'existing.tsx.bak'), 'utf-8')).toBe(originalContent);
      expect(readFileSync(existingFile, 'utf-8')).toBe('updated content');
    });

    test('should apply files with skip-existing strategy', async () => {
      const targetPath = join(testDir, 'skip-test');
      mkdirSync(targetPath, { recursive: true });
      
      // Create existing file
      const existingFile = join(targetPath, 'existing.tsx');
      const originalContent = 'should not be changed';
      writeFileSync(existingFile, originalContent);

      const results = await mcpTest(
        { command: 'node', args: [join(process.cwd(), 'dist/index.js')] },
        {
          tools: {
            'apply-component': {
              args: {
                files: [
                  { name: 'existing.tsx', content: 'this should be skipped' },
                  { name: 'new-file.tsx', content: 'this should be created' }
                ],
                targetPath: targetPath,
                mergeStrategy: 'skip-existing'
              },
              expect: (result) => {
                return result.content && 
                       result.content.length > 0 && 
                       result.content[0].text.includes('Skipped existing') &&
                       result.content[0].text.includes('Created new-file.tsx');
              }
            }
          }
        }
      );

      expect(results.tools['apply-component'].passed).toBe(true);
      
      // Verify existing file was not changed and new file was created
      expect(readFileSync(existingFile, 'utf-8')).toBe(originalContent);
      expect(readFileSync(join(targetPath, 'new-file.tsx'), 'utf-8')).toBe('this should be created');
    });

    test('should apply files with merge strategy', async () => {
      const targetPath = join(testDir, 'merge-test');
      mkdirSync(targetPath, { recursive: true });
      
      // Create existing file
      const existingFile = join(targetPath, 'existing.tsx');
      const originalContent = 'original content';
      writeFileSync(existingFile, originalContent);

      const results = await mcpTest(
        { command: 'node', args: [join(process.cwd(), 'dist/index.js')] },
        {
          tools: {
            'apply-component': {
              args: {
                files: [
                  { name: 'existing.tsx', content: 'new content to merge' }
                ],
                targetPath: targetPath,
                mergeStrategy: 'merge'
              },
              expect: (result) => {
                return result.content && 
                       result.content.length > 0 && 
                       result.content[0].text.includes('Merged content');
              }
            }
          }
        }
      );

      expect(results.tools['apply-component'].passed).toBe(true);
      
      // Verify content was merged
      const mergedContent = readFileSync(existingFile, 'utf-8');
      expect(mergedContent).toContain(originalContent);
      expect(mergedContent).toContain('new content to merge');
      expect(mergedContent).toContain('Generated by v0.dev');
    });

    test('should apply files with preview strategy', async () => {
      const targetPath = join(testDir, 'preview-test');
      mkdirSync(targetPath, { recursive: true });
      
      // Create existing file
      const existingFile = join(targetPath, 'existing.tsx');
      writeFileSync(existingFile, 'existing content');

      const results = await mcpTest(
        { command: 'node', args: [join(process.cwd(), 'dist/index.js')] },
        {
          tools: {
            'apply-component': {
              args: {
                files: [
                  { name: 'existing.tsx', content: 'preview content' },
                  { name: 'new-file.tsx', content: 'new preview content' }
                ],
                targetPath: targetPath,
                mergeStrategy: 'preview'
              },
              expect: (result) => {
                return result.content && 
                       result.content.length > 0 && 
                       result.content[0].text.includes('Preview') &&
                       result.content[0].text.includes('Exists: Yes') &&
                       result.content[0].text.includes('Exists: No');
              }
            }
          }
        }
      );

      expect(results.tools['apply-component'].passed).toBe(true);
    });
  });

  test('should handle generate-component tool gracefully', async () => {
    // Note: This test might fail if V0_API_KEY is not set, but should handle the error gracefully
    const results = await mcpTest(
      { command: 'node', args: [join(process.cwd(), 'dist/index.js')] },
      {
        tools: {
          'generate-component': {
            args: {
              prompt: 'A simple button component'
            },
            expect: (result) => {
              // Should either succeed with generated files or fail with an error message
              return result.content && 
                     result.content.length > 0 && 
                     (result.content[0].text.includes('Successfully generated') || 
                      result.content[0].text.includes('Error generating'));
            }
          }
        }
      }
    );

    expect(results.tools['generate-component'].passed).toBe(true);
  });
});
