import { createTRPCReact } from "@trpc/react-query";
import type { AppRouter } from "../../../server/routers";

export const trpc = createTRPCReact<AppRouter>();

/**
 * API 기본 주소를 현재 접속한 도메인으로 고정하여 
 * 포트 번호가 달라도 통신이 가능하게 합니다.
 */
export const getBaseUrl = () => {
  if (typeof window !== "undefined") return ""; // 브라우저에서는 상대 경로 사용
  return `http://localhost:${process.env.PORT ?? 3001}`;
};
