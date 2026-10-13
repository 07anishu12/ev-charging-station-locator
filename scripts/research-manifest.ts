import { createHash } from "node:crypto";
import { readdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { parseCsv } from "../worker/src/providers/research";
import { projectRoot } from "./runtime.mjs";

async function main() {
  const directory = resolve(projectRoot, "research/ev-india/datasets");
  const files = [];
  for (const name of (await readdir(directory)).sort()) {
    const bytes = await readFile(resolve(directory, name));
    files.push({ path: `research/ev-india/datasets/${name}`, bytes: bytes.length,
      sha256: createHash("sha256").update(bytes).digest("hex"),
      ...(name.endsWith(".csv") ? { rows: parseCsv(bytes.toString("utf8")).length } : {}),
    });
  }
  if (files.length !== 10) throw new Error("Expected the ten reviewed research export files.");
  await writeFile(resolve(projectRoot, "data/research-manifest.json"), JSON.stringify({ formatVersion: 1, files }, null, 2) + "\n");
  console.log(`Recorded checksums for ${files.length} research exports.`);
}
main().catch(() => { console.error("Research manifest generation failed; check export files."); process.exitCode = 1; });
