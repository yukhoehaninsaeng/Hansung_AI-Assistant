import { useState } from "react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";

const HANSUNG_NAVY = "#1e3476";
const HANSUNG_SKY = "#0098d4";

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();

  const handleAuthSuccess = async (message: string) => {
    toast.success(message);
    try {
      await utils.auth.me.invalidate();
    } catch (e) {
      console.error("Cache invalidate failed", e);
    }
    setTimeout(() => {
      window.location.href = "/";
    }, 300);
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => handleAuthSuccess("로그인 성공!"),
    onError: (error) => toast.error(error.message || "오류가 발생했습니다"),
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => handleAuthSuccess("회원가입 성공!"),
    onError: (error) => toast.error(error.message || "오류가 발생했습니다"),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isLogin) {
        await loginMutation.mutateAsync({ username, password });
      } else {
        await registerMutation.mutateAsync({ username, password, name });
      }
    } catch {
      // 에러는 onError에서 처리됨
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setIsLogin(!isLogin);
    setUsername("");
    setPassword("");
    setName("");
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ backgroundColor: "#f0f4ff" }}
    >
      {/* Card */}
      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl overflow-hidden">
        {/* Top color bar */}
        <div className="h-2" style={{ backgroundColor: HANSUNG_NAVY }} />

        <div className="px-8 py-8">
          {/* Logo */}
          <div className="flex justify-center mb-6">
            <img
              src="/Hansung UI.webp"
              alt="한성대학교"
              className="h-12 object-contain"
            />
          </div>

          {/* Title */}
          <h1 className="text-xl font-bold text-center mb-1" style={{ color: HANSUNG_NAVY }}>
            {isLogin ? "로그인" : "회원가입"}
          </h1>
          <p className="text-center text-gray-400 text-sm mb-6">
            {isLogin
              ? "한성대학교 AI 도우미에 오신 것을 환영합니다"
              : "새 계정을 만들어 시작하세요"}
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">
                아이디
              </label>
              <Input
                type="text"
                placeholder="아이디 입력"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
                className="rounded-xl border-gray-200 focus-visible:ring-0 focus-visible:border-[#0098d4] bg-gray-50"
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">
                  이름 (선택)
                </label>
                <Input
                  type="text"
                  placeholder="이름 입력"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                  className="rounded-xl border-gray-200 focus-visible:ring-0 focus-visible:border-[#0098d4] bg-gray-50"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1 ml-1">
                비밀번호
              </label>
              <Input
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
                className="rounded-xl border-gray-200 focus-visible:ring-0 focus-visible:border-[#0098d4] bg-gray-50"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-2.5 rounded-xl text-white text-sm font-semibold transition-opacity disabled:opacity-60 mt-1"
              style={{ backgroundColor: HANSUNG_NAVY }}
            >
              {isLoading ? "처리 중..." : isLogin ? "로그인" : "회원가입"}
            </button>
          </form>

          {/* Switch mode */}
          <p className="text-center text-gray-500 text-sm mt-5">
            {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
            <button
              type="button"
              onClick={switchMode}
              className="ml-1.5 font-semibold transition-colors"
              style={{ color: HANSUNG_SKY }}
            >
              {isLogin ? "회원가입" : "로그인"}
            </button>
          </p>
        </div>

        {/* Bottom footer */}
        <div
          className="px-8 py-3 text-center"
          style={{ backgroundColor: "#f8faff" }}
        >
          <p className="text-xs text-gray-400">한성대학교 AI 도우미</p>
        </div>
      </div>
    </div>
  );
}
