import { chromium } from "playwright";
import fs from "fs";

const BASE_SITE = "https://www.apec.org";
const INPUT_JSON = "apec_publications_api.json";

const OUT_JSON = "apec_publications_completed_fallback.json";
const OUT_CSV = "apec_publications_completed_fallback.csv";
const FALLBACK_REPORT = "apec_fallback_report.json";

const MISSING_PAGES = [21, 50, 71, 72];

const TYPE_WORDS = [
  "Reports",
  "Proceedings",
  "Manuals",
  "Brochures",
  "Directories",
  "Translations",
  "Multimedia"
];

const MONTH_WORDS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizeUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : BASE_SITE + url;
}

function normalizeImage(img) {
  if (!img) return null;
  return img.startsWith("http") ? img : BASE_SITE + img;
}

function cleanText(s) {
  return (s || "").replace(/\s+/g, " ").trim();
}

function parseListingText(rawText) {
  let text = cleanText(rawText);

  const typeRegex = new RegExp(`^(${TYPE_WORDS.join("|")})\\s+`, "i");
  const typeMatch = text.match(typeRegex);

  if (!typeMatch) return null;

  const type = typeMatch[1][0].toUpperCase() + typeMatch[1].slice(1).toLowerCase();
  text = text.slice(typeMatch[0].length).trim();

  const dateRegex = new RegExp(`^(${MONTH_WORDS.join("|")})\\s+(\\d{4})\\s+`, "i");
  const dateMatch = text.match(dateRegex);

  if (!dateMatch) return null;

  const month = dateMatch[1];
  const year = dateMatch[2];
  const date = `${month} ${year}`;

  const title = text.slice(dateMatch[0].length).trim();

  if (!title) return null;

  return {
    title,
    type,
    date
  };
}

function expectedIndexRange(page) {
  const start = ((page - 1) * 9) + 1;
  const end = page * 9;
  return { start, end };
}

function saveCSV(items) {
  fs.writeFileSync(
    OUT_CSV,
    [
      "index,title,type,date,url,img,source_page,source_method",
      ...items.map(r => [
        r.index ?? "",
        JSON.stringify(r.title ?? ""),
        JSON.stringify(r.type ?? ""),
        JSON.stringify(r.date ?? ""),
        JSON.stringify(r.url ?? ""),
        JSON.stringify(r.img ?? ""),
        r.source_page ?? "",
        JSON.stringify(r.source_method ?? "api")
      ].join(","))
    ].join("\n"),
    "utf8"
  );
}

const main = JSON.parse(fs.readFileSync(INPUT_JSON, "utf8"));
const items = main.items || [];

for (const item of items) {
  item.url = normalizeUrl(item.url);
  item.img = normalizeImage(item.img);
  item.source_method = item.source_method || "api";
}

const seenUrls = new Set(items.map(x => normalizeUrl(x.url)).filter(Boolean));
const fallbackReport = [];

const browser = await chromium.launch({
  headless: false
});

const page = await browser.newPage({
  viewport: { width: 1400, height: 1000 }
});

for (const pageNum of MISSING_PAGES) {
  const listingUrl = `${BASE_SITE}/publications/listings?page=${pageNum}`;
  const { start, end } = expectedIndexRange(pageNum);

  console.log("");
  console.log(`Fallback page ${pageNum}: ${listingUrl}`);
  console.log(`Expected index range: ${start}-${end}`);

  await page.goto(listingUrl, {
    waitUntil: "domcontentloaded",
    timeout: 60000
  });

  await page.waitForLoadState("networkidle").catch(() => {});
  await sleep(3000);

  const candidates = await page.$$eval('a[href*="/publications/"]', anchors => {
    return anchors.map(a => {
      const img = a.querySelector("img");
      return {
        href: a.href,
        text: a.innerText,
        img: img ? img.getAttribute("src") : null,
        imgAlt: img ? img.getAttribute("alt") : null
      };
    });
  });

  const recovered = [];

  for (const c of candidates) {
    const url = normalizeUrl(c.href);
    const text = cleanText(c.text);

    if (!url) continue;
    if (url.includes("/publications/listings")) continue;

    const parsed = parseListingText(text);
    if (!parsed) continue;

    if (seenUrls.has(url)) continue;

    seenUrls.add(url);

    const row = {
      index: null,
      title: parsed.title,
      type: parsed.type,
      date: parsed.date,
      url,
      img: normalizeImage(c.img),
      imgAlt: c.imgAlt || null,
      source_page: pageNum,
      source_method: "playwright_fallback"
    };

    recovered.push(row);
    items.push(row);
  }

  console.log(`Recovered from page ${pageNum}: ${recovered.length}`);

  for (const r of recovered) {
    console.log(`  - [${r.type}] ${r.date} — ${r.title}`);
  }

  fallbackReport.push({
    page: pageNum,
    expected_range: { start, end },
    recovered_count: recovered.length,
    recovered
  });
}

await browser.close();

items.sort((a, b) => {
  const ai = Number(a.index);
  const bi = Number(b.index);

  if (Number.isFinite(ai) && Number.isFinite(bi)) return ai - bi;
  if (Number.isFinite(ai)) return -1;
  if (Number.isFinite(bi)) return 1;

  return String(a.date || "").localeCompare(String(b.date || ""));
});

fs.writeFileSync(
  OUT_JSON,
  JSON.stringify({
    total_expected: main.total_expected,
    total_saved: items.length,
    missing_after_fallback: main.total_expected ? main.total_expected - items.length : null,
    fallback_pages_attempted: MISSING_PAGES,
    fallback_report: fallbackReport,
    items
  }, null, 2),
  "utf8"
);

saveCSV(items);

fs.writeFileSync(
  FALLBACK_REPORT,
  JSON.stringify(fallbackReport, null, 2),
  "utf8"
);

console.log("");
console.log("DONE");
console.log(`Expected: ${main.total_expected}`);
console.log(`Saved after fallback: ${items.length}`);
console.log(`Missing after fallback: ${main.total_expected - items.length}`);
console.log("Files:");
console.log(`- ${OUT_JSON}`);
console.log(`- ${OUT_CSV}`);
console.log(`- ${FALLBACK_REPORT}`);