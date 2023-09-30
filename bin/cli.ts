#!/usr/bin/env node

import { parseArgs } from "node:util";
import { CreateCommand } from "../src/create.js";
import { getPkgManager } from "../src/get-pkg-manager.js";

const currVersion = process.versions.node;
const currMajorVersion = parseInt(currVersion.split(".")[0], 10);
const minMajorVersion = 18;

if (currMajorVersion < minMajorVersion) {
  console.error(
    `The version of Node.js you are using (v${currVersion}) is not supported. Please use Node.js v${minMajorVersion} or higher.`
  );
  process.exit(1);
}

const packageManager = getPkgManager();

const { values, positionals } = parseArgs({
  options: {
    existing: {
      type: "boolean",
    },
    positionals: {
      type: "string",
      multiple: true,
    },
  },
  allowPositionals: true,
});

if (values.existing && positionals.length !== 0) {
  console.error(
    `The --existing option cannot be used with any other arguments.`
  );
  process.exit(1);
}

const init = new CreateCommand({
  name: positionals[0],
  packageManager,
  existing: values.existing,
});

await init.run();
