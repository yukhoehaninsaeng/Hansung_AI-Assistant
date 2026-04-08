# Linux 서버 배포 가이드 (초기 셋팅)

이 가이드는 ChatGPT 스타일 채팅 앱을 Linux 서버에 설치하고 실행하는 방법을 설명합니다.

---

## 📋 목차

1. [필수 요구사항]                    (#필수-요구사항)
2. [Step 1: 서버 준비]                (#step-1-서버-준비)
3. [Step 2: Node.js 설치]             (#step-2-nodejs-설치)
4. [Step 3: MySQL 설치]               (#step-3-mysql-설치)
5. [Step 4: 프로젝트 배포]             (#step-4-프로젝트-배포)
6. [Step 5: 환경 변수 설정]            (#step-5-환경-변수-설정)
7. [Step 6: 데이터베이스 초기화]        (#step-6-데이터베이스-초기화)
8. [Step 7: 애플리케이션 실행]          (#step-7-애플리케이션-실행)
9. [Step 8: PM2로 백그라운드 실행]      (#step-8-pm2로-백그라운드-실행)
10. [Step 9: Nginx 리버스 프록시 설정]  (#step-9-nginx-리버스-프록시-설정)
11. [Step 10: 도메인 매핑]              (#step-10-도메인-매핑)

---

## 필수 요구사항

- **OS**: Ubuntu 20.04 LTS 이상 (또는 CentOS 8 이상)
- **메모리**: 최소 2GB RAM
- **디스크**: 최소 10GB
- **포트**: 3000 (Node.js), 3306 (MySQL), 80/443 (Nginx)
- **인터넷**: 패키지 설치를 위한 인터넷 연결

---

## Step 1: 서버 준비

### 1.1 시스템 업데이트

```bash
sudo apt update
sudo apt upgrade -y
```

### 1.2 필수 패키지 설치

```bash
sudo apt install -y \
  curl \
  wget \
  git \
  build-essential \
  python3 \
  apt-transport-https \
  ca-certificates \
  gnupg \
  lsb-release
```

### 1.3 사용자 생성 (선택사항, 권장)

```bash
# 애플리케이션용 사용자 생성
sudo useradd -m -s /bin/bash appuser
sudo usermod -aG sudo appuser
```

---

## Step 2: Node.js 설치

### 2.1 Node.js 저장소 추가 (Ubuntu 22.04 기준)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
```

**다른 버전을 원하면:**
- Node.js 20.x: `setup_20.x`
- Node.js 18.x: `setup_18.x`

### 2.2 Node.js 설치

```bash
sudo apt install -y nodejs
```

### 2.3 설치 확인

```bash
node --version
npm --version
```

**예상 출력:**
```
v22.13.0
10.5.0
```

### 2.4 pnpm 설치 (프로젝트 패키지 매니저)

```bash
sudo npm install -g pnpm
pnpm --version
```

---

## Step 3: MySQL 설치

### 3.1 MySQL 저장소 추가

```bash
wget https://dev.mysql.com/get/mysql-apt-config_0.8.20-1_all.deb
sudo dpkg -i mysql-apt-config_0.8.20-1_all.deb
sudo apt update
```

### 3.2 MySQL 서버 설치

```bash
sudo apt install -y mysql-server
```

설치 중 root 비밀번호를 설정하라는 메시지가 나옵니다. **강력한 비밀번호를 설정하세요.**

### 3.3 MySQL 서비스 시작

```bash
sudo systemctl start mysql
sudo systemctl enable mysql
```

### 3.4 MySQL 설치 확인

```bash
mysql --version
```

### 3.5 MySQL 보안 설정 (선택사항, 권장)

```bash
sudo mysql_secure_installation
```

다음 질문에 답하세요:
- `Validate Password Component`: Y
- `Remove anonymous users`: Y
- `Disable root login remotely`: Y
- `Remove test database`: Y
- `Reload privilege tables`: Y

---

## Step 4: 프로젝트 배포

### 4.1 프로젝트 디렉토리 생성

```bash
sudo mkdir -p /opt/chatgpt-app
sudo chown appuser:appuser /opt/chatgpt-app
cd /opt/chatgpt-app
```

### 4.2 프로젝트 파일 복사

**방법 A: Git에서 클론 (권장)**

```bash
cd /opt/chatgpt-app
git clone <your-github-repo-url> .
```

**방법 B: 로컬에서 파일 전송**

```bash
# 로컬 컴퓨터에서 실행
scp -r /path/to/chatgpt-style-webapp/* user@server-ip:/opt/chatgpt-app/
```

**방법 C: 압축 파일로 전송**

```bash
# 로컬에서 압축
cd /home/ubuntu
tar -czf chatgpt-app.tar.gz chatgpt-style-webapp/

# 서버로 전송
scp chatgpt-app.tar.gz user@server-ip:/opt/chatgpt-app/

# 서버에서 압축 해제
cd /opt/chatgpt-app
tar -xzf chatgpt-app.tar.gz
```

### 4.3 디렉토리 구조 확인

```bash
ls -la /opt/chatgpt-app/
```

**예상 출력:**
```
drwxr-xr-x  client/
drwxr-xr-x  drizzle/
drwxr-xr-x  server/
drwxr-xr-x  storage/
drwxr-xr-x  shared/
-rw-r--r--  package.json
-rw-r--r--  tsconfig.json
-rw-r--r--  vite.config.ts
```

---

## Step 5: 환경 변수 설정

### 5.1 .env 파일 생성

```bash
cd /opt/chatgpt-app
sudo nano .env
```

### 5.2 다음 내용을 입력

```env
# 데이터베이스 설정
DATABASE_URL=mysql://root:your_mysql_password@localhost:3306/chatgpt_app

# JWT 보안 (강력한 랜덤 문자열 생성)
JWT_SECRET=your_very_long_random_secret_key_here_at_least_32_characters

# Node 환경
NODE_ENV=production

# 포트
PORT=3000

# OpenAI API (나중에 설정)
OPENAI_API_KEY=sk-your-api-key-here
OPENAI_MODEL=gpt-4o-mini

# Manus OAuth (현재는 비활성화, 나중에 설정 가능)
VITE_APP_ID=your_app_id
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://portal.manus.im
```

**중요한 값들:**

| 변수 | 설명 | 예시 |
|------|------|------|
| `DATABASE_URL` | MySQL 연결 문자열 | `mysql://root:password@localhost:3306/chatgpt_app` |
| `JWT_SECRET` | 세션 암호화 키 (32자 이상) | `abcdef123456789...` |
| `PORT` | 애플리케이션 포트 | `3000` |

### 5.3 파일 저장

- Nano 에디터: `Ctrl + X` → `Y` → `Enter`

### 5.4 파일 권한 설정 (보안)

```bash
sudo chmod 600 /opt/chatgpt-app/.env
```

---

## Step 6: 데이터베이스 초기화

### 6.1 MySQL 데이터베이스 생성

```bash
mysql -u root -p
```

MySQL 프롬프트에서:

```sql
CREATE DATABASE chatgpt_app CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE chatgpt_app;

-- users 테이블
CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  openId VARCHAR(64) NOT NULL UNIQUE,
  name TEXT,
  email VARCHAR(320),
  loginMethod VARCHAR(64),
  role ENUM('user', 'admin') DEFAULT 'user' NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  lastSignedIn TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- conversations 테이블
CREATE TABLE conversations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userId INT NOT NULL,
  title VARCHAR(255) NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
  INDEX (userId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- messages 테이블
CREATE TABLE messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  conversationId INT NOT NULL,
  role ENUM('user', 'assistant') NOT NULL,
  content LONGTEXT NOT NULL,
  createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
  FOREIGN KEY (conversationId) REFERENCES conversations(id) ON DELETE CASCADE,
  INDEX (conversationId)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

EXIT;
```

### 6.2 테스트 사용자 생성 (선택사항)

```bash
mysql -u root -p chatgpt_app
```

```sql
INSERT INTO users (openId, name, email, loginMethod, role) VALUES 
('test-user-001', 'Test User', 'test@example.com', 'manual', 'user');

EXIT;
```

---

## Step 7: 애플리케이션 실행

### 7.1 의존성 설치

```bash
cd /opt/chatgpt-app
pnpm install
```

**설치 시간**: 5-10분 소요

### 7.2 빌드

```bash
pnpm build
```

### 7.3 프로덕션 모드로 실행 (테스트)

```bash
pnpm start
```

**예상 출력:**
```
Server running on http://localhost:3000/
```

**테스트:**
```bash
# 다른 터미널에서
curl http://localhost:3000
```

**중지하려면**: `Ctrl + C`

---

## Step 8: PM2로 백그라운드 실행

PM2는 Node.js 애플리케이션을 백그라운드에서 자동으로 관리합니다.

### 8.1 PM2 설치

```bash
sudo npm install -g pm2
pm2 --version
```

### 8.2 PM2 설정 파일 생성

```bash
cd /opt/chatgpt-app
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'chatgpt-app',
    script: './dist/index.js',
    instances: 'max',
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G'
  }]
};
EOF
```

### 8.3 로그 디렉토리 생성

```bash
mkdir -p /opt/chatgpt-app/logs
```

### 8.4 PM2로 앱 시작

```bash
cd /opt/chatgpt-app
pm2 start ecosystem.config.js
```

### 8.5 PM2 상태 확인

```bash
pm2 status
pm2 logs chatgpt-app
```

### 8.6 PM2 자동 시작 설정 (서버 재부팅 시 자동 실행)

```bash
pm2 startup
# 출력된 명령어 실행 (sudo로 시작)

pm2 save
```

### 8.7 PM2 명령어 참고

```bash
# 앱 시작
pm2 start ecosystem.config.js

# 앱 중지
pm2 stop chatgpt-app

# 앱 재시작
pm2 restart chatgpt-app

# 앱 삭제
pm2 delete chatgpt-app

# 로그 확인
pm2 logs chatgpt-app

# 실시간 모니터링
pm2 monit
```

---

## Step 9: Nginx 리버스 프록시 설정

Nginx는 포트 80/443에서 요청을 받아 Node.js 앱(포트 3000)으로 전달합니다.

### 9.1 Nginx 설치

```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 9.2 Nginx 설정 파일 생성

```bash
sudo nano /etc/nginx/sites-available/chatgpt-app
```

다음 내용을 입력:

```nginx
upstream chatgpt_app {
    server localhost:3000;
    keepalive 64;
}

server {
    listen 80;
    server_name _;

    client_max_body_size 50M;

    location / {
        proxy_pass http://chatgpt_app;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # 정적 파일 캐싱
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

### 9.3 설정 파일 활성화

```bash
sudo ln -s /etc/nginx/sites-available/chatgpt-app /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
```

### 9.4 Nginx 설정 테스트

```bash
sudo nginx -t
```

**예상 출력:**
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

### 9.5 Nginx 재시작

```bash
sudo systemctl restart nginx
```

### 9.6 테스트

```bash
curl http://localhost
```

또는 브라우저에서: `http://server-ip`

---

## Step 10: 도메인 매핑

### 10.1 DNS 레코드 설정

도메인 제공자 (GoDaddy, Route53 등)에서:

```
A 레코드
호스트: @ (또는 www)
값: your-server-ip
TTL: 3600
```

### 10.2 Nginx 설정 업데이트

```bash
sudo nano /etc/nginx/sites-available/chatgpt-app
```

`server_name` 변경:

```nginx
server_name yourdomain.com www.yourdomain.com;
```

### 10.3 SSL 인증서 설정 (Let's Encrypt, 권장)

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```

### 10.4 자동 갱신 설정

```bash
sudo systemctl enable certbot.timer
sudo systemctl start certbot.timer
```

### 10.5 Nginx 재시작

```bash
sudo systemctl restart nginx
```

---

## 🚀 배포 완료!

### 접속 방법

- **초기**: `http://server-ip:3000`
- **Nginx 설정 후**: `http://server-ip`
- **도메인 설정 후**: `https://yourdomain.com`

### 모니터링

```bash
# PM2 상태 확인
pm2 status

# 로그 확인
pm2 logs chatgpt-app

# 시스템 리소스 확인
pm2 monit
```

### 업데이트 방법

```bash
cd /opt/chatgpt-app
git pull
pnpm install
pnpm build
pm2 restart chatgpt-app
```

---

## 🔧 문제 해결

### 포트 3000이 이미 사용 중인 경우

```bash
# 포트 확인
sudo lsof -i :3000

# 프로세스 종료
sudo kill -9 <PID>
```

### MySQL 연결 오류

```bash
# MySQL 상태 확인
sudo systemctl status mysql

# MySQL 재시작
sudo systemctl restart mysql

# 연결 테스트
mysql -u root -p -e "SELECT 1"
```

### Nginx 오류

```bash
# 설정 테스트
sudo nginx -t

# 로그 확인
sudo tail -f /var/log/nginx/error.log
```

### PM2 앱이 시작되지 않는 경우

```bash
# 로그 확인
pm2 logs chatgpt-app --err

# 앱 삭제 후 재시작
pm2 delete chatgpt-app
pm2 start ecosystem.config.js
```

---

## 📊 성능 최적화 (선택사항)

### 메모리 제한 설정

`ecosystem.config.js`에서:
```javascript
max_memory_restart: '1G'  // 1GB 이상 사용 시 자동 재시작
```

### 데이터베이스 연결 풀 설정

`.env`에 추가:
```env
DATABASE_POOL_MIN=2
DATABASE_POOL_MAX=10
```

### Nginx 캐싱 설정

이미 설정됨 (정적 파일 1년 캐싱)

---

## 🔒 보안 체크리스트

- [ ] MySQL root 비밀번호 변경
- [ ] `.env` 파일 권한 설정 (600)
- [ ] Firewall 설정 (필요한 포트만 개방)
- [ ] SSL 인증서 설정
- [ ] 정기적인 백업 설정
- [ ] 로그 모니터링

---

## 📞 추가 지원

- [PM2 공식 문서](https://pm2.keymetrics.io/)
- [Nginx 공식 문서](https://nginx.org/en/docs/)
- [MySQL 공식 문서](https://dev.mysql.com/doc/)
- [Node.js 공식 문서](https://nodejs.org/en/docs/)
