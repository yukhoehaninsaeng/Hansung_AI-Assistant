import { useLanguage } from "@/contexts/LanguageContext";
import { useState } from "react";

export function LanguageSwitch() {
  const { language, setLanguage } = useLanguage();
  const [isAnimating, setIsAnimating] = useState(false);

  const handleToggle = () => {
    setIsAnimating(true);
    setLanguage(language === "KR" ? "EN" : "KR");
    setTimeout(() => setIsAnimating(false), 300);
  };

  return (
    <button
      onClick={handleToggle}
      className={`relative inline-flex h-8 w-16 items-center rounded-full transition-colors duration-300 ${
        language === "KR" ? "bg-primary" : "bg-primary"
      } focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2`}
      aria-label="Toggle language"
    >
      {/* Slider */}
      <span
        className={`inline-block h-6 w-6 transform rounded-full bg-white shadow-lg transition-transform duration-300 ${
          language === "KR" ? "translate-x-1" : "translate-x-9"
        }`}
      />
      
      {/* Labels */}
      <span className="absolute left-2 text-xs font-semibold text-white pointer-events-none">
        KR
      </span>
      <span className="absolute right-2 text-xs font-semibold text-white pointer-events-none">
        EN
      </span>
    </button>
  );
}
