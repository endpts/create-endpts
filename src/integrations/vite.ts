import fs from "node:fs";
import path from "node:path";

import { execa } from "execa";
import ora from "ora";
import chalk from "chalk";
import {
  getExecCmd,
  getPkgManager,
  type PackageManager,
} from "../helpers/package-manager.js";

interface IntegrationOptions {
  packageManager: PackageManager;
}

export class ViteIntegration {
  private readonly packageManager: PackageManager;
  private readonly projectRootDir: string;

  constructor(opts: IntegrationOptions) {
    this.packageManager = opts.packageManager;
    // if we're augmenting an existing project, the CWD is the project root
    // otherwise, we create a new directory for the project
    this.projectRootDir = process.cwd();
  }

  private async addEnvVars() {
    const spinner = ora({
      text: `Adding environment variables`,
    }).start();

    const envFile = [
      ".env",
      ".env.local",
      ".env.development",
      ".env.development.local",
    ].find((env) => fs.existsSync(path.join(this.projectRootDir, env)));

    if (envFile) {
      try {
        fs.appendFileSync(
          path.join(this.projectRootDir, envFile),
          "\n\n# endpts\nVITE_ENDPTS_API_URL=http://localhost:3000\n"
        );
        spinner.succeed();
      } catch (e) {
        spinner.fail("Failed to add environment variables");
        console.log(e);
        process.exit(1);
      }
    } else {
      // create a new .env file
      try {
        fs.writeFileSync(
          path.join(this.projectRootDir, ".env"),
          "# endpts\nVITE_ENDPTS_API_URL=http://localhost:3000\n"
        );
        spinner.succeed();
      } catch (e) {
        spinner.fail("Failed to add environment variables");
        console.log(e);
        process.exit(1);
      }
    }
  }

  private async addDevServerScript() {
    const spinner = ora({
      text: "Adding dev:server script to package.json",
    }).start();

    try {
      const packageJson = JSON.parse(
        fs.readFileSync(path.join(this.projectRootDir, "package.json"), "utf-8")
      );

      packageJson.scripts = {
        ...packageJson.scripts,
        "dev:server": "endpts dev",
        "dev:all": 'concurrently -n vite,endpts "npm:dev" "npm:dev:server"',
      };

      fs.writeFileSync(
        path.join(this.projectRootDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );
      spinner.succeed();
    } catch (e: any) {
      spinner.fail("Failed to add dev:server script to package.json");
      console.log(e.stderr || e);
      process.exit(1);
    }
  }

  private async addGitIgnoreEntries() {
    const spinner = ora({
      text: "Adding endpts-related entries to .gitignore",
    }).start();

    try {
      // add endpts-related entries to .gitignore, if it exists
      if (fs.existsSync(path.join(this.projectRootDir, ".gitignore"))) {
        fs.appendFileSync(
          path.join(this.projectRootDir, ".gitignore"),
          "\n# endpts\n.ep\n.endpts\n"
        );
      }
      spinner.succeed();
    } catch (e: any) {
      spinner.fail("Failed to add endpts-related entries to .gitignore");
      console.log(e.stderr || e);
      process.exit(1);
    }
  }

  private async installDependencies() {
    const spinner = ora({
      text: "Installing dependencies",
    }).start();

    const devDeps = [
      "typescript",
      "@types/node",
      "@endpts/types",
      "@endpts/devtools",
      "concurrently",
    ];

    const args = ["install", "--D", ...devDeps];

    try {
      await execa(this.packageManager, args, {
        cwd: this.projectRootDir,
      });
      spinner.succeed();
    } catch (e: any) {
      spinner.fail("Failed to install dependencies");
      console.log(e.stderr || e);
      process.exit(1);
    }
  }

  private async createSampleRoutesDirectory({ dest }: { dest: string }) {
    const spinner = ora({
      text: `Creating routes directory`,
    }).start();

    // ensure the project does not already have a routes directory (we don't want to overwrite it)
    if (fs.existsSync(path.join(dest, "routes"))) {
      spinner.fail("A routes directory already exists in this project");
      process.exit(1);
    }

    try {
      fs.mkdirSync(path.join(dest, "routes"));
      fs.writeFileSync(
        path.join(dest, "routes/README.md"),
        `# The routes directory

This is the routes directory -- it contains all of your API routes.

## Creating a new route

To create a new route, simply create a new file in this directory. The file should export a default object with the following properties:

- \`method\`: The HTTP method for this route (e.g. \`GET\`, \`POST\`, \`PUT\`, \`DELETE\`, etc.)
- \`path\`: The path for this route (e.g. \`/users\`)
- \`handler\`: An asynchronous function that handles the request and returns a response

Here's an example route:

\`\`\`ts
import type { Route } from "@endpts/types";

export default {
  method: "GET",
  path: "/users",
  async handler(req) {
    return Response.json([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ]);
  },
} satisfies Route;
\`\`\`

## Dev server

To start the dev server, run:

\`\`\`sh
npm run dev
\`\`\`

The dev server will automatically reload when you make changes to your API routes.

## Making requests to your API

You can make requests to your API using fetch or any other HTTP client. The endpts dev server runs on port 3000 by default, however, if port 3000 is already in use, it will use the next available port.

To make a request to your API, you can use the \`VITE_ENDPTS_API_URL\` environment variable. For example, to make a request to the \`/users\` route, from the client:

\`\`\`ts
// the VITE_ENDPTS_API_URL is automatically injected into the client
const res = await fetch(new URL("/users", import.meta.env.VITE_ENDPTS_API_URL));
const users = await res.json();
\`\`\`
`
      );
      fs.writeFileSync(
        path.join(dest, "routes/get-users.ts"),
        `import type { Route } from "@endpts/types";

export default {
  method: "GET",
  path: "/users",
  async handler(req) {
    return withCors(
      Response.json([
        { id: 1, name: "Alice" },
        { id: 2, name: "Bob" },
        { id: 3, name: "Charlie" },
      ])
    );
  },
} satisfies Route;

/**
 * Adds CORS headers to a response.
 */
export function withCors(res: Response) {
  res.headers.set("Access-Control-Allow-Origin", "*");
  res.headers.set("Access-Control-Allow-Methods", "*");
  res.headers.set("Access-Control-Allow-Headers", "*");

  return res;
}
`
      );

      spinner.succeed();
    } catch (e) {
      spinner.fail("Failed to create routes directory");
      console.log(e);
      process.exit(1);
    }
  }

  async run() {
    console.log();
    console.log(chalk.bold(`Updating your existing project`));
    console.log();

    if (!fs.existsSync(path.join(this.projectRootDir, "package.json"))) {
      console.error(
        `The current directory does not contain a package.json file.`
      );
      process.exit(1);
    }

    await this.installDependencies();
    await this.addDevServerScript();
    await this.createSampleRoutesDirectory({ dest: this.projectRootDir });
    await this.addGitIgnoreEntries();
    await this.addEnvVars();

    console.log();
    console.log(
      chalk.green.bold(`Your project has been updated to use endpts API\n`)
    );
    console.log(
      `  - Start the Vite app and endpts dev server:`,
      chalk.cyan.bold(`${this.packageManager} run dev:all`)
    );
    console.log(
      `  - Create new routes in the ${chalk.bold.cyan("routes/")} directory`
    );
    console.log();
  }
}
