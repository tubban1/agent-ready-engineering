// Dual-era MCP Streamable HTTP entry, 2026-07-28 + legacy 2025 clients.
// Official v2 SDK owns server/discover, per-request metadata validation and result codecs.
// Source of truth remains createServer(): no local workspace, task submission requires scoped per-task Token.
import { createMcpHandler, originValidationResponse } from "@modelcontextprotocol/server";
import { createServer } from "./server.js";

const handler = createMcpHandler(() => createServer(), { legacy: "stateless", responseMode: "json" });

export async function handleMcpRequest(request: Request): Promise<Response> {
  // Reject cross-origin browser requests from untrusted origins, per MCP HTTP spec.
  // Requests without an Origin header (e.g. ordinary MCP clients) are permitted.
  const rejected = originValidationResponse(request, ["are.world2.co"]);
  if (rejected) return rejected;
  return handler.fetch(request);
}
