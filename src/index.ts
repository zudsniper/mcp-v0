#!/usr/bin/env node

import dotenv from "dotenv";
dotenv.config();

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { createClient } from "v0-sdk";

// Create v0 client
const v0 = createClient({
  apiKey: process.env.V0_API_KEY,
});

// Create MCP server
const server = new Server(
  {
    name: "mcp-v0",
    version: "2.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// Helper: normalize icon placeholders by inserting a glaring TODO marker
function withIconTodos(text: string): string {
  // If custom iconography is detected or referenced, add a visible placeholder.
  // We can't reliably parse SVGs here, so we provide a consistent placeholder note for downstream application.
  const siren = "🚨🚨🚨";
  const todoHeader = `// TODO: add custom icon here (describe shape, purpose, and size)`;
  const placeholder = `${siren} ICON_PLACEHOLDER ${siren}`;

  // Insert the TODO above any likely icon tag occurrences or return text unchanged if no icon patterns found.
  // This is a naive pass; consumers can further post-process per file.
  return text
    .replace(
      /<svg[\s\S]*?<\/svg>/g,
      (match) => `${todoHeader}\n${placeholder}\n${match}`,
    )
    .replace(
      /<img[^>]*icon[^>]*>/gi,
      (match) => `${todoHeader}\n${placeholder}\n${match}`,
    )
    .replace(
      /Icon\([^)]+\)/g,
      (match) => `${todoHeader}\n${placeholder}\n${match}`,
    );
}

// Define tool handlers
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  if (name === "generate_components") {
    // Balanced, generation-only: no diff/merge. Encourage long prompts.
    type GenerateComponentsArgs = {
      prompt: string;
      stack?: {
        framework?:
          | "nextjs"
          | "react"
          | "sveltekit"
          | "vue"
          | "nuxt"
          | "astro"
          | "remix"
          | "other";
        language?: "ts" | "js";
        ui_library?:
          | "tailwind"
          | "shadcn"
          | "mui"
          | "chakra"
          | "antd"
          | "radix"
          | "none"
          | "other";
      };
      project_conventions?: {
        routing?:
          | "next-app"
          | "next-pages"
          | "react-router"
          | "file-based"
          | "none"
          | "other";
        styling?:
          | "tailwind"
          | "css-modules"
          | "scss"
          | "vanilla-extract"
          | "styled-components"
          | "emotion"
          | "inline"
          | "other";
        state_mgmt?:
          | "none"
          | "context"
          | "redux"
          | "zustand"
          | "jotai"
          | "other";
        testing?:
          | "none"
          | "vitest"
          | "jest"
          | "rtl"
          | "cypress"
          | "playwright"
          | "other";
      };
      files?: {
        return_format?: "json-manifest" | "tar" | "zip" | "raw";
        path_conventions?: string[];
        naming_conventions?: string[];
      };
      style_guide?: {
        colors?: Record<string, string>;
        spacing_scale?: number[];
        radii?: number[];
        typography?: {
          font_families?: string[];
          text_styles?: Array<{
            name: string;
            fontFamily: string;
            weight: number;
            size: number;
            lineHeight?: number;
            letterSpacing?: number;
            align?: "LEFT" | "RIGHT" | "CENTER";
          }>;
        };
        effects?: Array<{
          name: string;
          type: "shadow" | "backdrop-blur";
          params: Record<string, number | string>;
        }>;
      };
      data_contracts?: {
        api_schema?: string | object;
        models?: Array<{ name: string; shape: object }>;
        mock_data?: boolean;
      };
      accessibility?: {
        requires_aria?: boolean;
        color_contrast_target?: "AA" | "AAA";
        keyboard_nav?: boolean;
      };
      i18n?: {
        enabled?: boolean;
        default_locale?: string;
        locales?: string[];
      };
      examples_and_context?: {
        code_examples?: string[];
        do_not_generate?: string[];
        existing_components_to_match?: string[];
      };
      acceptance_criteria?: string[];
      output_preferences?: {
        include_tests?: boolean;
        include_storybook?: boolean;
        comments_style?: "none" | "minimal" | "rich";
      };
    };

    const { prompt, files, ...rest } = (args || {}) as GenerateComponentsArgs;

    if (!prompt || typeof prompt !== "string") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Missing required string parameter: prompt",
          },
        ],
        isError: true,
      };
    }

    // Construct a high-signal message to v0. Emphasize long prompt and constraints.
    const message = JSON.stringify(
      {
        instruction:
          "Generate one or more components and related files. Do not perform diffs or merges; generation only.",
        guidance:
          "The input prompt is intentionally long and detailed; adhere strictly. Prefer returning a JSON manifest of files.",
        placeholders:
          "Wherever custom iconography is implied, insert a glaring placeholder and a TODO comment above it.",
        runtime: {
          default_model: process.env.V0_MODEL || "v0-1.5-md",
        },
        prompt,
        context: { ...rest },
        output: {
          return_format: files?.return_format || "json-manifest",
          path_conventions: files?.path_conventions,
          naming_conventions: files?.naming_conventions,
        },
      },
      null,
      2,
    );

    try {
      const result = await v0.chats.create({
        message,
        responseMode: "sync",
      });

      // Prefer a JSON manifest of files: [{ path, contents }]
      const filesOut =
        (result.latestVersion?.files as
          | Array<{ path?: string; content?: string }>
          | undefined) || [];

      if (files?.return_format === "raw") {
        const raw = filesOut
          .map(
            (f, i) =>
              `// File ${i + 1}: ${f.path || "unknown"}\n${f.content || ""}`,
          )
          .join("\n\n");
        return {
          content: [{ type: "text" as const, text: withIconTodos(raw) }],
        };
      }

      // Normalize into a JSON manifest suitable for MCP consumers
      const manifest = filesOut.map((f) => ({
        path: f.path || "unknown",
        contents: withIconTodos(f.content || ""),
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ files: manifest }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error generating components: ${error instanceof Error ? error.message : String(error)}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === "generate_component_with_figma_data") {
    // Adds curated Figma data to guide generation
    type GenerateWithFigmaArgs = {
      prompt: string;
      target_frames: Array<{ figma_node_id: string; name?: string }>;
      figma: {
        document?: {
          file_key: string;
          file_name?: string;
          updated_at?: string;
        };
        selection: {
          nodes: Array<{
            id: string;
            name?: string;
            type?: string;
            size?: { width: number; height: number };
            layout?: {
              mode?: "row" | "column" | "none";
              justifyContent?: string;
              alignItems?: string;
              wrap?: boolean;
              gap?: number;
              padding?: {
                top?: number;
                right?: number;
                bottom?: number;
                left?: number;
              };
              alignSelf?: string;
              sizing?: {
                horizontal?: "fill" | "fixed" | "hug";
                vertical?: "fill" | "fixed" | "hug";
              };
              constraints?: { horizontal?: string; vertical?: string };
            };
            text?: { content?: string; styleId?: string };
            componentRef?: {
              componentId?: string;
              componentSetId?: string;
              variantProps?: Record<string, string>;
            };
            fills?: Array<{
              color?: string;
              type?: "SOLID" | "IMAGE" | "GRADIENT";
              opacity?: number;
              imageRef?: string;
            }>;
            strokes?: Array<{ color?: string; weight?: number }>;
            effects?: Array<{
              type: string;
              params: Record<string, number | string>;
            }>;
            radius?: number | string;
            children?: string[];
          }>;
        };
        tokens?: {
          colors?: Record<string, string>;
          text_styles?: Array<{
            id: string;
            name: string;
            fontFamily: string;
            weight: number;
            size: number;
            lineHeight?: number;
            align?: string;
          }>;
          spacing_scale?: number[];
          radii?: number[];
          effects?: Array<{
            name: string;
            type: "backdrop-blur" | "shadow";
            params: Record<string, number | string>;
          }>;
        };
        components?: {
          instances?: Array<{
            node_id: string;
            name?: string;
            componentId: string;
            componentSetId?: string;
            variantProps?: Record<string, string>;
          }>;
          library?: Array<{
            id: string;
            name: string;
            variants?: Array<{
              id: string;
              name: string;
              properties: Record<string, string>;
            }>;
          }>;
        };
        assets?: {
          images?: Array<{
            node_id: string;
            name?: string;
            imageRef: string;
            format?: "png" | "jpg" | "webp" | "svg";
            cropTransform?: number[][];
            filenameSuffix?: string;
          }>;
          icons?: Array<{ node_id: string; name?: string; svg?: string }>;
        };
        interactions?: {
          notes?: string;
          flows?: Array<{ name: string; startNodeId: string }>;
        };
        mapping_hints?: {
          preferred_ui_library_components?: Record<string, string>;
          atomic_mapping?: Array<{
            figma_node_id: string;
            html_semantics: string;
          }>;
          accessibility_notes?: string[];
        };
      };
      stack?: {
        framework?:
          | "nextjs"
          | "react"
          | "sveltekit"
          | "vue"
          | "nuxt"
          | "astro"
          | "remix"
          | "other";
        language?: "ts" | "js";
        ui_library?:
          | "tailwind"
          | "shadcn"
          | "mui"
          | "chakra"
          | "antd"
          | "radix"
          | "none"
          | "other";
      };
      project_conventions?: {
        routing?:
          | "next-app"
          | "next-pages"
          | "react-router"
          | "file-based"
          | "none"
          | "other";
        styling?:
          | "tailwind"
          | "css-modules"
          | "scss"
          | "vanilla-extract"
          | "styled-components"
          | "emotion"
          | "inline"
          | "other";
        state_mgmt?:
          | "none"
          | "context"
          | "redux"
          | "zustand"
          | "jotai"
          | "other";
        testing?:
          | "none"
          | "vitest"
          | "jest"
          | "rtl"
          | "cypress"
          | "playwright"
          | "other";
      };
      files?: {
        return_format?: "json-manifest" | "tar" | "zip" | "raw";
        path_conventions?: string[];
        naming_conventions?: string[];
      };
      style_guide?: {
        colors?: Record<string, string>;
        spacing_scale?: number[];
        radii?: number[];
        typography?: {
          font_families?: string[];
          text_styles?: Array<{
            name: string;
            fontFamily: string;
            weight: number;
            size: number;
            lineHeight?: number;
            letterSpacing?: number;
            align?: "LEFT" | "RIGHT" | "CENTER";
          }>;
        };
        effects?: Array<{
          name: string;
          type: "shadow" | "backdrop-blur";
          params: Record<string, number | string>;
        }>;
      };
      data_contracts?: {
        api_schema?: string | object;
        models?: Array<{ name: string; shape: object }>;
        mock_data?: boolean;
      };
      accessibility?: {
        requires_aria?: boolean;
        color_contrast_target?: "AA" | "AAA";
        keyboard_nav?: boolean;
      };
      i18n?: {
        enabled?: boolean;
        default_locale?: string;
        locales?: string[];
      };
      examples_and_context?: {
        code_examples?: string[];
        do_not_generate?: string[];
        existing_components_to_match?: string[];
      };
      acceptance_criteria?: string[];
      output_preferences?: {
        include_tests?: boolean;
        include_storybook?: boolean;
        comments_style?: "none" | "minimal" | "rich";
      };
    };

    const { prompt, target_frames, figma, files, ...rest } = (args ||
      {}) as GenerateWithFigmaArgs;

    if (!prompt || typeof prompt !== "string") {
      return {
        content: [
          {
            type: "text" as const,
            text: "Missing required string parameter: prompt",
          },
        ],
        isError: true,
      };
    }
    if (!Array.isArray(target_frames) || target_frames.length === 0) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Missing required parameter: target_frames (non-empty array)",
          },
        ],
        isError: true,
      };
    }
    if (!figma || !figma.selection || !Array.isArray(figma.selection.nodes)) {
      return {
        content: [
          {
            type: "text" as const,
            text: "Missing required parameter: figma.selection.nodes",
          },
        ],
        isError: true,
      };
    }

    const message = JSON.stringify(
      {
        instruction:
          "Generate one or more components and related files using curated Figma data as strong guidance. No diffs or merges.",
        guidance:
          "The prompt is long; follow it strictly. Prefer returning a JSON manifest of files. Respect Figma layout, tokens, components, and variants.",
        placeholders:
          "Where custom icons exist, insert a glaring placeholder and a TODO above it.",
        runtime: {
          default_model: process.env.V0_MODEL || "v0-1.5-md",
        },
        prompt,
        target_frames,
        figma,
        context: { ...rest },
        output: {
          return_format: files?.return_format || "json-manifest",
          path_conventions: files?.path_conventions,
          naming_conventions: files?.naming_conventions,
        },
      },
      null,
      2,
    );

    try {
      const result = await v0.chats.create({
        message,
        responseMode: "sync",
      });

      const filesOut =
        (result.latestVersion?.files as
          | Array<{ path?: string; content?: string }>
          | undefined) || [];

      if (files?.return_format === "raw") {
        const raw = filesOut
          .map(
            (f, i) =>
              `// File ${i + 1}: ${f.path || "unknown"}\n${f.content || ""}`,
          )
          .join("\n\n");
        return {
          content: [{ type: "text" as const, text: withIconTodos(raw) }],
        };
      }

      const manifest = filesOut.map((f) => ({
        path: f.path || "unknown",
        contents: withIconTodos(f.content || ""),
      }));

      return {
        content: [
          {
            type: "text" as const,
            text: JSON.stringify({ files: manifest }, null, 2),
          },
        ],
      };
    } catch (error) {
      return {
        content: [
          {
            type: "text" as const,
            text: `Error generating components (figma): ${error instanceof Error ? error.message : String(error)}`,
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
        name: "generate_components",
        description:
          "Generate one or more components and supporting files from a long, detailed prompt. This tool only generates; it does not apply diffs or merges. Provide exhaustive details: goals, UX flows, stack, conventions, tokens, data contracts, examples, and acceptance criteria. Prefer long prompts for best results.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "A long, exhaustive prompt describing objectives, UX, constraints, and acceptance criteria. Short prompts lead to subpar results.",
            },
            stack: {
              type: "object",
              properties: {
                framework: {
                  type: "string",
                  enum: [
                    "nextjs",
                    "react",
                    "sveltekit",
                    "vue",
                    "nuxt",
                    "astro",
                    "remix",
                    "other",
                  ],
                },
                language: { type: "string", enum: ["ts", "js"] },
                ui_library: {
                  type: "string",
                  enum: [
                    "tailwind",
                    "shadcn",
                    "mui",
                    "chakra",
                    "antd",
                    "radix",
                    "none",
                    "other",
                  ],
                },
              },
            },
            project_conventions: {
              type: "object",
              properties: {
                routing: {
                  type: "string",
                  enum: [
                    "next-app",
                    "next-pages",
                    "react-router",
                    "file-based",
                    "none",
                    "other",
                  ],
                },
                styling: {
                  type: "string",
                  enum: [
                    "tailwind",
                    "css-modules",
                    "scss",
                    "vanilla-extract",
                    "styled-components",
                    "emotion",
                    "inline",
                    "other",
                  ],
                },
                state_mgmt: {
                  type: "string",
                  enum: [
                    "none",
                    "context",
                    "redux",
                    "zustand",
                    "jotai",
                    "other",
                  ],
                },
                testing: {
                  type: "string",
                  enum: [
                    "none",
                    "vitest",
                    "jest",
                    "rtl",
                    "cypress",
                    "playwright",
                    "other",
                  ],
                },
              },
            },
            files: {
              type: "object",
              properties: {
                return_format: {
                  type: "string",
                  enum: ["json-manifest", "tar", "zip", "raw"],
                  default: "json-manifest",
                },
                path_conventions: { type: "array", items: { type: "string" } },
                naming_conventions: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
            style_guide: {
              type: "object",
              properties: {
                colors: { type: "object" },
                spacing_scale: { type: "array", items: { type: "number" } },
                radii: { type: "array", items: { type: "number" } },
                typography: {
                  type: "object",
                  properties: {
                    font_families: { type: "array", items: { type: "string" } },
                    text_styles: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          name: { type: "string" },
                          fontFamily: { type: "string" },
                          weight: { type: "number" },
                          size: { type: "number" },
                          lineHeight: { type: "number" },
                          letterSpacing: { type: "number" },
                          align: {
                            type: "string",
                            enum: ["LEFT", "RIGHT", "CENTER"],
                          },
                        },
                        required: ["name", "fontFamily", "weight", "size"],
                      },
                    },
                  },
                },
                effects: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      type: {
                        type: "string",
                        enum: ["shadow", "backdrop-blur"],
                      },
                      params: { type: "object" },
                    },
                    required: ["name", "type", "params"],
                  },
                },
              },
            },
            data_contracts: {
              type: "object",
              properties: {
                api_schema: {},
                models: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      shape: { type: "object" },
                    },
                    required: ["name", "shape"],
                  },
                },
                mock_data: { type: "boolean" },
              },
            },
            accessibility: {
              type: "object",
              properties: {
                requires_aria: { type: "boolean" },
                color_contrast_target: { type: "string", enum: ["AA", "AAA"] },
                keyboard_nav: { type: "boolean" },
              },
            },
            i18n: {
              type: "object",
              properties: {
                enabled: { type: "boolean" },
                default_locale: { type: "string" },
                locales: { type: "array", items: { type: "string" } },
              },
            },
            examples_and_context: {
              type: "object",
              properties: {
                code_examples: { type: "array", items: { type: "string" } },
                do_not_generate: { type: "array", items: { type: "string" } },
                existing_components_to_match: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
            acceptance_criteria: { type: "array", items: { type: "string" } },
            output_preferences: {
              type: "object",
              properties: {
                include_tests: { type: "boolean" },
                include_storybook: { type: "boolean" },
                comments_style: {
                  type: "string",
                  enum: ["none", "minimal", "rich"],
                },
              },
            },
          },
          required: ["prompt"],
        },
      },
      {
        name: "generate_component_with_figma_data",
        description:
          "Generate one or more components with curated Figma data (selection nodes, variants, tokens, assets). This tool only generates; it does not apply diffs or merges. Provide a long, detailed prompt and select specific frames/components. Pass only relevant Figma subsets. Wherever custom iconography is used, the output will include a glaring placeholder and a TODO comment.",
        inputSchema: {
          type: "object",
          properties: {
            prompt: {
              type: "string",
              description:
                "A long, exhaustive prompt with objectives, UX, constraints, and acceptance criteria. Short prompts lead to subpar results.",
            },
            target_frames: {
              type: "array",
              description:
                "Specific Figma frame/component node IDs to build (e.g., [{ figma_node_id: '16:204', name: 'profile (edit)' }])",
              items: {
                type: "object",
                properties: {
                  figma_node_id: { type: "string" },
                  name: { type: "string" },
                },
                required: ["figma_node_id"],
              },
              minItems: 1,
            },
            figma: {
              type: "object",
              properties: {
                document: {
                  type: "object",
                  properties: {
                    file_key: { type: "string" },
                    file_name: { type: "string" },
                    updated_at: { type: "string" },
                  },
                },
                selection: {
                  type: "object",
                  properties: {
                    nodes: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          id: { type: "string" },
                          name: { type: "string" },
                          type: { type: "string" },
                          size: {
                            type: "object",
                            properties: {
                              width: { type: "number" },
                              height: { type: "number" },
                            },
                          },
                          layout: { type: "object" },
                          text: { type: "object" },
                          componentRef: { type: "object" },
                          fills: { type: "array", items: { type: "object" } },
                          strokes: { type: "array", items: { type: "object" } },
                          effects: { type: "array", items: { type: "object" } },
                          radius: {},
                          children: {
                            type: "array",
                            items: { type: "string" },
                          },
                        },
                        required: ["id"],
                      },
                    },
                  },
                  required: ["nodes"],
                },
                tokens: {
                  type: "object",
                  properties: {
                    colors: { type: "object" },
                    text_styles: { type: "array", items: { type: "object" } },
                    spacing_scale: { type: "array", items: { type: "number" } },
                    radii: { type: "array", items: { type: "number" } },
                    effects: { type: "array", items: { type: "object" } },
                  },
                },
                components: {
                  type: "object",
                  properties: {
                    instances: { type: "array", items: { type: "object" } },
                    library: { type: "array", items: { type: "object" } },
                  },
                },
                assets: {
                  type: "object",
                  properties: {
                    images: { type: "array", items: { type: "object" } },
                    icons: { type: "array", items: { type: "object" } },
                  },
                },
                interactions: {
                  type: "object",
                  properties: {
                    notes: { type: "string" },
                    flows: { type: "array", items: { type: "object" } },
                  },
                },
                mapping_hints: {
                  type: "object",
                  properties: {
                    preferred_ui_library_components: { type: "object" },
                    atomic_mapping: {
                      type: "array",
                      items: { type: "object" },
                    },
                    accessibility_notes: {
                      type: "array",
                      items: { type: "string" },
                    },
                  },
                },
              },
              required: ["selection"],
            },
            stack: { type: "object" },
            project_conventions: { type: "object" },
            files: {
              type: "object",
              properties: {
                return_format: {
                  type: "string",
                  enum: ["json-manifest", "tar", "zip", "raw"],
                  default: "json-manifest",
                },
                path_conventions: { type: "array", items: { type: "string" } },
                naming_conventions: {
                  type: "array",
                  items: { type: "string" },
                },
              },
            },
            style_guide: { type: "object" },
            data_contracts: { type: "object" },
            accessibility: { type: "object" },
            i18n: { type: "object" },
            examples_and_context: { type: "object" },
            acceptance_criteria: { type: "array", items: { type: "string" } },
            output_preferences: { type: "object" },
          },
          required: ["prompt", "target_frames", "figma"],
        },
      },
    ],
  };
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("MCP v0 server (v2) running on stdio");
}

main().catch(console.error);
