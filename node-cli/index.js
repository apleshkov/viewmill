#!/usr/bin/env node
// @ts-check

const fs = require("fs").promises;
const path = require("path");

const { parseArgs, outputInfo } = require("./lib");
const tr = require("./tr/transform");

/**
 * @param {string} inputPath 
 * @param {string} outputPath 
 * @param {string} str 
 * @param {boolean} [verbose] 
 * @returns {Promise<void>}
 */
async function writeString(inputPath, outputPath, str, verbose) {
    if (verbose) {
        console.log(" * " + inputPath + " -> " + outputPath);
    }
    await fs.writeFile(outputPath, str, { encoding: "utf-8" });
}

/**
 * @typedef {Object} Context
 * @property {() => tr.Options} transformOptions
 */

/**
 * @param {Context} ctx 
 * @param {string} inputPath 
 * @param {string | undefined | null} inputDir 
 * @param {string | undefined} outputDir
 * @param {import("./lib").ParsedFlags} flags
 * @returns {Promise<any>}
 */
async function transformFile(ctx, inputPath, inputDir, outputDir, { suffix, verbose }) {
    const parsedInput = path.parse(inputPath);
    const timeStart = Date.now();
    const output = tr.transform(
        inputPath,
        await fs.readFile(inputPath, { encoding: "utf-8" }),
        ctx.transformOptions()
    );
    const timeEnd = Date.now();
    if (verbose) {
        console.log(`Transformed "${inputPath}" in ${timeEnd - timeStart}ms`);
    }
    let outputPath;
    if (inputDir && outputDir) {
        const info = outputInfo(parsedInput, inputDir, outputDir);
        await fs.mkdir(info.dir, { recursive: true });
        outputPath = path.join(info.dir);
    } else {
        outputPath = path.join(parsedInput.dir, parsedInput.name);
    }
    if (suffix) {
        outputPath += suffix;
    }
    return await writeString(inputPath, outputPath + "." + output.ext, output.src, verbose);
}

/**
 * @param {Context} ctx 
 * @param {string} inputDir 
 * @param {string | undefined} outputDir 
 * @param {RegExp} re 
 * @param {import("./lib").ParsedFlags} flags 
 * @returns {Promise<any>}
 */
async function transformDir(ctx, inputDir, outputDir, re, flags) {
    const files = [];
    async function walk(/** @type {string} */dir) {
        const list = await fs.readdir(dir);
        for (const entry of list) {
            const entryPath = path.join(dir, entry);
            const stats = await fs.stat(entryPath);
            if (stats.isDirectory()) {
                await walk(dir);
            } else if (stats.isFile() && re.test(entryPath)) {
                files.push(entryPath);
            }
        }
    }
    await walk(inputDir);
    return Promise.allSettled(
        files.map((inputPath) => (
            transformFile(ctx, inputPath, inputDir, outputDir, flags)
        ))
    );
}

const WATCHING_MSG = "\nWatching for changes...\n";

/**
 * @param {Context} ctx 
 * @param {import("./lib").ParsedParams} params
 * @param {import("./lib").ParsedFlags} flags
 * @returns 
 */
async function transform(ctx, { inputPath, outputDir }, { re, watch, ...flags }) {
    const stats = await fs.stat(inputPath);
    if (stats.isDirectory()) {
        const regexp = re ? new RegExp(re) : /\.(jsx|tsx)$/;
        const fn = async () => (
            await transformDir(ctx, inputPath, outputDir, regexp, flags)
        );
        if (watch) {
            await fn();
            console.log(WATCHING_MSG);
            for await (const { filename, eventType } of fs.watch(inputPath, { recursive: true })) {
                if (eventType === "change" && filename && regexp.test(filename)) {
                    const p = path.join(inputPath, filename);
                    try {
                        await transformFile(ctx, p, inputPath, outputDir, flags);
                    } catch (e) {
                        console.error(e);
                    }
                }
            }
        } else {
            return await fn();
        }
    } else if (stats.isFile()) {
        const fn = async () => (
            await transformFile(ctx, inputPath, null, outputDir, flags)
        );
        if (watch) {
            await fn();
            console.log(WATCHING_MSG);
            for await (const { eventType } of fs.watch(inputPath)) {
                if (eventType === "change") {
                    await fn();
                }
            }
        } else {
            return await fn();
        }
    }
}

const USAGE_TEXT = `Usage: viewmill [OPTIONS] INPUT_PATH [OUTPUT_DIR]

Arguments:
  INPUT_PATH    File or directory. By default searches for all *.{jsx,tsx} files in a directory. Use the \`--re\` option to set your own filter.
  [OUTPUT_DIR]  Output directory

Options:
  --re          A regular expression to filter files in a directory (see the examples)
  --target      Output js target: ${tr.displayEsVersions()}
  --suffix      How to suffix output file names
  --verbose     Shows warnings and files as they are transformed
  --watch       Starts watching for changes
  --help        Prints this message
  --version     Prints the current version

Examples:
  1. Transform file:
        viewmill path/to/file.jsx
  2. Only *.jsx files:
        viewmill --re "\\.(jsx)$" path/to/dir
  3. Set target:
        viewmill --target esnext path/to/smth
  4. Suffix to get "*-view.js" as an output for "*.jsx":
        viewmill --suffix "-view" path/to/dir`;

/**
 * @param {string} [prefix]
 */
function printHelp(prefix) {
    if (typeof prefix === "string" && prefix.length > 0) {
        console.log(prefix + USAGE_TEXT);
    } else {
        console.log(USAGE_TEXT);
    }
}

/**
 * @param {string} msg
 */
function printUsageError(msg) {
    console.error("[error] " + msg);
    printHelp("\n");
}

/**
 * @param {string[]} args
 */
async function main(args) {
    if (args.length > 2) {
        const {
            params,
            flags: { showHelp, showVersion, ...flags }
        } = parseArgs(args, 2);
        if (showHelp) {
            printHelp();
        } else if (showVersion) {
            const { version } = require("./package.json");
            console.log(version);
        } else if (!params.inputPath) {
            printUsageError("No path provided");
            process.exitCode = 1;
        } else {
            /** @type {Context} */
            const ctx = {
                transformOptions() {
                    const { target, verbose } = flags;
                    return new tr.Options(target, verbose);
                }
            };
            await transform(ctx, params, flags);
        }
    } else {
        printHelp();
        process.exitCode = 1;
    }
}

main(process.argv);
