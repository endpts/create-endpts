import fs from "node:fs";
import path from "node:path";
import url from "node:url";

import { execa } from "execa";
import ora from "ora";
import chalk from "chalk";

import { PackageManager } from "./get-pkg-manager.js";

interface CreateOptions {
  name: string;
  packageManager: PackageManager;
  existing?: boolean;
}

export class CreateCommand {
  private readonly name: string;
  private readonly packageManager: PackageManager;
  private readonly existing?: boolean;
  private readonly projectRootDir: string;
  private readonly templatesRootDir = path.join(
    path.dirname(url.fileURLToPath(import.meta.url)),
    "../../templates/"
  );

  constructor(opts: CreateOptions) {
    this.name = opts.name || "my-api";
    this.packageManager = opts.packageManager;
    this.existing = opts.existing;

    // if we're augmenting an existing project, the CWD is the project root
    // otherwise, we create a new directory for the project
    this.projectRootDir = this.existing
      ? process.cwd()
      : path.join(process.cwd(), this.name);
  }

  private createProjectDir() {
    const spinner = ora({
      text: `Creating project directory: ${this.name}`,
    }).start();

    if (
      fs.existsSync(this.projectRootDir) &&
      fs.readdirSync(this.projectRootDir).length !== 0
    ) {
      spinner.fail(
        `The project directory already exists or is not empty: ${this.projectRootDir}`
      );
      process.exit(1);
    }

    try {
      fs.mkdirSync(this.projectRootDir);
      spinner.succeed();
    } catch (e) {
      spinner.fail("Failed to create project directory");
      console.log(e);
      process.exit(1);
    }
  }

  private writePackageJson() {
    const spinner = ora({
      text: `Writing package.json`,
    }).start();

    const packageJson = {
      name: this.name,
      type: "module",
      version: "1.0.0",
      private: true,
      scripts: {
        dev: "endpts dev",
      },
    };

    try {
      fs.writeFileSync(
        path.join(this.projectRootDir, "package.json"),
        JSON.stringify(packageJson, null, 2)
      );

      spinner.succeed();
    } catch (e) {
      spinner.fail("Failed to write package.json");
      console.log(e);
      process.exit(1);
    }
  }

  private copyTemplateFiles(src: string, dest: string) {
    const spinner = ora({
      text: `Copying project files`,
    }).start();

    try {
      this.copyFiles(src, dest);
      spinner.succeed();
    } catch (e) {
      spinner.fail("Failed to copy project files");
      console.log(e);
      process.exit(1);
    }
  }

  private copyFiles(src: string, dest: string) {
    let entries = fs.readdirSync(src, { withFileTypes: true });

    for (let entry of entries) {
      let srcPath = path.join(src, entry.name);
      let destPath = path.join(dest, entry.name);

      // if the entry is gitignore, rename it to .gitignore
      if (entry.name === "gitignore") {
        destPath = path.join(dest, ".gitignore");
      }

      if (entry.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        this.copyFiles(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
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

You can make requests to your API using fetch or any other HTTP client. For example, to make a request to the \`/users\` route, you can run:

\`\`\`ts
// ensure that you specify the correct port
const res = await fetch("http://localhost:3000/users");
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
    return Response.json([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
      { id: 3, name: "Charlie" },
    ]);
  },
} satisfies Route;
`
      );

      spinner.succeed();
    } catch (e) {
      spinner.fail("Failed to create routes directory");
      console.log(e);
      process.exit(1);
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

  private async augmentExistingProject() {
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

    console.log();
    console.log(
      chalk.green.bold(`Your project has been updated to use endpts API\n`)
    );
    console.log(
      `  - Start the dev server:`,
      chalk.cyan.bold(`${this.packageManager} run dev:server`)
    );
    console.log(
      `  - Create new routes in the ${chalk.bold.cyan("routes/")} directory`
    );
    console.log();
  }

  private async cleanBootstrap() {
    console.log();
    console.log(
      chalk.bold(`Bootstrapping a new endpts project`),
      chalk.cyan(`(${this.name})`)
    );
    console.log();

    this.createProjectDir();
    this.writePackageJson();
    this.copyTemplateFiles(
      path.join(this.templatesRootDir, "./basic/typescript"),
      this.projectRootDir
    );
    await this.installDependencies();

    console.log();
    console.log(
      chalk.green.bold(
        `Your endpts project ${this.name} has successfully been created!\n`
      )
    );
    console.log(
      `  - Change into your project directory using:`,
      chalk.cyan.bold(`cd ./${this.name}`)
    );
    console.log(
      `  - Start the dev server:`,
      chalk.cyan.bold(`${this.packageManager} run dev`)
    );
    console.log(
      `  - Create new routes in the ${chalk.bold.cyan("routes/")} directory`
    );
    console.log();
  }

  async run() {
    if (this.existing) {
      return this.augmentExistingProject();
    } else {
      return this.cleanBootstrap();
    }
  }
}
