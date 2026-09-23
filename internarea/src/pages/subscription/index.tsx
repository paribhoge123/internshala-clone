import axios from "axios";
import { Check } from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import { useTranslation } from "react-i18next";

const plans = [
  {
    key: "free",
    name: "Free Plan",
    price: 0,
    limit: "1 internship/month",
    color: "bg-gray-50 border-gray-200",
    buttonColor: "bg-gray-600 hover:bg-gray-700",
    features: [
      "1 internship application per month",
      "Basic profile",
      "Email support",
    ],
  },
  {
    key: "bronze",
    name: "Bronze Plan",
    price: 100,
    limit: "3 internships/month",
    color: "bg-orange-50 border-orange-200",
    buttonColor: "bg-orange-500 hover:bg-orange-600",
    features: [
      "3 internship applications per month",
      "Priority profile",
      "Email support",
    ],
  },
  {
    key: "silver",
    name: "Silver Plan",
    price: 300,
    limit: "5 internships/month",
    color: "bg-blue-50 border-blue-200",
    buttonColor: "bg-blue-600 hover:bg-blue-700",
    features: [
      "5 internship applications per month",
      "Featured profile",
      "Priority support",
    ],
  },
  {
    key: "gold",
    name: "Gold Plan",
    price: 1000,
    limit: "Unlimited internships",
    color: "bg-yellow-50 border-yellow-200",
    buttonColor: "bg-yellow-500 hover:bg-yellow-600",
    features: [
      "Unlimited internship applications",
      "Top-featured profile",
      "24/7 support",
    ],
  },
];

declare global {
  interface Window {
    Razorpay: any;
  }
}

const Subscription = () => {
  const { t } = useTranslation("common");
  const user = useSelector(selectuser);
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const [activePlan, setActivePlan] = useState<any>(null);
  const email = user?.email || "";

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    if (email) {
      axios
        .get(`http://localhost:5000/api/subscription/my-plan/${email}`)
        .then((res) => setActivePlan(res.data))
        .catch(console.error);
    }

    return () => {
      document.body.removeChild(script);
    };
  }, [email]);

  const handleSelectPlan = async (planKey: string, price: number) => {
    if (!email) {
      toast.error("Please log in with Google to subscribe to a plan");
      return;
    }
    setIsLoading(planKey);
    try {
      const res = await axios.post(
        "http://localhost:5000/api/subscription/create-order",
        { plan: planKey, email },
      );

      if (res.data.free) {
        toast.success(res.data.message);
        setActivePlan({ plan: planKey, price: 0, status: "active" });
        setIsLoading(null);
        return;
      }

      const options = {
        key: res.data.keyId,
        amount: res.data.amount,
        currency: res.data.currency,
        name: "Internshala Clone",
        description: res.data.planName,
        order_id: res.data.orderId,
        handler: async (response: any) => {
          try {
            const verifyRes = await axios.post(
              "http://localhost:5000/api/subscription/verify-payment",
              {
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                email,
                plan: planKey,
              },
            );
            toast.success(verifyRes.data.message);
            setActivePlan({ plan: planKey, price, status: "active" });
          } catch (error: any) {
            toast.error(
              error?.response?.data?.error || "Payment verification failed",
            );
          }
        },
        prefill: { email },
        theme: { color: "#2563eb" },
      };

      const rzp = new window.Razorpay(options);
      rzp.open();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Something went wrong");
    } finally {
      setIsLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-extrabold text-gray-900">
            {t("subscription.title")}
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            {t("subscription.subtitle")}
          </p>
          {activePlan && (
            <div className="mt-4 inline-block bg-green-100 text-green-800 px-4 py-2 rounded-full text-sm font-medium">
              {t("subscription.current")}: {activePlan.plan?.toUpperCase()} —{" "}
              {t("subscription.active")}
            </div>
          )}
          <p className="mt-2 text-sm text-red-500">
            ⚠️ {t("subscription.warning")}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.key}
              className={`rounded-2xl border-2 p-6 flex flex-col justify-between shadow-sm ${plan.color} ${
                activePlan?.plan === plan.key ? "ring-2 ring-green-400" : ""
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    {plan.name}
                  </h2>
                  {activePlan?.plan === plan.key && (
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded-full">
                      {t("subscription.active")}
                    </span>
                  )}
                </div>
                <div className="mb-4">
                  <span className="text-3xl font-extrabold text-gray-900">
                    {plan.price === 0 ? "Free" : `₹${plan.price}`}
                  </span>
                  {plan.price > 0 && (
                    <span className="text-gray-500 text-sm">/month</span>
                  )}
                </div>
                <p className="text-sm text-gray-600 mb-4 font-medium">
                  {plan.limit}
                </p>
                <ul className="space-y-2 mb-6">
                  {plan.features.map((feature, i) => (
                    <li
                      key={i}
                      className="flex items-start text-sm text-gray-700"
                    >
                      <Check className="h-4 w-4 text-green-500 mr-2 mt-0.5 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => handleSelectPlan(plan.key, plan.price)}
                disabled={
                  isLoading === plan.key || activePlan?.plan === plan.key
                }
                className={`w-full py-2 px-4 rounded-lg text-white font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${plan.buttonColor}`}
              >
                {isLoading === plan.key
                  ? t("subscription.processing")
                  : activePlan?.plan === plan.key
                    ? t("subscription.current")
                    : plan.price === 0
                      ? t("subscription.getstarted")
                      : t("subscription.subscribe")}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Subscription;
