# 1. Base Image: Official lightweight Python 3.12 Linux environment
FROM python:3.12-slim

# 2. Environment Variables
# PYTHONDONTWRITEBYTECODE: Prevents Python from writing .pyc files to disk
# PYTHONUNBUFFERED: Ensures logs are sent directly to terminal/cloud stdout without buffering
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

# 3. Set Working Directory inside container
WORKDIR /app

# 4. Install System Packages needed for PostgreSQL & C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# 5. Copy requirements file and install dependencies
# Doing this before copying the whole app leverages Docker's layer caching for ultra-fast builds
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 6. Copy remaining backend source code into container
COPY . .

# 7. Expose default port
EXPOSE 8000

# 8. Default start command (dynamically uses $PORT provided by Railway / cloud host)
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
