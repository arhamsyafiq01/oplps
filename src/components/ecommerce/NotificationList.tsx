// --- START OF FILE NotificationList.tsx ---

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
  ArrowUpLeftFromSquare as LuArrowUpFromSquare,
  PackageX as LuPackageX,
  Loader2 as LuLoader,
  Search as LuSearch,
  XCircle as LuXCircle, // For message dismissal
  Info as LuInfo, // For success message icon
} from "lucide-react";

import IssueOutItemModal, {
  IssueOutPayload,
} from "../form/item-form/IssueOutItemModal";
import DamageItemModal, {
  DamagePayload,
} from "../form/item-form/DamageItemModal";

// --- ADDED: Import the refresh context hook ---
import { useNotificationRefresh } from "../../context/NotificationRefreshContext";

const PARTS_API_URL = import.meta.env.VITE_PARTS_API_URL;
const ISSUE_API_URL = import.meta.env.VITE_ISSUE_API_URL;
const DAMAGE_API_URL = import.meta.env.VITE_DAMAGE_API_URL;

interface ApiListItem {
  part_id: string;
  part_number: string;
  quantity: number | string;
  type_description: string;
  status_description: string;
  updated_on: string;
  created_by_user: string | null;
  approved_by_user: string | null;
  approved_on: string | null;
  type?: string;
  status?: string;
  created_on: string;
}

export interface NotificationItem {
  id: string;
  partNumber: string;
  typeDescription: string;
  quantity: number;
  returnDate: string;
  createdBy: string | null;
  approvedBy: string | null;
  lastUpdated: string;
  daysSinceReturn: number | null;
  notificationStatus: "ok" | "gt14" | "gt30" | "gt90";
}

const NOTIFICATION_FILTERS = [
  { value: "all", label: "All" },
  { value: "gt14", label: "> 14 Days" },
  { value: "gt30", label: "> 30 Days" },
  { value: "gt90", label: "> 90 Days" },
];
const NOTIFICATION_STATUS_CLASSES: Record<
  NotificationItem["notificationStatus"],
  string
> = {
  gt14: "bg-blue-100 dark:bg-blue-900/50",
  gt30: "bg-yellow-100 dark:bg-yellow-900/50",
  gt90: "bg-red-100 dark:bg-red-900/50",
  ok: "",
};

const formatDateForDisplay = (
  dateTimeString: string | null | undefined
): string => {
  if (
    !dateTimeString ||
    dateTimeString === "0000-00-00" ||
    dateTimeString === "0000-00-00 00:00:00"
  ) {
    return "N/A";
  }
  try {
    const isoDateTimeString = dateTimeString.includes("T")
      ? dateTimeString
      : dateTimeString.replace(" ", "T") +
        (dateTimeString.endsWith("Z") ? "" : "Z");
    const date = new Date(isoDateTimeString);
    if (isNaN(date.getTime())) {
      console.warn("Invalid date string for formatting:", dateTimeString);
      return "Invalid Date";
    }
    const day = date.getUTCDate().toString().padStart(2, "0");
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    console.error("Error formatting date:", dateTimeString, e);
    return dateTimeString;
  }
};

const getNotificationStatus = (
  referenceDateString: string
): { days: number | null; status: NotificationItem["notificationStatus"] } => {
  try {
    if (!referenceDateString || referenceDateString.startsWith("0000-00-00"))
      return { days: null, status: "ok" };

    const isoReferenceDateString = referenceDateString.includes("T")
      ? referenceDateString
      : referenceDateString.replace(" ", "T") +
        (referenceDateString.endsWith("Z") ? "" : "Z");
    const refDate = new Date(isoReferenceDateString);
    if (isNaN(refDate.getTime())) {
      console.warn(
        `Invalid date for notification calculation: ${referenceDateString}`
      );
      return { days: null, status: "ok" };
    }

    const today = new Date();
    const todayUTCStart = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    );
    const refDateUTCStart = Date.UTC(
      refDate.getUTCFullYear(),
      refDate.getUTCMonth(),
      refDate.getUTCDate()
    );

    const diffTime = todayUTCStart - refDateUTCStart;
    if (diffTime < 0) return { days: 0, status: "ok" };

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    let status: NotificationItem["notificationStatus"] = "ok";
    if (diffDays > 90) status = "gt90";
    else if (diffDays > 30) status = "gt30";
    else if (diffDays >= 14) status = "gt14";

    return { days: diffDays, status };
  } catch (e) {
    console.error("Error calculating date diff:", referenceDateString, e);
    return { days: null, status: "ok" };
  }
};

