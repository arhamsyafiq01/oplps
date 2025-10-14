// --- START OF FILE HistoryPartItemTable.tsx ---

import React, { useState, useEffect, useCallback } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
} from "../ui/table"; // Adjust path if necessary
import {
  RefreshCw as LuRefresh,
  Search as LuSearch,
  Loader2 as LuLoader,
  XCircle as LuXCircle, // For message dismissal
  // CalendarDays as LuCalendarDays, // Icon is in CustomDateInput
} from "lucide-react";

// Date Picker
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
// *** ENSURE THIS PATH IS CORRECT for your CustomDateInput component ***
// import CustomDateInput from "../utils/CustomDateInput"; // Or your "../ui/calendar/calendar" if it's the correct one
import CustomDateInput from "../ui/calendar/calendar"; // Update this path to where your CustomDateInput actually exists

const HISTORY_API_URL =
  import.meta.env.VITE_HISTORY_API_URL ||
  `http://localhost/oplps_api/api/history.php`; // Fallback for local dev

interface ApiHistoryItem {
  event_id: string; // Should be non-optional if it's a primary key from the log table
  part_number: string;
  type_description: string | null;
  quantity_changed: string; // API might send numbers as strings
  quantity_after_action: string | null; // NEW: Expecting this from API
  remark: string | null;
  performed_by_id: string;
  performed_by_fullname?: string | null;
  action_date: string; // Expect "YYYY-MM-DD HH:MM:SS" from API
  action_type_description: string;
}

export interface HistoryLogItem {
  id: string;
  partNumber: string;
  typeDescription: string;
  quantityChanged: number;
  quantityAfterAction: number | null; // NEW
  remarks: string;
  performedBy: string;
  actionDateDisplay: string; // Formatted for UI: "DD/MM/YYYY HH:MM"
  actionDateObject: Date | null; // Actual Date object for filtering
  actionType: string;
}

// Helper to parse API date-time strings into Date objects or null
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
    // Ensure 'T' separator and 'Z' for UTC if not already an ISO string and API time is UTC
    // If API time is server local, new Date(dateTimeString.replace(" ", "T")) might be better
    const isoDateTimeString = dateTimeString.includes("T")
      ? dateTimeString
      : dateTimeString.replace(" ", "T") +
        (dateTimeString.endsWith("Z") ? "" : "Z");
    const date = new Date(isoDateTimeString);
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

