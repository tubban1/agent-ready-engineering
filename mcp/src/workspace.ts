// Read-only access to a local engagement workspace. Every path is resolved to its real
// location and must stay inside the workspace root; nothing is written and file contents
// are treated as data, never as instructions.
import { existsSync, readFileSync, readdirSync, realpathSync, statSync } from "node:fs";
import { basename, isAbsolute, join, relative, resolve, sep } from "node:path";
import { KnowledgeError } from "./knowledge.js";

const ASSESSMENT_FILE = /^ARE-T07-maturity-assessment-(\d{4}-\d{2}-\d{2})\.md$/;

export class Workspace {
  readonly root: string;

  constructor(root: string) {
    if (!existsSync(root) || !statSync(root).isDirectory())
      throw new Error(`Workspace folder not found: ${root}`);
    this.root = realpathSync(root);
  }

  private inside(real: string): boolean {
    return real === this.root || real.startsWith(this.root + sep);
  }

  /** Resolve a user-supplied path (relative to the root, or absolute) to a real path inside the workspace. */
  resolve(userPath: string, kind: "file" | "dir" | "any" = "any"): string {
    const candidate = isAbsolute(userPath) ? userPath : resolve(this.root, userPath);
    if (!existsSync(candidate)) {
      const lexical = resolve(candidate);
      if (!this.inside(lexical))
        throw new KnowledgeError("path_outside_workspace", "Paths must stay inside the workspace given with --workspace.");
      throw new KnowledgeError("not_found", `Nothing at ${this.rel(lexical)}. Paths are relative to the workspace root.`);
    }
    const real = realpathSync(candidate);
    if (!this.inside(real))
      throw new KnowledgeError("path_outside_workspace", "Paths (including symbolic links) must stay inside the workspace given with --workspace.");
    const isDir = statSync(real).isDirectory();
    if (kind === "file" && isDir) throw new KnowledgeError("not_a_file", `${this.rel(real)} is a folder; give a deliverable file.`);
    if (kind === "dir" && !isDir) throw new KnowledgeError("not_a_folder", `${this.rel(real)} is a file; give a scenario folder.`);
    return real;
  }

  rel(real: string): string {
    return relative(this.root, real) || ".";
  }

  read(real: string): string {
    return readFileSync(real, "utf8");
  }

  /**
   * Check an evidence location from ARE-T07: a path relative to the scenario folder,
   * optionally followed by a space and a section. Returns "ok", "missing" or "outside".
   */
  evidenceStatus(scenarioDir: string, location: string): "ok" | "missing" | "outside" {
    const filePart = location.trim().split(/\s+/)[0]!.split("#")[0]!;
    if (!filePart) return "missing";
    const candidate = isAbsolute(filePart) ? filePart : resolve(scenarioDir, filePart);
    if (!existsSync(candidate)) return this.inside(resolve(candidate)) ? "missing" : "outside";
    const real = realpathSync(candidate);
    if (!this.inside(real)) return "outside";
    return statSync(real).isFile() ? "ok" : "missing";
  }

  /** Scenario folders: `scenarios/*` in an engagement workspace, or the root itself in a single project. */
  scenarioDirs(): string[] {
    const scenarios = join(this.root, "scenarios");
    if (existsSync(scenarios) && statSync(scenarios).isDirectory()) {
      return readdirSync(scenarios)
        .map((n) => join(scenarios, n))
        .filter((p) => statSync(p).isDirectory() && this.inside(realpathSync(p)))
        .map((p) => realpathSync(p))
        .sort();
    }
    return this.assessmentFiles(this.root).length ? [this.root] : [];
  }

  /** ARE-T07 files in a scenario folder, oldest first. */
  assessmentFiles(scenarioDir: string): { path: string; date: string }[] {
    return readdirSync(scenarioDir)
      .map((n) => ({ n, m: n.match(ASSESSMENT_FILE) }))
      .filter((x) => x.m)
      .map((x) => ({ path: join(scenarioDir, x.n), date: x.m![1]! }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  fileIn(dir: string, name: string): string | null {
    const p = join(dir, name);
    return existsSync(p) && statSync(p).isFile() && this.inside(realpathSync(p)) ? realpathSync(p) : null;
  }

  scenarioName(dir: string): string {
    return dir === this.root ? basename(this.root) : basename(dir);
  }
}
