// @ts-check

const { parseArgs, outputInfo } = require("./lib");
const path = require("path");

/**
 * @param {any} cond 
 * @param {string} [msg] 
 */
function assert(cond, msg) {
    if (!cond) {
        throw new Error(msg ?? "The condition failed!");
    }
}

/**
 * @template T
 * @param {T} a
 * @param {T} b
 * @param {string} [expr]
 */
function assertStrictEq(a, b, expr = "a === b") {
    assert(a === b, `Testing of ${expr} failed!\na = ${a}\nb = ${b}`);
}

/**
 * @template {Record<string, any>} T
 * @param {T} a
 * @param {T} b
 */
function assertObjEq(a, b) {
    const check = (keys) => {
        for (const k of keys) {
            if (typeof a[k] === "undefined") {
                assert(typeof b[k] === "undefined", `b["${k}"] should be undefined, but '${b[k]}' found`);
            } else {
                assertStrictEq(a[k], b[k], `a.${k}] === b.${k}`);
            }
        }
    };
    check(Object.keys(a));
    check(Object.keys(b));
}

const cases = [
    //
    // Parse args
    //
    () => assertObjEq(parseArgs([]).flags, {}),
    () => assertObjEq(parseArgs(["input"]).params, { inputPath: "input" }),
    () => assertObjEq(parseArgs(["input", "output"]).params, {
        inputPath: "input",
        outputDir: "output"
    }),
    () => assertObjEq(parseArgs(["--re"]).flags, {}),
    () => assertObjEq(parseArgs(["--re", ".*"]).flags, { re: ".*" }),
    () => assertObjEq(parseArgs(["--target", "es2020"]).flags, { target: "es2020" }),
    () => assertObjEq(parseArgs(["--suffix", ".view"]).flags, { suffix: ".view" }),
    () => assertObjEq(parseArgs(["--verbose"]).flags, { verbose: true }),
    () => assertObjEq(parseArgs(["--watch"]).flags, { watch: true }),
    () => assertObjEq(parseArgs(["--help"]).flags, { showHelp: true }),
    () => {
        try {
            parseArgs(["-unknown"]);
        } catch (e) {
            assertStrictEq(e.message, "Unknown option: '-unknown'");
        }
    },
    () => {
        const o = parseArgs(["--re", ".*", "input", "output"]);
        assertObjEq(o.flags, { re: ".*" });
        assertObjEq(o.params, {
            inputPath: "input",
            outputDir: "output"
        });
    },
    () => {
        const o = parseArgs(["--re", ".*", "--help", "input", "output"]);
        assertObjEq(o.flags, { showHelp: true, re: ".*" });
        assertObjEq(o.params, {
            inputPath: "input",
            outputDir: "output"
        });
    },
    //
    // Output info
    //
    () => {
        const o = outputInfo(path.parse("path/to/foo.tsx"), "/path/to", "out");
        assertStrictEq(o.dir, "out");
        assertStrictEq(o.name, "foo");
    },
    () => {
        const o = outputInfo(path.parse("path/to/a/b/c/file.tsx"), "path/to", "out/foo/bar");
        assertStrictEq(o.dir, "out/foo/bar/a/b/c");
        assertStrictEq(o.name, "file");
    },
    () => {
        const o = outputInfo(path.parse("path/to/a/b/c/file.tsx"), "path/to/", "out/foo/bar/");
        assertStrictEq(o.dir, "out/foo/bar/a/b/c");
        assertStrictEq(o.name, "file");
    },
];

console.log(`Running ${cases.length} tests...`);
cases.forEach((fn) => fn());
console.log("Passed!");