# 📊 Job Market Analytics

A full-stack **Job Market Analytics Dashboard** that analyzes real-world job market data to provide insights into **job demand, skills, salaries, experience levels, companies, and locations**.

The application processes a large job dataset and presents interactive analytics through a clean web dashboard.

---

## 🚀 Features

### 📈 Dashboard Analytics

* Total job listings
* Top hiring companies
* Most demanded skills
* Top job locations
* State-wise job distribution
* Experience-level distribution
* Salary distribution
* Average salary analytics
* Remote / Hybrid / Onsite analysis

### 🧠 Skills Analytics

* Top demanded skills
* Case-insensitive skill normalization
* Skill demand comparison
* Skill vs city analysis
* Interactive skill-city visualization

### 💰 Salary Analytics

* Salary range distribution
* Average salary calculation
* Salary by experience
* Salary by city
* Salary KPI summary
* Salary-aware filtering
* Handles undisclosed salaries separately

### 🏙️ Location Analytics

* Top hiring cities
* Top hiring states
* City normalization
* Bengaluru/Bangalore normalization
* Gurugram/Gurgaon normalization
* City comparison
* City-based filtering

### 🔎 Job Search & Filters

* Search jobs by title
* Case-insensitive substring search
* Filter by skill
* Filter by city
* Filter by salary
* Filter by experience
* Sorting
* Pagination
* Empty-state handling

### 📁 CSV Upload

* Upload a new CSV dataset
* File validation
* Required-column validation
* Safe file handling
* Dataset reload after successful upload
* Previous dataset preserved if upload/processing fails

### 🔐 Authentication

* Sign up
* Sign in
* Logout
* Protected dashboard pages
* Authentication guards

---

# 🛠️ Tech Stack

## Frontend

* HTML5
* CSS3
* JavaScript (ES6+)
* Chart.js
* Google Charts

## Backend

* Node.js
* Express.js
* csv-parser
* Multer
* CORS

## Data

* CSV dataset
* In-memory analytics processing
* Approximately 97,929 job records in the included dataset

---

# 🏗️ Architecture

```text
                    ┌──────────────────────┐
                    │     CSV Dataset      │
                    │   jobs.csv / Data    │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │    Node.js Backend   │
                    │      Express.js      │
                    └──────────┬───────────┘
                               │
              ┌────────────────┼────────────────┐
              │                │                │
              ▼                ▼                ▼
       Analytics APIs     Filter APIs      Upload API
              │                │                │
              └────────────────┼────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │      Frontend        │
                    │ HTML + CSS + JS      │
                    └──────────┬───────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │ Interactive Dashboard│
                    │ Charts • KPIs • Jobs │
                    └──────────────────────┘
```

---

# 📂 Project Structure

```text
Job-Market-Analytics/
│
├── backend/
│   ├── routes/
│   │   ├── analytics.js
│   │   └── upload.js
│   │
│   ├── uploads/
│   │   └── jobs.csv
│   │
│   ├── server.js
│   ├── package.json
│   └── package-lock.json
│
├── frontend/
│   ├── css/
│   │   └── ...
│   │
│   ├── js/
│   │   ├── app.js
│   │   ├── skills.js
│   │   ├── cities.js
│   │   ├── salary.js
│   │   ├── comparator.js
│   │   └── filters.js
│   │
│   ├── index.html
│   ├── signin.html
│   ├── signup.html
│   ├── skills.html
│   ├── cities.html
│   ├── salary.html
│   ├── comparator.html
│   └── filters.html
│
├── .gitignore
└── README.md
```

---

# 📊 Dataset

The application is designed to work with a large job-market CSV dataset.

The dataset contains fields such as:

```text
title
jobId
currency
jobUploaded
companyName
tagsAndSkills
experience
salary
location
companyId
ReviewsCount
AggregateRating
jobDescription
minimumSalary
maximumSalary
minimumExperience
maximumExperience
```

The analytics layer uses these fields to calculate:

* Job demand
* Skill demand
* Salary statistics
* Experience distribution
* Location statistics
* Company hiring activity
* Salary by city
* Salary by experience

---

# ⚙️ Prerequisites

Make sure you have installed:

* Node.js 18+
* npm
* Git

Check your versions:

