#!/usr/bin/env node

import { CreateCommand } from "../src/create.js";

const _argv = process.argv.slice(2);
const init = new CreateCommand({
  name: _argv[0],
});

await init.run();
