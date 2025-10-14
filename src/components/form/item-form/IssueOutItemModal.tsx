// --- START OF FILE IssueOutItemModal.tsx ---
import { useState, useEffect, FormEvent, ChangeEvent } from "react";

// This interface was from your original code, representing local form state perhaps,
// but not directly used for the final payload to onSubmit.
// We can keep it if it's used elsewhere or remove it if `IssueOutPayload` is sufficient.
// For now, I'll comment it out as `IssueOutPayload` is what the parent expects.
/*
export interface IssueOutData {
  quantityIssued: number;
  issueDate: string; // This is for display, not API submission
  remarks?: string;
}
*/

// This is the structure the PARENT component's onSubmit function expects
export interface IssueOutPayload {
  quantity_issued: number; // Matches API field name expected by backend handler
  remarks?: string; // Optional remarks
}

interface IssueOutItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: IssueOutPayload) => Promise<void>; // Expects the API-ready payload
  itemData: {
    id: string; // This is the part_id, parent will add it to the final API call
    quantity: number; // Available quantity
    partNumber: string;
    partDescription: string;
    dateOfReturn: string; // For display purposes
  } | null;
}

// Helper function to get today's date in YYYY-MM-DD format for display
const getTodayDateString = (): string => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const adjustedDate = new Date(today.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split("T")[0];
};

// Helper Function for Date Formatting (DD/MM/YYYY) for display
// const formatDateForDisplay = (
//   dateTimeString: string | null | undefined
// ): string => {
//   if (
//     !dateTimeString ||
//     dateTimeString === "0000-00-00" ||
//     dateTimeString === "0000-00-00 00:00:00"
//   ) {
//     return "N/A";
//   }
//   try {
//     const isoDateTimeString = dateTimeString.includes("T")
//       ? dateTimeString
//       : dateTimeString.replace(" ", "T") +
//         (dateTimeString.endsWith("Z") ? "" : "Z");

//     const date = new Date(isoDateTimeString);

//     if (isNaN(date.getTime())) {
//       console.warn(
//         "formatDateForDisplay: Invalid date string received:",
//         dateTimeString
//       );
//       return "Invalid Date";
//     }
//     const day = date.getUTCDate().toString().padStart(2, "0");
//     const month = (date.getUTCMonth() + 1).toString().padStart(2, "0");
//     const year = date.getUTCFullYear();
//     return `${day}/${month}/${year}`;
//   } catch (e) {
//     console.error("Error formatting display date:", dateTimeString, e);
//     return dateTimeString;
//   }
// };

