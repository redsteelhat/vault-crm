/**
 * Generate src-tauri/icons/icon.ico for Windows build (required by tauri-build).
 * Run: pnpm icons
 * Uses sharp + png-to-ico; run once or before first tauri build.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const iconsDir = path.join(root, "src-tauri", "icons");
const iconIco = path.join(iconsDir, "icon.ico");

async function main() {
  if (fs.existsSync(iconIco)) {
    console.log("icons/icon.ico already exists, skip.");
    return;
  }
  try {
    const sharp = (await import("sharp")).default;
    const pngToIco = (await import("png-to-ico")).default;

    fs.mkdirSync(iconsDir, { recursive: true });

    // Primary blue (#2563eb) 256x256 PNG for ICO (Windows needs multiple sizes; png-to-ico can derive)
    const png256 = await sharp({
      create: {
        width: 256,
        height: 256,
        channels: 4,
        background: { r: 37, g: 99, b: 235, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const png32 = await sharp({
      create: {
        width: 32,
        height: 32,
        channels: 4,
        background: { r: 37, g: 99, b: 235, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const ico = await pngToIco([png32, png256]);
    fs.writeFileSync(iconIco, ico);
    console.log("Created src-tauri/icons/icon.ico");
  } catch (e) {
    console.error("Icon generation failed:", e.message);
    console.error("Install devDependencies (sharp, png-to-ico) and run: pnpm icons");
    process.exit(1);
  }
}

main();
