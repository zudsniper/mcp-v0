# MCP v0.dev Server

This project implements an MCP (Model Context Protocol) server that integrates with the v0.dev API to facilitate delegated component generation for Next.js projects.

## Features

- **Generate Components**: Use the `generate-component` tool to create React/Next.js components by providing a natural language prompt.
- **Apply Components**: Use the `apply-component` tool to apply generated files to your project with various merge strategies to prevent accidental overwrites.
- **List Project Files**: Use the `list-project-files` tool to inspect your project structure.
- **Read File**: Use the `read-file` tool to view the content of specific files.

## Installation

1.  Clone this repository:
    ```bash
    git clone https://github.com/zudsniper/mcp-v0.git
    cd mcp-v0
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Create a `.env` file in the root directory and add your v0.dev API key and desired model:
    ```
    V0_API_KEY=YOUR_V0_API_KEY_HERE
    V0_MODEL=v0-1.5-md
    ```
    Replace `YOUR_V0_API_KEY_HERE` with your actual v0.dev API key.

## Usage

To start the MCP server, run:

```bash
npm run start
```

The server will run and listen for MCP requests via `stdio`.

### MCP Tools

#### `generate-component`

- **Description**: Generate a React/Next.js component using v0.dev API.
- **Input**: 
  - `prompt`: (string) Description of the component to generate.
  - `model`: (string, optional) Model to use (defaults to environment variable `V0_MODEL`).
- **Output**: Returns the generated file contents as text.

#### `apply-component`

- **Description**: Apply generated component files to a project with configurable merge strategy.
- **Input**: 
  - `files`: (array of objects) Each object has `name` (string) and `content` (string) of the file.
  - `targetPath`: (string) Target directory path where files should be applied.
  - `mergeStrategy`: (enum) How to handle existing files. Options: `"overwrite"`, `"backup"`, `"merge"`, `"skip-existing"`, `"preview"`.
  - `backupSuffix`: (string, optional) Suffix for backup files (default: `.backup`).
- **Output**: A summary of the application process.

##### Merge Strategies:

- `overwrite`: Overwrites existing files.
- `backup`: Backs up existing files before overwriting them.
- `merge`: Appends new content to existing files (simple append for now).
- `skip-existing`: Skips applying files if they already exist.
- `preview`: Shows what would happen without actually applying changes.

#### `list-project-files`

- **Description**: List files in a project directory with optional filtering.
- **Input**: 
  - `projectPath`: (string) Path to the project directory.
  - `pattern`: (string, optional) File pattern to match (e.g., `*.tsx`, `*.js`).
  - `maxDepth`: (number, optional) Maximum directory depth to traverse (default: 3).
- **Output**: A list of relative file paths.

#### `read-file`

- **Description**: Read the content of a specific file.
- **Input**: 
  - `filePath`: (string) Path to the file to read.
- **Output**: The content of the file.

## Development

To compile the TypeScript code:

```bash
npm run build
```

## Contributing

Feel free to open issues or pull requests on the GitHub repository.

