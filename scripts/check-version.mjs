import { readFile } from "node:fs/promises";

const rootPackage = JSON.parse(await readFile("package.json", "utf8"));
const tauriConfig = JSON.parse(
  await readFile("src-tauri/tauri.conf.json", "utf8"),
);
const cargoManifest = await readFile("src-tauri/Cargo.toml", "utf8");
const cargoVersion = /^\s*version\s*=\s*"([^"]+)"/m.exec(cargoManifest)?.[1];

const versions = new Map([
  ["package.json", rootPackage.version],
  ["src-tauri/tauri.conf.json", tauriConfig.version],
  ["src-tauri/Cargo.toml", cargoVersion],
]);
const expected = rootPackage.version;
const mismatches = [...versions].filter(([, version]) => version !== expected);

if (!expected || mismatches.length > 0) {
  for (const [file, version] of versions) {
    console.error(`${file}: ${version ?? "missing"}`);
  }
  process.exitCode = 1;
} else {
  console.log(`Application version ${expected} is consistent.`);
}
