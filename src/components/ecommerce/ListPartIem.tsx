// --- START OF FILE ListPartItem.tsx ---

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  ArrowUpLeftFromSquare as LuArrowUpFromSquare,
  PackageX as LuPackageX,
  RefreshCw as LuRefresh,
  Loader2 as LuLoader,
  Search as LuSearch,
  XCircle as LuXCircle, // For message dismissal
  Info as LuInfo, // For success message icon
} from "lucide-react";

import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

import CustomDateInput from "../ui/calendar/calendar";

import EditItemModal, { ReturnItemData } from "../form/item-form/EditItemModal";
import IssueOutItemModal, {
  IssueOutPayload,
} from "../form/item-form/IssueOutItemModal";
import DamageItemModal, {
  DamagePayload,
} from "../form/item-form/DamageItemModal";

const PARTS_API_URL = import.meta.env.VITE_PARTS_API_URL;
const ISSUE_API_URL = import.meta.env.VITE_ISSUE_API_URL;
const DAMAGE_API_URL = import.meta.env.VITE_DAMAGE_API_URL;

interface ApiListItem {
  part_id: string;
  part_number: string;
  quantity: number | string;
  type_description: string;
  status_description: string;
  updated_on: string; // Expect "YYYY-MM-DD HH:MM:SS"
  created_by_user: string | null;
  approved_by_user: string | null;
  approved_on: string | null; // Expect "YYYY-MM-DD HH:MM:SS"
  type?: string;
  status?: string;
  created_on: string; // Expect "YYYY-MM-DD HH:MM:SS" (This is "Part Created")
}

export interface ListItem {
  id: string;
  partNumber: string;
  quantity: number;
  typeDescription: string;
  statusDescription: string;
  lastUpdatedDisplay: string; // Formatted for display
  lastUpdatedObject: Date; // Actual Date object
  createdBy: string | null;
  approvedBy: string | null;
  approvedOnDisplay: string; // Formatted for display (can be "N/A")
  approvedOnObject: Date | null; // Actual Date object or null
  typeId?: string;
  statusId?: string;
  partCreatedDateDisplay: string; // Formatted "Part Created" date
  partCreatedDateObject: Date; // Actual Date object for "Part Created"
}

const parseApiDateTime = (
  dateTimeString: string | null | undefined
): Date | null => {
  if (
    !dateTimeString ||
    dateTimeString.startsWith("0000-00-00") ||
    dateTimeString.trim() === ""
  ) {
    return null;
  }
  try {
    // If API returns "YYYY-MM-DD HH:MM:SS" in server's local time
    // Create date object assuming it's local.
    // The `replace` helps if there's no 'T' separator.
    const localDateTimeString = dateTimeString.replace(" ", "T");
    const date = new Date(localDateTimeString); // This parses as local time by default

    if (isNaN(date.getTime())) {
      console.warn(
        "parseApiDateTime: Invalid date string received:",
        dateTimeString
      );
      return null;
    }
    return date;
  } catch (e) {
    console.error("Error in parseApiDateTime:", dateTimeString, e);
    return null;
  }
};

