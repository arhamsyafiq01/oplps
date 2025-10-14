// AddUserPage.tsx
import React, { useState, useEffect } from "react";
import Input from "../input/InputField";
import Button from "../../ui/button/Button";
import Label from "../Label";
import { Loader2 as LuLoader } from "lucide-react";

const ADD_USER_API_URL = import.meta.env.VITE_ADD_USER_API_URL;
const GET_ROLES_API_URL = import.meta.env.VITE_GET_ROLES_API_URL;

interface RoleOption {
  role_id: string;
  description: string;
}

export default function AddUserPage() {
  const [userId, setUserId] = useState("");
  const [fname, setFname] = useState("");
  const [lname, setLname] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isFetchingRoles, setIsFetchingRoles] = useState(true);

  useEffect(() => {
    const fetchRoles = async () => {
      setIsFetchingRoles(true);
      setError(null); // Clear previous errors
      try {
        const response = await fetch(
          GET_ROLES_API_URL, // Make sure this is your correct roles API
          { credentials: "include" } // If your get_roles.php requires authentication
        );
        const data = await response.json();
        // ** EDITED: Check for data.status === "success" **
        if (
          response.ok &&
          data.status === "success" &&
          Array.isArray(data.roles)
        ) {
          setRoles(data.roles || []);
        } else {
          setError(data.message || "Failed to fetch roles.");
          setRoles([]); // Clear roles on error
        }
      } catch (err) {
        setError("Error connecting to fetch roles. Please check the network.");
        console.error("Fetch roles error:", err);
        setRoles([]);
      } finally {
        setIsFetchingRoles(false);
      }
    };
    fetchRoles();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (!userId || !fname || !password || !selectedRoleId) {
      setError("User ID, First Name, Password, and Role are required.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      if (!ADD_USER_API_URL) {
        throw new Error("Add user API URL is not configured.");
      }
      const response = await fetch(ADD_USER_API_URL, {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          user_id: userId,
          fname,
          lname,
          password,
          role_id: selectedRoleId, // Or role_description if your PHP expects that
        }),
      });

      const result = await response.json();
      // ** EDITED: Check for result.status === "success" (consistent with your add_user.php recent version) **
      if (response.ok && result.status === "success") {
        setSuccessMessage(result.message || successMessage);
        setUserId("");
        setFname("");
        setLname("");
        setPassword("");
        setConfirmPassword("");
        setSelectedRoleId("");
        setTimeout(() => setSuccessMessage(null), 2000); // Auto-clear success message
        // navigate('/user-management'); // Example navigation
      } else {
        setError(result.message || "Failed to add user. Please check details.");
      }
    } catch (err) {
      setError("An error occurred while adding the user. Please try again.");
      console.error("Add user submission error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // RoleSelect component with className merging
  const RoleSelect = ({
    value,
    onChange,
    options,
    className, // Accept className as a prop
  }: {
    value: string;
    onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    options: RoleOption[];
    className?: string;
  }) => (
    <select
      value={value}
      onChange={onChange}
      required
      // ** EDITED: Merge passed className with default classes **
      className={`w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5 py-2.5 
      font-normal text-gray-700 dark:text-gray-300 dark:border-gray-600 border-gray-300 dark:bg-gray-700 disabled:opacity-50
      ${className || ""}`} // Apply passed className here
      disabled={isFetchingRoles || options.length === 0} // Disable if roles are loading or none available
    >
      <option value="" disabled className="text-gray-500 dark:text-gray-400">
        {isFetchingRoles
          ? "Loading roles..."
          : options.length === 0
          ? "No roles available"
          : "Select Role"}
      </option>
      {options.map((role) => (
        <option
          key={role.role_id}
          value={role.role_id}
          className="text-black dark:text-white bg-white dark:bg-gray-700" // Option styling
        >
          {role.description}
        </option>
      ))}
    </select>
  );

  // Standard input field styling (example, adjust to your Input component)
  const inputClasses =
    "w-full rounded-lg border-[1.5px] border-stroke bg-transparent px-5 py-3 font-normal text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary";

  const labelClasses = "mb-1.5 block font-medium text-black dark:text-white";

  return (
    <div className="dark:bg-gray-900 py-2 px-4 items-center justify-center flex flex-wrap -mx-3 mb-6">
      <div className="w-full mx-auto bg-white dark:bg-gray-800 md:w-1/2 px-3 mb-6 md:mb-0">
        <h1 className="text-2xl font-semibold text-center text-gray-800 dark:text-white mb-6">
          New User Account
        </h1>
        <div className="p-6 sm:p-2 bg-white dark:bg-gray-800">
          {successMessage && (
            <p className="mb-4 p-3 text-center text-sm text-green-700 bg-green-100 dark:text-green-300 dark:bg-green-900/30 rounded-md">
              {successMessage}
            </p>
          )}
          {error && (
            <p className="mb-4 p-3 text-center text-sm text-red-700 bg-red-100 dark:text-red-300 dark:bg-red-900/30 rounded-md">
              {error}
            </p>
          )}
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <Label
                htmlFor="userId"
                className="mb-1.5 block font-medium text-black dark:text-white"
              >
                Employee ID <span className="text-red-500">*</span>
              </Label>
              <Input
                id="userId"
                type="text"
                className={inputClasses} // Apply consistent input styling
                placeholder="Example: 0877654231"
                value={userId}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setUserId(e.target.value)
                }
              />
            </div>

            <div>
              <Label
                htmlFor="fname"
                className="mb-1.5 block font-medium text-black dark:text-white"
              >
                First Name <span className="text-red-500">*</span>
              </Label>
              <Input
                id="fname"
                type="text"
                className={inputClasses}
                placeholder="Enter First Name"
                value={fname}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFname(e.target.value)
                }
              />
            </div>

            <div>
              <Label
                htmlFor="lname"
                className="mb-1.5 block font-medium text-black dark:text-white"
              >
                Last Name
                <span className="text-xs text-gray-500"> (Optional)</span>
              </Label>
              <Input
                id="lname"
                type="text"
                className={inputClasses}
                placeholder="Enter Last Name"
                value={lname}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setLname(e.target.value)
                }
              />
            </div>

            {/* Password Field - Visibility toggle removed */}
            <div>
              <Label htmlFor="password" className={labelClasses}>
                Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="password"
                type="password" // Always "password"
                className={inputClasses} // Removed pr-10
                placeholder="Enter password (6 Minimum Characters Length) "
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setPassword(e.target.value)
                }
              />
            </div>

            {/* Confirm Password Field - Visibility toggle removed */}
            <div>
              <Label htmlFor="confirmPassword" className={labelClasses}>
                Confirm Password <span className="text-red-500">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password" // Always "password"
                className={inputClasses} // Removed pr-10
                placeholder="Confirm password (6 Minimum Characters Length)"
                value={confirmPassword}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setConfirmPassword(e.target.value)
                }
                disabled={!password}
              />
              {password && confirmPassword && password !== confirmPassword && (
                <p className="text-xs text-red-500 mt-1">
                  Passwords do not match.
                </p>
              )}
            </div>

            <div>
              <Label
                htmlFor="role"
                className="mb-1.5 block font-medium text-black dark:text-white"
              >
                Role <span className="text-red-500">*</span>
              </Label>
              <RoleSelect
                value={selectedRoleId}
                // Removed direct className prop as it's handled inside RoleSelect now by merging
                onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
                  setSelectedRoleId(e.target.value)
                }
                options={roles}
              />
            </div>

            <Button
              className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-full shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-800 disabled:opacity-50"
              disabled={isLoading || isFetchingRoles || roles.length === 0}
            >
              {isLoading ? (
                <LuLoader className="animate-spin h-5 w-5 mr-2" />
              ) : null}
              {isLoading ? "Adding User..." : "Add User"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
