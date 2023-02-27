#!/usr/bin/env node

import { CreateCommand } from "../src/create.js";

const runtime = process.argv[0].split("/").pop();
const _argv = process.argv.slice(2);

if (runtime !== "node" && runtime !== "bun") {
  console.log("unsupported runtime");
  process.exit(1);
}

const init = new CreateCommand({
  name: _argv[0],
  packageManager: runtime === "bun" ? "bun" : "npm",
});

await init.run();
