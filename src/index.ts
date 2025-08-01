import dotenv from 'dotenv';
dotenv.config();

import { createServer } from '@modelcontextprotocol/sdk';
import { V0Client } from 'v0-sdk';

const v0 = new V0Client({
  apiKey: process.env.V0_API_KEY,
  model: process.env.V0_MODEL,
});

const server = createServer({
  tools: {
    generateComponent: async ({ prompt }: { prompt: string }) => {
      const result = await v0.generate({ prompt });
      return result.code;
    },
  },
});

server.start();

