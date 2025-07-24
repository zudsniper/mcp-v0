import dotenv from 'dotenv';
dotenv.config(); // Load environment variables from .env file

import { v0 } from 'v0-sdk';
import express from 'express';
import fs from 'fs/promises';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json()); // Enable JSON body parsing

// Endpoint to generate components
app.post('/generate-component', async (req, res) => {
  const { prompt } = req.body;

  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  try {
    const chat = await v0.chats.create({      message: prompt,
    });

    if (chat.files && chat.files.length > 0) {
      res.json({ success: true, files: chat.files });
    } else {
      res.json({ success: true, message: 'No files generated.', files: [] });
    }
  } catch (error: any) {
    console.error('Error generating component:', error);
    res.status(500).json({ error: error.message || 'Failed to generate component' });
  }
});

app.get('/', (req, res) => {
  res.send('MCP v0 server is running!');
});

app.listen(port, () => {
  console.log(`MCP v0 server listening at http://localhost:${port}`);
});





// Endpoint to apply generated code to a Next.js project
app.post("/apply-component", async (req, res) => {
  const { files, targetPath } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: "Files are required" });
  }
  if (!targetPath) {
    return res.status(400).json({ error: "Target path is required" });
  }

  try {
    // TODO: Implement robust file merging logic here to avoid overwriting
    // For now, we'll just save the files to a temporary directory
    // In a real scenario, this would involve:
    // 1. Reading existing files at targetPath
    // 2. Intelligently merging new content (e.g., adding new components, modifying existing ones)
    // 3. Handling potential conflicts
    // 4. Ensuring no existing code is overwritten

    const saveDir = `/tmp/v0-generated-components/${Date.now()}`;
    await fs.mkdir(saveDir, { recursive: true });

    for (const file of files) {
      const filePath = path.join(saveDir, file.name);
      await fs.writeFile(filePath, file.content);
      console.log(`Saved ${file.name} to ${filePath}`);
    }

    res.json({
      success: true,
      message: `Generated files saved to ${saveDir}. Manual integration required for now.`,
      savedPath: saveDir,
    });
  } catch (error: any) {
    console.error("Error applying component:", error);
    res.status(500).json({ error: error.message || "Failed to apply component" });
  }
});


