import fs from "fs";

const BASE_API = "https://www.apec.org/apecapi/publication/getpublications";
const BASE_SITE = "https://www.apec.org";

const OUT_JSON = "apec_publications_api.json";
const OUT_CSV = "apec_publications_api.csv";
const FAILED_JSON = "apec_failed_pages.json";

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function buildUrl({ page, keyword = "", type = "", fromDate = "", toDate = "", sort = "" }) {
  const params = new URLSearchParams({
    keyword,
    type,
    fromDate,
    toDate,
    sort,
    page: String(page)
  });

  return `${BASE_API}?${params.toString()}`;
}

function fullImageUrl(img) {
  if (!img) return null;
  return img.startsWith("http") ? img : BASE_SITE + img;
}

async function fetchJsonWithRetry(url, page, maxRetries = 5) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          "accept": "application/json, text/javascript, */*; q=0.01",
          "user-agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/148 Safari/537.36",
          "referer": "https://www.apec.org/publications/listings"
        }
      });

      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`HTTP ${res.status}. Body preview: ${body.slice(0, 200)}`);
      }

      return await res.json();
    } catch (err) {
      console.log(`  retry ${attempt}/${maxRetries} failed on page ${page}: ${err.message}`);

      if (attempt === maxRetries) {
        throw err;
      }

      await sleep(1000 * attempt);
    }
  }
}

function saveOutputs(all, failedPages, meta = {}) {
  fs.writeFileSync(
    OUT_JSON,
    JSON.stringify(
      {
        ...meta,
        total_saved: all.length,
        failed_pages: failedPages,
        items: all
      },
      null,
      2
    ),
    "utf8"
  );

  fs.writeFileSync(
    OUT_CSV,
    [
      "index,title,type,date,url,img,source_page",
      ...all.map(r => [
        r.index ?? "",
        JSON.stringify(r.title ?? ""),
        JSON.stringify(r.type ?? ""),
        JSON.stringify(r.date ?? ""),
        JSON.stringify(r.url ?? ""),
        JSON.stringify(r.img ?? ""),
        r.source_page ?? ""
      ].join(","))
    ].join("\n"),
    "utf8"
  );

  fs.writeFileSync(
    FAILED_JSON,
    JSON.stringify(failedPages, null, 2),
    "utf8"
  );
}

const all = [];
const seenUrls = new Set();
const failedPages = [];

let totalPages = null;
let total = null;

for (let page = 1; ; page++) {
  const url = buildUrl({ page });

  console.log(`Fetching page ${page}: ${url}`);

  try {
    const data = await fetchJsonWithRetry(url, page, 5);

    if (totalPages === null) totalPages = data.totalpages;
    if (total === null) total = data.total;

    for (const item of data.items || []) {
      if (seenUrls.has(item.url)) continue;
      seenUrls.add(item.url);

      all.push({
        index: item.index,
        title: item.title,
        type: item.type,
        date: item.date,
        url: item.url,
        img: fullImageUrl(item.img),
        imgAlt: item.imgAlt || null,
        source_page: page
      });
    }

    console.log(`  items=${data.items?.length || 0}, total_saved=${all.length}, totalpages=${data.totalpages}`);

    saveOutputs(all, failedPages, {
      total_expected: total,
      total_pages: totalPages,
      last_successful_page: page
    });

    if (page >= data.totalpages) break;

    await sleep(300);
  } catch (err) {
    console.log(`  FAILED page ${page}: ${err.message}`);

    failedPages.push({
      page,
      url,
      error: err.message
    });

    saveOutputs(all, failedPages, {
      total_expected: total,
      total_pages: totalPages,
      last_attempted_page: page
    });

    // No matamos todo el scraping. Seguimos con la siguiente página.
    if (totalPages !== null && page >= totalPages) break;

    await sleep(1500);
  }
}

console.log("");
console.log("DONE");
console.log(`Expected total: ${total}`);
console.log(`Saved total: ${all.length}`);
console.log(`Failed pages: ${failedPages.length}`);
console.log("Files:");
console.log(`- ${OUT_JSON}`);
console.log(`- ${OUT_CSV}`);
console.log(`- ${FAILED_JSON}`);