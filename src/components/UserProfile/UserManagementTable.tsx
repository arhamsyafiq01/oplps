// src/pages/UserManagementTable.tsx

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table"; // Adjust path
import {
  RefreshCw as LuRefresh,
  Trash2 as LuTrash,
  Edit as LuEdit,
  Loader2 as LuLoader,
  Search as LuSearch,
  XCircle as LuXCircle,
  Info as LuInfo,
} from "lucide-react";

// Import the EditUserModal and its types
import {
  EditUserModal,
  UserEditData,
  RoleOption,
} from "../form/user-form/EditUserModal"; // Corrected path

const USER_MANAGEMENT_API_URL = import.meta.env.VITE_USER_MANAGEMENT_API_URL;
const GET_ROLES_API_URL = import.meta.env.VITE_GET_ROLES_API_URL;

const ADMIN_ROLE_CODE = "ADMIN";

interface ApiUserItem {
  user_id: string;
  fname: string | null;
  lname: string | null;
  role_id?: string;
  role_description: string | null;
  created_on: string;
  updated_on: string;
  created_by_name: string | null;
}

export interface UserListItem {
  id: string;
  firstName: string;
  lastName: string;
  roleId?: string;
  roleDescription: string;
  createdOn: string;
  updatedOn: string;
  createdByName: string;
}

const formatDateForDisplay = (
  dateTimeString: string | null | undefined
): string => {
  if (!dateTimeString) return "N/A";
  try {
    const date = new Date(dateTimeString.replace(" ", "T") + "Z");
    if (isNaN(date.getTime())) return "Invalid Date";
    const day = date.getUTCDate().toString().padStart(2, "0");
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = date.getUTCFullYear();
    const hours = date.getUTCHours().toString().padStart(2, "0"); // These lines
    const minutes = date.getUTCMinutes().toString().padStart(2, "0"); // are for time
    return `${day}/${month}/${year} ${hours}:${minutes}`; // This includes time
  } catch (e) {
    console.warn(
      "Error formatting date in UserManagementTable:",
      dateTimeString,
      e
    );
    return dateTimeString;
  }
};

const mapApiUserToState = (apiItem: ApiUserItem): UserListItem => ({
  id: apiItem.user_id,
  firstName: apiItem.fname || "N/A",
  lastName: apiItem.lname || "",
  roleId: apiItem.role_id,
  roleDescription: apiItem.role_description || "Unknown Role",
  createdOn: formatDateForDisplay(apiItem.created_on),
  updatedOn: formatDateForDisplay(apiItem.updated_on),
  createdByName: apiItem.created_by_name || "System",
});

async function fetchRoleOptionsFromApi(): Promise<RoleOption[]> {
  console.log(`Fetching roles from:`, GET_ROLES_API_URL);
  const response = await fetch(GET_ROLES_API_URL, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!response.ok) {
    const errData = await response.json().catch(() => ({}));
    throw new Error(
      errData.message || `Roles fetch error! Status: ${response.status}`
    );
  }
  const jsonData = await response.json();
  if (jsonData.status === "success" && Array.isArray(jsonData.roles)) {
    return jsonData.roles as RoleOption[];
  }
  throw new Error(jsonData.message || `Invalid data structure for roles.`);
}

