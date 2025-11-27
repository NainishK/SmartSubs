# Subscription Manager

A full-stack application to manage subscriptions, track costs, and get smart recommendations.

## Project Structure

- **Backend**: FastAPI (Python)
- **Frontend**: Next.js (TypeScript/React)

## Getting Started

### Prerequisites

- Python 3.8+
- Node.js 18+

### 1. Start the Backend

Open a terminal and run:

```bash
cd backend
# Activate virtual environment (Windows)
venv\Scripts\activate
# Start the server
uvicorn main:app --reload --port 8000
```

The backend API will be available at `http://localhost:8000`.
API Documentation: `http://localhost:8000/docs`.

### 2. Start the Frontend

Open a **new** terminal and run:

```bash
cd frontend
# Install dependencies (first time only)
npm install
# Start the development server
npm run dev
```

The frontend application will be available at `http://localhost:3000`.

## Features

- **Dashboard**: View active subscriptions and monthly costs.
- **Search**: Find movies and TV shows (powered by TMDB).
- **Watchlist**: Save content you want to watch.
- **Recommendations**: 
    - **Watch Now**: See what's on your current subscriptions.
    - **Cancel Unused**: Identify subscriptions you aren't using.
