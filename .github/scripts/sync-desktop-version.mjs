import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

const releaseTag = process.env.RELEASE_TAG ?? "";
const version = releaseTag.replace(/^v/, "");
if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(version)) {
  throw new Error(`Expected a semantic release tag, received: ${releaseTag || "(empty)"}`);
}

const root = resolve(fileURLToPath(new URL("../../", import.meta.url)));
for (const relativePath of [
  "desktop-shell/package.json",
  "desktop-shell/src-tauri/tauri.conf.json",
]) {
  const path = resolve(root, relativePath);
  const content = readFileSync(path, "utf8");
  JSON.parse(content);
  const versionPattern = /("version"\s*:\s*")[^"]+("\s*,?)/;
  if (!versionPattern.test(content)) {
    throw new Error(`Could not find the JSON version field in ${relativePath}`);
  }
  writeFileSync(path, content.replace(versionPattern, `$1${version}$2`));
}

const cargoPath = resolve(root, "desktop-shell/src-tauri/Cargo.toml");
const cargo = readFileSync(cargoPath, "utf8");
const cargoVersionPattern = /^(version\s*=\s*)"[^"]+"$/m;
if (!cargoVersionPattern.test(cargo)) {
  throw new Error("Could not find the Cargo package version field to update");
}
const updatedCargo = cargo.replace(cargoVersionPattern, `$1"${version}"`);
writeFileSync(cargoPath, updatedCargo);
console.log(`Desktop bundle versions synchronized to ${version}`);
