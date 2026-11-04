// Terapkan schema + semua chunk seed ke D1.
//   npm run db:seed            -> D1 lokal (.wrangler/state)
//   npm run db:seed -- --remote -> D1 di Cloudflare (setelah wrangler login/token)
import { spawnSync } from 'node:child_process';
import { readdirSync, existsSync } from 'node:fs';

const remote = process.argv.includes('--remote');
const scope = remote ? '--remote' : '--local';
const only = (process.argv.find((a) => a.startsWith('--only=')) ?? '')
  .slice('--only='.length)
  .split(',')
  .filter(Boolean);
const files = [
  'schema.sql',
  ...readdirSync('seed')
    .filter((f) => f.endsWith('.sql'))
    .sort()
    .map((f) => `seed/${f}`),
].filter((f) => only.length === 0 || only.includes(f));

if (!existsSync('seed')) {
  console.error('seed/ tidak ada — jalankan: python scripts/seed.py');
  process.exit(1);
}

let done = 0;
for (const file of files) {
  const r = spawnSync(
    'npx',
    ['wrangler', 'd1', 'execute', 'harumnesia', scope, `--file=${file}`],
    {
      encoding: 'utf8',
      shell: true,
      maxBuffer: 64 * 1024 * 1024,
    },
  );
  if (r.status !== 0) {
    console.error(`\nGAGAL: ${file}\n${r.stdout ?? ''}\n${r.stderr ?? ''}`);
    process.exit(1);
  }
  done++;
  process.stdout.write(`\r${done}/${files.length} file diterapkan`);
}
console.log(
  `\nselesai: ${done} file diterapkan (${remote ? 'REMOTE' : 'lokal'})`,
);