```bash
node --version
npm --version
git --version
```

---

# 🚀 Installation

## 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd Job-Market-Analytics
```

---

## 2. Install backend dependencies

```bash
cd backend
npm install
```

---

## 3. Verify the dataset

Make sure the dataset exists at:

```text
backend/uploads/jobs.csv
```

If you are using your own dataset, make sure it contains the required columns.

---

# ▶️ Run the Backend

From the `backend` directory:

```bash
npm start
```

The backend should start on:

```text
http://localhost:5000
```

You can verify the server using:

```text
http://localhost:5000/
```

Expected response:

```text
Job Market Analytics Backend Running 🚀
```

---

# 🌐 Run the Frontend

The frontend consists of static HTML, CSS, and JavaScript files.

You can serve the frontend using a local static server.

For example, with VS Code:

```text
Live Server
```

or another static HTTP server.

Do not open the HTML files directly using:

```text
file:///
```

because browser security restrictions can interfere with API requests.

---

# 🔗 API Configuration

The frontend uses a centralized API configuration.

For local development:

```text
Frontend → http://localhost:5000
```

For production:

```text
Frontend → YOUR_DEPLOYED_BACKEND_URL
```

Do not hardcode `localhost:5000` throughout individual JavaScript files.

---

# 🔌 API Endpoints

## Health Check

```http
GET /
```

Returns:

```text
Job Market Analytics Backend Running 🚀
```

---

## Upload Dataset

```http
POST /upload
```

Form field:

```text
file
```

The uploaded CSV is validated before becoming the active dataset.

---

## Top Skills

```http
GET /analytics/top-skills
```

Returns the most demanded skills.

---

## Salary Range

```http
GET /analytics/salary-range
```

Returns salary distribution based on valid disclosed salaries.

Undisclosed salaries are handled separately rather than being incorrectly classified as `0-3 LPA`.

---

## Average Salary

```http
GET /analytics/average-salary
```

Calculates average salary using valid salary information.

Where both minimum and maximum salary are available:

```text
Average = (Minimum Salary + Maximum Salary) / 2
```

---

## Job Filters

```http
GET /analytics/filter
```

Supports filtering and pagination.

Example:

```text
/analytics/filter?page=1&limit=25
```

---

## All Cities

```http
GET /analytics/all-cities
```

Returns normalized and deduplicated city names.

---

## Experience Salary Bubble

```http
GET /analytics/experience-salary-bubble
```

Returns experience and salary data for the bubble visualization.

Experience is parsed using numeric experience fields where available.

---

## Top Companies

```http
GET /analytics/top-companies
```

Returns companies with the highest number of job listings.

---

## Top States

```http
GET /analytics/top-states
```

Returns job distribution across Indian states.

---

## Skills × City

```http
GET /analytics/skills-city-heatmap
```

Returns skill demand across major cities.

---

## Salary KPI Summary

```http
GET /analytics/salary-kpi-summary
```

Provides salary-related insights including:

* Highest-paying skill
* Highest-paying city
* Highest-paying experience group

All values are calculated dynamically from the dataset.

---

## Top Cities

```http
GET /analytics/top-cities
```

Returns the highest-volume job markets after city normalization.

Common variants such as:

```text
Bangalore → Bengaluru
Gurgaon → Gurugram
```

are normalized.

---

## Experience Level

```http
GET /analytics/experience-level
```

Returns grouped experience-level statistics suitable for visualization.

---

## Remote / Hybrid / Onsite

```http
GET /analytics/remote-onsite
```

Returns work-mode distribution based on available dataset information.

---

# 📐 Analytics Methodology

## Salary

Invalid salary values such as:

```text
0
null
undefined
negative values
```

are not treated as valid salary information.

Undisclosed salaries are kept separate from salary bands.

---

## Experience

Experience is derived primarily from:

```text
minimumExperience
maximumExperience
```

rather than unreliable string matching.

Experience is grouped into readable ranges for visualization.

---

## Skills

Skills are normalized for:

* casing
* whitespace
* duplicate representations

For example:

```text
Sales
sales
SALES
```

are treated as the same skill.

---

## Cities

Common location variations are normalized.

Examples:

```text
Bangalore → Bengaluru
Gurgaon → Gurugram
```

Sub-locality information is cleaned where appropriate.

---

# 🔐 Security

The application includes protections for:

* CSV upload validation
* File type validation
* File size validation
* Safe file handling
* Required-column validation
* Input validation
* CORS configuration
* Environment-based configuration

Never commit:

```text
.env
API keys
passwords
tokens
credentials
```

to GitHub.

---

# ⚡ Performance

Because the dataset contains tens of thousands of records, the application avoids unnecessarily sending the entire dataset to the browser.

Filtering supports pagination:

```text
page
limit
```

Example:

```text
/analytics/filter?page=1&limit=25
```

This reduces:

* API response size
* browser memory usage
* network overhead
* rendering time

---

# 🧪 Testing

Before deployment, verify:

### Backend

```bash
cd backend
npm install
npm start
```

### Frontend

Run the frontend through a local HTTP server.

### Functional Testing

Test:

* Authentication
* Dashboard
* Skills analytics
* City analytics
* Salary analytics
* Comparator
* Job filters
* Search
* Pagination
* CSV upload
* Empty results
* Invalid input

### Browser Testing

Check browser DevTools for:

```text
Console errors
Network errors
404 responses
500 responses
CORS errors
Failed API requests
```

---

# 🐛 Troubleshooting

## Backend does not start

Run:

```bash
cd backend
npm install
npm start
```

If dependencies are corrupted:

```bash
rm -rf node_modules package-lock.json
npm install
```

On Windows, delete `node_modules` and `package-lock.json` manually if required, then run:

```bash
npm install
```

---

## Frontend cannot connect to backend

Check that the backend is running:

```text
http://localhost:5000/
```

Then verify the frontend API configuration.

For production, make sure the frontend API base URL points to the deployed backend instead of localhost.

---

## Charts are empty

Check:

1. Backend is running.
2. Dataset exists.
3. API endpoint returns data.
4. Browser Network tab shows successful API requests.
5. Dataset contains the required columns.

---

## CSV upload fails

Verify that:

* the file is CSV
* the file size is within the allowed limit
* required columns are present
* the CSV is correctly formatted

---

# 🚀 Production Deployment

The application uses a separate frontend/backend architecture.

Recommended architecture:

```text
                    INTERNET
                       │
             ┌─────────┴─────────┐
             │                   │
             ▼                   ▼
       Frontend Hosting     Backend Hosting
       Static Website       Node.js / Express
             │                   │
             └─────────┬─────────┘
                       │
                       ▼
                   Job Dataset
