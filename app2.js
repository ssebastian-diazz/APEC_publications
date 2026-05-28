const DATA_URL = "data/publications_clean.json";
const SUMMARY_URL = "data/publications_summary.json";

const state = {
  data: [],
  summary: null,
  filtered: [],
  visibleCount: 40,
  charts: {}
};

const els = {
  kpiTotal: document.getElementById("kpiTotal"),
  kpiReports: document.getElementById("kpiReports"),
  kpiProceedings: document.getElementById("kpiProceedings"),
  kpiManuals: document.getElementById("kpiManuals"),
  kpiYears: document.getElementById("kpiYears"),

  typeFilter: document.getElementById("typeFilter"),
  yearFilter: document.getElementById("yearFilter"),
  monthFilter: document.getElementById("monthFilter"),
  sortFilter: document.getElementById("sortFilter"),
  searchInput: document.getElementById("searchInput"),
  resetFilters: document.getElementById("resetFilters"),

  resultCount: document.getElementById("resultCount"),
  resultsList: document.getElementById("resultsList"),
  loadMore: document.getElementById("loadMore"),

  termsOverTimeSelect: document.getElementById("termsOverTimeSelect"),
  termsYearSelect: document.getElementById("termsYearSelect")
};

const MONTHS = [
  { value: 1, label: "January" },
  { value: 2, label: "February" },
  { value: 3, label: "March" },
  { value: 4, label: "April" },
  { value: 5, label: "May" },
  { value: 6, label: "June" },
  { value: 7, label: "July" },
  { value: 8, label: "August" },
  { value: 9, label: "September" },
  { value: 10, label: "October" },
  { value: 11, label: "November" },
  { value: 12, label: "December" }
];

const STOPWORDS = new Set([

  "january", "february", "march", "april", "may", "june",
  "july", "august", "september", "october", "november", "december",
  "the", "and", "for", "with", "from", "into", "through", "within", "towards",
  "toward", "apec", "report", "reports", "project", "workshop", "summary",
  "study", "regional", "region", "economies", "economy", "final", "review",
  "analysis", "best", "practices", "development", "promoting", "enhancing",
  "building", "capacity", "policy", "policies", "program", "initiative",
  "public", "private", "dialogue", "conference", "seminar", "international",
  "using", "based", "new", "via", "its", "their", "our", "of", "in", "on",
  "to", "a", "an", "by", "as", "at", "is", "are", "good", "towards"
]);

function formatNumber(n) {
  return new Intl.NumberFormat("en-US").format(n || 0);
}

function uniqueSorted(values) {
  return [...new Set(values.filter(v => v !== null && v !== undefined && v !== ""))]
    .sort((a, b) => String(a).localeCompare(String(b)));
}

function countBy(items, keyFn) {
  const map = new Map();

  for (const item of items) {
    const key = keyFn(item);
    if (key === null || key === undefined || key === "") continue;
    map.set(key, (map.get(key) || 0) + 1);
  }

  return map;
}