// Helper to format Date objects (or null) into "DD/MM/YYYY HH:MM" for display
const formatDateObjectForUIDisplayWithTime = (
  date: Date | null | undefined
): string => {
  if (!date || isNaN(date.getTime())) {
    return "N/A";
  }
  try {
    // Use UTC methods if the date object represents a UTC timestamp for consistent display
    const day = date.getUTCDate().toString().padStart(2, "0");
    const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
    const year = date.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch (e) {
    console.error("Error in formatDateObjectForUIDisplayWithTime:", date, e);
    return "Error Date";
  }
};

const mapApiToHistoryLogItem = (apiItem: ApiHistoryItem): HistoryLogItem => {
  const actionDateObj = parseApiDateTime(apiItem.action_date);

  return {
    id: apiItem.event_id, // Use the actual event_id from the database
    partNumber: apiItem.part_number,
    typeDescription: apiItem.type_description || "N/A",
    quantityChanged: Number(apiItem.quantity_changed) || 0,
    quantityAfterAction:
      apiItem.quantity_after_action !== null
        ? Number(apiItem.quantity_after_action)
        : null,
    remarks: apiItem.remark || "No remarks",
    performedBy:
      apiItem.performed_by_fullname &&
      apiItem.performed_by_fullname.trim() !== ""
        ? apiItem.performed_by_fullname
        : apiItem.performed_by_id,
    actionDateDisplay: formatDateObjectForUIDisplayWithTime(actionDateObj),
    actionDateObject: actionDateObj, // Store the Date object (or null if parsing failed)
    actionType: apiItem.action_type_description,
  };
};

const ACTION_TYPE_FILTERS = ["All", "Issue Out", "Damaged"]; // Expanded

export default function HistoryPartItemTable() {
  const [allHistoryData, setAllHistoryData] = useState<HistoryLogItem[]>([]);
  const [filteredHistoryData, setFilteredHistoryData] = useState<
    HistoryLogItem[]
  >([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTypeFilter, setActiveTypeFilter] = useState<string>("All");
  const [activeActionFilter, setActiveActionFilter] = useState<string>("All");
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [toDate, setToDate] = useState<Date | null>(null);

  const totalColumns = 9; // No, PN, Type, QtyChanged, QtyAfterAction, ActionDate, PerformedBy, Remarks, ActionType

  const fetchData = useCallback(async (showLoadingSpinner = true) => {
    if (showLoadingSpinner) setIsLoading(true);
    setError(null); // Clear previous errors for a new fetch attempt

    try {
      const response = await fetch(HISTORY_API_URL, {
        method: "GET",
        headers: { Accept: "application/json", "Cache-Control": "no-cache" },
        credentials: "include",
      });
      if (!response.ok) {
        let errorMessage = `HTTP error! Status: ${response.status}`;
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || errorMessage;
        } catch (e) {
          /* Ignore */
        }
        throw new Error(errorMessage);
      }
      const jsonData = await response.json();
      if (jsonData.status === "success") {
        if (Array.isArray(jsonData.items)) {
          setAllHistoryData(jsonData.items.map(mapApiToHistoryLogItem));
        } else if (
          jsonData.items === null ||
          (typeof jsonData.items === "object" &&
            Object.keys(jsonData.items).length === 0)
        ) {
          setAllHistoryData([]); // Handle empty items object as well
        } else {
          throw new Error(
            jsonData.message ||
              "History API returned success but items is not an array or null."
          );
        }
      } else {
        throw new Error(
          jsonData.message || "API request for history was not successful."
        );
      }
    } catch (err) {
      console.error("Error fetching history:", err);
      setError(
        err instanceof Error
          ? err.message
          : "An unknown error occurred while fetching history."
      );
      setAllHistoryData([]);
    } finally {
      if (showLoadingSpinner) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const applyFiltersAndSearch = useCallback(() => {
    let result = [...allHistoryData];

    if (activeTypeFilter !== "All") {
      result = result.filter(
        (item) =>
          item.typeDescription.toLowerCase() === activeTypeFilter.toLowerCase()
      );
    }
    if (activeActionFilter !== "All") {
      result = result.filter((item) => item.actionType === activeActionFilter);
    }
    if (searchTerm.trim()) {
      const lowerCaseTerm = searchTerm.toLowerCase().trim();
      result = result.filter((item) =>
        item.partNumber.toLowerCase().includes(lowerCaseTerm)
      );
    }

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
            item.actionDateObject && // Ensure date object exists
            item.actionDateObject.getTime() >= fromDateStart.getTime()
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
            item.actionDateObject && // Ensure date object exists
            item.actionDateObject.getTime() <= toDateEnd.getTime()
        );
      }
    }

    setFilteredHistoryData(result);
  }, [
    allHistoryData,
    activeTypeFilter,
    activeActionFilter,
    searchTerm,
    fromDate,
    toDate,
  ]);

  useEffect(() => {
    applyFiltersAndSearch();
  }, [applyFiltersAndSearch]);

  const handleRefresh = () => {
    setSearchTerm("");
    setActiveTypeFilter("All");
    setActiveActionFilter("All");
    setFromDate(null);
    setToDate(null);
    fetchData(true); // This will also clear errors via its own setError(null)
  };
  const handleSearch = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const typeFilterOptions = [
    "All",
    ...Array.from(new Set(allHistoryData.map((item) => item.typeDescription)))
      .filter(Boolean)
      .sort(),
  ];

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white px-4 pb-3 pt-4 dark:border-gray-800 dark:bg-gray-800/30 sm:px-6">
      <div className="mb-4 pb-2 border-b border-gray-200 dark:border-gray-700 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-xl font-semibold text-center text-gray-800 dark:text-white">
          Loose Part Transaction History
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

      <div className="mb-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="relative w-full sm:w-auto ">
            <LuSearch className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder="Search Part Number"
              className="w-full rounded-md border border-gray-300 py-2 pl-9 pr-3 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 sm:w-64 disabled:opacity-50"
              value={searchTerm}
              onChange={handleSearch}
              disabled={isLoading}
              aria-label="Search by Part Number"
            />
          </div>
          {/* Row 2: Type and Action Filters */}
          <div className="flex flex-col sm:flex-row sm:flex-wrap sm:items-end gap-4">
            {/* Type Filter */}
            <div className="flex-grow sm:flex-grow-0">
              <label
                htmlFor="typeFilterSelect"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Type:
              </label>
              <select
                id="typeFilterSelect"
                value={activeTypeFilter}
                onChange={(e) => setActiveTypeFilter(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 disabled:opacity-50"
              >
                {typeFilterOptions.map((filter) => (
                  <option key={`type-${filter}`} value={filter}>
                    {filter}
                  </option>
                ))}
              </select>
            </div>

            {/* Action Filter */}
            <div className="flex-grow sm:flex-grow-0">
              <label
                htmlFor="actionFilterSelect"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Action:
              </label>
              <select
                id="actionFilterSelect"
                value={activeActionFilter}
                onChange={(e) => setActiveActionFilter(e.target.value)}
                disabled={isLoading}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 disabled:opacity-50"
              >
                {ACTION_TYPE_FILTERS.map((filter) => (
                  <option key={`action-${filter}`} value={filter}>
                    {filter}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filters - Placed after Type and Action */}
            {/* From Date */}
            <div className="flex-grow sm:flex-grow-0 sm:w-44 md:w-48">
              {/* Control width here for smaller date inputs */}
              <label
                htmlFor="fromDate"
                className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
              >
                Date From:
              </label>
              <DatePicker
                id="fromDate"
                selected={fromDate}
                onChange={(date: Date | null) => setFromDate(date)}
                selectsStart
                startDate={fromDate}
                endDate={toDate}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                customInput={<CustomDateInput />} // Use the custom input
                wrapperClassName="w-full" // Ensures the wrapper takes the width defined by parent div
                disabled={isLoading}
                isClearable
                showPopperArrow={false} // Optional: remove arrow from calendar popup
              />
            </div>

            {/* To Date */}
            <div className="flex-grow sm:flex-grow-0 sm:w-44 md:w-48">
              {/* Control width here */}
              <label
                htmlFor="toDate"
                className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1"
              >
                To Date:
              </label>
              <DatePicker
                id="toDate"
                selected={toDate}
                onChange={(date: Date | null) => setToDate(date)}
                selectsEnd
                startDate={fromDate}
                endDate={toDate}
                minDate={fromDate ?? undefined}
                dateFormat="dd/MM/yyyy"
                placeholderText="DD/MM/YYYY"
                customInput={<CustomDateInput />} // Use the custom input (same as From Date)
                wrapperClassName="w-full"
                disabled={isLoading}
                isClearable
                showPopperArrow={false}
              />
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div
          className="mb-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300"
          role="alert"
        >
          <LuXCircle className="h-5 w-5 flex-shrink-0" /> <span>{error}</span>
        </div>
      )}

      <div className="max-w-full overflow-x-auto">
        <Table>
          <TableHeader className="border-y bg-gray-50 text-xs uppercase text-gray-600 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400">
            <TableRow>
              <th className="px-4 py-3 text-center">No</th>
              <th className="px-4 py-3 text-center">Part Number</th>
              <th className="px-4 py-3 text-center">Type</th>
              <th className="px-4 py-3 text-center">Qty Action</th>
              <th className="px-4 py-3 text-center">Qty Remaining</th>
              <th className="px-4 py-3 text-center">Action Date</th>
              <th className="px-4 py-3 text-center">Performed By</th>
              <th className="px-4 py-3 text-center">Remarks</th>
              <th className="px-4 py-3 text-center">Action Type</th>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y dark:divide-gray-800">
            {isLoading && (
              <TableRow>
                <td
                  colSpan={totalColumns}
                  className="py-4 text-center text-sm text-gray-500 dark:text-gray-400 italic"
                >
                  <div className="flex justify-center items-center">
                    <LuLoader className="animate-spin h-5 w-5 mr-3" />
                    Loading history...
                  </div>
                </td>
              </TableRow>
            )}
            {!isLoading && filteredHistoryData.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={totalColumns}
                  className="py-4 text-center text-sm text-gray-500 dark:text-gray-400"
                  {...({} as any)}
                >
                  {error
                    ? "Could not load history."
                    : searchTerm ||
                      activeTypeFilter !== "All" ||
                      activeActionFilter !== "All" ||
                      fromDate ||
                      toDate
                    ? "No history entries found matching criteria."
                    : "No history entries found."}
                </TableCell>
              </TableRow>
            )}
            {!isLoading &&
              filteredHistoryData.map((item, index) => (
                <TableRow
                  key={item.id}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
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
                    {item.quantityChanged}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {item.quantityAfterAction !== null
                      ? item.quantityAfterAction
                      : "N/A"}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {item.actionDateDisplay}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm text-gray-700 dark:text-gray-300">
                    {item.performedBy}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm break-words max-w-xs text-gray-700 dark:text-gray-300">
                    {item.remarks}
                  </TableCell>
                  <TableCell className="px-4 py-3 text-center text-sm">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        item.actionType === "Issue Out"
                          ? "bg-green-100 text-green-700 dark:bg-green-700 dark:text-green-100"
                          : item.actionType === "Damaged"
                          ? "bg-red-100 text-red-700 dark:bg-red-700 dark:text-red-100"
                          : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-100"
                      }`}
                    >
                      {item.actionType}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
// --- END OF FILE HistoryPartItemTable.tsx ---
