# 🎓 Hansung AI Assistant

<div align="center">

![Hansung AI Assistant Banner](https://img.shields.io/badge/Hansung-AI%20Assistant-1e3476?style=for-the-badge&logoColor=white)

**한성대학교 학생을 위한 AI 기반 캠퍼스 챗봇**

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![tRPC](https://img.shields.io/badge/tRPC-2596BE?style=flat-square&logo=trpc&logoColor=white)](https://trpc.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-4169E1?style=flat-square&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## 📌 프로젝트 소개

**Hansung AI Assistant**는 한성대학교 학생들이 학교 생활에 필요한 정보를 빠르고 편리하게 얻을 수 있도록 만든 AI 챗봇 서비스입니다.

공지사항 검색, 수강신청 안내, 학사일정 안내, 입학 정보 등 학교 생활 전반에 걸친 질문에 자연어로 답변하며, 관리자가 업로드한 내부 문서와 실시간 웹 검색을 결합하여 정확한 정보를 제공합니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 📢 **공지사항 안내** | 학교 공지사항 페이지를 실시간 크롤링하여 최신 공지를 자연어로 안내 |
| 🎓 **입학 안내** | 입학처 홈페이지 정보를 기반으로 전형별 안내, 일정, 경쟁률 등 제공 |
| 📅 **수강신청 / 학사일정** | 수강신청 기간, 학사일정 등 날짜·절차 정보 제공 |
| 💬 **챗봇 Q&A** | LLM 기반 자연어 대화로 다양한 학교 관련 질문 응답 |
| 📄 **내부 문서 기반 답변** | 관리자가 업로드한 문서를 우선 참고하여 정확한 답변 생성 |
| 🔍 **실시간 웹 검색** | 내부 문서에 없는 정보는 DuckDuckGo 검색으로 보완 |
| 🔧 **관리자 기능** | 문서 업로드, 사용자 관리, 가입 승인 등 어드민 페이지 제공 |

---

## 🛠 기술 스택

**Frontend**
- React + TypeScript — 사용자 인터페이스 구성
- Wouter — 페이지 라우팅
- TanStack Query + tRPC — 서버 상태 관리 및 API 통신
- Tailwind CSS — 스타일링
- Vite — 빌드 도구

**Backend**
- Node.js + Express — 서버
- tRPC — 타입 안전한 API 레이어
- Drizzle ORM + PostgreSQL — 데이터베이스

**AI / 검색**
- LLM API — 자연어 응답 생성
- DuckDuckGo 웹 크롤링 — 한성대학교 관련 실시간 정보 검색
- 내부 문서 텍스트 검색 — 관리자가 업로드한 문서 기반 답변

**인증**
- bcryptjs — 비밀번호 해싱
- 세션 쿠키 — 로그인 상태 유지

---

## 🖥 사용 예시

```
👤 사용자: 수강신청은 언제야?
🤖 AI: 2025학년도 1학기 수강신청은 2월 17일(월)부터 2월 19일(수)까지입니다.
       학생처 공지사항에서 세부 일정을 확인하실 수 있습니다.

👤 사용자: 최신 공지사항 알려줘
🤖 AI: 가장 최근 공지사항 3건을 안내드립니다.
       1. [2025.04.01] 2025학년도 1학기 중간고사 일정 안내
       2. [2025.03.28] 도서관 이용 시간 변경 안내
       3. [2025.03.25] 장학금 신청 기간 안내
```

---

## 👤 관리자 기능

- 학교 공식 문서(텍스트, TXT, MD 등) 업로드 및 관리
- AI 참고 문서 등록 — 업로드된 문서를 AI가 우선 참고하여 답변
- 사용자 목록 조회 및 정보 수정
- 그룹 생성 및 멤버 관리
- 신규 가입 승인 / 거절 처리
