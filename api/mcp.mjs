// Vercel Function: public ARE MCP endpoint (read-only knowledge, explicit opt-in benchmark submission).
// The workspace checks are deliberately not exposed here; run the local stdio server for those.
import { handleMcpRequest } from "../mcp/dist/src/http.js";

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;
