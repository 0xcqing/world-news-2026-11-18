import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The finished front page ships next to this module. Resolving it from
// import.meta.url keeps the program working wherever the repo is mounted.
const SOURCE_DIR = dirname(fileURLToPath(import.meta.url));
const SOURCE_IMAGE = join(SOURCE_DIR, 'entry.png');

// A PNG always begins with these eight bytes (including the CRLF/EOF markers).
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const MAX_BYTES = 1024 * 1024;
const MAX_DIMENSION = 1024;

async function main(): Promise<void> {
  // The grader mounts the repo read-only, so output must go elsewhere.
  const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  const outputImage = join(outputDir, 'entry.png');

  await mkdir(outputDir, { recursive: true });
  const image = await readFile(SOURCE_IMAGE);
  await writeFile(outputImage, image);

  // Verify what actually landed on disk rather than trusting the copy call.
  const written = await readFile(outputImage);
  if (written.length > MAX_BYTES) {
    throw new Error(`entry.png is ${written.length} bytes, over the 1 MiB limit`);
  }
  if (!written.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error('entry.png does not start with the PNG signature');
  }

  // The IHDR chunk holds the dimensions as big-endian uint32 values.
  if (written.length < 24 || written.toString('ascii', 12, 16) !== 'IHDR') {
    throw new Error('entry.png is missing a valid IHDR chunk');
  }
  const width = written.readUInt32BE(16);
  const height = written.readUInt32BE(20);
  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    throw new Error(`entry.png is ${width}x${height}, above the ${MAX_DIMENSION}x${MAX_DIMENSION} limit`);
  }

  console.log(`Wrote ${written.length} bytes (${width}x${height}) to ${outputImage}`);
}

main().catch((error: unknown) => {
  console.error('Failed to publish the front page:', error);
  process.exitCode = 1;
});
