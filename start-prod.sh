#!/bin/bash

# .env 파일의 내용을 직접 환경 변수로 설정합니다.
export DATABASE_URL="mysql://root:bumjin2025!@@localhost:3306/chatgpt_app"
export JWT_SECRET="bumjin_chat_app_secret_key_2026_very_secure_string_minimum_32_chars"
export OAUTH_SERVER_URL="http://10.10.30.247:3001"
export VITE_OAUTH_PORTAL_URL="http://10.10.30.247:3001"
export VITE_APP_ID="local"
export VITE_ANALYTICS_ENDPOINT="http://10.10.30.247:3001"
export VITE_ANALYTICS_WEBSITE_ID="local"
export VITE_APP_TITLE="Bumjin Chat"
export VITE_APP_LOGO="/logo.png"
export PORT="3001"
export OPENAI_API_KEY="sk-your-api-key-here"
export OPENAI_MODEL="gpt-4o-mini"
export OWNER_OPEN_ID="admin"
export OWNER_NAME="Admin"

# 프로덕션 모드로 빌드 및 서버를 실행합니다.
cd /opt/bumjin_chatapp/Bumjin_ChatApp
rm -rf dist
pnpm build
NODE_ENV=production node dist/index.js
