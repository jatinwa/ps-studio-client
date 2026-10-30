/**
 * Downloads the studio's typefaces from Google Fonts so the site can serve them
 * itself.
 *
 * `next/font/google` fetches these at *build* time, which makes every deploy
 * depend on Google's servers being reachable from the build machine — that is
 * what broke the first Netlify build. Self-hosted, the build has no network
 * dependency at all, and the live site stops making a third-party request on
 * every page view.
 *
 * All three families are OFL licensed, so redistributing them with the site is
 * permitted. Run with: node scripts/fetch-fonts.mjs
 */

import { mkdir, writeFile, readdir } from "node:fs/promises";
import { join } from "node:path";

const OUT = "src/app/fonts";

/** A desktop UA, or Google serves the older TTF payload instead of woff2. */
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/*
 * Latin only — the same subset the Google-hosted setup requested, so the live
 * typography is unchanged.
 *
 * It cannot simply be widened here: `next/font/local` takes only path, weight
 * and style per source, with no unicode-range, so a second subset under the
 * same family/weight/style would not narrow its coverage — it would override
 * the first outright and take the basic Latin glyphs with it.
 *
 * The one rendered character this leaves out is the rupee sign (U+20B9), which
 * lives in latin-ext and already fell back to a system font before this change.
 */
const WANTED_SUBSETS = [{ name: "latin", startsWith: "U+0000-00FF" }];

const FAMILIES = [
  {
    file: "fraunces-roman-var",
    css: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,100..900&display=swap",
    style: "normal",
  },
  {
    file: "fraunces-italic-var",
    css: "https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,100..900&display=swap",
    style: "italic",
  },
  {
    file: "archivo-var",
    css: "https://fonts.googleapis.com/css2?family=Archivo:wght@100..900&display=swap",
    style: "normal",
  },
  {
    file: "space-mono-400",
    css: "https://fonts.googleapis.com/css2?family=Space+Mono:wght@400&display=swap",
    style: "normal",
  },
  {
    file: "space-mono-700",
    css: "https://fonts.googleapis.com/css2?family=Space+Mono:wght@700&display=swap",
    style: "normal",
  },
];

/** Split a Google Fonts stylesheet into its @font-face blocks. */
function parseFaces(css) {
  return [...css.matchAll(/@font-face\s*{([^}]*)}/g)].map((m) => {
    const body = m[1];
    const field = (k) => body.match(new RegExp(`${k}:\\s*([^;]+);`))?.[1].trim();
    return {
      style: field("font-style"),
      weight: field("font-weight"),
      range: field("unicode-range"),
      url: body.match(/src:\s*url\(([^)]+)\)/)?.[1],
    };
  });
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const written = [];

  for (const fam of FAMILIES) {
    const res = await fetch(fam.css, { headers: { "User-Agent": UA } });
    if (!res.ok) throw new Error(`${fam.file}: stylesheet ${res.status}`);
    const faces = parseFaces(await res.text());

    for (const subset of WANTED_SUBSETS) {
      const face = faces.find((f) => f.range?.startsWith(subset.startsWith));
      if (!face?.url) {
        console.warn(`  ! ${fam.file}: no ${subset.name} subset, skipped`);
        continue;
      }
      const bin = await fetch(face.url, { headers: { "User-Agent": UA } });
      if (!bin.ok) throw new Error(`${fam.file}/${subset.name}: ${bin.status}`);
      const buf = Buffer.from(await bin.arrayBuffer());
      const name = `${fam.file}-${subset.name}.woff2`;
      await writeFile(join(OUT, name), buf);
      written.push([name, buf.length]);
      console.log(`  ✓ ${name.padEnd(36)} ${(buf.length / 1024).toFixed(1)} KB`);
    }
  }

  const total = written.reduce((s, [, b]) => s + b, 0);
  console.log(
    `\n${written.length} files, ${(total / 1024).toFixed(1)} KB total, in ${OUT}`,
  );
  console.log("on disk:", (await readdir(OUT)).length, "entries");
}

main().catch((e) => {
  console.error("FAILED:", e.message);
  process.exit(1);
});