```

Before deploying, configure:

```text
API_BASE_URL
```

to the publicly accessible backend URL.

Do not use:

```text
http://localhost:5000
```

in production.

---

# 🌍 Deployment Checklist

Before deployment:

* [ ] Backend starts successfully
* [ ] Frontend builds successfully
* [ ] Dataset is available
* [ ] API URL is configured
* [ ] CORS is configured
* [ ] Environment variables are configured
* [ ] No API keys are exposed
* [ ] No localhost API URLs remain
* [ ] Authentication guards work
* [ ] CSV upload works
* [ ] Pagination works
* [ ] Charts display real data
* [ ] No hardcoded analytics remain
* [ ] Browser console has no critical errors
* [ ] API endpoints return successful responses
* [ ] Mobile layout works

---

# 📌 Key Design Principles

This project follows these principles:

### Data-driven

Analytics are calculated from the actual dataset rather than hardcoded values.

### Scalable

Pagination and efficient data processing reduce unnecessary browser/network load.

### Reliable

Invalid input and missing data are handled gracefully.

### Maintainable

API configuration and shared logic are centralized wherever possible.

### Deployment-ready

The frontend and backend can communicate using a configurable production API URL.

---

# 📄 License

This project is developed for educational, analytical, and demonstration purposes.

Add your preferred open-source license here if required.

---

# 👩‍💻 Author

**Rajat Raturi**

BCA Specialization in AI & DS

---

## ⭐ Project Summary

**Job Market Analytics** transforms a large job-market dataset into an interactive analytics platform that helps users understand:

> **What skills are in demand, where jobs are concentrated, how salaries vary, what experience employers seek, and which companies are hiring.**

The platform combines **data processing, REST APIs, interactive visualizations, filtering, and job-market intelligence** into one full-stack application.
