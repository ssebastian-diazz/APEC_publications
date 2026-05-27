import fs from "fs";

const INPUT = "apec_publications_completed_fallback.json";
// Si prefieres usar el bruto original:
// const INPUT = "apec_publications_api.json";

const OUT_JSON = "publications_clean.json";
const OUT_CSV = "publications_clean.csv";
const SUMMARY_JSON = "publications_summary.json";

const BASE_SITE = "https://www.apec.org";

const monthMap = {
  January: 1,
  February: 2,
  March: 3,
  April: 4,
  May: 5,
  June: 6,
  July: 7,
  August: 8,
  September: 9,
  October: 10,
  November: 11,
  December: 12
};

function normalizeUrl(url) {
  if (!url) return null;
  return url.startsWith("http") ? url : BASE_SITE + url;
}

function normalizeImg(img) {
  if (!img) return null;
  return img.startsWith("http") ? img : BASE_SITE + img;
}

function parseDate(dateText) {
  if (!dateText) {
    return {
      month_name: null,
      month: null,
      year: null,
      date_sort: null
    };
  }

  const parts = dateText.trim().split(/\s+/);
  const month_name = parts[0] || null;
  const year = parts[1] ? Number(parts[1]) : null;
  const month = monthMap[month_name] || null;

  return {
    month_name,
    month,
    year,
    date_sort: year && month ? `${year}-${String(month).padStart(2, "0")}` : null
  };
}

function slugFromUrl(url) {
  if (!url) return null;
  const clean = url.split("?")[0].replace(/\/$/, "");
  return clean.split("/").pop();
}

function cleanTitle(title) {
  return (title || "")
    .replace(/\s+/g, " ")
    .trim();
}

function inferTopicTags(title) {
  const t = title.toLowerCase();

  const rules = [
    ["digital", ["digital", "artificial intelligence", " ai ", "big data", "5g", "smart", "cyber", "data", "technology"]],
    ["trade", ["trade", "customs", "supply chain", "value chain", "tariff", "rules of origin"]],
    ["sustainability", ["sustainable", "sustainability", "green", "climate", "carbon", "environment", "decarbonisation", "energy transition"]],
    ["health", ["health", "aging", "diabetes", "obesity", "patient", "cancer", "healthcare"]],
    ["women", ["women", "woman", "gender", "female"]],
    ["smes", ["sme", "msme", "micro", "small and medium"]],
    ["finance", ["finance", "financial", "financing", "investment", "capital"]],
    ["agriculture", ["agriculture", "agricultural", "food", "farmers", "fisheries", "aquaculture"]],
    ["energy", ["energy", "hydrogen", "fuel cell", "electric vehicles", "bioenergy"]],
    ["regulation", ["regulatory", "regulation", "governance", "standards", "compliance"]]
  ];

  return rules
    .filter(([tag, keywords]) => keywords.some(k => t.includes(k)))
    .map(([tag]) => tag);
}

const raw = JSON.parse(fs.readFileSync(INPUT, "utf8"));
const items = raw.items || [];

const seen = new Set();

const clean = items
  .map(item => {
    const url = normalizeUrl(item.url);
    const parsedDate = parseDate(item.date);
    const title = cleanTitle(item.title);

    return {
      index: item.index ?? null,
      title,
      type: item.type || null,
      date: item.date || null,
      year: parsedDate.year,
      month: parsedDate.month,
      month_name: parsedDate.month_name,
      date_sort: parsedDate.date_sort,
      url,
      slug: slugFromUrl(url),
      img: normalizeImg(item.img),
      imgAlt: item.imgAlt || null,
      source_page: item.source_page ?? null,
      source_method: item.source_method || "api",
      topic_tags: inferTopicTags(title)
    };
  })
  .filter(item => {
    if (!item.url) return false;
    if (seen.has(item.url)) return false;
    seen.add(item.url);
    return true;
  })
  .sort((a, b) => {
    if (a.year !== b.year) return (b.year || 0) - (a.year || 0);
    if (a.month !== b.month) return (b.month || 0) - (a.month || 0);
    return (a.index || 999999) - (b.index || 999999);
  });

const byType = {};
const byYear = {};
const byYearType = {};
const byTopic = {};

for (const item of clean) {
  byType[item.type] = (byType[item.type] || 0) + 1;
  byYear[item.year] = (byYear[item.year] || 0) + 1;

  const yt = `${item.year || "unknown"}|${item.type || "unknown"}`;
  byYearType[yt] = (byYearType[yt] || 0) + 1;

  for (const tag of item.topic_tags) {
    byTopic[tag] = (byTopic[tag] || 0) + 1;
  }
}

const summary = {
  total_expected: raw.total_expected ?? null,
  total_clean: clean.length,
  missing_vs_expected: raw.total_expected ? raw.total_expected - clean.length : null,
  coverage_pct: raw.total_expected ? Number(((clean.length / raw.total_expected) * 100).toFixed(2)) : null,
  year_min: Math.min(...clean.map(x => x.year).filter(Boolean)),
  year_max: Math.max(...clean.map(x => x.year).filter(Boolean)),
  byType,
  byYear,
  byTopic,
  failed_pages_original: raw.failed_pages || raw.still_failed_pages || []
};

fs.writeFileSync(OUT_JSON, JSON.stringify(clean, null, 2), "utf8");

fs.writeFileSync(
  OUT_CSV,
  [
    "index,title,type,date,year,month,month_name,date_sort,url,slug,img,source_page,source_method,topic_tags",
    ...clean.map(r => [
      r.index ?? "",
      JSON.stringify(r.title ?? ""),
      JSON.stringify(r.type ?? ""),
      JSON.stringify(r.date ?? ""),
      r.year ?? "",
      r.month ?? "",
      JSON.stringify(r.month_name ?? ""),
      JSON.stringify(r.date_sort ?? ""),
      JSON.stringify(r.url ?? ""),
      JSON.stringify(r.slug ?? ""),
      JSON.stringify(r.img ?? ""),
      r.source_page ?? "",
      JSON.stringify(r.source_method ?? ""),
      JSON.stringify((r.topic_tags || []).join("|"))
    ].join(","))
  ].join("\n"),
  "utf8"
);

fs.writeFileSync(SUMMARY_JSON, JSON.stringify(summary, null, 2), "utf8");

console.log("DONE");
console.log(`Clean records: ${clean.length}`);
console.log(`Coverage: ${summary.coverage_pct}%`);
console.log("Files:");
console.log(`- ${OUT_JSON}`);
console.log(`- ${OUT_CSV}`);
console.log(`- ${SUMMARY_JSON}`);