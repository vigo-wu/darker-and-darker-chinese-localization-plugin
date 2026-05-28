const { buildExtension } = require("./lib/extension-build");

function parseMode(argv) {
  const modeArg = argv.find((arg) => arg.startsWith("--mode="));
  if (modeArg) {
    return modeArg.split("=")[1];
  }

  if (argv.includes("--dev")) {
    return "dev";
  }

  return "prod";
}

function main() {
  const mode = parseMode(process.argv.slice(2));
  if (!["dev", "prod"].includes(mode)) {
    throw new Error(`Unsupported mode: ${mode}`);
  }

  const result = buildExtension({ mode });
  console.log(`Build complete (${mode})`);
  console.log(`Output: ${result.outDir}`);
}

main();
