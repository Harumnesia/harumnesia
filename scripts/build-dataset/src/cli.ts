import { buildDataset, validateGeneratedDataset } from './pipeline.js';

const command = process.argv[2];

try {
  if (command === 'build') {
    const result = await buildDataset();
    console.log(
      `Built ${result.records.length} canonical records (SHA-256: ${result.hash}) and ${result.runtimeBytes} runtime bytes (SHA-256: ${result.runtimeHash}).`,
    );
  } else if (command === 'validate') {
    const result = await validateGeneratedDataset();
    console.log(
      `Validated ${result.records} canonical/runtime records (canonical SHA-256: ${result.hash}; runtime SHA-256: ${result.runtimeHash}).`,
    );
  } else {
    throw new Error('Usage: cli.ts <build|validate>');
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
