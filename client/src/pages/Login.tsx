import { useState } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import bumjinLogo from "/bumjinicon.png";

export default function Login() {
  const [, navigate] = useLocation();
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const utils = trpc.useUtils();

  // 성공 시 실행될 공통 리다이렉트 함수
  const handleAuthSuccess = async (message: string) => {
    toast.success(message);
    
    // 1. 캐시 무효화 시도
    try {
      await utils.auth.me.invalidate();
    } catch (e) {
      console.error("Cache invalidate failed", e);
    }

    // 2. 가장 확실한 리다이렉트 방식: window.location.href 사용
    // 0.3초 대기 후 강제 새로고침하며 메인으로 이동
    setTimeout(() => {
      window.location.href = "/";
    }, 300);
  };

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: () => handleAuthSuccess("로그인 성공!"),
    onError: (error) => {
      toast.error(error.message || "오류가 발생했습니다");
    },
  });

  const registerMutation = trpc.auth.register.useMutation({
    onSuccess: () => handleAuthSuccess("회원가입 성공!"),
    onError: (error) => {
      toast.error(error.message || "오류가 발생했습니다");
    },
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
    } catch (err) {
      // 에러는 onError에서 처리됨
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-lg">
        <div className="p-8">
          <div className="flex justify-center mb-8">
            <img src={bumjinLogo} alt="BumJin" className="h-16 object-contain" />
          </div>

          <h1 className="text-2xl font-bold text-center mb-2 text-gray-900">
            {isLogin ? "로그인" : "회원가입"}
          </h1>
          <p className="text-center text-gray-600 mb-8">
            {isLogin ? "계정으로 로그인하세요" : "새 계정을 만드세요"}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">아이디</label>
              <Input
                type="text"
                placeholder="아이디 입력"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            {!isLogin && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">이름 (선택)</label>
                <Input
                  type="text"
                  placeholder="이름 입력"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={isLoading}
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">비밀번호</label>
              <Input
                type="password"
                placeholder="비밀번호 입력"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors"
              disabled={isLoading}
            >
              {isLoading ? "처리 중..." : isLogin ? "로그인" : "회원가입"}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-600 text-sm">
              {isLogin ? "계정이 없으신가요?" : "이미 계정이 있으신가요?"}
              <button
                type="button"
                onClick={() => {
                  setIsLogin(!isLogin);
                  setUsername("");
                  setPassword("");
                  setName("");
                }}
                className="ml-2 text-red-600 hover:text-red-700 font-semibold transition-colors"
              >
                {isLogin ? "회원가입" : "로그인"}
              </button>
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200 text-center">
            <p className="text-xs text-gray-500">BumJin Chat App</p>
          </div>
        </div>
      </Card>
    </div>
  );
}
