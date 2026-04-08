import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import Chat from "./pages/Chat";
import Login from "./pages/Login";
import Admin from "./pages/Admin";
import AdminUserSettings from "./pages/AdminUserSettings";
import PublicChat from "./pages/PublicChat";
import { useAuth } from "@/_core/hooks/useAuth";
import { useEffect, useState } from "react";

// 26.04.06 수정: 스플래시 화면
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    const t1 = setTimeout(() => setFadeOut(true), 3900);
    const t2 = setTimeout(onDone, 5300);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [onDone]);

  return (
    <>
      <style>{`
        @keyframes splashCircleExpand {
          0%   { clip-path: circle(0vmax at 50% 50%); }
          100% { clip-path: circle(71.5vmax at 50% 50%); }
        }
        @keyframes splashCircleWipe {
          0%   { clip-path: circle(71.5vmax at 50% calc(50% - 3vmin)); }
          100% { clip-path: circle(8vmax at 50% calc(50% - 5vmin)); }
        }
        @keyframes splashCharIn {
          0%   { opacity: 0; transform: scale(0.4) translateY(20px); }
          60%  { transform: scale(1.1) translateY(-4px); }
          80%  { transform: scale(0.97) translateY(2px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes splashSubIn {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 0.88; transform: translateY(0); }
        }
        @keyframes splashMainIn {
          0%   { opacity: 0; transform: translateY(12px); }
          100% { opacity: 1; transform: translateY(0); }
        }
        @keyframes splashTextOut {
          0%   { opacity: 1; }
          100% { opacity: 0; }
        }
      `}</style>

      {/* 배경 */}
      <div style={{ position: "fixed", inset: 0, zIndex: 9999, background: "#09121f", fontFamily: "'Pretendard', sans-serif", opacity: fadeOut ? 0 : 1, transition: "opacity 1.4s ease", pointerEvents: fadeOut ? "none" : "auto" }}>

        {/* 파란 원 — 확장 후 유지, 3s에 축소 */}
        <div style={{
          position: "absolute", inset: 0,
          background: "#489AFF",
          clipPath: "circle(0vmax at 50% 50%)",
          animation: "splashCircleExpand 0.6s cubic-bezier(0.22,1,0.36,1) 0.05s forwards, splashCircleWipe 0.7s cubic-bezier(0.6,0,0.8,0.4) 3.0s forwards",
        }}>

          {/* 캐릭터 + 텍스트 중앙 정렬 컨테이너 */}
          <div style={{
            position: "absolute", inset: 0,
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center",
            gap: "2vmin",
          }}>
            <img
              src="/splash_obj.gif"
              alt="캐릭터"
              style={{
                height: "18vmin", objectFit: "contain",
                animation: "splashCharIn 0.8s cubic-bezier(0.34,1.4,0.64,1) 0.7s both",
              }}
            />

            <div style={{
              textAlign: "center", whiteSpace: "nowrap",
              display: "flex", flexDirection: "column", alignItems: "center",
              animation: "splashTextOut 0.45s ease-in forwards 3.0s",
            }}>
              <p style={{
                fontSize: "clamp(16px, 1.0vmax, 20px)", fontWeight: 400,
                color: "rgba(255,255,255,0.9)", letterSpacing: "0.01em",
                marginBottom: "0.4vmax", opacity: 0,
                animation: "splashSubIn 0.55s ease-out 1.2s forwards",
              }}>
                학사 공지부터 남은 입학 안내까지, 한성인을 위한 똑똑한 길잡이
              </p>
              <p style={{
                fontSize: "clamp(24px, 1.3vmax, 28px)", fontWeight: 700,
                color: "#000", letterSpacing: "-0.01em", opacity: 0,
                animation: "splashMainIn 0.55s ease-out 1.5s forwards",
              }}>
                한성대학교 <span style={{ fontWeight: 700, color: "#fff"}}>AI도우미</span>를 만나보세요.
              </p>
            </div>
          </div>

        </div>
      </div>
    </>
  );
}

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return <div className="flex items-center justify-center h-screen">로딩 중...</div>;
  }

  if (!user) {
    return (
      <Switch>
        <Route path="/guest" component={PublicChat} />
        <Route path="/login" component={Login} />
        <Route component={() => <Redirect to="/login" />} />
      </Switch>
    );
  }

  return (
    <Switch>
      <Route path="/guest" component={PublicChat} />
      <Route path="/login" component={() => <Redirect to="/" />} />
      <Route path="/" component={Chat} />
      <Route path="/admin/users/:userId">
        {(params) => <AdminUserSettings userId={Number(params.userId)} />}
      </Route>
      <Route path="/admin" component={Admin} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  const [showSplash, setShowSplash] = useState(true);

  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <LanguageProvider>
          <TooltipProvider>
            <Toaster />
            {showSplash && <SplashScreen onDone={() => setShowSplash(false)} />}
            <Router />
          </TooltipProvider>
        </LanguageProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
