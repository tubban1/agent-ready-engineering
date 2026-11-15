import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";

const entry=fileURLToPath(new URL("../dist/src/index.js",import.meta.url));
async function withStdioClient(options: ConstructorParameters<typeof Client>[1], fn:(c:Client)=>Promise<void>) {
  const client=new Client({name:"are-stdio-interop",version:"1.0.0"},options);
  const transport=new StdioClientTransport({command:process.execPath,args:[entry]});
  try {await client.connect(transport);await fn(client);}
  finally {await client.close();}
}
test("P0 stdio legacy 2025 client still works",async()=>{
  await withStdioClient(undefined,async client=>{
    assert.equal(client.getProtocolEra(),"legacy");
    const tools=await client.listTools();
    assert.ok(tools.tools.some(x=>x.name==="are_get_check"));
  });
});
test("P0 stdio modern 2026 client negotiates via probe and reads",async()=>{
  await withStdioClient({versionNegotiation:{mode:"auto"}},async client=>{
    assert.equal(client.getProtocolEra(),"modern");
    const tools=await client.listTools();
    assert.ok(tools.tools.some(x=>x.name==="are_get_check"));
  });
});
