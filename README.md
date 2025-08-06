# MCP v0.dev Server (v2)

This project provides an MCP (Model Context Protocol) server that integrates with the v0.dev API for high-quality, generation-only workflows. Version 2 focuses on producing complete component implementations (potentially multiple files) from long, detailed prompts, with an optional Figma-guided path.

Key changes in v2
- New tools:
  - generate_components: Multi-file, generation-only output driven by a long prompt and project conventions.
  - generate_component_with_figma_data: Same as above, but additionally guided by curated Figma data (selection nodes, component variants, tokens, and assets).
- Removed tools:
  - All previous “apply/merge/list/read” utilities and any internal diff/merge logic. This server now focuses on generation only.
- Output format:
  - Defaults to a JSON manifest of files for predictable consumption by clients. Also supports raw/tar/zip based on input preference.
- Icon placeholders:
  - Wherever custom iconography is detected in generated code, the server injects a glaring placeholder and a TODO marker above the location to ensure designers/devs can replace it with the correct asset.

Installation

1) Clone and install
```bash
git clone https://github.com/zudsniper/mcp-v0.git
cd mcp-v0
npm install
```

2) Environment variables
Create a .env file in the repo root and set your v0.dev API key and optional model:
```
V0_API_KEY=YOUR_V0_API_KEY_HERE
V0_MODEL=v0-1.5-md
```

Notes:
- V0_MODEL is optional. If omitted, the server will assume a sensible default (currently v0-1.5-md).
- You can change V0_MODEL to any model your v0.dev account supports.

Usage

Release build note
- Before pushing to your release branch (which triggers npm publish in your pipeline), ensure the build artifacts are generated:
  ```
  npm run build
  ```
  This compiles TypeScript to dist and marks the CLI entry as executable.

Start the server:
```bash
npm run start
```
The server runs over stdio for MCP clients.

Best results require long, exhaustive prompts
For both tools below, always provide detailed prompts covering:
- Objectives and UX flows
- Architectural constraints, libraries, and style constraints
- Data contracts, edge cases, and acceptance criteria
- Examples and anti-goals

MCP Tools

generate_components

Description
Generate one or more components and supporting files from a long, detailed prompt. This tool only generates; it does not apply diffs or merges. Prefer long prompts for superior results.

Input schema (summary)
- prompt: string (required)
- stack?: { framework, language, ui_library }
- project_conventions?: { routing, styling, state_mgmt, testing }
- files?: { return_format: "json-manifest" | "tar" | "zip" | "raw", path_conventions?: string[], naming_conventions?: string[] }
- style_guide?: {
  colors?: Record<string, string>,
  spacing_scale?: number[],
  radii?: number[],
  typography?: { font_families?: string[], text_styles?: Array<{ name, fontFamily, weight, size, lineHeight?, letterSpacing?, align? }> },
  effects?: Array<{ name, type: "shadow" | "backdrop-blur", params: Record<string, number | string> }>
}
- data_contracts?: { api_schema?: string | object, models?: Array<{ name, shape }>, mock_data?: boolean }
- accessibility?: { requires_aria?: boolean, color_contrast_target?: "AA" | "AAA", keyboard_nav?: boolean }
- i18n?: { enabled?: boolean, default_locale?: string, locales?: string[] }
- examples_and_context?: { code_examples?: string[], do_not_generate?: string[], existing_components_to_match?: string[] }
- acceptance_criteria?: string[]
- output_preferences?: { include_tests?: boolean, include_storybook?: boolean, comments_style?: "none" | "minimal" | "rich" }

Output
- Default: JSON manifest: { files: [{ path, contents }, ...] }
- If return_format = "raw": concatenated file outputs
- tar/zip are supported for future extensibility

Custom iconography placeholders
If generated files contain inline SVGs or icon-like references, each occurrence will be preceded by:
// TODO: add custom icon here (describe shape, purpose, and size)
🚨🚨🚨 ICON_PLACEHOLDER 🚨🚨🚨

