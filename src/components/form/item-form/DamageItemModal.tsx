// --- START OF FILE DamageItemModal.tsx (Renamed from BrokenItemModal.tsx) ---
import { useState, useEffect, FormEvent, ChangeEvent } from "react";

// This is the structure the PARENT component's onSubmit function expects
export interface DamagePayload {
  quantity_damaged: number; // Matches API field name for backend handler
  remarks: string; // Remarks are usually required for damaged items
}

interface DamageItemModalProps {
  // Renamed
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payload: DamagePayload) => Promise<void>; // Expects the API-ready payload
  itemData: {
    id: string; // This is the part_id, parent will add it
    quantity: number; // Available quantity
    partNumber: string;
    partDescription: string;
    dateOfReturn: string; // For display purposes (e.g., when the part was created/received)
  } | null;
}

// Helper function to get today's date in YYYY-MM-DD format for display
const getTodayDateString = (): string => {
  const today = new Date();
  const offset = today.getTimezoneOffset();
  const adjustedDate = new Date(today.getTime() - offset * 60 * 1000);
  return adjustedDate.toISOString().split("T")[0];
};

// Using the more robust date formatting function
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

export default function DamageItemModal({
  // Renamed
  isOpen,
  onClose,
  onSubmit,
  itemData,
}: DamageItemModalProps) {
  // Local state for form inputs
  const [quantity, setQuantity] = useState<number | string>(""); // Input for quantity damaged
  const [remarks, setRemarks] = useState(""); // Input for remarks
  const [damageDate, setDamageDate] = useState(""); // For displaying today's date (read-only)

  // UI/UX state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showQuantityWarning, setShowQuantityWarning] = useState(false);

  useEffect(() => {
    if (isOpen && itemData) {
      // Reset form fields when modal opens
      setQuantity("");
      setRemarks("");
      setDamageDate(getTodayDateString()); // Set to today's date for display
      setError(null);
      setIsSubmitting(false);
      setShowQuantityWarning(false);
    }
  }, [isOpen, itemData]);

  const handleQuantityChange = (event: ChangeEvent<HTMLInputElement>) => {
    const currentVal = event.target.value;
    setQuantity(currentVal);
    if (error) setError(null);

    const currentQuantityNum = Number(currentVal);
    if (
      itemData &&
      !isNaN(currentQuantityNum) &&
      currentQuantityNum > 0 &&
      currentQuantityNum > itemData.quantity
    ) {
      setShowQuantityWarning(true);
    } else {
      setShowQuantityWarning(false);
    }
  };

  const handleRemarksChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    setRemarks(event.target.value);
    if (error) setError(null);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const quantityNum = Number(quantity);

    // --- Validation ---
    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError("Please enter a valid positive quantity for damaged items.");
      return;
    }
    if (itemData && quantityNum > itemData.quantity) {
      setError(
        `Damaged quantity (${quantityNum}) cannot exceed available amount (${itemData.quantity}).`
      );
      setShowQuantityWarning(true);
      return;
    }
    setShowQuantityWarning(false);

    const trimmedRemarks = remarks.trim();
    if (!trimmedRemarks) {
      setError("Remarks are required for damaged items.");
      return; // Prevent submission if remarks are empty
    }

    // --- Prepare Payload for onSubmit ---
    const payload: DamagePayload = {
      quantity_damaged: quantityNum,
      remarks: trimmedRemarks,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(payload); // Call parent's onSubmit
    } catch (err: any) {
      console.error("DamageItemModal - Submission Error:", err);
      setError(
        err.message || "Failed to mark item as damaged. Please try again."
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !itemData) return null;

  // --- Define input classes (reusing from your previous code) ---
  const baseEditableInputClasses = `
    col-span-2 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm h-10
    focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500
    dark:border-gray-600 dark:bg-gray-700 dark:text-white
    dark:focus:border-indigo-400 dark:focus:ring-indigo-400
    disabled:opacity-50
  `;
  const quantityInputClasses = `
    ${baseEditableInputClasses}
    ${
      showQuantityWarning
        ? "border-red-500 focus:border-red-500 focus:ring-red-500 dark:border-red-400 dark:focus:border-red-400 dark:focus:ring-red-400"
        : ""
    }
  `;
  const dateInputClasses = `
    col-span-2 rounded-md border border-gray-300 bg-gray-100 px-3 py-2 text-sm text-gray-500 shadow-sm focus:outline-none focus:ring-0 h-10
    dark:border-gray-600 dark:bg-gray-700/50 dark:text-gray-400
  `;
  const remarksTextareaClasses = `
    col-span-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-indigo-500
    dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-indigo-400 dark:focus:ring-indigo-400 disabled:opacity-50
  `;

  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-lg rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="mb-4 flex items-center justify-between border-b border-gray-200 pb-3 dark:border-gray-700">
          <h4
            id="modal-title"
            className="text-lg font-semibold text-gray-900 dark:text-white"
          >
            Mark Item as Damaged {/* Updated Title */}
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
                  Description:
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

            {/* Quantity Damaged Input */}
            <div className="grid grid-cols-3 items-center gap-4">
              <label
                htmlFor="damageQuantity" // Changed ID
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Quantity Damaged
              </label>
              <div className="col-span-2 flex flex-col gap-1">
                <input
                  id="damageQuantity" // Changed ID
                  type="number"
                  value={quantity}
                  onChange={handleQuantityChange}
                  className={quantityInputClasses}
                  required
                  min="1"
                  // max={itemData.quantity} // JS validation is primary
                  disabled={isSubmitting}
                  placeholder="Enter quantity damaged"
                  aria-label="Quantity damaged"
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

            {/* Damage Date Display (Read-Only) */}
            <div className="grid grid-cols-3 items-center gap-4">
              <label
                htmlFor="damageDate" // Changed ID
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Damage Date
              </label>
              <input
                id="damageDate" // Changed ID
                type="date"
                value={damageDate} // Using damageDate state
                readOnly
                className={dateInputClasses}
                required
                disabled={isSubmitting}
                aria-label="Damage date (read only)"
              />
            </div>

            {/* Remarks Input (Now explicitly required in JS) */}
            <div className="grid grid-cols-3 items-start gap-4">
              <label
                htmlFor="damageRemarks" // Changed ID
                className="pt-2 text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Remarks <span className="text-red-500">*</span>
              </label>
              <textarea
                id="damageRemarks" // Changed ID
                name="remarks" // Added name attribute
                rows={3}
                value={remarks}
                onChange={handleRemarksChange}
                className={remarksTextareaClasses}
                disabled={isSubmitting}
                placeholder="Enter reason or condition details (required)..."
                aria-label="Remarks for damaged item"
                required // HTML5 required attribute
              />
            </div>
          </div>

          {/* Footer / Action Buttons */}
          <div className="mt-6 flex justify-end gap-3 border-t border-gray-200 pt-4 dark:border-gray-700">
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
              disabled={
                isSubmitting ||
                showQuantityWarning ||
                !quantity ||
                Number(quantity) <= 0 ||
                !remarks.trim()
              } // Added !remarks.trim()
              className="inline-flex justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 dark:focus:ring-offset-gray-800"
            >
              {isSubmitting ? "Marking..." : "Mark as Damaged"}
              {/* Updated Button Text */}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
// --- END OF FILE DamageItemModal.tsx ---
