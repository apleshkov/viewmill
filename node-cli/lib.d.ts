import { ParsedPath } from "path";

export type ParsedFlags = {
    re?: string,
    target?: string,
    suffix?: string,
    verbose?: boolean,
    watch?: boolean,
    showHelp?: boolean,
    showVersion?: boolean
}

export type ParsedParams = {
    inputPath: string,
    outputDir?: string
};

export type ParsedArgs = {
    params: ParsedParams,
    flags: ParsedFlags
};

export declare function parseArgs(args: string[], offset?: number): ParsedArgs;

export declare function outputInfo(parsedPath: ParsedPath, inputDir: string, outputDir: string): {
    dir: string,
    name: string
};
