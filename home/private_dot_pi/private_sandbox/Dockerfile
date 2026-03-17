FROM node:22-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    build-essential \
    ca-certificates \
    curl \
    fd-find \
    git \
    jq \
    openssh-client \
    python3 \
    python3-pip \
    ripgrep \
    unzip \
    wget \
  && rm -rf /var/lib/apt/lists/* \
  && ln -sf /usr/bin/fdfind /usr/local/bin/fd

RUN curl -fsSL https://bun.sh/install | BUN_INSTALL=/usr/local bash

RUN npm install -g @mariozechner/pi-coding-agent \
  && npm install -g @tobilu/qmd \
  && npm install -g @plannotator/pi-extension \
  && npm install -g pi-self-learning

RUN useradd -m -s /bin/bash dev \
  && mkdir -p /home/dev/.pi/agent/sessions \
  && mkdir -p /home/dev/.pi/agent/self-learning-memory \
  && mkdir -p /home/dev/Documents/obsidian/agents \
  && mkdir -p /workspace \
  && ln -s /home/dev/.pi/agent/self-learning-memory /home/dev/Documents/obsidian/agents/self-learning

COPY .pi/agent/extensions/ /home/dev/.pi/agent/extensions/
COPY .pi/agent/skills/ /home/dev/.pi/agent/skills/
COPY .pi/agent/settings.json /home/dev/.pi/agent/settings.json
COPY .pi/agent/models.json /home/dev/.pi/agent/models.json
COPY .pi/agent/AGENTS.md /home/dev/.pi/agent/AGENTS.md

RUN chown -R dev:dev /home/dev /workspace

USER dev
WORKDIR /workspace
ENTRYPOINT ["pi"]
