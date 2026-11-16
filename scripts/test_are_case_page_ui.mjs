// Dependency-free browser DOM smoke for the public ARE case report.
import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";

const filename = process.argv[2];
if (!filename) throw new Error("Provide case HTML path");
const html = fs.readFileSync(filename, "utf8");
const data = html.match(/<script type="application\/json" id="evidence">([\s\S]*?)<\/script>/);
const source = html.match(/<script>\s*([\s\S]*?)<\/script>/);
assert.ok(data, "Missing embedded evidence");
assert.ok(source, "Missing interactive JS");
const idList = [...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]);
const elements = new Map();
for (const id of idList) {
  elements.set(id, {
    textContent: "",
    innerHTML: "",
    value: "",
    addEventListener() {},
    appendChild(child) { (this.children ||= []).push(child); },
    select() {},
  });
}
elements.get("evidence").textContent = data[1];
const doc = {
  documentElement: { lang: "en" },
  getElementById(id) {
    if (!elements.has(id)) throw new Error("Missing DOM id during render: " + id);
    return elements.get(id);
  },
  createElement() { return { textContent: "", value: "" }; },
};
const context = { document: doc, navigator: { clipboard: { writeText: async () => {} } }, console };
vm.runInNewContext(source[1], context, { timeout: 4000 });
assert.ok(elements.get("checksBody").innerHTML.includes("L1-V1"), "The 39-check table did not render");
assert.ok(elements.get("checksBody").innerHTML.includes("L4-R4"), "The last 39-check row did not render");
assert.ok(elements.get("oracleRows").innerHTML.includes("xray_flare_classes"), "NOAA comparison did not render");
assert.ok(elements.get("toolInventory").innerHTML.includes("get_current_kp"), "Tool evidence did not render");
assert.equal(elements.get("resultCount").textContent, "39 / 39");
assert.ok(elements.get("prompt").value.includes("Allowed public tools ONLY"));
console.log("CASE_UI_RENDER_PASS, checks=39, tools=4, oracle=3, no missing DOM IDs");
