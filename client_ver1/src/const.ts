export { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";

/**
 * 환경 변수(VITE_OAUTH_PORTAL_URL)에 의존하지 않고, 
 * 현재 브라우저가 접속 중인 도메인과 포트를 그대로 사용하여 
 * 3000번과 3001번 포트 불일치 문제를 원천 차단합니다.
 */
export const getLoginUrl = () => {
  // 현재 접속한 주소 (예: http://10.10.30.247:3000)
  const currentOrigin = window.location.origin;
  const appId = import.meta.env.VITE_APP_ID || "local";
  const redirectUri = `${currentOrigin}/api/oauth/callback`;
  const state = btoa(redirectUri);

  // 현재 도메인을 베이스로 사용
  const url = new URL(`${currentOrigin}/app-auth`);
  url.searchParams.set("appId", appId);
  url.searchParams.set("redirectUri", redirectUri);
  url.searchParams.set("state", state);
  url.searchParams.set("type", "signIn");

  return url.toString();
};
