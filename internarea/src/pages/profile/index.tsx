import { selectuser } from "@/Feature/Userslice";
import {
  ExternalLink,
  Mail,
  User,
  Monitor,
  Smartphone,
  Clock,
} from "lucide-react";
import Link from "next/link";
import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import axios from "axios";
import { useTranslation } from "react-i18next";

interface UserType {
  name: string;
  email: string;
  photo: string;
}

interface LoginRecord {
  _id: string;
  browser: string;
  os: string;
  deviceType: string;
  ipAddress: string;
  loginMethod: string;
  status: string;
  createdAt: string;
}

const index = () => {
  const { t } = useTranslation("common");
  const user = useSelector(selectuser);
  const [loginHistory, setLoginHistory] = useState<LoginRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    const fetchHistory = async () => {
      if (!user?.email) return;
      try {
        setLoadingHistory(true);
        const res = await axios.get(
          `http://localhost:5000/api/login-tracking/history/${user.email}`,
        );
        setLoginHistory(res.data);
      } catch (error) {
        console.log(error);
      } finally {
        setLoadingHistory(false);
      }
    };
    fetchHistory();
  }, [user?.email]);

  const statusLabel = (status: string) => {
    switch (status) {
      case "success":
        return { text: "Success", color: "bg-green-100 text-green-800" };
      case "blocked_otp_pending":
        return { text: "OTP Pending", color: "bg-yellow-100 text-yellow-800" };
      case "blocked_time_window":
        return {
          text: "Blocked (Time Window)",
          color: "bg-red-100 text-red-800",
        };
      default:
        return { text: status, color: "bg-gray-100 text-gray-800" };
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
          {/* Profile Header */}
          <div className="relative h-32 bg-gradient-to-r from-blue-500 to-blue-600">
            <div className="absolute -bottom-12 left-1/2 transform -translate-x-1/2">
              {user?.photo ? (
                <img
                  src={user?.photo}
                  alt={user?.name}
                  className="w-24 h-24 rounded-full border-4 border-white shadow-lg"
                />
              ) : (
                <div className="w-24 h-24 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                  <User className="h-12 w-12 text-gray-400" />
                </div>
              )}
            </div>
          </div>

          {/* Profile Content */}
          <div className="pt-16 pb-8 px-6">
            <div className="text-center mb-8">
              <h1 className="text-2xl font-bold text-gray-900">{user?.name}</h1>
              <div className="mt-2 flex items-center justify-center text-gray-500">
                <Mail className="h-4 w-4 mr-2" />
                <span>{user?.email}</span>
              </div>
            </div>

            <div className="space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4 text-center">
                  <span className="text-blue-600 font-semibold text-2xl">
                    0
                  </span>
                  <p className="text-blue-600 text-sm mt-1">
                    {t("profile.active")}
                  </p>
                </div>
                <div className="bg-green-50 rounded-lg p-4 text-center">
                  <span className="text-green-600 font-semibold text-2xl">
                    0
                  </span>
                  <p className="text-green-600 text-sm mt-1">
                    {t("profile.accepted")}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-center pt-4">
                <Link
                  href="/userapplication"
                  className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors duration-200"
                >
                  {t("profile.viewapps")}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </div>

        {/* Login History Section */}
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden mt-6">
          <div className="border-b border-gray-200 px-6 py-4">
            <h2 className="text-xl font-bold text-gray-900 flex items-center">
              <Clock className="h-5 w-5 mr-2 text-gray-500" />
              {t("profile.loginhistory")}
            </h2>
            <p className="mt-1 text-sm text-gray-500">
              {t("profile.historysubtitle")}
            </p>
          </div>

          <div className="p-6">
            {loadingHistory ? (
              <p className="text-gray-500 text-sm">{t("profile.loading")}</p>
            ) : loginHistory.length === 0 ? (
              <p className="text-gray-500 text-sm">{t("profile.nohistory")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Date
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Method
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Browser / OS
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Device
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        IP Address
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {loginHistory.map((record) => {
                      const status = statusLabel(record.status);
                      return (
                        <tr key={record._id}>
                          <td className="px-4 py-3 text-sm text-gray-700 whitespace-nowrap">
                            {new Date(record.createdAt).toLocaleString()}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700 capitalize">
                            {record.loginMethod}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {record.browser} / {record.os}
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            <div className="flex items-center">
                              {record.deviceType === "mobile" ? (
                                <Smartphone className="h-4 w-4 mr-1 text-gray-400" />
                              ) : (
                                <Monitor className="h-4 w-4 mr-1 text-gray-400" />
                              )}
                              {record.deviceType || "desktop"}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {record.ipAddress}
                          </td>
                          <td className="px-4 py-3 text-sm">
                            <span
                              className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${status.color}`}
                            >
                              {status.text}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default index;