const mapApiToNotificationItem = (apiItem: ApiListItem): NotificationItem => {
  const { days, status } = getNotificationStatus(apiItem.created_on);
  return {
    id: String(apiItem.part_id),
    partNumber: apiItem.part_number,
    typeDescription: apiItem.type_description,
    quantity: Number(apiItem.quantity) || 0,
    returnDate: apiItem.created_on,
    createdBy: apiItem.created_by_user ?? "N/A",
    approvedBy: apiItem.approved_by_user ?? null,
    lastUpdated: apiItem.updated_on,
    daysSinceReturn: days,
    notificationStatus: status,
  };
};

export default function NotificationListTable() {
  const [allNotificationData, setAllNotificationData] = useState<
    NotificationItem[]
  >([]);
  const [filteredData, setFilteredData] = useState<NotificationItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeDescFilter, setActiveDescFilter] = useState<string>("All");
  const [activeAgeFilter, setActiveAgeFilter] = useState<string>("all");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isIssueOutModalOpen, setIsIssueOutModalOpen] =
    useState<boolean>(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState<boolean>(false);
  const [actionItem, setActionItem] = useState<NotificationItem | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- ADDED: Get the trigger function from the context ---
  const { triggerRefresh } = useNotificationRefresh();

  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const fetchData = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    if (showLoadingSpinner) clearMessages();
    setError(null);

    try {
      const response = await fetch(PARTS_API_URL, {
        method: "GET",
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        credentials: "include",
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || `HTTP error! Status: ${response.status}`
        );
      }
      const jsonData = await response.json();

      if (jsonData.status === "success" && Array.isArray(jsonData.items)) {
        const mappedData = jsonData.items.map(mapApiToNotificationItem);
        const approvedItems = mappedData.filter(
          (item: NotificationItem) =>
            item.approvedBy !== null && item.quantity > 0
        );
        const overdueItems = approvedItems.filter(
          (item: NotificationItem) => item.notificationStatus !== "ok"
        );
        setAllNotificationData(overdueItems);
      } else if (
        jsonData.status === "success" &&
        (jsonData.items === null || jsonData.items.length === 0)
      ) {
        setAllNotificationData([]);
      } else {
        throw new Error(jsonData.message || "Invalid data structure from API.");
      }
    } catch (err) {
      console.error("Error fetching notification items:", err);
      const message =
        err instanceof Error ? err.message : "Unknown fetch error.";
      setError(message);
      setAllNotificationData([]);
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyFiltersAndSearch = useCallback(() => {
    let result = [...allNotificationData];

    if (activeDescFilter !== "All") {
      result = result.filter(
        (item) =>
          item.typeDescription.toLowerCase() === activeDescFilter.toLowerCase()
      );
    }
    if (activeAgeFilter !== "all") {
      result = result.filter(
        (item) => item.notificationStatus === activeAgeFilter
      );
    }
    if (searchTerm.trim()) {
      const lowerCaseTerm = searchTerm.toLowerCase().trim();
      result = result.filter((item) =>
        item.partNumber.toLowerCase().includes(lowerCaseTerm)
      );
    }
    setFilteredData(result);
  }, [allNotificationData, activeDescFilter, activeAgeFilter, searchTerm]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  const handleRefresh = () => {
    setSearchTerm("");
    setActiveDescFilter("All");
    setActiveAgeFilter("all");
    fetchData(true);
  };
  const handleDescFilter = (filterType: string) => {
    clearMessages();
    setActiveDescFilter(filterType);
  };
  const handleAgeFilter = (filterType: string) => {
    clearMessages();
    setActiveAgeFilter(filterType);
  };
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    clearMessages();
    setSearchTerm(event.target.value);
  };

  const openIssueOutModal = (item: NotificationItem) => {
    if (isActionLoading) return;
    clearMessages();
    setActionItem(item);
    setError(null);
    setIsIssueOutModalOpen(true);
  };
  const openDamageModal = (item: NotificationItem) => {
    if (isActionLoading) return;
    clearMessages();
    setActionItem(item);
    setError(null);
    setIsDamageModalOpen(true);
  };
  const closeModal = () => {
    setIsIssueOutModalOpen(false);
    setIsDamageModalOpen(false);
    setActionItem(null);
  };

  const handlePostEventApiAction = async (
    apiUrl: string,
    payload: any, // Consider a union type: IssueOutPayload | DamagePayload
    actionDesc: string,
    quantityChanged: number
  ): Promise<void> => {
    if (!actionItem) throw new Error(`No item selected for ${actionDesc}`);
    clearMessages();
    setError(null);
    setIsActionLoading(true);
    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        credentials: "include",
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || result.status !== "success") {
        throw new Error(
          result.message || `API Error for ${actionDesc}: ${response.status}`
        );
      }

      const successMsg =
        actionDesc === "issue out item"
          ? `Successfully issued out ${quantityChanged} unit(s) of "${actionItem.partNumber}".`
          : `Successfully marked ${quantityChanged} unit(s) of "${actionItem.partNumber}" as damaged.`;
      setSuccessMessage(successMsg);
      setTimeout(() => setSuccessMessage(null), 4000);

      closeModal();

      const currentActionItemId = actionItem.id;
      const remainingQuantity = actionItem.quantity - quantityChanged;

      if (remainingQuantity <= 0) {
        setAllNotificationData((prevData) =>
          prevData.filter((item) => item.id !== currentActionItemId)
        );
      } else {
        setAllNotificationData((prevData) =>
          prevData.map((item) =>
            item.id === currentActionItemId
              ? { ...item, quantity: remainingQuantity }
              : item
          )
        );
      }

      // --- MODIFIED: Trigger a refresh for the sidebar badge ---
      triggerRefresh();
    } catch (err) {
      console.error(
        `Error during '${actionDesc}' on Part ID ${actionItem?.id}:`,
        err
      );
      const message =
        err instanceof Error
          ? err.message
          : `Unknown error during ${actionDesc}.`;
      setError(message);
      throw err;
    } finally {
      setIsActionLoading(false);
      setActionItem(null); // Clear actionItem after action
    }
  };

  const getCurrentUserId = (): string | null => {
    return sessionStorage.getItem("user_id"); // Example: Your actual method
  };

  const handleIssueOutSubmitForNotification = async (
    modalPayload: IssueOutPayload
  ): Promise<void> => {
    if (!actionItem) throw new Error("No item selected for issuing.");
    const userId = getCurrentUserId();
    if (!userId) {
      const msg = "User not identified.";
      setError(msg);
      throw new Error(msg);
    }
    const apiPayload = { part_id: actionItem.id, ...modalPayload };

    if (modalPayload.quantity_issued > actionItem.quantity) {
      const errMsg = `Cannot issue ${modalPayload.quantity_issued}. Only ${actionItem.quantity} available.`;
      setError(errMsg);
      throw new Error(errMsg);
    }
    await handlePostEventApiAction(
      ISSUE_API_URL,
      apiPayload,
      "issue out item",
      modalPayload.quantity_issued
    );
  };

  const handleDamageSubmitForNotification = async (
    modalPayload: DamagePayload
  ): Promise<void> => {
    if (!actionItem)
      throw new Error("No item selected for marking as damaged.");
    const userId = getCurrentUserId();
    if (!userId) {
      const msg = "User not identified.";
      setError(msg);
      throw new Error(msg);
    }
    const apiPayload = { part_id: actionItem.id, ...modalPayload };

    if (modalPayload.quantity_damaged > actionItem.quantity) {
      const errMsg = `Cannot mark ${modalPayload.quantity_damaged} as damaged. Only ${actionItem.quantity} available.`;
      setError(errMsg);
      throw new Error(errMsg);
    }
    await handlePostEventApiAction(
      DAMAGE_API_URL,
      apiPayload,
      "mark item as damaged",
      modalPayload.quantity_damaged
    );
  };

  const anyLoading = isLoading || isActionLoading;
  const totalColumns = 10;
  const descriptionFilterOptions = [
    "All",
    ...Array.from(
      new Set(allNotificationData.map((item) => item.typeDescription))
    ).filter(Boolean),
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6">
      {/* Header and Color Indicators */}
      <div className="mb-4 flex flex-col gap-y-3 border-b border-gray-200 pb-4 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between">
        <h2 className="text-xl font-semibold mb-3 text-center text-gray-800 dark:text-white">
          Overdue Loose Part
        </h2>
        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-sm text-gray-600 dark:text-gray-400 sm:mt-1">
          {NOTIFICATION_FILTERS.filter((f) => f.value !== "all").map(
            (filter) => (
              <div key={filter.value} className="flex items-center">
                <div
                  className={`mr-1.5 h-5 w-5 rounded-sm ${
                    NOTIFICATION_STATUS_CLASSES[
                      filter.value as keyof typeof NOTIFICATION_STATUS_CLASSES
                    ]
                  }`}
                ></div>
                <span>{filter.label}</span>
              </div>
            )
          )}
        </div>
        <div className="flex items-center gap-2 justify-end">
          <button
            onClick={handleRefresh}
            disabled={anyLoading}
            className={`inline-flex items-center gap-1.5 rounded-md border border-gray-300 bg-white px-4 py-1.5 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 ${
              anyLoading ? "cursor-not-allowed" : ""
            }`}
          >
            <LuRefresh
              className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Controls: Search, Filters, Refresh */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="relative w-full sm:w-auto ">
          <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search Part Number"
            className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:w-64 disabled:opacity-50"
            value={searchTerm}
            onChange={handleSearch}
            disabled={anyLoading}
            aria-label="Search by Part Number"
          />
        </div>

        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:flex-wrap">
          <div className="flex-grow sm:flex-grow-0">
            <label
              htmlFor="typeFilterSelect"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Type:
            </label>
            <select
              id="typeFilterSelect"
              value={activeDescFilter}
              onChange={(e) => handleDescFilter(e.target.value)}
              disabled={anyLoading}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 disabled:opacity-50"
            >
              {descriptionFilterOptions.map((filterOption) => (
                <option key={`type-${filterOption}`} value={filterOption}>
                  {filterOption}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-grow sm:flex-grow-0 ">
            <label
              htmlFor="overdueFilterSelect"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Overdue By:
            </label>
            <select
              id="overdueFilterSelect"
              value={activeAgeFilter}
              onChange={(e) => handleAgeFilter(e.target.value)}
              disabled={anyLoading}
              className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 disabled:opacity-50"
            >
              {NOTIFICATION_FILTERS.map((filterOption) => (
                <option
                  key={`age-${filterOption.value}`}
                  value={filterOption.value}
                >
                  {filterOption.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* --- Display Error and Success Messages --- */}
      {error && !isIssueOutModalOpen && !isDamageModalOpen && (
        <div
          className="mb-4 flex items-center gap-2 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-400"
          role="alert"
        >
          <LuXCircle className="h-5 w-5 flex-shrink-0" />
          <span>{error}</span>
          <button
            onClick={() => setError(null)}
            className="ml-auto p-1 text-red-500 hover:text-red-700 dark:text-red-300 dark:hover:text-red-100 rounded-full hover:bg-red-200 dark:hover:bg-red-700/50"
            aria-label="Close error"
          >
            <LuXCircle className="h-4 w-4" />
          </button>
        </div>
      )}
      {successMessage && !isIssueOutModalOpen && !isDamageModalOpen && (
        <div
          className="mb-4 flex items-center gap-2 rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-700 dark:border-green-600 dark:bg-green-900/40 dark:text-green-300"
          role="status"
        >
          <LuInfo className="h-5 w-5 flex-shrink-0" />
          <span>{successMessage}</span>
          <button
            onClick={() => setSuccessMessage(null)}
            className="ml-auto p-1 text-green-500 hover:text-green-700 dark:text-green-300 dark:hover:text-green-100 rounded-full hover:bg-green-200 dark:hover:bg-green-700/50"
            aria-label="Close success message"
          >
            <LuXCircle className="h-4 w-4" />
          </button>
        </div>
      )}
      {/* End Messages */}

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y bg-gray-50 text-xs uppercase text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <TableRow>
              <th className="px-4 py-3 text-center">No</th>
              <th className="px-4 py-3 text-center">Part Number</th>
              <th className="px-4 py-3 text-center">Type</th>
              <th className="px-4 py-3 text-center">Quantity</th>
              <th className="px-4 py-3 text-center">Return Date</th>
              <th className="px-4 py-3 text-center">Created By</th>
              <th className="px-4 py-3 text-center">Approved By</th>
              <th className="px-4 py-3 text-center">Last Updated</th>
              <th className="px-4 py-3 text-center">Days Overdue</th>
              <th className="px-4 py-3 text-center">Actions</th>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y dark:divide-gray-800">
            {isLoading && (
              <TableRow>
                <td
                  colSpan={totalColumns}
                  className="py-4 text-center text-sm text-gray-500 italic"
                >
                  Loading notifications...
                </td>
              </TableRow>
            )}
            {!isLoading && filteredData.length === 0 && (
              <TableRow>
                <td
                  colSpan={totalColumns}
                  className="py-4 text-center text-sm text-gray-500"
                >
                  {error
                    ? "Could not load data."
                    : searchTerm ||
                      activeDescFilter !== "All" ||
                      activeAgeFilter !== "all"
                    ? "No items found matching criteria."
                    : "No overdue approved items found."}
                </td>
              </TableRow>
            )}
            {!isLoading &&
              filteredData.map((item, index) => (
                <TableRow
                  key={item.id}
                  className={`${
                    NOTIFICATION_STATUS_CLASSES[item.notificationStatus] || ""
                  } hover:bg-gray-50 dark:hover:bg-gray-800/50`}
                >
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {index + 1}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {item.partNumber}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {item.typeDescription}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {item.quantity}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {formatDateForDisplay(item.returnDate)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {item.createdBy}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {item.approvedBy || "N/A"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {formatDateForDisplay(item.lastUpdated)}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm font-medium text-gray-700 dark:text-gray-300">
                    {item.daysSinceReturn ?? "N/A"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-2 sm:gap-3">
                      <button
                        title="Issue Out Item"
                        onClick={() => openIssueOutModal(item)}
                        disabled={isActionLoading || item.quantity <= 0}
                        className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          (isActionLoading &&
                            actionItem?.id === item.id &&
                            isIssueOutModalOpen) ||
                          item.quantity <= 0
                            ? "border-gray-400 bg-gray-200 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            : "border-violet-600 bg-violet-100 text-violet-700 hover:bg-violet-200 focus:ring-violet-500 dark:border-violet-700 dark:bg-violet-900/50 dark:text-violet-300 dark:hover:bg-violet-800/60"
                        }`}
                      >
                        {isActionLoading &&
                        actionItem?.id === item.id &&
                        isIssueOutModalOpen ? (
                          <LuLoader className="h-4 w-4 animate-spin" />
                        ) : (
                          <LuArrowUpFromSquare className="h-4 w-4" />
                        )}
                        <span className="hidden ">
                          {isIssueOutModalOpen &&
                          actionItem?.id === item.id &&
                          !isIssueOutModalOpen
                            ? "Issuing..."
                            : ""}
                        </span>
                      </button>

                      <button
                        title="Damaged Item"
                        onClick={() => openDamageModal(item)}
                        disabled={isActionLoading || item.quantity <= 0}
                        className={`inline-flex items-center gap-1 rounded border px-2 py-1 text-xs font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${
                          (isActionLoading &&
                            actionItem?.id === item.id &&
                            isDamageModalOpen) ||
                          item.quantity <= 0
                            ? "border-gray-400 bg-gray-200 text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400"
                            : "border-red-600 bg-red-200 text-red-600 hover:bg-red-100 focus:ring-red-500 dark:border-red-700 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900/50"
                        }`}
                      >
                        {isActionLoading &&
                        actionItem?.id === item.id &&
                        isDamageModalOpen ? (
                          <LuLoader className="h-4 w-4 animate-spin" />
                        ) : (
                          <LuPackageX className="h-4 w-4" />
                        )}
                        {/* <span className="hidden sm:inline"> */}
                        <span className="hidden">
                          {isDamageModalOpen &&
                          actionItem?.id === item.id &&
                          !isDamageModalOpen
                            ? "Damage Item..."
                            : ""}
                        </span>
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {isIssueOutModalOpen && actionItem && (
        <IssueOutItemModal
          isOpen={isIssueOutModalOpen}
          onClose={closeModal}
          onSubmit={handleIssueOutSubmitForNotification}
          itemData={{
            id: actionItem.id,
            partNumber: actionItem.partNumber,
            partDescription: actionItem.typeDescription,
            quantity: actionItem.quantity,
            dateOfReturn: actionItem.returnDate,
          }}
        />
      )}
      {isDamageModalOpen && actionItem && (
        <DamageItemModal
          isOpen={isDamageModalOpen}
          onClose={closeModal}
          onSubmit={handleDamageSubmitForNotification}
          itemData={{
            id: actionItem.id,
            partNumber: actionItem.partNumber,
            partDescription: actionItem.typeDescription,
            quantity: actionItem.quantity,
            dateOfReturn: actionItem.returnDate,
          }}
        />
      )}
    </div>
  );
}