function sortEntriesNumeric(entries) {
  return [...entries].sort((a, b) => Number(a[0]) - Number(b[0]));
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function getSearchBlob(item) {
  return normalizeText([
    item.title,
    item.type,
    item.date,
    item.year,
    item.month_name,
    ...(item.topic_tags || [])
  ].join(" "));
}

function createOption(value, label) {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = label;
  return option;
}

async function init() {
  const [data, summary] = await Promise.all([
    fetch(DATA_URL).then(res => res.json()),
    fetch(SUMMARY_URL).then(res => res.json())
  ]);

  state.data = data;
  state.summary = summary;

  populateFilters();
  populateTermsYearSelect();
  renderKPIs();
  bindEvents();
  applyFilters();
}

function populateFilters() {
  const types = uniqueSorted(state.data.map(d => d.type));
  const years = [...new Set(state.data.map(d => d.year).filter(Boolean))]
    .sort((a, b) => b - a);

  for (const type of types) {
    els.typeFilter.appendChild(createOption(type, type));
  }

  for (const year of years) {
    els.yearFilter.appendChild(createOption(year, year));

    if (els.termsYearSelect) {
      els.termsYearSelect.appendChild(createOption(year, year));
    }
  }

  for (const month of MONTHS) {
    els.monthFilter.appendChild(createOption(month.value, month.label));
  }
}


function populateTermsYearSelect() {
  if (!els.termsYearSelect) return;

  const existingValues = new Set(
    [...els.termsYearSelect.options].map(option => option.value)
  );

  const years = [...new Set(state.data.map(d => d.year).filter(Boolean))]
    .sort((a, b) => b - a);

  for (const year of years) {
    if (!existingValues.has(String(year))) {
      els.termsYearSelect.appendChild(createOption(year, year));
    }
  }
}

function renderKPIs() {
  const byType = state.summary?.byType || {};
  const yearMin = state.summary?.year_min || "—";
  const yearMax = state.summary?.year_max || "—";

  els.kpiTotal.textContent = formatNumber(state.summary?.total_clean || state.data.length);
  els.kpiReports.textContent = formatNumber(byType.Reports);
  els.kpiProceedings.textContent = formatNumber(byType.Proceedings);
  els.kpiManuals.textContent = formatNumber(byType.Manuals);
  els.kpiYears.textContent = `${yearMin}–${yearMax}`;
}

function bindEvents() {
  els.typeFilter.addEventListener("change", () => {
    state.visibleCount = 40;
    applyFilters();
  });

  els.yearFilter.addEventListener("change", () => {
    state.visibleCount = 40;
    applyFilters();
  });

  els.monthFilter.addEventListener("change", () => {
    state.visibleCount = 40;
    applyFilters();
  });

  els.sortFilter.addEventListener("change", () => {
    state.visibleCount = 40;
    applyFilters();
  });

  els.searchInput.addEventListener("input", debounce(() => {
    state.visibleCount = 40;
    applyFilters();
  }, 160));

  els.resetFilters.addEventListener("click", () => {
    els.typeFilter.value = "";
    els.yearFilter.value = "";
    els.monthFilter.value = "";
    els.sortFilter.value = "newest";
    els.searchInput.value = "";
    if (els.termsOverTimeSelect) els.termsOverTimeSelect.value = "default";
    if (els.termsYearSelect) els.termsYearSelect.value = "";
    state.visibleCount = 40;
    applyFilters();
  });

  els.loadMore.addEventListener("click", () => {
    state.visibleCount += 40;
    renderResults();
  });

  if (els.termsOverTimeSelect) {
    els.termsOverTimeSelect.addEventListener("change", () => {
      renderTermsOverTimeChart(state.filtered);
    });
  }

  if (els.termsYearSelect) {
    els.termsYearSelect.addEventListener("change", () => {
      renderTermsChart(state.filtered);
    });
  }
}

function debounce(fn, delay) {
  let timer = null;

  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function applyFilters() {
  const type = els.typeFilter.value;
  const year = els.yearFilter.value ? Number(els.yearFilter.value) : null;
  const month = els.monthFilter.value ? Number(els.monthFilter.value) : null;
  const query = normalizeText(els.searchInput.value.trim());
  const sort = els.sortFilter.value;

  let filtered = state.data.filter(item => {
    if (type && item.type !== type) return false;
    if (year && item.year !== year) return false;
    if (month && item.month !== month) return false;
    if (query && !getSearchBlob(item).includes(query)) return false;
    return true;
  });

  filtered = sortData(filtered, sort);

  state.filtered = filtered;

  renderCharts(filtered);
  renderResults();
}

function sortData(items, sort) {
  const arr = [...items];

  if (sort === "oldest") {
    return arr.sort((a, b) => {
      if ((a.year || 0) !== (b.year || 0)) return (a.year || 0) - (b.year || 0);
      if ((a.month || 0) !== (b.month || 0)) return (a.month || 0) - (b.month || 0);
      return String(a.title).localeCompare(String(b.title));
    });
  }

  if (sort === "title_az") {
    return arr.sort((a, b) => String(a.title).localeCompare(String(b.title)));
  }

  if (sort === "title_za") {
    return arr.sort((a, b) => String(b.title).localeCompare(String(a.title)));
  }

  return arr.sort((a, b) => {
    if ((b.year || 0) !== (a.year || 0)) return (b.year || 0) - (a.year || 0);
    if ((b.month || 0) !== (a.month || 0)) return (b.month || 0) - (a.month || 0);
    return String(a.title).localeCompare(String(b.title));
  });
}

function renderResults() {
  const shown = state.filtered.slice(0, state.visibleCount);

  els.resultCount.textContent = `${formatNumber(state.filtered.length)} records found`;

  if (!shown.length) {
    els.resultsList.innerHTML = `<div class="empty-state">No publications match the selected filters.</div>`;
    els.loadMore.style.display = "none";
    return;
  }

  els.resultsList.innerHTML = shown.map(item => {
    const tags = (item.topic_tags || []).slice(0, 4);

    return `
      <article class="result-item">
        <div>
          <h3 class="result-title">${escapeHtml(item.title)}</h3>

          <div class="result-meta">
            <span class="badge">${escapeHtml(item.type || "Unknown")}</span>
            <span class="badge light">${escapeHtml(item.date || "No date")}</span>
            ${tags.map(tag => `<span class="badge light">${escapeHtml(tag)}</span>`).join("")}
          </div>
        </div>

        <a class="result-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noopener">
          Open
        </a>
      </article>
    `;
  }).join("");

  els.loadMore.style.display = state.filtered.length > state.visibleCount ? "inline-flex" : "none";
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function renderCharts(items) {
  renderYearChart(items);
  renderTypeChart(items);
  renderTypeYearChart(items);
  renderMonthChart(items);
  renderTermsChart(items);
  renderTermsOverTimeChart(items);
}

function chartDefaults() {
  Chart.defaults.font.family = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  Chart.defaults.color = "#64748b";
  Chart.defaults.borderColor = "#e3eaf2";
}

function destroyChart(name) {
  if (state.charts[name]) {
    state.charts[name].destroy();
  }
}

function renderYearChart(items) {
  destroyChart("year");

  const entries = sortEntriesNumeric(countBy(items, d => d.year).entries());
  const labels = entries.map(([year]) => year);
  const values = entries.map(([, count]) => count);

  state.charts.year = new Chart(document.getElementById("yearChart"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Publications",
        data: values,
        backgroundColor: "#163b73",
        borderRadius: 4
      }]
    },
    options: baseChartOptions({
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
        y: { beginAtZero: true }
      }
    })
  });
}

