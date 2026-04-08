# 우분투 MySQL 서버 배포 가이드

이 문서는 우분투 서버에 ChatGPT 스타일 채팅 앱을 배포하는 방법을 설명합니다.

## 1. 사전 준비사항

### 1.1 우분투 서버 환경 설정

```bash
# 시스템 업데이트
sudo apt update && sudo apt upgrade -y

# Node.js 설치 (v22 이상)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# pnpm 설치
npm install -g pnpm

# MySQL 8.0 설치
sudo apt install -y mysql-server

# MySQL 서비스 시작
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 1.2 MySQL 데이터베이스 생성

```bash
# MySQL 접속
sudo mysql -u root

# 다음 SQL 명령어 실행:
CREATE DATABASE chatgpt_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'chatgpt_user'@'localhost' IDENTIFIED BY 'your_secure_password_here';
GRANT ALL PRIVILEGES ON chatgpt_app.* TO 'chatgpt_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

## 2. 애플리케이션 배포

### 2.1 프로젝트 클론 및 설정

```bash
# 프로젝트 디렉토리로 이동
cd /home/ubuntu
git clone <your-repository-url> chatgpt-app
cd chatgpt-app

# 의존성 설치
pnpm install
```

### 2.2 환경 변수 설정

`.env` 파일을 생성하고 다음 내용을 추가하세요:

```bash
# 데이터베이스 연결
DATABASE_URL="mysql://chatgpt_user:your_secure_password_here@localhost:3306/chatgpt_app"

# JWT 시크릿 (강력한 무작위 문자열 생성)
JWT_SECRET="your_jwt_secret_key_here_generate_a_random_string"

# Manus OAuth 설정 (필요한 경우)
VITE_APP_ID="your_app_id"
OAUTH_SERVER_URL="https://api.manus.im"
VITE_OAUTH_PORTAL_URL="https://manus.im/login"

# 포트 설정
PORT=3000
```

### 2.3 데이터베이스 마이그레이션 실행

프로젝트 루트 디렉토리에서 다음 명령어를 실행하여 모든 마이그레이션을 적용합니다:

```bash
# 마이그레이션 SQL 파일들을 MySQL에 적용
mysql -u chatgpt_user -p chatgpt_app < drizzle/0000_lively_thor.sql
mysql -u chatgpt_user -p chatgpt_app < drizzle/0001_pretty_blackheart.sql
mysql -u chatgpt_user -p chatgpt_app < drizzle/0002_tired_ender_wiggin.sql
mysql -u chatgpt_user -p chatgpt_app < drizzle/0003_thick_spyke.sql
```

또는 한 번에 모든 마이그레이션을 실행하는 스크립트를 사용할 수 있습니다:

```bash
# 마이그레이션 스크립트 실행 (아래 참고)
bash scripts/migrate.sh
```

## 3. 마이그레이션 스크립트 (자동화)

프로젝트 루트에 `scripts/migrate.sh` 파일을 생성하세요:

```bash
#!/bin/bash

# 마이그레이션 스크립트
# 사용법: bash scripts/migrate.sh

set -e

# 환경 변수 로드
if [ -f .env ]; then
  export $(cat .env | grep -v '#' | xargs)
fi

# 데이터베이스 정보 추출
DB_URL=$DATABASE_URL
# mysql://user:password@host:port/database 형식에서 정보 추출
DB_USER=$(echo $DB_URL | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
DB_PASSWORD=$(echo $DB_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
DB_HOST=$(echo $DB_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_NAME=$(echo $DB_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

echo "데이터베이스 마이그레이션 시작..."
echo "Host: $DB_HOST, Database: $DB_NAME"

# 마이그레이션 파일 실행
for sql_file in drizzle/000*.sql; do
  if [ -f "$sql_file" ]; then
    echo "적용 중: $sql_file"
    mysql -h "$DB_HOST" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$sql_file"
  fi
done

echo "마이그레이션 완료!"
```

## 4. 애플리케이션 빌드 및 실행

### 4.1 프로덕션 빌드

```bash
# 클라이언트 및 서버 빌드
pnpm build
```

### 4.2 서버 실행

```bash
# 프로덕션 모드로 실행
pnpm start

# 또는 PM2를 사용하여 백그라운드에서 실행
npm install -g pm2
pm2 start "pnpm start" --name "chatgpt-app"
pm2 save
pm2 startup
```

## 5. Nginx 리버스 프록시 설정 (선택사항)

### 5.1 Nginx 설치

```bash
sudo apt install -y nginx
```

