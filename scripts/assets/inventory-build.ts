import { readdir, readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

import { PERFUME_IMAGE_MANIFEST } from '../../apps/web/src/assets/perfume-image-manifest.js';

type InventoryFile = {
  path: string;
  rawBytes: number;
  gzipBytes: number;
};

async function listFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      const itemPath = path.join(directory, entry.name);
      return entry.isDirectory() ? listFiles(itemPath) : [itemPath];
    }),
  );
  return nested.flat().sort();
}

function sum(files: readonly InventoryFile[]) {
  return {
    rawBytes: files.reduce((total, file) => total + file.rawBytes, 0),
    gzipBytes: files.reduce((total, file) => total + file.gzipBytes, 0),
  };
}

export async function createBuildInventory(rootDirectory = process.cwd()) {
  const outputDirectory = path.join(rootDirectory, 'apps', 'web', 'dist');
  const outputFiles = await listFiles(outputDirectory);
  const files: InventoryFile[] = await Promise.all(
    outputFiles.map(async (filePath) => {
      const content = await readFile(filePath);
      return {
        path: path.relative(outputDirectory, filePath).replaceAll('\\', '/'),
        rawBytes: (await stat(filePath)).size,
        gzipBytes: gzipSync(content, { level: 9 }).byteLength,
      };
    }),
  );

  const matches = (pattern: RegExp) =>
    files.filter(({ path: value }) => pattern.test(value));
  const indexHtml = matches(/^index\.html$/);
  const mainJavaScript = matches(/^assets\/index-[^/]+\.js$/);
  const workerJavaScript = matches(
    /^assets\/recommendation\.worker-[^/]+\.js$/,
  );
  const css = matches(/^assets\/index-[^/]+\.css$/);
  const runtimeJson = matches(/^assets\/recommendation-[^/]+\.json$/);
  const taxonomyAssets = matches(
    /^assets\/(?:notes|accords|genders|concentrations)-[^/]+\.json$/,
  );
  const brandAssets = matches(/^favicon\.svg$/);
  const perfumeImageAssets = matches(/^assets\/perfumes\//);
  const criticalFiles = [
    ...indexHtml,
    ...mainJavaScript,
    ...css,
    ...brandAssets,
  ];
  const lazyFiles = [
    ...workerJavaScript,
    ...runtimeJson,
    ...taxonomyAssets,
    ...perfumeImageAssets,
  ];
  const manifestPath = path.join(
    rootDirectory,
    'apps',
    'web',
    'src',
    'assets',
    'perfume-image-manifest.ts',
  );

  return {
    schemaVersion: 1,
    buildDirectory: 'apps/web/dist',
    assets: {
      indexHtml,
      mainJavaScript,
      workerJavaScript,
      css,
      runtimeJson,
      taxonomyAssets,
      brandAssets,
      perfumeImageAssets,
    },
    deliveryGroups: {
      criticalInitial: { files: criticalFiles, ...sum(criticalFiles) },
      lazyOrRouteTriggered: { files: lazyFiles, ...sum(lazyFiles) },
    },
    perfumeImages: {
      approvedEntries: Object.keys(PERFUME_IMAGE_MANIFEST).length,
      emittedFiles: perfumeImageAssets.length,
      ...sum(perfumeImageAssets),
    },
    imageManifestSourceBytes: (await stat(manifestPath)).size,
    totalEmitted: { files: files.length, ...sum(files) },
  };
}

export async function writeBuildInventory(rootDirectory = process.cwd()) {
  const report = await createBuildInventory(rootDirectory);
  await writeFile(
    path.join(
      rootDirectory,
      'scripts',
      'assets',
      'asset-inventory-report.json',
    ),
    `${JSON.stringify(report, null, 2)}\n`,
    'utf8',
  );
  return report;
}

const isDirectExecution =
  process.argv[1] !== undefined &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isDirectExecution) {
  const report = await writeBuildInventory();
  console.log(
    `Inventoried ${report.totalEmitted.files} emitted files (${report.totalEmitted.rawBytes} raw bytes).`,
  );
}