function renderTypeChart(items) {
  destroyChart("type");

  const entries = [...countBy(items, d => d.type).entries()]
    .sort((a, b) => b[1] - a[1]);

  state.charts.type = new Chart(document.getElementById("typeChart"), {
    type: "doughnut",
    data: {
      labels: entries.map(([type]) => type),
      datasets: [{
        data: entries.map(([, count]) => count),
        backgroundColor: [
          "#163b73",
          "#2f6da8",
          "#6b8fb9",
          "#9aadc4",
          "#c6d4e5",
          "#dce6f2"
        ],
        borderColor: "#ffffff",
        borderWidth: 2
      }]
    },
    options: baseChartOptions({
      cutout: "68%",
      radius: "82%",
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 10,
            usePointStyle: true
          }
        }
      }
    })
  });
}

function renderTypeYearChart(items) {
  destroyChart("typeYear");

  const years = [...new Set(items.map(d => d.year).filter(Boolean))]
    .sort((a, b) => a - b);

  const types = ["Reports", "Proceedings", "Manuals", "Brochures", "Directories", "Multimedia"];
  const colorMap = {
    Reports: "#163b73",
    Proceedings: "#2f6da8",
    Manuals: "#6b8fb9",
    Brochures: "#9aadc4",
    Directories: "#b7c6d8",
    Multimedia: "#d2dce8"
  };

  const datasets = types
    .filter(type => items.some(d => d.type === type))
    .map(type => ({
      label: type,
      data: years.map(year => items.filter(d => d.year === year && d.type === type).length),
      borderColor: colorMap[type],
      backgroundColor: colorMap[type],
      tension: 0.25,
      pointRadius: 1.6,
      borderWidth: 2
    }));

  state.charts.typeYear = new Chart(document.getElementById("typeYearChart"), {
    type: "line",
    data: {
      labels: years,
      datasets
    },
    options: baseChartOptions({
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 10,
            usePointStyle: true
          }
        }
      },
      scales: {
        x: { ticks: { maxRotation: 0, autoSkip: true, maxTicksLimit: 12 } },
        y: { beginAtZero: true }
      }
    })
  });
}

function renderMonthChart(items) {
  destroyChart("month");

  const counts = new Map(MONTHS.map(m => [m.value, 0]));

  for (const item of items) {
    if (item.month) counts.set(item.month, (counts.get(item.month) || 0) + 1);
  }

  state.charts.month = new Chart(document.getElementById("monthChart"), {
    type: "bar",
    data: {
      labels: MONTHS.map(m => m.label.slice(0, 3)),
      datasets: [{
        label: "Publications",
        data: MONTHS.map(m => counts.get(m.value) || 0),
        backgroundColor: "#2f6da8",
        borderRadius: 4
      }]
    },
    options: baseChartOptions({
      plugins: {
        legend: { display: false }
      },
      scales: {
        y: { beginAtZero: true }
      }
    })
  });
}