export default function IssueOutItemModal({
  isOpen,
  onClose,
  onSubmit,
  itemData,
}: IssueOutItemModalProps) {
  // Local state for form inputs
  const [quantity, setQuantity] = useState<number | string>(""); // Input value for quantity
  const [issueDate, setIssueDate] = useState(""); // For displaying today's date (read-only)
  const [remarks, setRemarks] = useState<string>(""); // Input value for remarks

  // UI/UX state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuantityWarning, setShowQuantityWarning] = useState(false);

  useEffect(() => {
    if (isOpen && itemData) {
      // Reset form fields when modal opens or itemData changes
      setQuantity("");
      setIssueDate(getTodayDateString()); // Set to today's date for display
      setRemarks("");
      setError(null);
      setIsSubmitting(false);
      setShowQuantityWarning(false);
    }
  }, [isOpen, itemData]);

  const handleQuantityChange = (event: ChangeEvent<HTMLInputElement>) => {
    const currentVal = event.target.value;
    setQuantity(currentVal);
    if (error) setError(null); // Clear previous general error

    const currentQuantityNum = Number(currentVal);
    if (
      itemData &&
      !isNaN(currentQuantityNum) &&
      currentQuantityNum > 0 && // Ensure it's positive
      currentQuantityNum > itemData.quantity // Check against available stock
    ) {
      setShowQuantityWarning(true); // Show specific warning for quantity
    } else {
      setShowQuantityWarning(false);
    }
  };

  const handleRemarksChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setRemarks(event.target.value);
    if (error) setError(null); // Clear general error on input change
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null); // Clear previous errors

    const quantityNum = Number(quantity);

    // --- Validation ---
    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError("Please enter a valid positive quantity to issue.");
      return;
    }
    if (itemData && quantityNum > itemData.quantity) {
      // This condition should also be caught by showQuantityWarning, but good to double check
      setError(
        `Quantity to issue (${quantityNum}) cannot exceed available amount (${itemData.quantity}).`
      );
      setShowQuantityWarning(true); // Ensure warning is visible
      return;
    }
    setShowQuantityWarning(false); // Clear warning if validation passes this point

    // --- Prepare Payload for onSubmit ---
    // This is the payload structure expected by the parent component's onSubmit handler.
    // The parent component will then add `part_id` before sending to the API.
    const payload: IssueOutPayload = {
      quantity_issued: quantityNum,
      remarks: remarks.trim() || undefined, // Send undefined if remarks are empty (backend handles optional)
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload); // Call the parent's onSubmit function
      // If onSubmit is successful, the parent component should handle closing the modal.
      // If onSubmit throws, the catch block here will handle it.
    } catch (err: any) {
      console.error("IssueOutItemModal - Submission Error:", err);
      // Display error message from the parent's submission logic, or a generic one
      setError(err.message || "Failed to issue out item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !itemData) return null; // Don't render if not open or no item data

  // --- Dynamic CSS classes for quantity input based on warning state ---
  const quantityInputClasses = `
    col-span-2 rounded-md border px-3 py-2 text-sm shadow-sm disabled:opacity-50
    dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400
    ${
      showQuantityWarning
        ? "border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400" // Warning style
        : "border-gray-300 focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700" // Default style
    }`;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose} // Close modal if backdrop is clicked
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside modal content
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
          <h4
            id="modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Issue Out Item
          </h4>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50"
            aria-label="Close modal"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-6 w-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div className="space-y-4 py-4">
            {/* Error Display Area */}
            {error && (
              <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Item Information Display */}
            <div className="space-y-2 rounded-md border border-gray-200 p-3 dark:border-gray-700">
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Part Number:
                </span>
                <span className="text-gray-800 dark:text-gray-200">
                  {itemData.partNumber}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Type:
                </span>
                <span className="text-gray-800 dark:text-gray-200">
                  {itemData.partDescription}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Available Quantity:
                </span>
                <span className="font-medium text-gray-800 dark:text-gray-100">
                  {itemData.quantity}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-600 dark:text-gray-400">
                  Return Date:
                </span>
                <span className="text-gray-800 dark:text-gray-200">
                  {itemData.dateOfReturn} {/* << SIMPLY RENDER THE PROP */}
                </span>
              </div>
            </div>

            {/* Quantity to Issue Input */}
            <div className="grid grid-cols-3 items-center gap-4">
              <label
                htmlFor="issueQuantity"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Quantity to Issue Out
              </label>
              <div className="col-span-2 flex flex-col gap-1">
                <input
                  id="issueQuantity"
                  type="number"
                  value={quantity}
                  onChange={handleQuantityChange}
                  className={quantityInputClasses}
                  required
                  min="1"
                  // max={itemData.quantity} // Native max validation, also handled in JS
                  disabled={isSubmitting}
                  placeholder="Enter quantity"
                  aria-label="Quantity to issue out"
                  aria-invalid={showQuantityWarning ? "true" : "false"}
                />
                {showQuantityWarning && (
                  <p
                    className="mt-1 text-xs text-red-600 dark:text-red-400"
                    role="alert"
                  >
                    Quantity cannot exceed available ({itemData.quantity}).
                  </p>
                )}
              </div>
            </div>

            {/* Issue Out Date Display (Read-Only) */}
            <div className="grid grid-cols-3 items-center gap-4">
              <label
                htmlFor="issueDate"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Issue Out Date
              </label>
              <input
                id="issueDate"
                type="date"
                value={issueDate} // Displays today's date
                readOnly
                className="col-span-2 rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 shadow-sm focus:outline-none focus:ring-0 dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-400"
                required // Good for form semantics, though read-only
                disabled={isSubmitting} // Consistent disabled state
                aria-label="Issue out date (read only)"
              />
            </div>

            {/* Remarks Input */}
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-3 sm:items-start sm:gap-4">
              <label
                htmlFor="issueRemarks"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 sm:mt-px sm:pt-2"
              >
                Remarks{" "}
                <span className="text-xs text-gray-500">(Optional)</span>
              </label>
              <div className="sm:col-span-2">
                <textarea
                  id="issueRemarks"
                  name="remarks"
                  rows={3}
                  value={remarks}
                  onChange={handleRemarksChange}
                  disabled={isSubmitting}
                  className="block w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400 disabled:opacity-50"
                  placeholder="Enter any remarks for this issue..."
                />
              </div>
            </div>
          </div>

          {/* Footer / Action Buttons */}
          <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
            <button
              type="button" // Important: type="button" to prevent form submission
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={
                isSubmitting ||
                showQuantityWarning ||
                !quantity ||
                Number(quantity) <= 0
              } // Disable if warning, no quantity, or quantity is not positive
              className="inline-flex justify-center rounded-md border border-transparent bg-violet-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
            >
              {isSubmitting ? "Issuing..." : "Issue Out"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// --- END OF FILE IssueOutItemModal.tsx ---
