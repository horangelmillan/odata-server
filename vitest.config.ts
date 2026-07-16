import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = dirname(fileURLToPath(import.meta.url));
const phrasecodeCjs = resolve(
    root,
    "node_modules/@phrasecode/odata/dist/index.js",
);

export default defineConfig({
    resolve: {
        alias: {
            "@phrasecode/odata": phrasecodeCjs,
        },
    },
    test: {
        globals: true,
        environment: "node",
        fileParallelism: false,
        setupFiles: ["./src/__tests__/setup.ts"],
        include: ["src/__tests__/**/*.test.ts"],
    },
    esbuild: {
        tsconfigRaw: {
            compilerOptions: {
                experimentalDecorators: true,
                emitDecoratorMetadata: true,
            },
        },
    },
});
