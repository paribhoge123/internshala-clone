import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import axios from "axios";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { Globe } from "lucide-react";

const languages = [
  { code: "en", label: "English" },
  { code: "es", label: "Español" },
  { code: "hi", label: "हिंदी" },
  { code: "pt", label: "Português" },
  { code: "zh", label: "中文" },
  { code: "fr", label: "Français" },
];

const LanguageSwitcher = () => {
  const { i18n, t } = useTranslation("common");
  const user = useSelector(selectuser);
  const [showDropdown, setShowDropdown] = useState(false);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otp, setOtp] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [otpSent, setOtpSent] = useState(false);

  const handleLanguageSelect = async (code: string) => {
    setShowDropdown(false);

    // French requires OTP verification
    if (code === "fr") {
      if (!user?.email) {
        toast.error("Please log in to switch to French");
        return;
      }
      // Send OTP
      try {
        setIsLoading(true);
        await axios.post("http://localhost:5000/api/resume/send-otp", {
          email: user.email,
        });
        toast.success("OTP sent to your email for French verification");
        setOtpSent(true);
        setShowOtpModal(true);
      } catch (error) {
        toast.error("Failed to send OTP");
      } finally {
        setIsLoading(false);
      }
      return;
    }

    // All other languages switch immediately
    i18n.changeLanguage(code);
    localStorage.setItem("preferredLanguage", code);
    toast.success(`Language changed successfully`);
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }
    try {
      setIsLoading(true);
      await axios.post("http://localhost:5000/api/resume/verify-otp", {
        email: user?.email,
        otp,
      });
      // OTP verified — switch to French
      i18n.changeLanguage("fr");
      localStorage.setItem("preferredLanguage", "fr");
      toast.success("Language changed to French!");
      setShowOtpModal(false);
      setOtp("");
      setOtpSent(false);
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  const currentLang =
    languages.find((l) => l.code === i18n.language) || languages[0];

  return (
    <>
      {/* Language Dropdown */}
      <div className="relative">
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className="flex items-center space-x-1 text-gray-600 hover:text-blue-600 px-2 py-1 rounded-lg hover:bg-gray-50 text-sm"
        >
          <Globe className="h-4 w-4" />
          <span>{currentLang.label}</span>
        </button>

        {showDropdown && (
          <div className="absolute right-0 mt-2 w-40 bg-white rounded-lg shadow-lg border border-gray-100 z-50">
            {languages.map((lang) => (
              <button
                key={lang.code}
                onClick={() => handleLanguageSelect(lang.code)}
                className={`w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 first:rounded-t-lg last:rounded-b-lg ${
                  i18n.language === lang.code
                    ? "bg-blue-50 text-blue-600 font-medium"
                    : "text-gray-700"
                }`}
              >
                {lang.label}
                {lang.code === "fr" && (
                  <span className="ml-1 text-xs text-orange-500">🔒</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* French OTP Modal */}
      {showOtpModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-sm w-full mx-4">
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              {t("language.otp.title")}
            </h2>
            <p className="text-gray-600 text-sm mb-6">
              {t("language.otp.subtitle")}
            </p>
            <form onSubmit={handleOtpVerify} className="space-y-4">
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="Enter 6-digit OTP"
                maxLength={6}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Verifying..." : t("language.otp.button")}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOtpModal(false);
                  setOtp("");
                }}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                {t("language.otp.back")}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default LanguageSwitcher;
