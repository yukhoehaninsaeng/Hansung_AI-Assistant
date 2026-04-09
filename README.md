# 🎓 Hansung AI Assistant

<div align="center">

![Hansung AI Assistant Banner](https://img.shields.io/badge/Hansung-AI%20Assistant-0064A4?style=for-the-badge&logo=openai&logoColor=white)

**한성대학교 학생을 위한 AI 기반 캠퍼스 챗봇**

[![Node.js](https://img.shields.io/badge/Node.js-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![React](https://img.shields.io/badge/React-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![OpenAI](https://img.shields.io/badge/OpenAI%20API-412991?style=flat-square&logo=openai&logoColor=white)](https://openai.com/)
[![RAG](https://img.shields.io/badge/RAG-Document%20Search-FF6B6B?style=flat-square)](https://en.wikipedia.org/wiki/Retrieval-augmented_generation)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](LICENSE)

</div>

---

## 📌 프로젝트 소개

**Hansung AI Assistant**는 한성대학교 학생들이 학교 생활에 필요한 정보를 빠르고 편리하게 얻을 수 있도록 만든 AI 챗봇 서비스입니다.

공지사항 검색, 수강신청 안내, 학사일정 안내 등 학교 생활 전반에 걸친 질문에 자연어로 답변하며, PDF·문서 기반 RAG(검색 증강 생성) 기술을 활용해 정확한 정보를 제공합니다.

---

## ✨ 주요 기능

| 기능 | 설명 |
|------|------|
| 📢 **공지사항 안내** | 학교 공지사항을 자연어로 질문하면 관련 내용을 즉시 안내 |
| 📅 **수강신청 / 학사일정** | 수강신청 기간, 학사일정 등 날짜·절차 정보 제공 |
| 💬 **챗봇 Q&A** | OpenAI API 기반 자연어 대화로 다양한 학교 관련 질문 응답 |
| 📄 **PDF / 문서 기반 RAG** | 학교 공식 문서를 벡터화하여 정확한 근거 기반 답변 생성 |
| 🔧 **관리자 기능** | 문서 업로드, 공지 관리 등 어드민 페이지 제공 |

---

## 🛠 기술 스택

### Frontend
- **React** — 사용자 인터페이스 구성
- **React Router** — 페이지 라우팅

### Backend
- **Node.js / Express** — REST API 서버

### AI / 검색
- **OpenAI API** — GPT 기반 자연어 응답 생성
- **RAG (Retrieval-Augmented Generation)** — PDF·문서 벡터 검색 후 답변 생성

---

## 📁 프로젝트 구조

```
Hansung_AI-Assistant/
├── client/                 # React 프론트엔드
│   ├── src/
│   │   ├── components/     # UI 컴포넌트
│   │   ├── pages/          # 페이지 (챗봇, 관리자 등)
│   │   └── App.jsx
│   └── package.json
├── server/                 # Node.js 백엔드
│   ├── routes/             # API 라우터
│   ├── services/           # OpenAI, RAG 서비스
│   ├── data/               # 업로드 문서 저장
│   └── index.js
└── README.md
```


---

## 🖥 사용 예시

```
👤 사용자: 수강신청은 언제야?
🤖 AI: 2025학년도 1학기 수강신청은 2월 17일(월)부터 2월 19일(수)까지입니다.
       학생처 공지사항에서 세부 일정을 확인하실 수 있습니다.

👤 사용자: 졸업요건 PDF 보여줘
🤖 AI: 졸업요건 문서를 기반으로 안내드립니다. 총 130학점 이상 이수 및
       전공 60학점 이상 취득이 필요하며...
```

---

## 👤 관리자 기능

- 학교 공식 PDF·문서 업로드 및 벡터 인덱싱
- 유저 및 그룹관리
- 가입승인

---

