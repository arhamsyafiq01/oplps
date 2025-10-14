// src/components/form/user-form/EditUserModal.tsx
import React, { useState, useEffect, FormEvent } from "react"; // Added React import
import { UserListItem } from "../../UserProfile/UserManagementTable"; // Adjust path if needed
import {
  Loader2 as LuLoader,
  Eye as LuEye,
  EyeOff as LuEyeOff,
  XCircle as LuXCircle,
} from "lucide-react";

export interface RoleOption {
  role_id: string;
  description: string;
}

export interface UserEditData {
  originalUserId: string;
  newUserId: string; // The potentially new user ID
  firstName: string;
  lastName: string;
  roleId: string;
  newPassword?: string; // Password is optional
}

interface EditUserModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (userData: UserEditData) => Promise<void>;
  userData: UserListItem | null;
  roleOptions: RoleOption[];
  isLoading: boolean; // Passed from parent to indicate API action in progress
}

export const EditUserModal: React.FC<EditUserModalProps> = ({
  // Typed as React.FC
  isOpen,
  onClose,
  onSubmit,
  userData,
  roleOptions,
  isLoading: isSubmitting, // Use isSubmitting internally for clarity
}) => {
  const [editableUserId, setEditableUserId] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [selectedRoleId, setSelectedRoleId] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && userData) {
      setEditableUserId(userData.id);
      setFirstName(userData.firstName === "N/A" ? "" : userData.firstName);
      setLastName(userData.lastName);
      // Pre-select role based on roleId if available, otherwise by description
      const currentRole = userData.roleId
        ? roleOptions.find((r) => r.role_id === userData.roleId)
        : roleOptions.find((r) => r.description === userData.roleDescription);
      setSelectedRoleId(currentRole?.role_id || "");

      setNewPassword(""); // Reset password fields each time modal opens
      setConfirmPassword("");
      setShowNewPassword(false);
      setShowConfirmPassword(false);
      setError(null); // Clear previous errors
    }
  }, [isOpen, userData, roleOptions]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!editableUserId.trim()) {
      setError("User ID cannot be empty.");
      return;
    }
    if (!firstName.trim()) {
      setError("First Name cannot be empty.");
      return;
    }
    if (!selectedRoleId) {
      setError("Please select a role for the user.");
      return;
    }
    if (!userData) {
      setError("No user data to submit.");
      return;
    } // Should not happen

    // Password validation (only if newPassword field is not empty)
    if (newPassword) {
      // If user typed something for a new password
      if (newPassword.length < 6) {
        // Example: Minimum length
        setError("New password must be at least 6 characters long.");
        return;
      }
      if (newPassword !== confirmPassword) {
        setError("New passwords do not match.");
        return;
      }
    }

    const updatedUserData: UserEditData = {
      originalUserId: userData.id,
      newUserId: editableUserId.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      roleId: selectedRoleId,
      // Only include newPassword in the submission data if it's been set and is not empty
      ...(newPassword && { newPassword: newPassword }),
    };

    try {
      await onSubmit(updatedUserData); // This calls the parent's submit handler
      // Parent (UserManagementTable) will handle closing the modal on success via its own logic
    } catch (err: any) {
      // This catch block will catch errors re-thrown by onSubmit if not handled by the parent,
      // or if onSubmit itself throws an error (e.g., user cancels confirmation in parent)
      console.error("Edit User Submission Error caught in Modal:", err);
      setError(err.message || "Failed to update user. Please try again.");
    }
  };

  if (!isOpen || !userData) return null;

  const inputBaseClasses =
    "w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary disabled:opacity-50";
  const selectBaseClasses = `${inputBaseClasses} py-2.5`; // For select padding

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
      aria-labelledby="edit-user-modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700 flex-shrink-0">
          <h4
            id="edit-user-modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Edit User: {userData.firstName} {userData.lastName}
          </h4>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:ring-offset-gray-800 disabled:opacity-50"
            aria-label="Close modal"
          >
            <LuXCircle className="h-6 w-6" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-grow overflow-y-auto pr-2 space-y-4"
        >
          {/* Added space-y-4 here */}
          {error && (
            <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
              {error}
            </div>
          )}
          <div>
            <label
              htmlFor="editUserId"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Employee ID
              <span className="text-xs text-red-500">
                (Caution when changing)
              </span>
            </label>
            <input
              id="editUserId"
              type="text"
              value={editableUserId}
              onChange={(e) => setEditableUserId(e.target.value)}
              className={inputBaseClasses}
              disabled={isSubmitting}
              required
            />
          </div>
          <div>
            <label
              htmlFor="editFirstName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              First Name
            </label>
            <input
              id="editFirstName"
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              className={inputBaseClasses}
              disabled={isSubmitting}
              required
            />
          </div>
          <div>
            <label
              htmlFor="editLastName"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Last Name
              <span className="text-xs text-gray-500">(Optional)</span>
            </label>
            <input
              id="editLastName"
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              className={inputBaseClasses}
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label
              htmlFor="editUserRole"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Role
            </label>
            <select
              id="editUserRole"
              value={selectedRoleId}
              onChange={(e) => setSelectedRoleId(e.target.value)}
              className={selectBaseClasses}
              disabled={isSubmitting || roleOptions.length === 0}
              required
            >
              <option value="" disabled>
                Select a role
              </option>
              {roleOptions.map((role) => (
                <option key={role.role_id} value={role.role_id}>
                  {role.description}
                </option>
              ))}
            </select>
            {roleOptions.length === 0 && !isSubmitting && (
              <p className="text-xs text-gray-500 mt-1">Loading roles...</p>
            )}
          </div>
          <div className="pt-2 border-t border-gray-200 dark:border-gray-700 mt-4">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
              Change Password
              <span className="text-xs font-normal text-gray-500">
                (Optional)
              </span>
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              Leave fields blank to keep the current password.
            </p>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="newPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  New Password
                </label>
                <div className="relative">
                  <input
                    id="newPassword"
                    type={showNewPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className={`${inputBaseClasses} pr-10`}
                    disabled={isSubmitting}
                    placeholder="Enter new password (min. 6 chars)"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showNewPassword ? (
                      <LuEyeOff className="h-5 w-5" />
                    ) : (
                      <LuEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label
                  htmlFor="confirmPassword"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    id="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${inputBaseClasses} pr-10`}
                    disabled={isSubmitting || !newPassword}
                    placeholder="Confirm new password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  >
                    {showConfirmPassword ? (
                      <LuEyeOff className="h-5 w-5" />
                    ) : (
                      <LuEye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>

        <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700 flex-shrink-0">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="editUserForm" // Link to form by id if form tag doesn't wrap buttons
            onClick={handleSubmit} // Or trigger submit on the form if button is outside
            disabled={isSubmitting || !selectedRoleId || !editableUserId.trim()}
            className="inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
          >
            {isSubmitting ? (
              <LuLoader className="animate-spin h-4 w-4 mr-2" />
            ) : null}
            {isSubmitting ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>
    </div>
  );
};
