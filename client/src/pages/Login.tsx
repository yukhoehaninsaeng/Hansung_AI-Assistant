import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { getLoginUrl } from "@/const";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useLocation } from "wouter";

export default function Login() {
  const { isAuthenticated, loading } = useAuth();
  const { t } = useLanguage();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (loading || !isAuthenticated) return;
    setLocation("/chat");
  }, [isAuthenticated, loading, setLocation]);

  const handleLogin = () => {
    window.location.href = getLoginUrl();
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader className="items-center text-center">
          <img src="/bumjin-logo.png" alt="BumJin" className="h-12 mb-4" />
          <CardTitle>{t("login_title")}</CardTitle>
          <CardDescription>{t("login_subtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="w-full"
            onClick={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            {loading ? t("login_loading") : t("login_button")}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
