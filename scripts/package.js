const { packageExtension } = require("./lib/extension-build");

function main() {
  const result = packageExtension();
  console.log(`Package created: ${result.zipFile} (${result.sizeKb} KB)`);
  console.log(`Extension folder: ${result.outDir}`);
}

main();
