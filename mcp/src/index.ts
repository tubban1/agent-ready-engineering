#!/usr/bin/env node
// Local stdio entry point of the ARE MCP server.
//   are-mcp                       knowledge only
//   are-mcp --workspace <folder>  knowledge + read-only checks of that engagement workspace
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { Workspace } from "./workspace.js";

const args = process.argv.slice(2);
let workspace: Workspace | undefined;
const i = args.indexOf("--workspace");
if (i >= 0) {
  const folder = args[i + 1];
  if (!folder) {
    console.error("are-mcp: --workspace needs a folder path.");
    process.exit(2);
  }
  try {
    workspace = new Workspace(folder);
  } catch (err) {
    console.error(`are-mcp: ${(err as Error).message}`);
    process.exit(2);
  }
}

const server = createServer({ workspace });
await server.connect(new StdioServerTransport());
// stdout carries the MCP protocol; diagnostics go to stderr only.
console.error(`are-mcp: running on stdio (read-only)${workspace ? `, workspace ${workspace.root}` : ", knowledge only"}`);