// Helper to format Date objects (or null) into "DD/MM/YYYY" for display
const formatDateForUIDisplay = (date: Date | null | undefined): string => {
  if (!date || isNaN(date.getTime())) {
    return "N/A";
  }
  try {
    const day = date.getUTCDate().toString().padStart(2, "0");
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`; // This includes time
  } catch (e) {
    console.error("Error in formatDateForUIDisplay:", date, e);
    return "Error Date"; // Or return the original problematic string if preferred
  }
};

const mapApiToState = (apiItem: ApiListItem): ListItem => {
  const partCreatedDateObj = parseApiDateTime(apiItem.created_on);
  const lastUpdatedObj = parseApiDateTime(apiItem.updated_on);
  const approvedOnObj = parseApiDateTime(apiItem.approved_on);

  return {
    id: String(apiItem.part_id),
    partNumber: apiItem.part_number,
    quantity: Number(apiItem.quantity) || 0,
    typeDescription: apiItem.type_description || "N/A",
    statusDescription: apiItem.status_description || "N/A",
    lastUpdatedDisplay: formatDateForUIDisplay(lastUpdatedObj),
    lastUpdatedObject: lastUpdatedObj || new Date(0), // Fallback for sort/filter
    createdBy: apiItem.created_by_user ?? "N/A",
    approvedBy: apiItem.approved_by_user ?? null,
    approvedOnDisplay: formatDateForUIDisplay(approvedOnObj),
    approvedOnObject: approvedOnObj, // Can be null if not approved
    typeId: apiItem.type,
    statusId: apiItem.status,
    partCreatedDateDisplay: formatDateForUIDisplay(partCreatedDateObj),
    partCreatedDateObject: partCreatedDateObj || new Date(0), // Fallback for filtering
  };
};

export default function ListPartItemTable() {
  const [allData, setAllData] = useState<ListItem[]>([]);
  const [filteredData, setFilteredData] = useState<ListItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<string>("All");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isActionLoading, setIsActionLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [isIssueOutModalOpen, setIsIssueOutModalOpen] =
    useState<boolean>(false);
  const [isDamageModalOpen, setIsDamageModalOpen] = useState<boolean>(false);
  const [actionItem, setActionItem] = useState<ListItem | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- Function to clear messages ---
  const clearMessages = () => {
    setError(null);
    setSuccessMessage(null);
  };

  const fetchData = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
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
        const mappedData = jsonData.items.map(mapApiToState);
        const approvedItems = mappedData.filter(
          (item: ListItem) => item.approvedBy !== null && item.quantity > 0
        );
        setAllData(approvedItems);
      } else if (
        jsonData.status === "success" &&
        (jsonData.items === null || jsonData.items.length === 0)
      ) {
        setAllData([]);
      } else {
        throw new Error(jsonData.message || "Invalid data structure from API.");
      }
    } catch (err) {
      console.error("Error fetching list items:", err);
      const message =
        err instanceof Error ? err.message : "Unknown fetch error.";
      setError(message);
      setAllData([]);
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyFiltersAndSearch = useCallback(() => {
    let result = [...allData];
    if (activeFilter !== "All") {
      result = result.filter(
        (item) =>
          item.typeDescription.toLowerCase() === activeFilter.toLowerCase()
      );
    }
    if (searchTerm.trim()) {
      const lowerCaseTerm = searchTerm.toLowerCase().trim();
      result = result.filter((item) =>
        item.partNumber.toLowerCase().includes(lowerCaseTerm)
      );
    }

    // --- REFINED DATE FILTER LOGIC ---
    if (fromDate || toDate) {
      // Only apply date filters if at least one is set
      let effectiveFromDate = fromDate;
      let effectiveToDate = toDate;

      // Scenario 1: Only FromDate is selected - filter for that single day
      if (fromDate && !toDate) {
        effectiveToDate = fromDate; // Treat ToDate as the same as FromDate
      }
      // Scenario 2: Only ToDate is selected - filter for that single day
      else if (!fromDate && toDate) {
        effectiveFromDate = toDate; // Treat FromDate as the same as ToDate
      }
      // Scenario 3: Both are selected (this includes fromDate === toDate for single day)
      // No change needed here, effectiveFromDate and effectiveToDate are already set.

      if (effectiveFromDate) {
        const fromDateStart = new Date(
          effectiveFromDate.getFullYear(),
          effectiveFromDate.getMonth(),
          effectiveFromDate.getDate(),
          0,
          0,
          0,
          0 // Start of the day
        );
        result = result.filter(
          (item) =>
            item.partCreatedDateObject && // Ensure date object exists
            item.partCreatedDateObject.getTime() >= fromDateStart.getTime()
        );
      }

      if (effectiveToDate) {
        const toDateEnd = new Date(
          effectiveToDate.getFullYear(),
          effectiveToDate.getMonth(),
          effectiveToDate.getDate(),
          23,
          59,
          59,
          999 // End of the day
        );
        result = result.filter(
          (item) =>
            item.partCreatedDateObject && // Ensure date object exists
            item.partCreatedDateObject.getTime() <= toDateEnd.getTime()
        );
      }
    }
    // --- End Date Filter ---
    setFilteredData(result);
  }, [allData, activeFilter, searchTerm, fromDate, toDate]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  const handleRefresh = () => {
    setSearchTerm("");
    setActiveFilter("All");
    setFromDate(null);
    setToDate(null);
    clearMessages(); // Clear messages on manual refresh
    fetchData(true);
  };

  const handleFilter = (filterType: string) => {
    setActiveFilter(filterType);
  };

  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  // const openEditModal = (item: ListItem) => {
  //   if (isActionLoading) return;
  //   setActionItem(item);
  //   setError(null);
  //   setIsEditModalOpen(true);
  // };

  const openIssueOutModal = (item: ListItem) => {
    if (isActionLoading) return;
    setActionItem(item);
    setError(null);
    setIsIssueOutModalOpen(true);
  };

  const openDamageModal = (item: ListItem) => {
    if (isActionLoading) return;
    setActionItem(item);
    setError(null);
    setIsDamageModalOpen(true);
  };

  const closeModal = () => {
    setIsEditModalOpen(false);
    setIsIssueOutModalOpen(false);
    setIsDamageModalOpen(false);
    setActionItem(null);
  };

  const handlePostApiAction = async (
    apiUrl: string,
    payload: any,
    actionDesc: string,
    quantityChanged: number
  ): Promise<void> => {
    if (!actionItem)
      throw new Error(`No item selected for action: ${actionDesc}`);
    clearMessages(); // Clear previous messages before new action
    setIsActionLoading(true);
    setActionItem(actionItem); // Ensure actionItem is set for loading indicators

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

      // Set success message
      const successMsg =
        actionDesc === "issue out item"
          ? `Successfully issued out ${quantityChanged} unit(s) of "${actionItem.partNumber}".`
          : `Successfully marked ${quantityChanged} unit(s) of "${actionItem.partNumber}" as damaged.`;
      setSuccessMessage(successMsg);
      setTimeout(() => setSuccessMessage(null), 4000); // Auto-clear

      closeModal(); // Close modal on success

      // Optimistic UI update or refetch
      // Your existing logic for updating allData locally is good for immediate feedback
      const currentActionItemId = actionItem.id;
      const remainingQuantity = actionItem.quantity - quantityChanged;
      if (remainingQuantity <= 0) {
        setAllData((prevData) =>
          prevData.filter((item) => item.id !== currentActionItemId)
        );
      } else {
        setAllData((prevData) =>
          prevData.map((item) =>
            item.id === currentActionItemId
              ? { ...item, quantity: remainingQuantity }
              : item
          )
        );
      }
      // Optionally, you can still call `await fetchData(false);` if you prefer to rely on server truth
      // but the optimistic update provides faster UI feedback.
    } catch (err) {
      console.error(`Error during '${actionDesc}' on ${actionItem?.id}:`, err);
      const message =
        err instanceof Error
          ? err.message
          : `Unknown error during ${actionDesc}.`;
      setError(message);
      throw err; // Re-throw for modal's catch block if needed
    } finally {
      setIsActionLoading(false);
      setActionItem(null); // Clear actionItem after action attempt
    }
  };

  const handleUpdateItemSubmit = async (
    updatedDataFromModal: ReturnItemData
  ): Promise<void> => {
    if (!actionItem) return;
    const payload = {
      action: "update_details",
      part_id: actionItem.id,
      part_number: updatedDataFromModal.partNumber,
      part_description: updatedDataFromModal.partDescription,
      quantity: updatedDataFromModal.quantity,
    };

    setError(null);
    setIsActionLoading(true);
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
        throw new Error(result.message || "Failed to update item details.");
      }
      closeModal();
      await fetchData(false); // Refetch after successful update
    } catch (err) {
      console.error(`Error updating item details for ${actionItem.id}:`, err);
      const message =
        err instanceof Error ? err.message : "Unknown error updating details.";
      setError(message);
      throw err;
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleIssueOutSubmit = async (
    modalPayload: IssueOutPayload
  ): Promise<void> => {
    if (!actionItem) throw new Error("No item selected for issuing.");
    const apiPayload = { part_id: actionItem.id, ...modalPayload };

    if (modalPayload.quantity_issued > actionItem.quantity) {
      const errMsg = `Cannot issue ${modalPayload.quantity_issued}. Only ${actionItem.quantity} available.`;
      setError(errMsg);
      throw new Error(errMsg);
    }

    await handlePostApiAction(
      // CORRECTED: Removed extra closing curly brace and semicolon
      ISSUE_API_URL,
      apiPayload,
      "issue out item",
      modalPayload.quantity_issued
    );
  }; // CORRECTED: Added missing closing curly brace for the function

  const handleDamageSubmit = async (
    modalPayload: DamagePayload
  ): Promise<void> => {
    if (!actionItem)
      throw new Error("No item selected for marking as damaged.");
    const apiPayload = { part_id: actionItem.id, ...modalPayload };

    if (modalPayload.quantity_damaged > actionItem.quantity) {
      const errMsg = `Cannot mark ${modalPayload.quantity_damaged} as damaged. Only ${actionItem.quantity} available.`;
      setError(errMsg);
      throw new Error(errMsg);
    }
    await handlePostApiAction(
      DAMAGE_API_URL,
      apiPayload,
      "mark item as damaged", // CORRECTED: Added comma
      modalPayload.quantity_damaged
    );
  };

  const availableTypeDescriptions = Array.from(
    new Set(allData.map((item) => item.typeDescription))
  ).filter(Boolean);
  const filterOptions = ["All", ...availableTypeDescriptions];
  const totalColumns = 9;
  const anyLoading = isLoading || isActionLoading;

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-gray-800/30 sm:px-6">
      <div className="mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-white">
          Loose Part Item List
        </h2>
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

      <div className="mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-auto">
            <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search Part Number"
              value={searchTerm}
              onChange={handleSearch}
              disabled={isLoading || isActionLoading}
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:w-64 disabled:opacity-50"
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
            <div className="flex-grow sm:flex-grow-0">
              <label
                htmlFor="typeFilterSelect"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Type:
              </label>
              <select
                id="typeFilterSelect"
                value={activeFilter}
                onChange={(e) => handleFilter(e.target.value)}
                disabled={isLoading || isActionLoading}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 disabled:opacity-50"
              >
                {filterOptions.map((filter) => (
                  <option key={filter} value={filter}>
                    {filter}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-grow sm:flex-grow-0 sm:w-44 md:w-48">
              <label
                htmlFor="listFromDate"
                className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
              >
                Returnd Date From:
              </label>
              <DatePicker
                id="listFromDate"
                selected={fromDate}
                onChange={(date: Date | null) => setFromDate(date)}
                selectsStart
                startDate={fromDate}
                endDate={toDate}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                customInput={<CustomDateInput />}
                wrapperClassName="w-full"
                disabled={isLoading || isActionLoading}
                isClearable
                showPopperArrow={false}
              />
            </div>

            <div className="flex-grow sm:flex-grow-0 sm:w-44 md:w-48">
              <label
                htmlFor="listToDate"
                className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
              >
                Return Date To:
              </label>
              <DatePicker
                id="listToDate"
                selected={toDate}
                onChange={(date: Date | null) => setToDate(date)}
                selectsEnd
                startDate={fromDate}
                endDate={toDate}
                minDate={fromDate ?? undefined}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                customInput={<CustomDateInput />}
                wrapperClassName="w-full"
                disabled={isLoading || isActionLoading}
                isClearable
                showPopperArrow={false}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Success and Error Message Display Area */}
      {error &&
        !isEditModalOpen &&
        !isIssueOutModalOpen &&
        !isDamageModalOpen && (
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
      {successMessage &&
        !isEditModalOpen &&
        !isIssueOutModalOpen &&
        !isDamageModalOpen && (
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
      {/* End Message Display Area */}
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
                Approved By
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Last Updated
              </th>
              <th
                scope="col"
                className="whitespace-nowrap px-4 py-3 text-center"
              >
                Actions
              </th>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-gray-100 dark:divide-gray-800">
            {isLoading && (
              <TableRow>
                <td
                  colSpan={totalColumns}
                  className="py-4 text-center text-sm text-gray-500 italic"
                >
                  Loading inventory...
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
                    : searchTerm || activeFilter !== "All" || fromDate || toDate
                    ? "No items found matching criteria."
                    : "No approved items found."}
                </td>
              </TableRow>
            )}
            {!isLoading &&
              filteredData.map((item, index) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-800/50"
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
                    {item.partCreatedDateDisplay}
                  </TableCell>
                  {/* Display formatted date */}
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {item.createdBy}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {item.approvedBy || "N/A"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {item.lastUpdatedDisplay}
                  </TableCell>
                  {/* Display formatted date */}
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
                          {/* <span className="hidden sm:inline">Edit</span> */}
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
                        <span className="hidden ">
                          {isDamageModalOpen &&
                          actionItem?.id === item.id &&
                          !isDamageModalOpen
                            ? "Damage Item..."
                            : ""}
                          {/* <span className="hidden sm:inline">Edit</span> */}
                        </span>
                      </button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      {isEditModalOpen && actionItem && (
        <EditItemModal
          isOpen={isEditModalOpen}
          onClose={closeModal}
          onSubmit={handleUpdateItemSubmit}
          itemData={{
            id: actionItem.id,
            partNumber: actionItem.partNumber,
            partDescription: actionItem.typeDescription,
            quantity: actionItem.quantity,
          }}
          descriptionOptions={availableTypeDescriptions}
        />
      )}
      {isIssueOutModalOpen && actionItem && (
        <IssueOutItemModal
          isOpen={isIssueOutModalOpen}
          onClose={closeModal}
          onSubmit={handleIssueOutSubmit}
          itemData={{
            id: actionItem.id,
            partNumber: actionItem.partNumber,
            partDescription: actionItem.typeDescription,
            quantity: actionItem.quantity,
            dateOfReturn: actionItem.partCreatedDateDisplay, // Pass the pre-formatted string
          }}
        />
      )}
      {isDamageModalOpen && actionItem && (
        <DamageItemModal
          isOpen={isDamageModalOpen}
          onClose={closeModal}
          onSubmit={handleDamageSubmit}
          itemData={{
            id: actionItem.id,
            partNumber: actionItem.partNumber,
            partDescription: actionItem.typeDescription,
            quantity: actionItem.quantity,
            dateOfReturn: actionItem.partCreatedDateDisplay, // Pass the pre-formatted string
          }}
        />
      )}
    </div>
  );
}
// --- END OF FILE ListPartItem.tsx ---
