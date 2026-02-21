type RequestLike = {
  protocol?: string;
  headers?: Record<string, string | string[] | undefined>;
};

type SessionCookieOptions = {
  domain?: string;
  httpOnly: true;
  path: string;
  sameSite: "none" | "lax";
  secure: boolean;
};

function isSecureRequest(req: RequestLike) {
  if (req.protocol === "https") return true;

  const forwardedProto = req.headers?.["x-forwarded-proto"];
  if (!forwardedProto) return false;

  const protoList = Array.isArray(forwardedProto)
    ? forwardedProto
    : forwardedProto.split(",");

  return protoList.some((proto: string) => proto.trim().toLowerCase() === "https");
}

export function getSessionCookieOptions(req: RequestLike): SessionCookieOptions {
  const isSecure = isSecureRequest(req);
  const sameSite: "none" | "lax" = isSecure ? "none" : "lax";

  return {
    httpOnly: true,
    path: "/",
    sameSite,
    secure: isSecure,
  };
}