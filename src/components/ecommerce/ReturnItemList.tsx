import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  RefreshCw as LuRefresh,
  PlusCircle as LuPlusCircle,
  CheckCircle as LuCheckCircle,
  XCircle as LuXCircle, // For error/close icon for messages
  Info as LuInfo, // For success icon for messages
  Loader2 as LuLoader,
  Search as LuSearch,
  Edit as LuEdit,
  Trash2 as LuTrash, // For Delete button
} from "lucide-react";

// --- Import Modals and related types ---
import AddItemModal, {
  NewPartData,
  TypeOption,
  StatusOption,
} from "../form/item-form/AddItemModal";
import EditItemModal, { ReturnItemData } from "../form/item-form/EditItemModal";

// --- API URLs ---
const PARTS_API_URL = import.meta.env.VITE_PARTS_API_URL;
const TYPES_API_URL = import.meta.env.VITE_TYPES_API_URL;
const STATUS_API_URL = import.meta.env.VITE_STATUS_API_URL;

// --- Constants ---
const PENDING_STATUS_DESCRIPTION = "Pending";
const SUPERVISOR_ROLE_CODE = "SUPV";
const ADMIN_ROLE_CODE = "ADMIN";
const OPERATOR_ROLE_CODE = "OPER";

// --- Interfaces ---
interface ApiPartItem {
  part_id: string;
  part_number: string;
  quantity: number | string;
  type_description: string;
  status_description: string;
  created_on: string;
  updated_on: string;
  created_by_user: string | null;
  approved_by_user: string | null;
  approved_on: string | null;
  type_id?: string;
}

export interface PartItem {
  id: string;
  partNumber: string;
  quantity: number;
  typeDescription: string;
  statusDescription: string;
  returnDate: string;
  lastUpdated: string;
  createdBy: string;
  approvedBy: string | null;
  approvedOn: string | null;
  typeId?: string;
}

// --- Helper Function for Date Formatting ---
const formatDateForDisplay = (
  dateTimeString: string | null | undefined
): string => {
  if (!dateTimeString) return "N/A";
  try {
    const date = new Date(dateTimeString.replace(" ", "T"));
    if (isNaN(date.getTime())) return "Invalid Date";

    const day = date.getDate().toString().padStart(2, "0");
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    console.warn("Error formatting date:", dateTimeString, e);
    return String(dateTimeString);
  }
};

const mapApiToState = (apiItem: ApiPartItem): PartItem => ({
  id: String(apiItem.part_id),
  partNumber: apiItem.part_number,
  quantity: Number(apiItem.quantity) || 0,
  typeDescription: apiItem.type_description || "N/A",
  statusDescription: apiItem.status_description || "N/A",
  returnDate: apiItem.created_on,
  lastUpdated: apiItem.updated_on,
  createdBy: apiItem.created_by_user ?? "Unknown",
  approvedBy: apiItem.approved_by_user ?? null,
  approvedOn: apiItem.approved_on ?? null,
  typeId: apiItem.type_id,
});

async function fetchOptions<T>(url: string, optionName: string): Promise<T[]> {
  const response = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "include",
  });
  if (!response.ok) {
    let errorMsg = `${optionName} fetch error! Status: ${response.status}`;
    try {
      const errorData = await response.json();
      errorMsg = errorData.message || errorMsg;
    } catch (jsonError) {
      /* Ignore */
    }
    throw new Error(errorMsg);
  }
  const jsonData = await response.json();
  if (jsonData.status === "success" && Array.isArray(jsonData.items)) {
    return jsonData.items as T[];
  } else {
    throw new Error(
      jsonData.message || `Invalid data structure for ${optionName}.`
    );
  }
}

