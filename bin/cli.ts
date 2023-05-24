#!/usr/bin/env node

import path from "path";
import { CreateCommand } from "../src/create.js";

const runtime = path.basename(process.argv[0]).replace(".exe", "");
const _argv = process.argv.slice(2);

const init = new CreateCommand({
  name: _argv[0],
  packageManager: runtime === "bun" ? "bun" : "npm",
});

await init.run();
