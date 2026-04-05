FROM python:3.11-slim

WORKDIR /app

# psycopg2-binary 빌드에 필요한 최소 패키지
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev gcc \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

CMD ["python", "-u", "app.py"]
