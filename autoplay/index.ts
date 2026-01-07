import { randomInt } from "node:crypto";
import * as fs from "node:fs/promises";
import * as path from "node:path";

const config = {
    root: "/home/supinic/Music",
    extensions: [".mp3", ".wav", ".ogg", ".opus"],
    exclude: {
        dir: [] as string[],
        file: [] as string[]
    },
    historySize: 100
};

const randomFromSet = <T> (input: Set<T>): T => {
    if (input.size === 0) {
        throw new Error("No eligible items in set");
    }

    const arr = [...input];
    const index = randomInt(0, arr.length);
    return arr[index];
}

const walk = async (dir: string, out: Set<string>): Promise<void> => {
    const entries = new Set(await fs.readdir(dir, { withFileTypes: true }));
    for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            if (config.exclude.dir.includes(fullPath)) {
                continue;
            }

            await walk(fullPath, out);
            continue;
        }
        else if (!entry.isFile()) {
            continue;
        }

        const ext = path.extname(entry.name).toLowerCase();
        if (!config.extensions.includes(ext)) {
            continue;
        }

        const fullNormalizedPath = path.resolve(fullPath);
        out.add(fullNormalizedPath);
    }
}

const recents: string[] = [];
const library = new Set<string>();

export const get = async () => {
    console.log("1");
    if (library.size === 0) {
        await walk(config.root, library);
    }

    console.log([...library]);

    if (library.size < config.historySize) {
        throw new Error("Library size is lower than repeats");
    }

    const recentsSet = new Set(recents);
    const eligibleSet = library.difference(recentsSet);

    const link = randomFromSet(eligibleSet);
    recents.unshift(link);
    recents.splice(config.historySize);

    return {
        link
    };
}

export const clear = () => {
    library.clear();
}
