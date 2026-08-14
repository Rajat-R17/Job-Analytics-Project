# 📊 Job Market Analytics Platform

> **AI-Powered Real-Time Intelligence for Skills, Salaries, Cities, and Hiring Trends Across India.**

An end-to-end data engineering and web analytics platform that processes **97,929 Indian job market records** (~83 MB dataset) to deliver interactive market insights, salary benchmarks, city competitiveness metrics, and skill demand heatmaps.

---

## 🌟 Key Features & Dashboard Modules

### 1. 📈 Main Analytics Dashboard (`index.html`)
- **Real-Time KPIs**: Total active job count, top-demanded skill, leading hiring state, average market salary, and top recruiters.
- **India Hiring Heatmap**: Interactive Google GeoChart illustrating state-wise hiring volume across India.
- **Visual Analytics**: Top skills demand bar chart, salary distribution doughnut chart, top companies bar chart, and experience level breakdown.

### 2. 💻 Skills Intelligence (`skills.html`)
- **Skill-to-City Matrix Heatmap**: Color-graded interactive table displaying cross-tabulated skill demand across top Indian tech hubs (Bengaluru, Hyderabad, Pune, Mumbai, Chennai, Gurugram).
- **Skill Compensation Analysis**: Identifies premium skills and projects recommended learning paths for career acceleration.

### 3. 📍 Cities Intelligence (`cities.html`)
- **Tech Hub Normalization**: Normalizes city name variations (e.g., *Bangalore* → *Bengaluru*, *Gurgaon* → *Gurugram*) and cleans sub-locality noise.
- **Work Mode Classification**: Breakdown of Onsite (89,942), Hybrid (5,774), and Remote (2,213) job postings.

### 4. 💰 Salary Intelligence (`salary.html`)
- **Midpoint Salary Calculation**: Computes accurate compensation using `(minimumSalary + maximumSalary) / 2` (Average: **₹7.55 LPA** across 33,236 disclosed salary jobs).
- **Experience vs Salary Bubble Chart**: Interactive scatter chart mapping numeric experience years against compensation in LPA.
- **Salary Band Distribution**: Clean breakdown excluding undisclosed 0-salary jobs (`0-3 LPA`, `3-6 LPA`, `6-10 LPA`, `10-15 LPA`, `15-20 LPA`, `20+ LPA`).

### 5. ⚔️ Market Comparator (`comparator.html`)
- **Side-by-Side City Analytics**: Compare any two cities on job volume, average salary, top skills, and recruiting companies.
- **Normalized 0–100 Radar Chart**: Standardized multi-axis radar chart eliminating scale distortion between job volume and salary LPA.

### 6. 🔍 Job Explorer & Search (`filters.html`)
- **Debounced Substring Search**: Case-insensitive substring matching across job titles, companies, skills, and locations.
- **Server-Side Pagination**: Efficient 25-items-per-page backend pagination preventing memory/network bloat.
- **CSV Data Export**: Export active filtered job search results directly to CSV.

---

## 🛠 System Architecture

```text
[ 📄 CSV Dataset (jobs.csv — 97.9k rows) ]
                   │
                   ▼
┌──────────────────────────────────────────────────────────┐
│          Backend Service (backend/services/dataset.js)   │
│  • In-Memory Fast Cache                                 │
│  • City Normalization Engine (Bengaluru, Gurugram, etc.) │
│  • Midpoint Salary & Numeric Experience Parser           │
│  • Server-Side Substring Search & Pagination             │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│          Express.js REST API (Port 5000)                │
│  • GET  /analytics/*  (13 Analytics Endpoints)          │
│  • POST /upload       (Secure CSV Upload & Hot Reload)  │
└──────────────────────────┬───────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────┐
│          Frontend Application (Vanilla JS + HTML5 + CSS) │
│  • Centralized Config (config.js -> API_BASE_URL)        │
│  • Route Authentication Guard (auth.js)                  │
│  • Dynamic Chart.js & Google GeoChart Visualizations     │
└──────────────────────────────────────────────────────────┘
```

---

## 🔌 Backend API Reference

