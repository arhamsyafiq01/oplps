import React, { useState, useEffect } from "react";
import { useModal } from "../../hooks/useModal";
import { Modal } from "../ui/modal";
import Button from "../ui/button/Button";
import Input from "../form/input/InputField";
import Label from "../form/Label";

const GET_PROFILE_API_URL = import.meta.env.VITE_GET_PROFILE_API_URL;
const CHANGE_PASSWORD_API_URL = import.meta.env.VITE_CHANGE_PASSWORD_API_URL;
const UPDATE_PROFILE_API_URL = import.meta.env.VITE_UPDATE_PROFILE_API_URL;

// Define an interface for the user data structure
interface UserProfileData {
  user_id: string;
  fname: string;
  lname: string;
  role_description: string;
}

export default function UserMetaCard() {
  const { isOpen, openModal, closeModal } = useModal();
  const [modalType, setModalType] = useState<"edit" | "password">("edit");
  const [userData, setUserData] = useState<UserProfileData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [editData, setEditData] = useState({ fname: "", lname: "" });
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  // --- Fetch Profile Data on Mount ---
  useEffect(() => {
    const fetchProfile = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch(GET_PROFILE_API_URL, {
          method: "GET",
          credentials: "include",
        });
        const result = await response.json();
        if (response.ok && result.success) {
          setUserData(result.data);
          setEditData({
            fname: result.data.fname || "",
            lname: result.data.lname || "",
          });
        } else {
          setError(result.message || "Failed to fetch profile data.");
        }
      } catch (err) {
        console.error("Fetch profile error:", err);
        setError("An error occurred while fetching profile data.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
  }, []);

  // --- Handlers for Form Inputs ---
  const handleEditChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handlePasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    // --- Handle Password Change ---
    if (modalType === "password") {
      console.log("Attempting to change password with data:", passwordData);
      // Client-side validation
      if (passwordData.newPassword !== passwordData.confirmPassword) {
        alert("New passwords do not match!");
        return;
      }
      if (!passwordData.currentPassword || !passwordData.newPassword) {
        alert("Please fill in all password fields.");
        return;
      }

      // --- Call change_password.php API ---
      try {
        const response = await fetch(CHANGE_PASSWORD_API_URL, {
          method: "POST",
          credentials: "include", // Send session cookie
          headers: {
            "Content-Type": "application/json", // Sending JSON
          },
          body: JSON.stringify({
            // Send current and new password
            currentPassword: passwordData.currentPassword,
            newPassword: passwordData.newPassword,
          }),
        });

        const result = await response.json();

        if (response.ok && result.success) {
          alert(result.message || "Password changed successfully!");
          // Clear password fields on success
          setPasswordData({
            currentPassword: "",
            newPassword: "",
            confirmPassword: "",
          });
          closeModal(); // Close modal on success
        } else {
          // Display error message from server
          alert(result.message || "Failed to change password.");
        }
      } catch (err) {
        console.error("Change password fetch error:", err);
        alert("An error occurred while trying to change the password.");
      }

      // --- Handle Edit Profile ---
    } else {
      console.log("Attempting to save profile with data:", editData);
      // Basic validation (optional, as PHP handles required fname)
      if (!editData.fname) {
        alert("First name cannot be empty.");
        return;
      }

      // --- Call update_profile.php API ---
      try {
        const response = await fetch(UPDATE_PROFILE_API_URL, {
          method: "POST",
          credentials: "include", // Send session cookie
          headers: {
            "Content-Type": "application/json", // Sending JSON
          },
          body: JSON.stringify(editData), // Send fname and lname
        });

        const result = await response.json();

        if (response.ok && result.success) {
          alert(result.message || "Profile updated successfully!");
          // Update local userData state to reflect changes immediately in the UI
          setUserData((prev) =>
            prev
              ? { ...prev, fname: editData.fname, lname: editData.lname }
              : null
          );
          closeModal(); // Close modal on success
        } else {
          // Display error message from server
          alert(result.message || "Failed to update profile.");
        }
      } catch (err) {
        console.error("Update profile fetch error:", err);
        alert("An error occurred while trying to update the profile.");
      }
    }
    // Removed closeModal() from here, moved inside success handlers
  };

  // --- Modal Opening Functions ---
  const openEditModal = () => {
    if (userData) {
      setEditData({ fname: userData.fname || "", lname: userData.lname || "" });
    }
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setModalType("edit");
    openModal();
  };

  const openPasswordModal = () => {
    setPasswordData({
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    });
    setModalType("password");
    openModal();
  };

  // --- Render Loading/Error States ---
  if (isLoading)
    return <div className="p-6 text-center">Loading profile...</div>;
  if (error)
    return <div className="p-6 text-center text-red-500">Error: {error}</div>;
  if (!userData)
    return <div className="p-6 text-center">Could not load profile data.</div>;

  // --- Main Component Render ---
  return (
    <>
      <div className="p-5 border border-gray-200 rounded-2xl dark:border-gray-800 lg:p-6">
        {/* Profile Header */}
        <div className="flex flex-col gap-5 xl:flex-row xl:items-center xl:justify-between">
          <div className="flex flex-col items-center w-full gap-6 xl:flex-row">
            <div className="w-20 h-20 overflow-hidden border border-gray-200 rounded-full dark:border-gray-800">
              <img src="/images/user/user1.png" alt="user" />
            </div>
            <div className="order-3 text-center xl:order-2 xl:text-left">
              <h4 className="mb-2 text-lg font-semibold text-gray-800 dark:text-white/90">
                {userData.fname || ""} {userData.lname || ""}
              </h4>
              <div className="flex flex-col items-center gap-1 xl:flex-row xl:gap-3">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {userData.user_id}
                </p>
                <div className="hidden h-3.5 w-px bg-gray-300 dark:bg-gray-700 xl:block"></div>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {userData.role_description || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>
        {/* Action Buttons */}
        <div className="flex flex-col gap-4 mt-8 sm:flex-row sm:justify-end">
          {/* Edit Button */}
          <button
            onClick={openEditModal}
            className="flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="20"
              height="20"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                fill="currentColor"
              />
            </svg>
            Edit Profile
          </button>
          {/* Change Password Button */}
          <button
            onClick={openPasswordModal}
            className="flex items-center justify-center gap-2 rounded-full border border-gray-300 bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-theme-xs hover:bg-gray-50 hover:text-gray-800 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-white/[0.03] dark:hover:text-gray-200 lg:inline-flex lg:w-auto"
          >
            <svg
              className="fill-current"
              width="20"
              height="20"
              viewBox="0 0 18 18"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                fillRule="evenodd"
                clipRule="evenodd"
                d="M15.0911 2.78206C14.2125 1.90338 12.7878 1.90338 11.9092 2.78206L4.57524 10.116C4.26682 10.4244 4.0547 10.8158 3.96468 11.2426L3.31231 14.3352C3.25997 14.5833 3.33653 14.841 3.51583 15.0203C3.69512 15.1996 3.95286 15.2761 4.20096 15.2238L7.29355 14.5714C7.72031 14.4814 8.11172 14.2693 8.42013 13.9609L15.7541 6.62695C16.6327 5.74827 16.6327 4.32365 15.7541 3.44497L15.0911 2.78206ZM12.9698 3.84272C13.2627 3.54982 13.7376 3.54982 14.0305 3.84272L14.6934 4.50563C14.9863 4.79852 14.9863 5.2734 14.6934 5.56629L14.044 6.21573L12.3204 4.49215L12.9698 3.84272ZM11.2597 5.55281L5.6359 11.1766C5.53309 11.2794 5.46238 11.4099 5.43238 11.5522L5.01758 13.5185L6.98394 13.1037C7.1262 13.0737 7.25666 13.003 7.35947 12.9002L12.9833 7.27639L11.2597 5.55281Z"
                fill="currentColor"
              />
            </svg>
            Change Password
          </button>
        </div>
      </div>

      {/* Modal */}
      <Modal isOpen={isOpen} onClose={closeModal} className="max-w-[700px] m-4">
        <div className="no-scrollbar relative w-full max-w-[700px] overflow-y-auto rounded-3xl bg-white p-4 dark:bg-gray-900 lg:p-11">
          {/* Edit Profile Modal Content */}
          {modalType === "edit" ? (
            <>
              {/* ... Modal Header ... */}
              <div className="px-2 pr-14">
                <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                  Edit Personal Information
                </h4>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                  Update your details. ID and Role cannot be changed here.
                </p>
              </div>
              <form
                className="flex flex-col"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
                  <div className="mt-7">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                      <div className="col-span-2">
                        <Label htmlFor="fname">First Name</Label>
                        <Input
                          id="fname"
                          name="fname"
                          type="text"
                          value={editData.fname}
                          onChange={handleEditChange}
                        />
                      </div>
                      <div className="col-span-2">
                        <Label htmlFor="lname">Last Name</Label>
                        <Input
                          id="lname"
                          name="lname"
                          type="text"
                          value={editData.lname}
                          onChange={handleEditChange}
                        />
                      </div>
                      {/* ID Input (Read Only) */}
                      <div className="col-span-2 ">
                        <Label>Employee ID</Label>
                        <Input
                          type="text"
                          value={userData.user_id}
                          disabled
                          className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed" /* readOnly REMOVED */
                        />
                      </div>
                      {/* Role Input (Read Only) */}
                      <div className="col-span-2 ">
                        <Label>Role</Label>
                        <Input
                          type="text"
                          value={userData.role_description || "N/A"}
                          disabled
                          className="bg-gray-100 dark:bg-gray-800 cursor-not-allowed" /* readOnly REMOVED */
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Modal Footer Buttons */}
                <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={closeModal} /* type REMOVED */
                  >
                    Close
                  </Button>
                  <Button size="sm" onClick={handleSave} /* type REMOVED */>
                    Save Changes
                  </Button>
                </div>
              </form>
            </>
          ) : (
            /* Change Password Modal Content */
            <>
              {/* ... Modal Header ... */}
              <div className="px-2 pr-14">
                <h4 className="mb-2 text-2xl font-semibold text-gray-800 dark:text-white/90">
                  Change Password
                </h4>
                <p className="mb-6 text-sm text-gray-500 dark:text-gray-400 lg:mb-7">
                  Enter your current and new password.
                </p>
              </div>
              <form
                className="flex flex-col"
                onSubmit={(e) => e.preventDefault()}
              >
                <div className="custom-scrollbar h-[450px] overflow-y-auto px-2 pb-3">
                  <div className="mt-7">
                    <div className="grid grid-cols-1 gap-x-6 gap-y-5 lg:grid-cols-2">
                      <div className="col-span-2 ">
                        <Label htmlFor="currentPassword">
                          Current Password
                        </Label>
                        <Input
                          id="currentPassword"
                          name="currentPassword"
                          type="password"
                          value={passwordData.currentPassword}
                          onChange={handlePasswordChange}
                        />
                      </div>
                      <div className="col-span-2 mt-5">
                        <Label htmlFor="newPassword">New Password</Label>
                        <Input
                          id="newPassword"
                          name="newPassword"
                          type="password"
                          value={passwordData.newPassword}
                          onChange={handlePasswordChange}
                        />
                      </div>
                      <div className="col-span-2 mt-5 ">
                        <Label htmlFor="confirmPassword">
                          Re-Enter New Password
                        </Label>
                        <Input
                          id="confirmPassword"
                          name="confirmPassword"
                          type="password"
                          value={passwordData.confirmPassword}
                          onChange={handlePasswordChange}
                        />
                      </div>
                    </div>
                  </div>
                </div>
                {/* Modal Footer Buttons */}
                <div className="flex items-center gap-3 px-2 mt-6 lg:justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={closeModal} /* type REMOVED */
                  >
                    Close
                  </Button>
                  <Button size="sm" onClick={handleSave} /* type REMOVED */>
                    Save Changes
                  </Button>
                </div>
              </form>
            </>
          )}
        </div>
      </Modal>
    </>
  );
}
