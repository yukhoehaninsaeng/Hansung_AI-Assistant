import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { ForbiddenError } from "@shared/_core/errors";
import { parse as parseCookieHeader } from "cookie";
import type { Request } from "express";
import { SignJWT, jwtVerify } from "jose";
import type { User } from "../../drizzle/schema";
import * as db from "../db";
import { ENV } from "./env";

/**
 * 로컬 전용 세션 페이로드
 */
export type SessionPayload = {
  userId: number;
  username: string;
};

class SDKServer {
  private parseCookies(cookieHeader: string | undefined) {
    if (!cookieHeader) {
      return new Map<string, string>();
    }
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }

  private getSessionSecret() {
    const secret = ENV.cookieSecret || "bumjin_chat_app_secret_key_2026_very_secure_string_minimum_32_chars";
    return new TextEncoder().encode(secret);
  }

  /**
   * 로컬 사용자를 위한 세션 토큰 생성
   */
  async createSessionToken(
    userId: number,
    username: string,
    options: { expiresInMs?: number } = {}
  ): Promise<string> {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1000);
    const secretKey = this.getSessionSecret();

    return new SignJWT({
      userId,
      username,
    })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(expirationSeconds)
      .sign(secretKey);
  }

  /**
   * 세션 토큰 검증
   */
  async verifySession(
    cookieValue: string | undefined | null
  ): Promise<SessionPayload | null> {
    if (!cookieValue) {
      return null;
    }

    try {
      const secretKey = this.getSessionSecret();
      const { payload } = await jwtVerify(cookieValue, secretKey, {
        algorithms: ["HS256"],
      });
      
      const { userId, username } = payload as Record<string, any>;

      if (typeof userId !== "number" || typeof username !== "string") {
        return null;
      }

      return { userId, username };
    } catch (error) {
      console.warn("[Auth] Session verification failed:", String(error));
      return null;
    }
  }

  /**
   * 요청 인증 (로컬 전용)
   */
  async authenticateRequest(req: Request): Promise<User> {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);

    if (!session) {
      throw ForbiddenError("로그인이 필요합니다.");
    }

    const user = await db.getUserById(session.userId);

    if (!user) {
      throw ForbiddenError("사용자를 찾을 수 없습니다.");
    }

    // 승인 상태 확인
    if (user.status !== "approved") {
      throw ForbiddenError("승인되지 않은 계정입니다.");
    }

    return user;
  }
}

export const sdk = new SDKServer();
