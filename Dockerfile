FROM oven/bun:1.3.9

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 python3-venv python3-pip python-is-python3 \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --production

COPY classifier-api/requirements.txt classifier-api/requirements.txt
RUN python3 -m venv /opt/venv \
  && /opt/venv/bin/pip install --no-cache-dir -r classifier-api/requirements.txt

ENV PATH="/opt/venv/bin:$PATH"

COPY . .

ENV NODE_ENV=production

EXPOSE 8000

CMD ["./start.sh"]
