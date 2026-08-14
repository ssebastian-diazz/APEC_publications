<a id="readme-top"></a>

<!-- PROJECT SHIELDS -->
<p align="center">
  <a href="https://github.com/ssebastian-diazz/APEC_publications/issues"><img src="https://img.shields.io/github/issues/ssebastian-diazz/APEC_publications.svg?style=for-the-badge" alt="Issues"></a>
  <a href="https://github.com/ssebastian-diazz/APEC_publications/blob/main/LICENSE.txt"><img src="https://img.shields.io/badge/license-Unlicense-black.svg?style=for-the-badge" alt="License"></a>
  <a href="https://www.linkedin.com/in/sebasti%C3%A1n-d%C3%ADaz-prado-0780731bb/"><img src="https://img.shields.io/badge/-LinkedIn-black.svg?style=for-the-badge&logo=linkedin&colorB=555" alt="LinkedIn"></a>
</p>

<!-- PROJECT LOGO -->
<br />
<div align="center">
  <h3 align="center">APEC Publications Explorer</h3>

  <p align="center">
    Recovering, cleaning, and visualizing three decades of APEC's public publications archive
    <br />
    <a href="#about-the-project"><strong>Explore the analysis »</strong></a>
    <br />
    <br />
    <a href="https://ssebastian-diazz.github.io/APEC_publications/">View Demo</a>
    &middot;
    <a href="https://github.com/ssebastian-diazz/APEC_publications/issues/new?labels=bug">Report Bug</a>
    &middot;
    <a href="https://github.com/ssebastian-diazz/APEC_publications/issues/new?labels=enhancement">Request Feature</a>
  </p>
</div>

<!-- TABLE OF CONTENTS -->
<details>
  <summary>Table of Contents</summary>
  <ol>
    <li><a href="#about-the-project">About The Project</a></li>
    <li><a href="#built-with">Built With</a></li>
    <li><a href="#getting-started">Getting Started</a>
      <ul>
        <li><a href="#prerequisites">Prerequisites</a></li>
        <li><a href="#installation">Installation</a></li>
      </ul>
    </li>
    <li><a href="#usage">Usage</a></li>
    <li><a href="#data--methodology">Data &amp; Methodology</a></li>
    <li><a href="#roadmap">Roadmap</a></li>
    <li><a href="#contact">Contact</a></li>
  </ol>
</details>

<!-- ABOUT THE PROJECT -->
## About The Project

APEC publishes its full report archive through a public endpoint, but with no way to browse it by theme, track how publication types have shifted over time, or see which policy terms have persisted (or faded) across three decades. This project scrapes that endpoint, reconciles the records against duplicate and malformed entries, and turns the result into a browsable explorer.

The explorer surfaces:

- **KPIs at a glance** — total publications, breakdown by type (reports, proceedings, manuals), and the year range covered.
- **Volume over time** — publications by year, and how the mix of publication types has evolved.
- **Seasonality** — the monthly rhythm of when APEC publishes.
- **Title term analysis** — the most recurring terms in publication titles, clickable to inspect the underlying titles, plus tracked themes (policy & regulation, technology & digitalization, sustainability & energy, inclusion & SMEs) charted over time.
- **A filterable, searchable table** of every publication, with CSV export.

The underlying dataset recovers 2,883 of the 2,919 publications reported by APEC's endpoint — an estimated 98.77% coverage — after cleaning and deduplication.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

### Built With

* [![Python][Python]][Python-url]
* [![Node.js][Node.js]][Node-url]
* [![JavaScript][JavaScript]][JavaScript-url]
* [![Chart.js][Chartjs]][Chartjs-url]

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- GETTING STARTED -->
## Getting Started

The project has two parts: a scraping/cleaning pipeline (Python and Node.js) that produces the dataset, and a static explorer (HTML/CSS/JS) that reads it.

### Prerequisites

* Python 3.9+ with pip
* Node.js 18+

### Installation

1. Clone the repo
   ```sh
   git clone https://github.com/ssebastian-diazz/APEC_publications.git
   cd APEC_publications
   ```
2. Install Python dependencies (for the scraping/cleaning scripts)
   ```sh
   pip install -r requirements.txt
   ```
3. Install Node dependencies (for the fetch scripts)
   ```sh
   npm install
   ```
4. Serve the explorer locally
   ```sh
   python3 -m http.server
   ```
5. Open `http://localhost:8000` in your browser

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- USAGE EXAMPLES -->
## Usage

- Use the **Filters** panel to narrow by type, year, month, or a keyword search across title, type, and topic.
- Click any bar in **Top recurring terms in titles** to open the matching publication titles for that term.
- Switch the **Terms over time** dropdown between the default themes and a specific tracked theme to see how it has evolved since 1993.
- Download the current cleaned dataset directly from the **Publications** table as CSV.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- DATA & METHODOLOGY -->
## Data & Methodology

Source data comes from APEC's public publications endpoint, covering 1993–2026. The scraping scripts (`scrape_apec_publications.mjs.py`, `get_pub.mjs`) pull the raw records; failed and fallback pages are logged separately (`apec_failed_pages.json`, `apec_fallback_report.json`) and reconciled during cleaning. The cleaned dataset (`data/publications_clean.csv`) is what powers the explorer and is available for direct download from the app.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- ROADMAP -->
## Roadmap

- [ ] Re-run the scraper to close the remaining ~1.2% coverage gap
- [ ] Add a topic-clustering view beyond keyword term tracking
- [ ] Publish the cleaning pipeline as a scheduled job to keep the dataset current

See the [open issues](https://github.com/ssebastian-diazz/APEC_publications/issues) for a full list of proposed features and known issues.

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- CONTACT -->
## Contact

Sebastián Díaz Prado — [sebastiaan.diaz.prado@gmail.com](mailto:sebastiaan.diaz.prado@gmail.com) — [LinkedIn](https://www.linkedin.com/in/sebasti%C3%A1n-d%C3%ADaz-prado-0780731bb/)

Project Link: [https://github.com/ssebastian-diazz/APEC_publications](https://github.com/ssebastian-diazz/APEC_publications)

<p align="right">(<a href="#readme-top">back to top</a>)</p>

<!-- MARKDOWN LINKS & IMAGES -->
[Python]: https://img.shields.io/badge/python-3776AB?style=for-the-badge&logo=python&logoColor=white
[Python-url]: https://www.python.org/
[Node.js]: https://img.shields.io/badge/node.js-339933?style=for-the-badge&logo=node.js&logoColor=white
[Node-url]: https://nodejs.org/
[JavaScript]: https://img.shields.io/badge/javascript-000000?style=for-the-badge&logo=javascript&logoColor=F7DF1E
[JavaScript-url]: https://developer.mozilla.org/en-US/docs/Web/JavaScript
[Chartjs]: https://img.shields.io/badge/chart.js-FF6384?style=for-the-badge&logo=chart.js&logoColor=white
[Chartjs-url]: https://www.chartjs.org/
