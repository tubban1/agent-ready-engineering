// Stateless Streamable HTTP entry: read-only knowledge plus opt-in benchmark submission.
// No workspace is ever attached here: client deliverables are checked only by the local stdio server.
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./server.js";

export async function handleMcpRequest(req: Request): Promise<Response> {
  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({ sessionIdGenerator: undefined, enableJsonResponse: true });
  await server.connect(transport);
  try {
    return await transport.handleRequest(req);
  } finally {
    // JSON responses are complete once returned; release per-request state.
    void transport.close();
    void server.close();
  }
}