// --- Component ---
export default function PartItemsTable() {
  const [allFetchedData, setAllFetchedData] = useState<PartItem[]>([]);
  const [filteredData, setFilteredData] = useState<PartItem[]>([]);
  const [typeOptions, setTypeOptions] = useState<TypeOption[]>([]);
  const [statusOptions, setStatusOptions] = useState<StatusOption[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [actionItem, setActionItem] = useState<PartItem | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");

  useEffect(() => {
    const storedRole = sessionStorage.getItem("user_role_code");
    setUserRole(storedRole);
  }, []);

  const isSupervisor = userRole === SUPERVISOR_ROLE_CODE;
  const isAdmin = userRole === ADMIN_ROLE_CODE;
  const canCurrentUserEdit =
    userRole === SUPERVISOR_ROLE_CODE ||
    userRole === ADMIN_ROLE_CODE ||
    userRole === OPERATOR_ROLE_CODE;

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  // --- MODIFIED ---
  // Added `keepExistingMessages` parameter to prevent clearing messages after a successful action.
  const fetchPartsData = useCallback(
    async (showLoadingIndicator = true, keepExistingMessages = false) => {
      if (showLoadingIndicator) setIsLoading(true);
      if (!keepExistingMessages) {
        clearMessages(); // Only clear messages if we're not preserving them
      }
      setActionItem(null);
      try {
        const response = await fetch(PARTS_API_URL, {
          method: "GET",
          headers: { Accept: "application/json", "Cache-Control": "no-cache" },
          credentials: "include",
        });
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.message || `Parts fetch error! Status: ${response.status}`
          );
        }
        const jsonData = await response.json();
        if (jsonData.status === "success" && Array.isArray(jsonData.items)) {
          setAllFetchedData(jsonData.items.map(mapApiToState));
        } else if (jsonData.status === "success" && jsonData.items === null) {
          setAllFetchedData([]);
        } else {
          throw new Error(jsonData.message || "Invalid parts data structure.");
        }
      } catch (err) {
        console.error("Parts fetch error:", err);
        const errorMsg =
          err instanceof Error ? err.message : "Unknown parts fetch error.";
        setError(errorMsg);
        setAllFetchedData([]);
      } finally {
        if (showLoadingIndicator) setIsLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    const loadInitialData = async () => {
      setIsLoading(true);
      try {
        const [types, statuses] = await Promise.all([
          fetchOptions<TypeOption>(TYPES_API_URL, "Type Options"),
          fetchOptions<StatusOption>(STATUS_API_URL, "Status Options"),
        ]);
        setTypeOptions(types);
        setStatusOptions(statuses);
        await fetchPartsData(false); // Initial load clears messages
      } catch (err) {
        console.error("Initial data load error:", err);
        setError(
          err instanceof Error ? err.message : "Failed to load initial data."
        );
        setAllFetchedData([]);
        setTypeOptions([]);
        setStatusOptions([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadInitialData();
  }, [fetchPartsData]);

  const applyFiltersAndSearch = useCallback(() => {
    let result = allFetchedData;
    if (activeFilter !== "All") {
      result = result.filter(
        (item) =>
          item.typeDescription.toLowerCase() === activeFilter.toLowerCase()
      );
    }
    if (searchTerm) {
      const lowerCaseTerm = searchTerm.toLowerCase().trim();
      if (lowerCaseTerm) {
        result = result.filter((item) =>
          item.partNumber.toLowerCase().includes(lowerCaseTerm)
        );
      }
    }
    setFilteredData(result);
  }, [allFetchedData, activeFilter, searchTerm]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  const handleRefresh = () => {
    setSearchTerm("");
    setActiveFilter("All");
    fetchPartsData(true); // Manual refresh clears messages by default
  };

  const handleFilter = (filterType: string) => {
    setActiveFilter(filterType);
  };
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const openAddModal = () => {
    if (isLoading || isAdding || isActionLoading) return;
    clearMessages();
    setActionItem(null);
    setIsAddModalOpen(true);
  };
  const openEditModal = (item: PartItem) => {
    if (isLoading || isAdding || isActionLoading) return;
    clearMessages();
    setActionItem(item);
    setIsEditModalOpen(true);
  };
  const closeActionModals = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    if (!error) {
      setActionItem(null);
    }
  };

  const handleGenericPutAction = async (
    itemForAction: PartItem | null,
    payload: object,
    actionDesc: string
  ): Promise<boolean> => {
    clearMessages();
    setIsActionLoading(true);
    if (itemForAction) setActionItem(itemForAction);

    try {
      const response = await fetch(PARTS_API_URL, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") {
        throw new Error(result.message || `API Error for ${actionDesc}`);
      }

      const itemIdentifier = itemForAction
        ? `"${itemForAction.partNumber}"`
        : "the item";
      let finalSuccessMessage = "";
      switch (actionDesc) {
        case "update item details":
          finalSuccessMessage = `Successfully updated details for item ${itemIdentifier}.`;
          break;
        case "approve item":
          finalSuccessMessage = `Successfully approved item ${itemIdentifier}.`;
          break;
        case "delete item":
          finalSuccessMessage = `Successfully deleted item ${itemIdentifier}.`;
          break;
        default:
          finalSuccessMessage = `Action '${actionDesc}' on item ${itemIdentifier} was successful.`;
          break;
      }
      setSuccessMessage(finalSuccessMessage);
      setTimeout(() => setSuccessMessage(null), 4000);

      if (actionDesc === "update item details") closeActionModals();

      // --- MODIFIED ---
      // Pass `true` to keep the success message visible after refetching data.
      await fetchPartsData(false, true);

      return true;
    } catch (err) {
      console.error(`Error during '${actionDesc}':`, err);
      const message =
        err instanceof Error
          ? err.message
          : `Unknown error during ${actionDesc}.`;
      setError(message);
      return false;
    } finally {
      setIsActionLoading(false);
      if (actionDesc !== "update item details" || !error) {
        setActionItem(null);
      }
    }
  };

  const handleAddItemSubmit = async (
    newPartData: NewPartData
  ): Promise<void> => {
    clearMessages();
    setIsAdding(true);

    if (!window.confirm("Are you sure you want to add this new item?")) {
      setIsAdding(false);
      return;
    }

    try {
      const response = await fetch(PARTS_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(newPartData),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") {
        throw new Error(result.message || "Failed to add item.");
      }

      setSuccessMessage(
        `Successfully added new item "${newPartData.part_number}".`
      );
      setTimeout(() => setSuccessMessage(null), 4000);
      closeActionModals();

      // --- MODIFIED ---
      // Pass `true` to keep the success message visible after refetching data.
      await fetchPartsData(false, true);
    } catch (err) {
      console.error("Error adding part:", err);
      setError(err instanceof Error ? err.message : "Failed to add item.");
    } finally {
      setIsAdding(false);
    }
  };

  const handleUpdateItemSubmit = async (
    updatedDataFromModal: ReturnItemData
  ): Promise<void> => {
    if (!actionItem) {
      setError("Error: No item selected for update.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to update item "${actionItem.partNumber}"?`
      )
    ) {
      return;
    }

    const selectedTypeOption = typeOptions.find(
      (opt) => opt.description === updatedDataFromModal.partDescription
    );

    if (!selectedTypeOption) {
      setError(
        `Selected type description "${updatedDataFromModal.partDescription}" is not valid.`
      );
      return;
    }

    const payload = {
      action: "update_details",
      part_id: actionItem.id,
      part_number: updatedDataFromModal.partNumber,
      partDescription: updatedDataFromModal.partDescription,
      quantity: updatedDataFromModal.quantity,
    };
    await handleGenericPutAction(actionItem, payload, "update item details");
  };

  const handleApproveItem = async (itemToApprove: PartItem) => {
    if (isActionLoading || isAdding || itemToApprove.approvedBy) return;
    if (itemToApprove.statusDescription !== PENDING_STATUS_DESCRIPTION) {
      setError(
        `Item "${itemToApprove.partNumber}" cannot be approved as it is not 'Pending'.`
      );
      return;
    }
    if (!isSupervisor && !isAdmin) {
      setError("You do not have permission to approve items.");
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to approve item "${itemToApprove.partNumber}"?`
      )
    ) {
      return;
    }

    const payload = { action: "approve_item", part_id: itemToApprove.id };
    await handleGenericPutAction(itemToApprove, payload, "approve item");
  };

  const handleDeleteItem = async (itemToDelete: PartItem) => {
    if (isActionLoading || isAdding || itemToDelete.approvedBy) return;
    if (!isSupervisor && !isAdmin) {
      setError("You do not have permission to delete items.");
      return;
    }
    if (itemToDelete.statusDescription !== PENDING_STATUS_DESCRIPTION) {
      setError(
        `Item "${itemToDelete.partNumber}" cannot be deleted as it is not 'Pending'.`
      );
      return;
    }

    if (
      !window.confirm(
        `Are you sure you want to PERMANENTLY DELETE item "${itemToDelete.partNumber}"? This action cannot be undone.`
      )
    ) {
      return;
    }

    const payload = { action: "delete_item", part_id: itemToDelete.id };
    await handleGenericPutAction(itemToDelete, payload, "delete item");
  };

  const showActionsColumn = isSupervisor || isAdmin || canCurrentUserEdit;
  const totalColumns = showActionsColumn ? 11 : 10;
  const anyActionInProgress = isLoading || isAdding || isActionLoading;
  const availableDescriptionsForFilter = [
    ...new Set(typeOptions.map((opt) => opt.description).filter(Boolean)),
  ];
  const availableDescriptionsForModal = typeOptions
    .map((opt) => opt.description)
    .filter(Boolean);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-gray-800/30 sm:px-6">
      <div className="mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold mb-3 text-center text-gray-800 dark:text-white">
          Return Loose Part Item
        </h2>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={openAddModal}
            disabled={
              anyActionInProgress ||
              typeOptions.length === 0 ||
              statusOptions.length === 0
            }
            className={`inline-flex items-center gap-2 rounded-lg border border-blue-500 bg-blue-500 px-4 py-1.5 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-blue-700 dark:bg-blue-700 dark:text-gray-100 dark:hover:bg-blue-900 disabled:cursor-not-allowed`}
            title={
              typeOptions.length === 0 || statusOptions.length === 0
                ? "Options loading..."
                : "Add New Item"
            }
          >
            {isAdding ? (
              <LuLoader className="h-4 w-4 animate-spin" />
            ) : (
              <LuPlusCircle className="h-4 w-4" />
            )}
            {isAdding ? "Adding..." : " "}
            <span className="hidden sm:inline">Add Item</span>
          </button>
          <button
            onClick={handleRefresh}
            className={`inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800 disabled:cursor-not-allowed`}
            disabled={anyActionInProgress}
            title="Refresh Data"
          >
            <LuRefresh
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="w-full sm:max-w-md">
          <div className="relative mb-2">
            <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search Part Number..."
              value={searchTerm}
              onChange={handleSearch}
              disabled={anyActionInProgress}
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:w-64 disabled:opacity-50"
              aria-label="Search by Part Number"
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2 sm:ml-auto sm:flex-shrink-0">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300 mr-2 hidden sm:inline">
            Type:
          </span>
          {["All", ...availableDescriptionsForFilter].map((filter) => (
            <button
              key={filter}
              onClick={() => handleFilter(filter!)}
              disabled={anyActionInProgress}
              aria-pressed={activeFilter === filter}
              className={`rounded px-3 py-1.5 text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                activeFilter === filter
                  ? "bg-blue-600 text-white hover:bg-blue-700 dark:bg-blue-500 dark:hover:bg-blue-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {error && !isAddModalOpen && !isEditModalOpen && (
        <div
          className="mb-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400"
          role="alert"
        >
          <LuXCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100 rounded-full hover:bg-red-200 dark:hover:bg-red-700/50"
            aria-label="Close alert"
          >
            <LuXCircle className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMessage && !isAddModalOpen && !isEditModalOpen && (
        <div
          className="mb-4 flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-600 dark:bg-green-900/40 dark:text-green-300"
          role="status"
        >
          <LuInfo className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto p-1 text-green-500 hover:text-green-700 dark:text-green-300 dark:hover:text-green-100 rounded-full hover:bg-green-200 dark:hover:bg-green-700/50"
            aria-label="Close message"
          >
            <LuXCircle className="h-4 w-4" />
          </button>
        </div>
      )}

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y bg-gray-50 text-xs uppercase text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
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
                Part Number
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Type
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Quantity
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Return Date
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Created By
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Status
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Approved By
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Approved On
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Last Updated
              </th>
              {showActionsColumn && (
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
                <td
                  colSpan={totalColumns}
                  className="py-4 text-center text-gray-500 dark:text-gray-400 italic"
                >
                  Loading data...
                </td>
              </TableRow>
            )}
            {!isLoading && filteredData.length === 0 && (
              <TableRow>
                <td
                  colSpan={totalColumns}
                  className="py-4 text-center text-gray-500 dark:text-gray-400"
                >
                  {error
                    ? "Failed to load items. Please try refreshing."
                    : searchTerm || activeFilter !== "All"
                    ? "No items found matching criteria."
                    : "No items found. Add a new item."}
                </td>
              </TableRow>
            )}
            {!isLoading &&
              filteredData.map((item, index) => {
                const isPending =
                  item.statusDescription === PENDING_STATUS_DESCRIPTION &&
                  !item.approvedBy;
                const isThisItemLoading =
                  isActionLoading && actionItem?.id === item.id;
                return (
                  <TableRow
                    key={item.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                  >
                    <TableCell className="py-3 px-4 text-center text-sm text-gray-700 dark:text-gray-400">
                      {index + 1}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center text-sm text-gray-700 dark:text-gray-300">
                      {item.partNumber}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center text-sm text-gray-700 dark:text-gray-400">
                      {item.typeDescription}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center text-sm text-gray-700 dark:text-gray-400">
                      {item.quantity}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center text-sm text-gray-700 dark:text-gray-400">
                      {formatDateForDisplay(item.returnDate)}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center text-sm text-gray-700 dark:text-gray-400">
                      {item.createdBy}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center text-sm text-gray-700 dark:text-gray-400">
                      <span
                        className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${
                          item.statusDescription === PENDING_STATUS_DESCRIPTION
                            ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300"
                            : item.approvedBy
                            ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                            : "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300"
                        }`}
                      >
                        {item.statusDescription}
                      </span>
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center text-sm text-gray-700 dark:text-gray-400">
                      {item.approvedBy || "N/A"}
                    </TableCell>
                    <TableCell className="py-3 px-4 text-center text-sm text-gray-700 dark:text-gray-400">
                      {formatDateForDisplay(item.approvedOn)}
                    </TableCell>
                    <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                      {formatDateForDisplay(item.lastUpdated)}
                    </TableCell>
                    {showActionsColumn && (
                      <TableCell className="py-3 px-4 text-center text-sm">
                        <div className="flex items-center justify-center gap-2">
                          {canCurrentUserEdit && isPending && (
                            <button
                              title="Edit Item"
                              onClick={() => openEditModal(item)}
                              disabled={anyActionInProgress}
                              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                isThisItemLoading && isEditModalOpen
                                  ? "border-gray-400 bg-gray-200 text-gray-500"
                                  : "border-blue-600 bg-blue-100 text-blue-700 hover:bg-blue-200 focus:ring-blue-500"
                              }`}
                            >
                              {isThisItemLoading && isEditModalOpen ? (
                                <LuLoader className="h-4 w-4 animate-spin" />
                              ) : (
                                <LuEdit className="h-4 w-4" />
                              )}
                              {/* <span className="hidden sm:inline">Edit</span> */}
                            </button>
                          )}
                          {(isSupervisor || isAdmin) && isPending && (
                            <button
                              title="Approve Item"
                              onClick={() => handleApproveItem(item)}
                              disabled={anyActionInProgress}
                              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                isThisItemLoading && !isEditModalOpen
                                  ? "border-gray-400 bg-gray-200 text-gray-500"
                                  : "border-green-600 bg-green-100 text-green-700 hover:bg-green-200 focus:ring-green-500"
                              }`}
                            >
                              {isThisItemLoading && !isEditModalOpen ? (
                                <LuLoader className="h-4 w-4 animate-spin" />
                              ) : (
                                <LuCheckCircle className="h-4 w-4" />
                              )}
                              {/* <span className="hidden sm:inline">Approve</span> */}
                            </button>
                          )}
                          {(isSupervisor || isAdmin) && isPending && (
                            <button
                              title="Delete Item"
                              onClick={() => handleDeleteItem(item)}
                              disabled={anyActionInProgress}
                              className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                                isThisItemLoading && !isEditModalOpen
                                  ? "border-gray-400 bg-gray-200 text-gray-500"
                                  : "border-red-600 bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500"
                              }`}
                            >
                              {isThisItemLoading && !isEditModalOpen ? (
                                <LuLoader className="h-4 w-4 animate-spin" />
                              ) : (
                                <LuTrash className="h-4 w-4" />
                              )}
                              {/* <span className="hidden sm:inline">Delete</span> */}
                            </button>
                          )}
                        </div>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {isAddModalOpen && (
        <AddItemModal
          isOpen={isAddModalOpen}
          onClose={closeActionModals}
          onSubmit={handleAddItemSubmit}
          typeOptions={typeOptions}
          statusOptions={statusOptions}
        />
      )}
      {isEditModalOpen && actionItem && (
        <EditItemModal
          isOpen={isEditModalOpen}
          onClose={closeActionModals}
          onSubmit={handleUpdateItemSubmit}
          itemData={{
            id: actionItem.id,
            partNumber: actionItem.partNumber,
            partDescription: actionItem.typeDescription,
            quantity: actionItem.quantity,
          }}
          descriptionOptions={availableDescriptionsForModal}
        />
      )}
    </div>
  );
}
