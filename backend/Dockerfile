FROM python:3.9-slim

# Install required system packages
RUN apt-get update && apt-get install -y \
    gcc \
    libpcap-dev \
    tshark \
    net-tools \
    iproute2 \
    procps \
    iputils-ping \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Create and set working directory
WORKDIR /app

# Copy requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set container command
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--reload"] 