import axios from "axios";
import {
  FileText,
  Mail,
  Phone,
  MapPin,
  User,
  Briefcase,
  GraduationCap,
  Zap,
} from "lucide-react";
import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useSelector } from "react-redux";
import { selectuser } from "@/Feature/Userslice";
import Link from "next/link";

declare global {
  interface Window {
    Razorpay: any;
  }
}

const ResumePage = () => {
  const user = useSelector(selectuser);
  const email = user?.email || "";

  const [step, setStep] = useState<"form" | "otp" | "payment" | "done">("form");
  const [isLoading, setIsLoading] = useState(false);
  const [otp, setOtp] = useState("");
  const [myResumes, setMyResumes] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    name: user?.name || "",
    phone: "",
    address: "",
    objective: "",
    qualifications: "",
    experience: "",
    skills: "",
  });

  useEffect(() => {
    // Load Razorpay script
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    document.body.appendChild(script);

    // Fetch existing resumes
    if (email) {
      axios
        .get(`http://localhost:5000/api/resume/my-resumes/${email}`)
        .then((res) => setMyResumes(res.data))
        .catch(console.error);
    }

    return () => {
      document.body.removeChild(script);
    };
  }, [email]);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // STEP 1: Submit form → send OTP
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error("Please log in with Google to use this feature");
      return;
    }
    if (!formData.name || !formData.qualifications) {
      toast.error("Name and qualifications are required");
      return;
    }
    try {
      setIsLoading(true);
      await axios.post("http://localhost:5000/api/resume/send-otp", { email });
      toast.success("OTP sent to your email");
      setStep("otp");
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to send OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 2: Verify OTP → create Razorpay order
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otp) {
      toast.error("Please enter the OTP");
      return;
    }
    try {
      setIsLoading(true);
      await axios.post("http://localhost:5000/api/resume/verify-otp", {
        email,
        otp,
      });
      toast.success("OTP verified! Proceeding to payment...");
      setStep("payment");
      await handlePayment();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Invalid OTP");
    } finally {
      setIsLoading(false);
    }
  };

  // STEP 3: Create order + open Razorpay
  const handlePayment = async () => {
    try {
      const orderRes = await axios.post(
        "http://localhost:5000/api/resume/create-order",
        { email },
      );

      const options = {
        key: orderRes.data.keyId,
        amount: orderRes.data.amount,
        currency: orderRes.data.currency,
        name: "Internshala Clone",
        description: "Resume Creation - ₹50",
        order_id: orderRes.data.orderId,
        handler: async (response: any) => {
          try {
            const generateRes = await axios.post(
              "http://localhost:5000/api/resume/generate",
              {
                ...formData,
                email,
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
              },
            );
            toast.success("Resume generated successfully!");
            setStep("done");
            // Refresh resumes list
            const resumesRes = await axios.get(
              `http://localhost:5000/api/resume/my-resumes/${email}`,
            );
            setMyResumes(resumesRes.data);
          } catch (error: any) {
            toast.error(
              error?.response?.data?.error || "Failed to generate resume",
            );
            setStep("form");
          }
        },
        prefill: { email },
        theme: { color: "#2563eb" },
      };

      const rzp = new window.Razorpay(options);
      rzp.on("payment.failed", () => {
        toast.error("Payment failed. Please try again.");
        setStep("form");
      });
      rzp.open();
    } catch (error: any) {
      toast.error(error?.response?.data?.error || "Failed to initiate payment");
      setStep("form");
    }
  };

  if (!email) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Login Required
          </h2>
          <p className="text-gray-600 mb-6">
            Please log in with Google to create your resume
          </p>
          <Link
            href="/"
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
          >
            Go to Home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-extrabold text-gray-900">
            Resume Builder
          </h1>
          <p className="mt-2 text-gray-600">
            Create a professional resume for ₹50 — premium feature
          </p>
          {/* Steps indicator */}
          <div className="flex justify-center items-center space-x-4 mt-6">
            {["form", "otp", "payment", "done"].map((s, i) => (
              <div key={s} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    step === s
                      ? "bg-blue-600 text-white"
                      : ["form", "otp", "payment", "done"].indexOf(step) > i
                        ? "bg-green-500 text-white"
                        : "bg-gray-200 text-gray-500"
                  }`}
                >
                  {i + 1}
                </div>
                {i < 3 && <div className="w-8 h-0.5 bg-gray-300 mx-1" />}
              </div>
            ))}
          </div>
          <div className="flex justify-center space-x-8 mt-2 text-xs text-gray-500">
            <span>Details</span>
            <span>OTP</span>
            <span>Payment</span>
            <span>Done</span>
          </div>
        </div>

        {/* STEP 1: Form */}
        {step === "form" && (
          <div className="bg-white rounded-2xl shadow-lg p-8">
            <h2 className="text-xl font-bold text-gray-900 mb-6">
              Enter Your Details
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Full Name *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      name="name"
                      type="text"
                      required
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="John Doe"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                      name="phone"
                      type="text"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      placeholder="9999999999"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Address
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    name="address"
                    type="text"
                    value={formData.address}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="City, State, Country"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Career Objective
                </label>
                <textarea
                  name="objective"
                  value={formData.objective}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  placeholder="A motivated student seeking an internship in software development..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Education & Qualifications *
                </label>
                <div className="relative">
                  <GraduationCap className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <textarea
                    name="qualifications"
                    required
                    value={formData.qualifications}
                    onChange={handleChange}
                    rows={3}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="B.Tech in Computer Science, XYZ University (2021-2025)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Experience
                </label>
                <div className="relative">
                  <Briefcase className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <textarea
                    name="experience"
                    value={formData.experience}
                    onChange={handleChange}
                    rows={3}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="Web Developer Intern at ABC Company (Jun 2024 - Aug 2024)"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Skills
                </label>
                <div className="relative">
                  <Zap className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                  <input
                    name="skills"
                    type="text"
                    value={formData.skills}
                    onChange={handleChange}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-black focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    placeholder="React, Node.js, MongoDB, Python"
                  />
                </div>
              </div>

              <div className="bg-blue-50 rounded-lg p-4 text-sm text-blue-800">
                <strong>Premium Feature:</strong> Resume creation costs ₹50.
                After submitting this form, you'll receive an OTP to verify your
                email, then proceed to payment.
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {isLoading
                  ? "Sending OTP..."
                  : "Continue to OTP Verification →"}
              </button>
            </form>
          </div>
        )}

        {/* STEP 2: OTP */}
        {step === "otp" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <Mail className="h-16 w-16 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Verify Your Email
            </h2>
            <p className="text-gray-600 mb-6">
              Enter the OTP sent to <strong>{email}</strong>
            </p>
            <form
              onSubmit={handleOtpVerify}
              className="space-y-4 max-w-sm mx-auto"
            >
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg text-black text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="000000"
                maxLength={6}
              />
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {isLoading ? "Verifying..." : "Verify OTP & Pay ₹50"}
              </button>
              <button
                type="button"
                onClick={() => setStep("form")}
                className="w-full py-2 text-sm text-gray-500 hover:text-gray-700"
              >
                ← Back to form
              </button>
            </form>
          </div>
        )}

        {/* STEP 3: Payment processing */}
        {step === "payment" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-bold text-gray-900">
              Opening Payment...
            </h2>
            <p className="text-gray-600 mt-2">
              Complete the ₹50 payment in the Razorpay window
            </p>
          </div>
        )}

        {/* STEP 4: Done */}
        {step === "done" && (
          <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <FileText className="h-8 w-8 text-green-600" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">
              Resume Generated!
            </h2>
            <p className="text-gray-600 mb-6">
              Your resume has been created and attached to your profile. A
              confirmation email has been sent to {email}.
            </p>
            <button
              onClick={() => setStep("form")}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 mr-3"
            >
              Create Another
            </button>
          </div>
        )}

        {/* Existing Resumes */}
        {myResumes.length > 0 && (
          <div className="bg-white rounded-2xl shadow-lg p-8 mt-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">My Resumes</h2>
            <div className="space-y-3">
              {myResumes.map((resume) => (
                <div
                  key={resume._id}
                  className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
                >
                  <div>
                    <p className="font-medium text-gray-900">{resume.name}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(resume.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <a
                    href={`http://localhost:5000/api/resume/download/${resume.filePath}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-700"
                  >
                    Download PDF
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ResumePage;
