// Składa produkcyjny build Vite w jeden samodzielny plik HTML (CSS + JS w środku),
// gotowy do publikacji jako strona (np. Artifact) lub otwarcia bez serwera.
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const dist = join(root, 'dist');
const assets = join(dist, 'assets');
const files = readdirSync(assets);
const css = files.filter((f) => f.endsWith('.css')).map((f) => readFileSync(join(assets, f), 'utf8')).join('\n');
const jsFile = files.find((f) => f.endsWith('.js'));
const js = readFileSync(join(assets, jsFile), 'utf8').replace(/<\/script/gi, '<\\/script');

const html = readFileSync(join(dist, 'index.html'), 'utf8');
const body = html
  .slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'))
  .replace(/<script[^>]*src=[^>]*><\/script>/g, '')
  .trim();

const out = `<title>1v1 Shooter</title>
<meta name="description" content="Strzelanka 1v1 w przeglądarce — etap 1: postać">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Rubik:wght@500;700;900&display=swap">
<style>
${css}
</style>
${body}
<script type="module">
${js}
</script>
`;

const outDir = join(root, 'dist-artifact');
mkdirSync(outDir, { recursive: true });
writeFileSync(join(outDir, 'index.html'), out);
console.log(`dist-artifact/index.html — ${(out.length / 1024).toFixed(0)} KB`);