generate_component_with_figma_data

Description
Generate one or more components guided by curated Figma data (selection nodes, component variants, tokens, assets). This tool only generates; it does not apply diffs or merges. Provide a long, detailed prompt and limit Figma data to relevant frames/components.

Input schema (summary)
- prompt: string (required)
- target_frames: Array<{ figma_node_id: string, name?: string }> (required)
- figma: (required)
  - document?: { file_key: string, file_name?: string, updated_at?: string }
  - selection: {
      nodes: Array<{
        id: string,
        name?: string,
        type?: string,
        size?: { width, height },
        layout?: { mode?, justifyContent?, alignItems?, wrap?, gap?, padding?, alignSelf?, sizing?, constraints? },
        text?: { content?, styleId? },
        componentRef?: { componentId?, componentSetId?, variantProps?: Record<string, string> },
        fills?: Array<{ color?, type?, opacity?, imageRef? }>,
        strokes?: Array<{ color?, weight? }>,
        effects?: Array<{ type, params }>,
        radius?: number | string,
        children?: string[]
      }>
    }
  - tokens?: {
      colors?: Record<string, string>,
      text_styles?: Array<{ id, name, fontFamily, weight, size, lineHeight?, align? }>,
      spacing_scale?: number[],
      radii?: number[],
      effects?: Array<{ name, type: "backdrop-blur" | "shadow", params }>
    }
  - components?: {
      instances?: Array<{ node_id, name?, componentId, componentSetId?, variantProps? }>,
      library?: Array<{ id, name, variants?: Array<{ id, name, properties: Record<string, string> }> }>
    }
  - assets?: {
      images?: Array<{ node_id, name?, imageRef, format?, cropTransform?, filenameSuffix? }>,
      icons?: Array<{ node_id, name?, svg? }>
    }
  - interactions?: { notes?: string, flows?: Array<{ name, startNodeId }> }
  - mapping_hints?: {
      preferred_ui_library_components?: Record<string, string>,
      atomic_mapping?: Array<{ figma_node_id, html_semantics }>,
      accessibility_notes?: string[]
    }
- Plus the same optional fields as generate_components (stack, project_conventions, files, style_guide, data_contracts, accessibility, i18n, examples_and_context, acceptance_criteria, output_preferences)

Output
- Default: JSON manifest: { files: [{ path, contents }, ...] }
- Supports "raw", "tar", "zip" as requested
- Custom icons receive the same TODO + siren placeholder treatment as above

Examples

Example: generate_components (Next.js + Tailwind)
- prompt: “Build a responsive profile edit screen with Avatar upload, inputs for Display Name, Website, Bio, and Username; include Likes/Dislikes chip groups... Include a11y with AA contrast...”
- stack: { framework: "nextjs", language: "ts", ui_library: "tailwind" }
- project_conventions: { routing: "next-app", styling: "tailwind" }
- files: { return_format: "json-manifest", path_conventions: ["src/app", "src/components"], naming_conventions: ["PascalCase components", "kebab-case files"] }
- style_guide: Provide colors/spacing/typography as needed.

Example: generate_component_with_figma_data
- prompt: “Implement ‘profile (edit)’ using the exact layout and tokens from Figma. Respect padding, radii, gaps, typography, and component variants (header mobile=off, tag hover=off inverted=off, etc.).”
- target_frames: [{ figma_node_id: "16:204", name: "profile (edit)" }]
- figma: Provide a curated subset of the Figma selection nodes, components, and tokens relevant to the frame.

Development

Build TypeScript:
```bash
npm run build
```

Version and model configuration
- package.json version: 2.0.0
- Server reports: “MCP v0 server (v2) running on stdio”
- Environment model override: set V0_MODEL in your .env or environment to pick a specific v0.dev model at runtime

Contributing
Open issues or PRs on the repository if you have suggestions for additional schema fields, better icon placeholder detection, or output format improvements.