function renderTermsChart(items) {
  destroyChart("terms");

  const canvas = document.getElementById("termsChart");
  if (!canvas) return;

  const selectedYear = els.termsYearSelect?.value ? Number(els.termsYearSelect.value) : null;
  const sourceItems = selectedYear
    ? items.filter(item => item.year === selectedYear)
    : items;

  const limit = selectedYear ? 10 : 16;
  const terms = extractTopTerms(sourceItems, limit);

  const selectedTermStillVisible = terms.some(d => d.term === state.selectedTopTerm);
  if (!selectedTermStillVisible) {
    state.selectedTopTerm = null;
  }

  state.charts.terms = new Chart(canvas, {
    type: "bar",
    data: {
      labels: terms.map(d => d.term),
      datasets: [{
        label: selectedYear ? `Frequency in ${selectedYear}` : "Frequency",
        data: terms.map(d => d.count),
        backgroundColor: "#163b73",
        hoverBackgroundColor: "#1d4f91",
        borderRadius: 3,
        barThickness: selectedYear ? 12 : 10,
        maxBarThickness: 14,
        categoryPercentage: 0.72,
        barPercentage: 0.78
      }]
    },
    options: baseChartOptions({
      indexAxis: "y",
      interaction: {
        mode: "nearest",
        axis: "y",
        intersect: false
      },
      onHover: (event, elements, chart) => {
        const points = chart.getElementsAtEventForMode(
          event,
          "nearest",
          { intersect: false, axis: "y" },
          true
        );

        chart.canvas.style.cursor = points.length ? "pointer" : "default";
      },
      onClick: (event, elements, chart) => {
        const points = chart.getElementsAtEventForMode(
          event,
          "nearest",
          { intersect: false, axis: "y" },
          true
        );

        if (!points.length) return;

        const index = points[0].index;
        const term = terms[index]?.term;

        if (!term) return;

        state.selectedTopTerm = term;
        renderTermTitlesPanel(sourceItems, term, selectedYear);
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: context => {
              const term = context[0]?.label || "";
              return selectedYear ? `${term} - ${selectedYear}` : term;
            },
            afterBody: () => "Click to read matching titles"
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true
        },
        y: {
          ticks: {
            autoSkip: false,
            font: {
              size: selectedYear ? 12 : 11
            }
          }
        }
      }
    })
  });

  if (state.selectedTopTerm) {
    renderTermTitlesPanel(sourceItems, state.selectedTopTerm, selectedYear);
  } else {
    renderTermTitlesPanel(sourceItems, null, selectedYear);
  }
}

function tokenizeTitleForTerms(title) {
  const allowedShortTerms = new Set([
    "ai", "esg", "sme", "smes", "msme", "msmes", "5g"
  ]);

  const canonicalMap = new Map([
    ["digitalisation", "digitalization"],
    ["decarbonisation", "decarbonization"],
    ["smes", "sme"],
    ["msmes", "msme"],
    ["technologies", "technology"],
    ["policies", "policy"],
    ["regulations", "regulation"],
    ["standards", "standard"],
    ["investments", "investment"],
    ["farmers", "farmer"],
    ["sustainable", "sustainability"],
    ["environmental", "environment"],
    ["financing", "finance"],
    ["financial", "finance"],
    ["innovative", "innovation"],
    ["innovations", "innovation"]
  ]);

  const monthTerms = new Set([
    "january", "february", "march", "april", "may", "june",
    "july", "august", "september", "october", "november", "december"
  ]);

  return normalizeText(title)
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map(w => w.trim())
    .filter(Boolean)
    .map(w => canonicalMap.get(w) || w)
    .filter(w => {
      if (monthTerms.has(w)) return false;
      if (STOPWORDS.has(w)) return false;
      if (allowedShortTerms.has(w)) return true;
      if (w.length < 4) return false;
      if (/^\d+$/.test(w)) return false;
      return true;
    });
}

