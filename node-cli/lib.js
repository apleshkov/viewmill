// @ts-check

const path = require("path");

/** @type {import("./lib")} */
module.exports = {
    parseArgs: function (args, offset = 0) {
        const flags = {};
        let i = offset;
        while (args[i] && args[i][0] === "-") {
            if (args[i] === "--re") {
                flags.re = args[i + 1];
                i += 2;
                continue;
            }
            if (args[i] === "--target") {
                flags.target = args[i + 1];
                i += 2;
                continue;
            }
            if (args[i] === "--suffix") {
                flags.suffix = args[i + 1];
                i += 2;
                continue;
            }
            if (args[i] === "--verbose") {
                flags.verbose = true;
                i += 1;
                continue;
            }
            if (args[i] === "--watch") {
                flags.watch = true;
                i += 1;
                continue;
            }
            if (args[i] === "--help") {
                flags.showHelp = true;
                i += 1;
                continue;
            }
            throw new Error(`Unknown option: '${args[i]}'`);
        }
        return {
            flags,
            params: {
                inputPath: args[i],
                outputDir: args[i + 1]
            }
        };
    },
    outputInfo(parsedPath, inputDir, outputDir) {
        const subdir = parsedPath.dir.substring(inputDir.length);
        return {
            dir: path.join(outputDir, subdir),
            name: parsedPath.name
        };
    }
};