export default function UserManagementTable() {
  const [allUsers, setAllUsers] = useState<UserListItem[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<UserListItem[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [actionUser, setActionUser] = useState<UserListItem | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>(""); // State for role filter
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [roleOptions, setRoleOptions] = useState<RoleOption[]>([]);

  useEffect(() => {
    const role = sessionStorage.getItem("user_role_code");
    const userId = sessionStorage.getItem("user_id");
    setCurrentUserRole(role);
    setCurrentUserId(userId);
  }, []);

  const isCurrentUserSupervisor = currentUserRole === ADMIN_ROLE_CODE;

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const fetchData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setIsLoading(true);
      clearMessages(); // Clear messages on full page load/refresh
    }
    console.log("Fetching users and roles...");
    try {
      const [usersResponse, rolesData] = await Promise.all([
        fetch(USER_MANAGEMENT_API_URL, {
          method: "GET",
          headers: { Accept: "application/json" },
          credentials: "include",
        }),
        fetchRoleOptionsFromApi(),
      ]);

      if (!usersResponse.ok) {
        const errData = await usersResponse.json().catch(() => ({}));
        throw new Error(
          errData.message ||
            `HTTP error fetching users! Status: ${usersResponse.status}`
        );
      }
      const usersJsonData = await usersResponse.json();

      if (
        usersJsonData.status === "success" &&
        Array.isArray(usersJsonData.users)
      ) {
        setAllUsers(usersJsonData.users.map(mapApiUserToState));
      } else if (
        usersJsonData.status === "success" &&
        usersJsonData.users === null
      ) {
        setAllUsers([]);
      } else {
        throw new Error(
          usersJsonData.message || "Invalid data structure for users."
        );
      }

      setRoleOptions(rolesData);
    } catch (err) {
      console.error("Error fetching initial data (users/roles):", err);
      setError(
        err instanceof Error
          ? err.message
          : "Unknown error fetching initial data."
      );
      setAllUsers([]);
      setRoleOptions([]);
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, []); // No dependencies needed if it's only called by other useEffect/handlers

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Combined filter logic
  const applyFilters = useCallback(() => {
    let result = allUsers;

    // Filter by search term
    if (searchTerm) {
      const lowerCaseTerm = searchTerm.toLowerCase().trim();
      if (lowerCaseTerm) {
        result = result.filter(
          (user) =>
            user.firstName.toLowerCase().includes(lowerCaseTerm) ||
            user.lastName.toLowerCase().includes(lowerCaseTerm) ||
            user.roleDescription.toLowerCase().includes(lowerCaseTerm) ||
            user.id.toLowerCase().includes(lowerCaseTerm)
        );
      }
    }

    // Filter by role
    if (selectedRoleFilter) {
      result = result.filter((user) => user.roleId === selectedRoleFilter);
    }

    setFilteredUsers(result);
  }, [allUsers, searchTerm, selectedRoleFilter]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const handleRefresh = () => {
    setSearchTerm("");
    setSelectedRoleFilter(""); // Reset role filter
    fetchData(true);
  };
  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    clearMessages();
    setSearchTerm(event.target.value);
  };

  const handleRoleFilterChange = (
    event: React.ChangeEvent<HTMLSelectElement>
  ) => {
    clearMessages();
    setSelectedRoleFilter(event.target.value);
  };

  const openEditModal = (user: UserListItem) => {
    if (anyActionInProgress) return;
    clearMessages();
    setActionUser(user);
    setIsEditModalOpen(true);
  };

  const closeModal = () => {
    setIsEditModalOpen(false);
    setActionUser(null);
  };

  const handleUserApiAction = async (
    payload: object,
    actionDesc: string,
    userNameForMessage: string
  ): Promise<boolean> => {
    clearMessages();
    setIsActionLoading(true);

    console.log(
      `Performing action '${actionDesc}' for user: ${userNameForMessage}`,
      payload
    );
    try {
      const response = await fetch(USER_MANAGEMENT_API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(
          result.message || `HTTP error! Status: ${response.status}`
        );
      if (result.status !== "success")
        throw new Error(result.message || `API failed for ${actionDesc}.`);

      const verb = actionDesc.split("_")[0];
      setSuccessMessage(`User ${userNameForMessage} ${verb}d successfully.`);
      setTimeout(() => setSuccessMessage(null), 4000);

      await fetchData(false); // Refresh list without main loader
      if (actionDesc === "update_user_details") closeModal();
      return true;
    } catch (err) {
      console.error(`Error during user '${actionDesc}':`, err);
      setError(
        err instanceof Error
          ? err.message
          : `Unknown error during ${actionDesc}.`
      );
      return false;
    } finally {
      setIsActionLoading(false);
      if (actionDesc !== "update_user_details" || successMessage) {
        setActionUser(null);
      }
    }
  };

  const handleEditUserSubmit = async (editData: UserEditData) => {
    if (!actionUser) {
      setError("Original user data not found for editing.");
      throw new Error("Original user data not found.");
    }
    if (
      !window.confirm(
        `Are you sure you want to update user ${actionUser.firstName} ${
          actionUser.lastName
        } (ID: ${actionUser.id})? ${
          editData.originalUserId !== editData.newUserId
            ? "WARNING: User ID will be changed!"
            : ""
        }`
      )
    ) {
      throw new Error("Update cancelled by user.");
    }
    const payload = {
      action: "update_user_details",
      original_user_id: editData.originalUserId,
      new_user_id: editData.newUserId,
      fname: editData.firstName,
      lname: editData.lastName,
      role_id: editData.roleId,
    };
    await handleUserApiAction(
      payload,
      "update_user_details",
      `${editData.firstName} ${editData.lastName} (New ID: ${editData.newUserId})`
    );
  };

  const handleDeleteUser = async (userToDelete: UserListItem) => {
    if (!isCurrentUserSupervisor) {
      setError("You do not have permission to delete users.");
      return;
    }
    if (userToDelete.id === currentUserId) {
      setError("You cannot delete your own account.");
      return;
    }
    if (
      !window.confirm(
        `Delete Employee ID: ${userToDelete.id} ${userToDelete.firstName} ${userToDelete.lastName} ? This action is permanent.`
      )
    )
      return;

    setActionUser(userToDelete);
    const payload = { action: "delete_user", user_id: userToDelete.id };
    await handleUserApiAction(
      payload,
      "delete_user",
      `${userToDelete.firstName} ${userToDelete.lastName}`
    );
  };

  const anyActionInProgress = isLoading || isActionLoading;
  const totalColumns = isCurrentUserSupervisor ? 8 : 7;

  return (
    <div className="overflow-hidden bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-gray-800/30 sm:px-1">
      <div className="pb-2 border-b border-gray-200 dark:border-gray-700 mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-white">
          User Account Management
        </h2>
        <div className="flex flex-wrap items-center justify-end gap-2 flex-grow">
          <button
            onClick={handleRefresh}
            className={`inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 ${
              isLoading ? "opacity-50 cursor-not-allowed" : ""
            }`}
            disabled={isLoading}
            title="Refresh Data"
            aria-label="Refresh Data"
          >
            <LuRefresh
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Filter controls */}
      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-start">
        <div className="relative w-full sm:w-auto">
          <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
          <input
            type="text"
            placeholder="Search Employee ID, Name"
            value={searchTerm}
            onChange={handleSearchChange}
            disabled={isLoading}
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:w-72 disabled:opacity-50"
          />
        </div>
        <div className="w-full sm:w-auto">
          <select
            id="role-filter"
            value={selectedRoleFilter}
            onChange={handleRoleFilterChange}
            disabled={isLoading}
            className="w-full rounded-md border border-gray-300 py-2 pl-3 pr-8 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:w-48 disabled:opacity-50"
            aria-label="Filter by role"
          >
            <option value="">All Role</option>
            {roleOptions.map((role) => (
              <option key={role.role_id} value={role.role_id}>
                {role.description}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div
          className="mb-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400"
          role="alert"
        >
          <LuXCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100 rounded-full hover:bg-red-200 dark:hover:bg-red-700/50"
          >
            <LuXCircle className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMessage && (
        <div
          className="mb-4 flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-600 dark:bg-green-900/40 dark:text-green-300"
          role="status"
        >
          <LuInfo className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto p-1 text-green-500 hover:text-green-700 dark:text-green-300 dark:hover:text-green-100 rounded-full hover:bg-green-200 dark:hover:bg-green-700/50"
          >
            <LuXCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y border-gray-100 bg-gray-50 text-left text-xs font-semibold uppercase tracking-wider text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <TableRow>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                No
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Employee ID
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                First Name
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Last Name
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Role
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Created On
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Last Updated
              </th>
              {isCurrentUserSupervisor && (
                <th
                  scope="col"
                  className="whitespace-nowrap px-4 py-3 text-center"
                >
                  Actions
                </th>
              )}
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && (
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  className="py-4 text-center text-sm text-gray-500 dark:text-gray-400 italic"
                  {...({} as any)}
                >
                  <div className="flex justify-center items-center">
                    <LuLoader className="animate-spin h-5 w-5 mr-3" />
                    Loading users...
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && filteredUsers.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  className="py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                  {...({} as any)}
                >
                  {error
                    ? "Could not load users."
                    : searchTerm || selectedRoleFilter
                    ? "No users found matching your filters."
                    : "No users found."}
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              filteredUsers.map((user, index) => (
                <TableRow
                  key={user.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {index + 1}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-center">
                    {user.id}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-center">
                    {user.firstName}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-center">
                    {user.lastName}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-sm text-gray-700 dark:text-gray-300 text-center">
                    {user.roleDescription}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {user.createdOn}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {user.updatedOn}
                  </TableCell>
                  {isCurrentUserSupervisor && (
                    <TableCell className="px-4 py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <button
                          onClick={() => openEditModal(user)}
                          disabled={
                            anyActionInProgress ||
                            (user.id === currentUserId &&
                              !isCurrentUserSupervisor) /* Allow supervisor to edit self, others cannot */
                          }
                          className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isActionLoading &&
                            actionUser?.id === user.id &&
                            isEditModalOpen
                              ? "border-gray-400 bg-gray-200 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                              : user.id === currentUserId &&
                                !isCurrentUserSupervisor
                              ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500"
                              : "border-blue-600 bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-500 dark:border-blue-700 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-800/60"
                          }`}
                          title={
                            user.id === currentUserId &&
                            !isCurrentUserSupervisor
                              ? "Cannot edit own account unless Supervisor"
                              : "Edit User"
                          }
                        >
                          {isActionLoading &&
                          actionUser?.id === user.id &&
                          isEditModalOpen ? (
                            <LuLoader className="animate-spin h-4 w-4" />
                          ) : (
                            <LuEdit className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Edit</span>
                        </button>
                        <button
                          onClick={() => handleDeleteUser(user)}
                          disabled={
                            anyActionInProgress || user.id === currentUserId
                          }
                          className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                            isActionLoading &&
                            actionUser?.id === user.id &&
                            !isEditModalOpen
                              ? "border-gray-400 bg-gray-200 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                              : user.id === currentUserId
                              ? "border-gray-300 bg-gray-100 text-gray-400 cursor-not-allowed dark:border-gray-600 dark:bg-gray-700 dark:text-gray-500"
                              : "border-red-600 bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500 dark:border-red-700 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-800/60"
                          }`}
                          title={
                            user.id === currentUserId
                              ? "Cannot delete own account"
                              : "Delete User"
                          }
                        >
                          {isActionLoading &&
                          actionUser?.id === user.id &&
                          !isEditModalOpen ? (
                            <LuLoader className="animate-spin h-4 w-4" />
                          ) : (
                            <LuTrash className="h-4 w-4" />
                          )}
                          <span className="hidden sm:inline">Delete</span>
                        </button>
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {isEditModalOpen && actionUser && (
        <EditUserModal
          isOpen={isEditModalOpen}
          onClose={closeModal}
          onSubmit={handleEditUserSubmit}
          userData={actionUser}
          roleOptions={roleOptions}
          isLoading={
            isActionLoading &&
            actionUser?.id === actionUser?.id &&
            isEditModalOpen
          }
        />
      )}
    </div>
  );
}
