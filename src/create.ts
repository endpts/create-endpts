import fs from "node:fs";
import path from "node:path";
import url from "node:url";

import { execa } from "execa";
import ora from "ora";
import chalk from "chalk";

import { PackageManager } from "./helpers/get-pkg-manager.js";

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

  async run() {
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
}
