#!/usr/bin/env node

import { parseArgs } from "node:util";
import { CreateCommand } from "../src/create.js";
import { ViteIntegration } from "../src/integrations/vite.js";
import { getPkgManager } from "../src/helpers/get-pkg-manager.js";

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
    integration: {
      type: "string",
    },
    positionals: {
      type: "string",
      multiple: true,
    },
  },
  allowPositionals: true,
});

if (values.integration) {
  if (positionals.length !== 0) {
    console.error(
      `The --integration option cannot be used with any other arguments.`
    );
    process.exit(1);
  }

  const integration = values.integration;

  if (integration === "vite") {
    const viteIntegration = new ViteIntegration({
      packageManager,
    });

    await viteIntegration.run();
  } else {
    console.error(`The integration "${integration}" is not supported.`);
    process.exit(1);
  }
} else {
  const create = new CreateCommand({
    name: positionals[0],
    packageManager,
  });

  await create.run();
}
