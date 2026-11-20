// Vice Sunset Studio — the program that hands this entry in.
//
// Node 22, standard library only. It copies the offline web app (app/) and
// the screenshots (screenshots/) from beside this file into /output, then
// writes /output/dossier.json with the vendored make.fun library so the
// gate can check the entry and the judge can read it. The app itself is
// plain static files: index.html plus ES modules, no build step, no
// network at runtime, photos read on the user's own machine.
//
// Serve the app locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(outputDir, { recursive: true });
cpSync(join(repoRoot, 'app'), join(outputDir, 'app'), { recursive: true });
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(join(repoRoot, 'screenshots'))) {
  cpSync(join(repoRoot, 'screenshots'), join(outputDir, 'screenshots'), { recursive: true });
}

// The gate's own caps, so a build that would fail the scorer fails here
// first: at most 4 screenshots, each at most 256 KiB; app/ at most 993
// files and 48 MiB in all, no path over 1000 bytes; the dossier text
// capped at 160 KiB. /output itself holds at most 1000 entries, 64 MiB.
writeFileSync(
  join(outputDir, 'dossier.json'),
  buildDossier(outputDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
    app_path_max_bytes: 1000,
  }),
);
