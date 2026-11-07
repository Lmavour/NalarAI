import { copyFile, mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const sourceRoot = path.resolve("public/nalar_ai_karakter");
const outputRoot = path.resolve("public/assets/stickers");
const fixturePublicRoot = path.resolve("e2e/ui-fixture/public");
const fixtureOutputRoot = path.join(fixturePublicRoot, "assets/stickers");

await rm(outputRoot, { recursive: true, force: true });
await rm(fixtureOutputRoot, { recursive: true, force: true });
await mkdir(outputRoot, { recursive: true });
await mkdir(fixtureOutputRoot, { recursive: true });

const characterDirectories = await readdir(sourceRoot, { withFileTypes: true });
let processed = 0;

for (const directory of characterDirectories) {
  if (!directory.isDirectory()) continue;
  const directoryPath = path.join(sourceRoot, directory.name);
  const files = await readdir(directoryPath, { withFileTypes: true });

  for (const file of files) {
    if (!file.isFile() || path.extname(file.name).toLowerCase() !== ".png") continue;
    const outputPath = path.join(outputRoot, file.name);
    await sharp(path.join(directoryPath, file.name))
      .rotate()
      .resize(384, 384, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .png({ compressionLevel: 9, adaptiveFiltering: true })
      .toFile(outputPath);
    await copyFile(outputPath, path.join(fixtureOutputRoot, file.name));
    processed += 1;
  }
}

await copyFile(path.resolve("public/logo-mark.png"), path.join(fixturePublicRoot, "logo-mark.png"));

console.log(`Processed ${processed} transparent character stickers for the app and UI fixture.`);