function extractTopTerms(items, limit = 16) {
  const counts = new Map();

  for (const item of items) {
    const words = tokenizeTitleForTerms(item.title);

    for (const word of words) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function getTermMatches(items, term, limit = 10) {
  if (!term) return [];

  const matches = [];

  for (const item of items) {
    const tokens = tokenizeTitleForTerms(item.title);
    const occurrences = tokens.filter(token => token === term).length;

    if (occurrences > 0) {
      matches.push({
        occurrences,
        title: item.title,
        type: item.type,
        date: item.date,
        url: item.url
      });
    }
  }

  return matches
    .sort((a, b) => b.occurrences - a.occurrences || String(a.title).localeCompare(String(b.title)))
    .slice(0, limit);
}

function renderTermTitlesPanel(items, term, selectedYear) {
  const panel = document.getElementById("termDetail");
  const titleEl = document.getElementById("termDetailTitle");
  const metaEl = document.getElementById("termDetailMeta");
  const listEl = document.getElementById("termDetailList");

  if (!panel || !titleEl || !metaEl || !listEl) return;

  if (!term) {
    titleEl.textContent = "Select a term";
    metaEl.textContent = "Click a bar above to inspect up to 10 matching publication titles.";
    listEl.innerHTML = "";
    panel.classList.remove("active");
    return;
  }

  const matches = getTermMatches(items, term, 10);
  const yearLabel = selectedYear ? ` in ${selectedYear}` : "";

  titleEl.textContent = `Titles containing “${term}”${yearLabel}`;
  metaEl.textContent = `${matches.length} title${matches.length === 1 ? "" : "s"} shown. Matches use the same normalized title terms as the chart.`;

  if (!matches.length) {
    listEl.innerHTML = `<div class="term-detail-empty">No matching titles found for this term under the current filters.</div>`;
    panel.classList.add("active");
    return;
  }

  listEl.innerHTML = matches.map((item, index) => `
    <article class="term-title-item">
      <div>
        <span class="term-title-index">${index + 1}</span>
        <strong>${escapeHtml(item.title)}</strong>
        <p>${escapeHtml(item.type || "Unknown")} · ${escapeHtml(item.date || "No date")} · ${item.occurrences} occurrence${item.occurrences === 1 ? "" : "s"}</p>
      </div>

      <a href="${escapeAttribute(item.url)}" target="_blank" rel="noopener">Open</a>
    </article>
  `).join("");

  panel.classList.add("active");
}

function getTermGroups() {
  return {
    default: [
      { label: "Trade", terms: ["trade", "customs", "supply chain", "value chain"] },
      { label: "Digital", terms: ["digital", "technology", "artificial intelligence", "big data", "5g", "cyber"] },
      { label: "Sustainability", terms: ["sustainable", "sustainability", "climate", "green", "carbon", "environment"] },
      { label: "Energy", terms: ["energy", "hydrogen", "electric vehicles", "fuel cell", "bioenergy"] },
      { label: "SMEs", terms: ["sme", "smes", "msme", "msmes", "small and medium", "micro"] }
    ],

    policy: [
      { label: "Regulation", terms: ["regulation", "regulatory", "governance", "compliance"] },
      { label: "Standards", terms: ["standards", "standard", "conformity"] },
      { label: "Trade", terms: ["trade", "customs", "rules of origin"] },
      { label: "Investment", terms: ["investment", "investor", "capital"] },
      { label: "Finance", terms: ["finance", "financial", "financing"] }
    ],

    technology: [
      { label: "Digital", terms: ["digital", "digitalization", "digitalisation"] },
      { label: "AI", terms: ["artificial intelligence", " ai ", "smart technology"] },
      { label: "Data", terms: ["data", "big data", "information"] },
      { label: "Cyber", terms: ["cyber", "cybersecurity"] },
      { label: "Innovation", terms: ["innovation", "innovative"] }
    ],

    sustainability: [
      { label: "Climate", terms: ["climate", "adaptation", "mitigation"] },
      { label: "Energy", terms: ["energy", "hydrogen", "bioenergy"] },
      { label: "Green", terms: ["green", "decarbonisation", "decarbonization", "carbon"] },
      { label: "Environment", terms: ["environment", "environmental", "ecosystem"] },
      { label: "Sustainable", terms: ["sustainable", "sustainability"] }
    ],

    inclusion: [
      { label: "SMEs", terms: ["sme", "smes", "msme", "msmes", "small and medium"] },
      { label: "Women", terms: ["women", "woman", "gender", "female"] },
      { label: "Health", terms: ["health", "healthcare", "aging", "diabetes", "obesity"] },
      { label: "Agriculture", terms: ["agriculture", "agricultural", "farmers", "food"] },
      { label: "Inclusive", terms: ["inclusive", "inclusion", "empowerment"] }
    ]
  };
}

function renderTermsOverTimeChart(items) {
  destroyChart("termsOverTime");

  const canvas = document.getElementById("termsOverTimeChart");
  if (!canvas) return;

  const selectedGroup = els.termsOverTimeSelect?.value || "default";
  const groups = getTermGroups();
  const selectedTerms = groups[selectedGroup] || groups.default;

  const years = [...new Set(items.map(d => d.year).filter(Boolean))]
    .sort((a, b) => a - b);

  const colorMap = [
    "#163b73",
    "#2f6da8",
    "#5d82ad",
    "#8aa3bf",
    "#b7c6d8",
    "#d2dce8"
  ];

  const datasets = selectedTerms.map((group, index) => {
    return {
      label: group.label,
      data: years.map(year => {
        return items.filter(item => {
          if (item.year !== year) return false;

          const title = normalizeText(item.title);
          const tags = normalizeText((item.topic_tags || []).join(" "));
          const blob = `${title} ${tags}`;

          return group.terms.some(term => blob.includes(normalizeText(term)));
        }).length;
      }),
      borderColor: colorMap[index % colorMap.length],
      backgroundColor: colorMap[index % colorMap.length],
      tension: 0.28,
      pointRadius: 1.8,
      borderWidth: 2
    };
  });

  state.charts.termsOverTime = new Chart(canvas, {
    type: "line",
    data: {
      labels: years,
      datasets
    },
    options: baseChartOptions({
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 10,
            usePointStyle: true
          }
        }
      },
      scales: {
        x: {
          ticks: {
            maxRotation: 0,
            autoSkip: true,
            maxTicksLimit: 12
          }
        },
        y: {
          beginAtZero: true
        }
      }
    })
  });
}

