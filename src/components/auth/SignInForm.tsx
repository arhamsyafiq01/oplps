import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
// import { FaEye, FaEyeSlash } from "react-icons/fa";
import Input from "../form/input/InputField";
import Button from "../ui/button/Button";
import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

const LOGIN_API_URL = import.meta.env.VITE_LOGIN_API_URL;

export default function SignInForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [user_id, setUserId] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!user_id || !password) {
      setErrorMessage("Please enter your ID and password.");
      setTimeout(() => setErrorMessage(""), 3000);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(LOGIN_API_URL, {
  method: "POST",
  headers: {
    "Content-Type": "application/json", // JSON instead of x-www-form-urlencoded
  },
  credentials: "include", // send cookies for session
  body: JSON.stringify({
    user_id: user_id,
    password: password,
  }),
});

const data = await response.json();

if (response.ok) {
  console.log("Login successful:", data);

  setSuccessMessage(data.message || "Login successful!");
  setErrorMessage(""); // clear any previous error

  // Save user info
  sessionStorage.setItem("user_id", data.user_id || "");
  sessionStorage.setItem("user_fname", data.fname || "");
  sessionStorage.setItem("user_lname", data.lname || "");
  sessionStorage.setItem("user_role_code", data.role_code || "");

  setTimeout(() => {
    navigate("/home");
  }, 1000);
} else {
  console.error("Login failed:", data);
  setSuccessMessage(""); // clear any old success
  setErrorMessage(data.message || "Invalid ID and Password. Please try again.");
  setTimeout(() => setErrorMessage(""), 3000);
}
    } catch (error) {
      console.error("Error during login:", error);
      setSuccessMessage(""); // clear any old success
      setErrorMessage(
        "An error occurred during login. Please try again later."
      );

      // Auto-hide error after 3s
      setTimeout(() => setErrorMessage(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col flex-1 bg-neutral-50 dark:bg-gray-900 ">
      <div className="fixed bottom-6 left-6">
        <ThemeTogglerTwo />
      </div>
      <div className="flex flex-col justify-center flex-1 w-full max-w-md mx-auto">
        <div className="mb-5 sm:mb-8">
          <div className="relative flex items-center justify-center  mb-10">
            <div className="flex flex-col items-start mb-5">
              <img width={270} height={100} src="/Logo BR.png" alt="Logo" />
            </div>
          </div>
          <h1 className="mb-2 font-semibold text-gray-800 text-title-sm dark:text-white/90 sm:text-title-md text-center">
            Welcome !
          </h1>
          <p className="text-l text-gray-500 dark:text-gray-400 text-center mb-5">
            Enter your ID and Password to Sign In
          </p>
        </div>
        <div>
          {errorMessage && (
            <div className="mb-4 text-sm text-red-500 text-center">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="mb-4 text-sm text-green-600 text-center">
              {successMessage}
            </div>
          )}
          <form onSubmit={handleSubmit}>
            <div className="space-y-6">
              <div>
                <Input
                  className="bg-white"
                  placeholder="Enter your ID"
                  value={user_id}
                  onChange={(e) => setUserId(e.target.value)}
                />
              </div>
              <div>
                <div className="relative">
                  <Input
                    className="bg-white"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                  />
                  <span
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute z-30 -translate-y-1/2 cursor-pointer right-4 top-1/2"
                  ></span>
                </div>
              </div>
              <div className="flex justify-center p-4">
                <Button className="w-60 mx-auto" size="sm" disabled={isLoading}>
                  {isLoading ? "Signing in..." : "Sign in"}
                </Button>
              </div>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
