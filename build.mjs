/**
 * Brilliant Drivers – static site builder (zero dependencies, Node 18+)
 *
 *   node build.mjs      → writes the deployable site to ./public_html
 *
 * src/layout.html     shared <html> shell
 * src/partials/*.html reusable blocks, used as {{> name}}
 * src/pages/*.html    one file per page, starting with a JSON front-matter comment
 * src/content/*.html  long-form blog content, used as {{content:name}}
 * src/static/         copied as-is to the web root (.htaccess, PHP form handler, robots.txt)
 * src/assets/         css / js / images, copied to /assets
 *
 * Icons: {{icon:name}} (see src/icons.mjs).  Variables: {{title}}, {{year}} …
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import icons from './src/icons.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(ROOT, 'src');
const OUT = path.join(ROOT, 'public_html');
const SITE = 'https://brilliantdrivers.ca';
const BASE = (process.env.BASE_PATH || '').replace(/\/+$/, '');
const YEAR = new Date().getFullYear();

const read = (p) => fs.readFileSync(path.join(SRC, p), 'utf8');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const e of fs.readdirSync(from, { withFileTypes: true })) {
    if (e.name === '.DS_Store') continue;
    const a = path.join(from, e.name);
    const b = path.join(to, e.name);
    if (e.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

// 1. Fresh output folder + static files
fs.rmSync(OUT, { recursive: true, force: true });
copyDir(path.join(SRC, 'assets'), path.join(OUT, 'assets'));
copyDir(path.join(SRC, 'static'), OUT);

// 2. Cache-busting versions for CSS / JS
const ver = (f) => crypto.createHash('md5').update(fs.readFileSync(path.join(OUT, f))).digest('hex').slice(0, 8);
const V = { css: ver('assets/css/style.css'), js: ver('assets/js/main.js') };

// 3. Templating helpers
const partials = Object.fromEntries(
  fs.readdirSync(path.join(SRC, 'partials'))
    .filter((f) => f.endsWith('.html'))
    .map((f) => [f.replace(/\.html$/, ''), read(`partials/${f}`)])
);

function icon(name) {
  const i = icons[name];
  if (!i) throw new Error(`Unknown icon: ${name}`);
  const paint = i.fill
    ? 'fill="currentColor"'
    : 'fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"';
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" ${paint} aria-hidden="true" focusable="false">${i.d}</svg>`;
}

function render(str, vars, depth = 0) {
  if (depth > 10) throw new Error('Partial nesting too deep');
  str = str.replace(/\{\{>\s*([\w-]+)\s*\}\}/g, (_, n) => {
    if (!(n in partials)) throw new Error(`Unknown partial: ${n}`);
    return render(partials[n], vars, depth + 1);
  });
  str = str.replace(/\{\{content:([\w-]+)\}\}/g, (_, n) => read(`content/${n}.html`));
  str = str.replace(/\{\{icon:([\w-]+)\}\}/g, (_, n) => icon(n));
  str = str.replace(/\{\{(\w+)\}\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
  return str;
}

// 4. Pages
const layout = read('layout.html');
const pages = fs.readdirSync(path.join(SRC, 'pages'))
  .filter((f) => f.endsWith('.html'))
  .map((f) => {
    const raw = read(`pages/${f}`);
    const m = raw.match(/^<!--\s*(\{[\s\S]*?\})\s*-->\s*/);
    if (!m) throw new Error(`Missing JSON front matter in ${f}`);
    return { file: f, meta: JSON.parse(m[1]), body: raw.slice(m[0].length) };
  });

const sitemap = [];
for (const { meta, body } of pages) {
  const vars = {
    ...meta,
    year: YEAR,
    site: SITE,
    v_css: V.css,
    v_js: V.js,
    canonical: SITE + meta.path,
    ogImage: SITE + (meta.ogImage || '/assets/img/First-driving-lesson.webp'),
    robots: meta.noindex ? 'noindex, follow' : 'index, follow',
    head: meta.preload ? `<link rel="preload" as="image" href="${meta.preload}" fetchpriority="high">` : '',
    bodyClass: meta.bodyClass || '',
  };
  let html = render(layout.replace('{{body}}', () => body), vars);
  if (meta.nav) html = html.replace(`data-nav="${meta.nav}"`, `data-nav="${meta.nav}" aria-current="page"`);
  if (BASE) html = html.replace(/(href|src|action|data-base-href)="\//g, `$1="${BASE}/`);

  const outFile = meta.path.endsWith('/')
    ? path.join(OUT, meta.path, 'index.html')
    : path.join(OUT, meta.path);
  fs.mkdirSync(path.dirname(outFile), { recursive: true });
  fs.writeFileSync(outFile, html);
  if (!meta.noindex) sitemap.push({ loc: SITE + meta.path, priority: meta.priority || '0.7' });
  console.log('  ✓', meta.path);
}

// 5. sitemap.xml
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(
  path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${sitemap
    .map((u) => `  <url><loc>${u.loc}</loc><lastmod>${today}</lastmod><priority>${u.priority}</priority></url>`)
    .join('\n')}\n</urlset>\n`
);

console.log(`\nBuilt ${pages.length} pages → public_html/  (upload the CONTENTS of this folder to Cloudways)`);