function extractTopTerms(items, limit = 16) {
  const counts = new Map();

  const allowedShortTerms = new Set([
    "ai", "esg", "sme", "smes", "msme", "msmes", "5g"
  ]);

  const canonicalMap = new Map([
    ["digitalisation", "digitalization"],
    ["decarbonisation", "decarbonization"],
    ["smes", "sme"],
    ["msmes", "msme"],
    ["technologies", "technology"],
    ["policies", "policy"],
    ["regulations", "regulation"],
    ["standards", "standard"],
    ["investments", "investment"],
    ["farmers", "farmer"],
    ["sustainable", "sustainability"],
    ["environmental", "environment"],
    ["financing", "finance"],
    ["financial", "finance"],
    ["innovative", "innovation"],
    ["innovations", "innovation"]
  ]);

  for (const item of items) {
    const title = normalizeText(item.title)
      .replace(/&/g, " and ")
      .replace(/[^a-z0-9\s-]/g, " ");

    const words = title
      .split(/\s+/)
      .map(w => w.trim())
      .filter(Boolean)
      .map(w => canonicalMap.get(w) || w)
      .filter(w => {
        const monthTerms = new Set([
          "january", "february", "march", "april", "may", "june",
          "july", "august", "september", "october", "november", "december"
        ]);

        if (monthTerms.has(w)) return false;
        if (STOPWORDS.has(w)) return false;
        if (allowedShortTerms.has(w)) return true;
        if (w.length < 4) return false;
        if (/^\d+$/.test(w)) return false;
        return true;
      });

    for (const word of words) {
      counts.set(word, (counts.get(word) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, limit)
    .map(([term, count]) => ({ term, count }));
}

function baseChartOptions(extra = {}) {
  return deepMerge({
    responsive: true,
    maintainAspectRatio: false,
    resizeDelay: 150,
    devicePixelRatio: 1.5,
    interaction: {
      intersect: false,
      mode: "index"
    },
    plugins: {
      tooltip: {
        backgroundColor: "#0b1220",
        titleColor: "#ffffff",
        bodyColor: "#dbeafe",
        padding: 10,
        cornerRadius: 8
      }
    },
    scales: {
      x: {
        grid: {
          display: false
        }
      },
      y: {
        grid: {
          color: "#e8eef5"
        }
      }
    }
  }, extra);
}

function deepMerge(target, source) {
  const output = { ...target };

  for (const key of Object.keys(source)) {
    if (
      source[key] &&
      typeof source[key] === "object" &&
      !Array.isArray(source[key])
    ) {
      output[key] = deepMerge(output[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }

  return output;
}

chartDefaults();

init().catch(error => {
  console.error(error);
  document.body.innerHTML = `
    <main class="page">
      <section class="panel">
        <div class="empty-state">
          Could not load the publications dataset. Check that the JSON files are inside the data folder.
        </div>
      </section>
    </main>
  `;
});
