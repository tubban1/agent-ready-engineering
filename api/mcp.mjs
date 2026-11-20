// Vercel Function: public ARE MCP transport (knowledge, opt-in benchmark and scoped private Task Token submissions).
// The workspace checks are deliberately not exposed here; run the local stdio server for those.
import { handleMcpRequest } from "../mcp/dist/src/http.js";

export const GET = handleMcpRequest;
export const POST = handleMcpRequest;
export const DELETE = handleMcpRequest;
