import { test } from "node:test";
import assert from "node:assert/strict";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { handleMcpRequest } from "../src/http.js";

async function withClient(options: ConstructorParameters<typeof Client>[1], fn: (client: Client)=>Promise<void>) {
 const client=new Client({name:"are-p0-interop",version:"1.0.0"}, options);
 const transport=new StreamableHTTPClientTransport(new URL("https://are.fde.fan/mcp"),{
   fetch:(url,init)=>handleMcpRequest(new Request(url,init))
 });
 try {await client.connect(transport);await fn(client);} finally {await client.close();}
}
test("P0 official SDK v2 client legacy mode still uses 2025 handshake",async()=>{
 await withClient(undefined,async client=>{
   assert.equal(client.getProtocolEra(),"legacy");
   const list=await client.listTools();
   assert.ok(list.tools.some(x=>x.name==="are_get_check"));
 });
});
test("P0 official SDK v2 client auto-detects 2026 era and calls a read-only tool",async()=>{
 await withClient({versionNegotiation:{mode:"auto"}},async client=>{
   assert.equal(client.getProtocolEra(),"modern");
   const list=await client.listTools();
   assert.ok(list.tools.some(x=>x.name==="are_get_check"));
   const result=await client.callTool({name:"are_get_check",arguments:{id:"L3-A2"}});
   assert.ok(result.content?.some(x=>x.type==="text"&&x.text.includes("L3-A2")));
 });
});
test("P0 official SDK v2 client modern-pinned mode connects",async()=>{
 await withClient({versionNegotiation:{mode:{pin:"2026-07-28"}}},async client=>{
   assert.equal(client.getProtocolEra(),"modern");
   const list=await client.listTools();
   assert.ok(list.tools.length>=8);
 });
});
