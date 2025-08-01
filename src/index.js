const dotenv = require("dotenv");
dotenv.config();

const { createServer } = require("@modelcontextprotocol/sdk");
const { V0Client } = require("v0-sdk");

const v0 = new V0Client({
  apiKey: process.env.V0_API_KEY,
  model: process.env.V0_MODEL,
});

const server = createServer({
  tools: {
    generateComponent: async ({ prompt }) => {
      const result = await v0.generate({ prompt });
      return result.code;
    },
  },
});

server.start();