### 5.2 Nginx 설정

`/etc/nginx/sites-available/chatgpt-app` 파일을 생성하세요:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 5.3 Nginx 활성화 및 재시작

```bash
# 사이트 활성화
sudo ln -s /etc/nginx/sites-available/chatgpt-app /etc/nginx/sites-enabled/

# Nginx 테스트
sudo nginx -t

# Nginx 재시작
sudo systemctl restart nginx
```

## 6. SSL 인증서 설정 (Let's Encrypt)

```bash
# Certbot 설치
sudo apt install -y certbot python3-certbot-nginx

# SSL 인증서 발급
sudo certbot --nginx -d your-domain.com

# 자동 갱신 설정
sudo systemctl enable certbot.timer
```

## 7. 데이터베이스 테이블 구조

### 사용자 테이블 (users)
- `id`: 사용자 ID (자동 증가)
- `username`: 사용자명 (로컬 로그인용)
- `passwordHash`: 비밀번호 해시
- `openId`: Manus OAuth ID
- `name`: 사용자 이름
- `email`: 이메일
- `loginMethod`: 로그인 방식 (local/oauth)
- `role`: 역할 (user/admin)
- `status`: 가입 상태 (pending/approved/rejected)
- `groupId`: 그룹 ID
- `createdAt`: 생성 날짜
- `updatedAt`: 수정 날짜
- `lastSignedIn`: 마지막 로그인 날짜

### 대화 테이블 (conversations)
- `id`: 대화 ID
- `userId`: 사용자 ID
- `title`: 대화 제목
- `createdAt`: 생성 날짜
- `updatedAt`: 수정 날짜

### 메시지 테이블 (messages)
- `id`: 메시지 ID
- `conversationId`: 대화 ID
- `role`: 역할 (user/assistant)
- `content`: 메시지 내용
- `createdAt`: 생성 날짜

### 사용자 그룹 테이블 (userGroups)
- `id`: 그룹 ID
- `name`: 그룹 이름
- `description`: 그룹 설명
- `createdAt`: 생성 날짜
- `updatedAt`: 수정 날짜

### 내부 파일 테이블 (internalFiles)
- `id`: 파일 ID
- `filename`: 파일명
- `fileKey`: S3 파일 키
- `fileUrl`: 파일 URL
- `mimeType`: MIME 타입
- `fileSize`: 파일 크기
- `content`: 추출된 텍스트 내용
- `uploadedBy`: 업로드한 사용자 ID
- `uploadedAt`: 업로드 날짜

## 8. 문제 해결

### 8.1 데이터베이스 연결 오류

```bash
# MySQL 상태 확인
sudo systemctl status mysql

# MySQL 로그 확인
sudo tail -f /var/log/mysql/error.log

# 데이터베이스 연결 테스트
mysql -u chatgpt_user -p -h localhost chatgpt_app -e "SELECT 1;"
```

### 8.2 포트 충돌

```bash
# 3000 포트 사용 확인
sudo lsof -i :3000

# 포트 변경 (필요시)
PORT=3001 pnpm start
```

### 8.3 권한 문제

```bash
# 파일 권한 설정
sudo chown -R ubuntu:ubuntu /home/ubuntu/chatgpt-app
chmod -R 755 /home/ubuntu/chatgpt-app
```

## 9. 모니터링 및 유지보수

### 9.1 로그 확인

```bash
# PM2 로그 확인
pm2 logs chatgpt-app

# 시스템 로그 확인
sudo journalctl -u nginx -f
```

### 9.2 정기적인 백업

```bash
# 데이터베이스 백업
mysqldump -u chatgpt_user -p chatgpt_app > backup_$(date +%Y%m%d).sql

# 백업 복원
mysql -u chatgpt_user -p chatgpt_app < backup_20260209.sql
```

## 10. 보안 권장사항

1. **강력한 비밀번호 사용**: MySQL 사용자 비밀번호는 최소 16자 이상의 복잡한 문자열 사용
2. **방화벽 설정**: 필요한 포트만 개방
3. **정기적인 업데이트**: `sudo apt update && sudo apt upgrade -y`
4. **SSL/TLS 사용**: Let's Encrypt로 무료 인증서 발급
5. **데이터베이스 백업**: 정기적인 자동 백업 설정

---

**배포 완료 후 확인사항:**
- 회원가입 페이지 접속 가능 여부
- 로그인 성공 후 채팅 페이지 이동 여부
- 관리자 페이지 접속 가능 여부
- 파일 업로드 기능 정상 작동 여부
