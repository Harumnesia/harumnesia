import { buildDataset, validateGeneratedDataset } from './pipeline.js';

const command = process.argv[2];

try {
  if (command === 'build') {
    const result = await buildDataset();
    console.log(
      `Built ${result.records.length} records (SHA-256: ${result.hash}).`,
    );
  } else if (command === 'validate') {
    const result = await validateGeneratedDataset();
    console.log(
      `Validated ${result.records} records (SHA-256: ${result.hash}).`,
    );
  } else {
    throw new Error('Usage: cli.ts <build|validate>');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
