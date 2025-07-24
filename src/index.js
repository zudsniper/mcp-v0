"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const v0_sdk_1 = require("v0-sdk");
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
dotenv_1.default.config(); // Load environment variables from .env file
const app = (0, express_1.default)();
const port = process.env.PORT || 3000;
app.use(express_1.default.json()); // Enable JSON body parsing
// Endpoint to generate components
app.post('/generate-component', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const { prompt } = req.body;
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }
    try {
        const chat = yield v0_sdk_1.v0.chats.create({ message: prompt,
        });
        if (chat.files && chat.files.length > 0) {
            res.json({ success: true, files: chat.files });
        }
        else {
            res.json({ success: true, message: 'No files generated.', files: [] });
        }
    }
    catch (error) {
        console.error('Error generating component:', error);
        res.status(500).json({ error: error.message || 'Failed to generate component' });
    }
}));
app.get('/', (req, res) => {
    res.send('MCP v0 server is running!');
});
app.listen(port, () => {
    console.log(`MCP v0 server listening at http://localhost:${port}`);
});
// Endpoint to apply generated code to a Next.js project
app.post("/apply-component", (req, res) => __awaiter(void 0, void 0, void 0, function* () {
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
        yield promises_1.default.mkdir(saveDir, { recursive: true });
        for (const file of files) {
            const filePath = path_1.default.join(saveDir, file.name);
            yield promises_1.default.writeFile(filePath, file.content);
            console.log(`Saved ${file.name} to ${filePath}`);
        }
        res.json({
            success: true,
            message: `Generated files saved to ${saveDir}. Manual integration required for now.`,
            savedPath: saveDir,
        });
    }
    catch (error) {
        console.error("Error applying component:", error);
        res.status(500).json({ error: error.message || "Failed to apply component" });
    }
}));
