#!/bin/bash

# 마이그레이션 스크립트
# 사용법: bash scripts/migrate.sh

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${YELLOW}=== 데이터베이스 마이그레이션 시작 ===${NC}"

# .env 파일 확인
if [ ! -f .env ]; then
  echo -e "${RED}오류: .env 파일을 찾을 수 없습니다.${NC}"
  echo "프로젝트 루트에 .env 파일을 생성하고 DATABASE_URL을 설정하세요."
  exit 1
fi

# 환경 변수 로드
export $(cat .env | grep -v '#' | xargs)

# DATABASE_URL 확인
if [ -z "$DATABASE_URL" ]; then
  echo -e "${RED}오류: DATABASE_URL 환경 변수가 설정되지 않았습니다.${NC}"
  exit 1
fi

# 데이터베이스 정보 추출 (mysql://user:password@host:port/database)
DB_USER=$(echo $DATABASE_URL | sed -n 's/.*:\/\/\([^:]*\).*/\1/p')
DB_PASSWORD=$(echo $DATABASE_URL | sed -n 's/.*:\/\/[^:]*:\([^@]*\).*/\1/p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's/.*@\([^:]*\).*/\1/p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's/.*\/\([^?]*\).*/\1/p')

# 기본값 설정
DB_PORT=${DB_PORT:-3306}

echo -e "${YELLOW}데이터베이스 정보:${NC}"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo "  User: $DB_USER"

# 마이그레이션 파일 실행
echo -e "${YELLOW}마이그레이션 파일 적용 중...${NC}"

migration_count=0
for sql_file in drizzle/000*.sql; do
  if [ -f "$sql_file" ]; then
    echo -e "${YELLOW}적용 중: $(basename $sql_file)${NC}"
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" < "$sql_file"
    if [ $? -eq 0 ]; then
      echo -e "${GREEN}✓ $(basename $sql_file) 적용 완료${NC}"
      ((migration_count++))
    else
      echo -e "${RED}✗ $(basename $sql_file) 적용 실패${NC}"
      exit 1
    fi
  fi
done

echo -e "${GREEN}=== 마이그레이션 완료! (총 $migration_count개 파일 적용) ===${NC}"

# 테이블 목록 확인
echo -e "${YELLOW}생성된 테이블:${NC}"
mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASSWORD" "$DB_NAME" -e "SHOW TABLES;"