| Endpoint | Method | Description | Response Payload |
| :--- | :--- | :--- | :--- |
| `/` | `GET` | API Health Check | `{ status: "online", version: "1.0.0" }` |
| `/analytics/top-skills` | `GET` | Case-normalized top skills | `[{ skill: "Python", count: 3962 }, ...]` |
| `/analytics/top-cities` | `GET` | Top 10 hiring cities | `[{ city: "Bengaluru", count: 19785 }, ...]` |
| `/analytics/salary-range` | `GET` | Disclosed salary distribution | `{ "0-3 LPA": 9791, ..., Undisclosed: 64693 }` |
| `/analytics/average-salary` | `GET` | Midpoint average compensation | `{ averageSalary: 7.55, validJobs: 33236 }` |
| `/analytics/experience-salary-bubble` | `GET` | Exp vs Salary scatter points | `[{ x: 3, y: 3.5, r: 6, city: "Bengaluru" }]` |
| `/analytics/experience-level` | `GET` | Binned experience buckets | `{ "0-2 Years": 28450, "3-5 Years": 41200, ... }` |
| `/analytics/salary-kpi-summary` | `GET` | Dynamic top skill, city & exp band | `{ bestSkill: "Cardiology", bestSkillAvgLPA: 47.9, ... }` |
| `/analytics/skills-city-heatmap` | `GET` | Skill x City matrix table data | `[{ skill: "Python", Bengaluru: 1200, ... }]` |
| `/analytics/remote-onsite` | `GET` | Work mode breakdown | `{ Onsite: 89942, Hybrid: 5774, Remote: 2213 }` |
| `/analytics/all-cities` | `GET` | Clean deduplicated city list | `["Agra", "Ahmedabad", "Bengaluru", ...]` |
| `/analytics/filter` | `GET` | Paginated job search | `{ data: [...], page: 1, limit: 25, total: 97929 }` |
| `/upload` | `POST` | CSV Upload & Dataset Hot Reload | `{ message: "...", totalRecords: 97929 }` |

---

## 💻 Local Installation & Setup

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher)
- [npm](https://www.npmjs.com/) (v9 or higher)

### 1. Clone the Repository
```bash
git clone https://github.com/aastha-yadav2/Job-Analytics.git
cd Job-Analytics
```

### 2. Install & Run Backend Server
```bash
# Option A: From root directory
npm run install:backend
npm start

# Option B: From backend directory directly
cd backend
npm install
npm start
```
The Express backend server will start on **`http://localhost:5000`** and load `backend/uploads/jobs.csv` into memory.

### 3. Launch Frontend Application
Serve the `frontend/` directory using any local server:
```bash
# Option A: Using npx serve
npx serve frontend

# Option B: Live Server extension in VS Code
```
Or open `frontend/index.html` directly in your browser.

---

## 🧪 Running Integration Tests

Run the automated integration test suite to verify dataset math, city normalization, and API endpoint schemas:
```bash
npm test
```

---

## 🌐 Production Deployment Guide

### Backend Deployment (Render / Railway / Heroku)
1. Set Environment Variables:
   - `PORT`: Injected by hosting provider (default: `5000`).
2. Build & Start Command:
   ```bash
   cd backend && npm install && npm start
   ```

### Frontend Deployment (Vercel / Netlify / GitHub Pages)
1. Deploy the `frontend/` directory.
2. Configure your production API URL in `frontend/js/config.js` or set `window.APP_CONFIG.API_BASE_URL`:
   ```html
   <script>
     window.APP_CONFIG = { API_BASE_URL: "https://your-backend-api.onrender.com" };
   </script>
   ```

---

## 🔒 Security & Quality Standards

- **Route Authentication Guard**: `auth.js` enforces session checks on dashboard pages and redirects unauthenticated traffic to `signin.html`.
- **Upload Security**: `upload.js` validates file extensions (`.csv`), enforces a 100MB size limit, sanitizes filenames to prevent path traversal, and hot-reloads dataset memory.
- **Portability**: Uses strict relative/module pathing without machine-specific hardcoded paths.

---

## 📄 License

Distributed under the ISC License. See `LICENSE` for details.