# HROne Employee Attendance & Analytics API

## Overview

This project implements an employee attendance and analytics REST API using FastAPI and MongoDB.

It supports employee management, attendance punch-in and punch-out, attendance regularization, and analytics for employees and departments. It also includes an explain endpoint to inspect MongoDB query execution plans.

## Features

- Employee creation and paginated employee listing
- Attendance punch-in and punch-out
- Attendance record filtering and pagination
- Attendance regularization with history tracking
- Monthly employee attendance analytics
- Department attendance summaries
- Late-comer leaderboard with ranking
- Department attendance trends with a seven-day moving average
- MongoDB query-plan inspection using execution statistics
- Input validation and appropriate HTTP status codes
- MongoDB indexes for attendance queries

## Technology Stack

- Python
- FastAPI
- MongoDB
- PyMongo
- Uvicorn

## Requirements

- Python 3.10 or newer
- MongoDB 6.0 or newer
- Dependencies listed in `requirements.txt`

## Setup and Installation

Run the following commands from the project root.

### 1. Create and activate a virtual environment

**Windows PowerShell:**

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
```

### 2. Install dependencies

```powershell
python -m pip install -r requirements.txt
```

### 3. Configure MongoDB

Make sure MongoDB is running locally. By default, the application connects to `mongodb://localhost:27017` and uses the database `attendance_db`.

If needed, create a `.env` file in the project root and configure:

- `MONGO_URI` — MongoDB connection URI
- `MONGO_DB` — database name

The application uses these defaults if the variables are not set. Do not commit `.env` files or credentials to Git.

### 4. Load the sample data (optional)

If you want to initialize the sample dataset, run:

```powershell
python sample_seed.py
```

**Note:** Run the seed script only when you intend to reload the sample data. Check its behavior before running it against a database containing records you need to preserve.

### 5. Start the API

```powershell
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

The API will be available at:

- API documentation: `http://127.0.0.1:8000/docs`
- Health check: `http://127.0.0.1:8000/health`

## Running Tests

Use the Swagger UI at `/docs` to exercise the API endpoints and inspect their responses.

Test results should be recorded only after the corresponding tests have actually been run. Include concurrency, validation, analytics edge cases, and query-plan checks when verifying the implementation.

## Project Structure

```text
candidate_kit/
├── app/
│   └── main.py
├── sample_data/
├── requirements.txt
├── openapi.yaml
├── DATA_MODEL.md
├── REVIEW.md
├── DECISIONS.md
└── README.md
```

## Submission

Submit the required project files in a public Git repository, as specified by the assignment.

Do not include `.env`, credentials, secrets, a virtual environment, or unnecessary database files.
