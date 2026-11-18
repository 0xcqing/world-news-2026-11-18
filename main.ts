import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const PNG_SIGNATURE = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];

// entry.png ships beside this module inside the read-only bot directory.
const sourcePath = fileURLToPath(new URL("./entry.png", import.meta.url));
// The grader mounts a writable /output and may redirect it with this env var.
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? "/output";
const outputPath = join(outputDir, "entry.png");

async function main(): Promise<void> {
  const image = await readFile(sourcePath);

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, image);

  // Re-read what landed on disk so the check covers the written bytes.
  const written = await readFile(outputPath);
  if (!hasPngSignature(written)) {
    throw new Error(`${outputPath} is not a non-empty PNG`);
  }

  console.log(`wrote ${written.length} bytes to ${outputPath}`);
}

function hasPngSignature(bytes: Uint8Array): boolean {
  return (
    bytes.length > PNG_SIGNATURE.length &&
    PNG_SIGNATURE.every((byte, index) => bytes[index] === byte)
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
