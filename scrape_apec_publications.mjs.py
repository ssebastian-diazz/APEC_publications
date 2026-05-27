import { chromium } from "playwright";
import fs from "fs";

const BASE = "https://www.apec.org";
const START_URL = "https://www.apec.org/publications/listings?page=1";

const TYPE_WORDS = [
  "proceedings",
  "reports",
  "manuals",
  "brochures",
  "directories",
  "translations",
  "multimedia"
];

function cleanText(s) {
  return (s || "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTypeAndTitle(text) {
  const clean = cleanText(text);
  const lower = clean.toLowerCase();

  const foundType = TYPE_WORDS.find(t => lower.startsWith(t + " "));
  if (!foundType) {
    return { type: null, title: clean };
  }

  const title = clean.slice(foundType.length).trim();

  return {
    type: foundType,
    title
  };
}

function inferDateFromUrl(url) {
  const m = url.match(/\/publications\/(\d{4})\/(\d{2})\//);
  if (!m) return { year: null, month: null };

  return {
    year: Number(m[1]),
    month: Number(m[2])
  };
}

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

const apiLogs = [];
page.on("response", async (res) => {
  const url = res.url();
  const ct = res.headers()["content-type"] || "";

  if (
    ct.includes("application/json") ||
    url.toLowerCase().includes("publication") ||
    url.toLowerCase().includes("listing")
  ) {
    apiLogs.push({
      status: res.status(),
      url,
      contentType: ct
    });
  }
});

const results = new Map();
let emptyPages = 0;

for (let pageNum = 1; pageNum <= 300; pageNum++) {
  const url = `https://www.apec.org/publications/listings?page=${pageNum}`;
  console.log(`Scraping page ${pageNum}: ${url}`);

  await page.goto(url, { waitUntil: "networkidle", timeout: 60000 });

  const items = await page.$$eval('a[href*="/publications/"]', anchors => {
    return anchors.map(a => ({
      href: a.href,
      text: a.innerText
    }));
  });

  let added = 0;

  for (const item of items) {
    const href = item.href;

    if (!href.includes("/publications/")) continue;
    if (href.includes("/publications/listings")) continue;

    const text = item.text.replace(/\s+/g, " ").trim();
    if (!text) continue;

    const { type, title } = (() => {
      const typeWords = [
        "proceedings",
        "reports",
        "manuals",
        "brochures",
        "directories",
        "translations",
        "multimedia"
      ];

      const lower = text.toLowerCase();
      const found = typeWords.find(t => lower.startsWith(t + " "));

      if (!found) return { type: null, title: text };

      return {
        type: found,
        title: text.slice(found.length).trim()
      };
    })();

    const dateMatch = href.match(/\/publications\/(\d{4})\/(\d{2})\//);

    const row = {
      title,
      type,
      url: href,
      year: dateMatch ? Number(dateMatch[1]) : null,
      month: dateMatch ? Number(dateMatch[2]) : null,
      source_page: pageNum
    };

    if (!results.has(href)) {
      results.set(href, row);
      added++;
    }
  }

  console.log(`  found=${items.length}, new=${added}, total=${results.size}`);

  if (added === 0) emptyPages++;
  else emptyPages = 0;

  if (emptyPages >= 3) {
    console.log("Stopping: 3 pages without new publications.");
    break;
  }
}

await browser.close();

const rows = [...results.values()];

fs.writeFileSync(
  "apec_publications.json",
  JSON.stringify(rows, null, 2),
  "utf8"
);

fs.writeFileSync(
  "apec_publications.csv",
  [
    "title,type,year,month,url,source_page",
    ...rows.map(r => [
      JSON.stringify(r.title || ""),
      JSON.stringify(r.type || ""),
      r.year || "",
      r.month || "",
      JSON.stringify(r.url || ""),
      r.source_page || ""
    ].join(","))
  ].join("\n"),
  "utf8"
);

fs.writeFileSync(
  "apec_network_candidates.json",
  JSON.stringify(apiLogs, null, 2),
  "utf8"
);

console.log(`Done. Publications: ${rows.length}`);
console.log("Saved:");
console.log("- apec_publications.json");
console.log("- apec_publications.csv");
console.log("- apec_network_candidates.json");