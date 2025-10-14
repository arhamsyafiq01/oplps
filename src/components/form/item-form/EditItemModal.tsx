// --- START OF FILE EditItemModal.tsx ---

import { useState, useEffect, FormEvent } from "react";

export interface ReturnItemData {
  partNumber: string;
  partDescription: string;
  quantity: number;
}

// Props for the Edit Modal
interface EditItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (updatedItemData: ReturnItemData) => Promise<void>;
  itemData: {
    id: string;
    partNumber: string;
    partDescription: string;
    quantity: number;
  };
  descriptionOptions: string[];
}

export default function EditItemModal({
  isOpen,
  onClose,
  onSubmit,
  itemData,
  descriptionOptions,
}: EditItemModalProps) {
  const [partNumber, setPartNumber] = useState("");
  const [partDescription, setPartDescription] = useState("");
  const [quantity, setQuantity] = useState<number | string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // --- Pre-fill form when modal opens or itemData changes ---
  useEffect(() => {
    if (isOpen && itemData) {
      setPartNumber(itemData.partNumber);
      setPartDescription(itemData.partDescription);
      setQuantity(itemData.quantity);
      setError(null);
      setIsSubmitting(false);
    }
  }, [isOpen, itemData]);

  // --- Handle Internal Form Submission ---
  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);

    const quantityNum = Number(quantity);

    // --- Validation ---
    if (!partNumber.trim()) {
      setError("Part Number is required.");
      return;
    }
    if (!partDescription) {
      setError("Please select a Part Description.");
      return;
    }
    if (isNaN(quantityNum) || quantityNum <= 0) {
      setError("Please enter a valid positive quantity.");
      return;
    }

    // This object now correctly matches the updated ReturnItemData interface
    const updatedItemData: ReturnItemData = {
      partNumber: partNumber.trim(),
      partDescription: partDescription,
      quantity: quantityNum,
    };

    // ... setIsSubmitting, try/catch/finally ...
    setIsSubmitting(true);
    try {
      await onSubmit(updatedItemData); // Pass the object without dateOfReturn
    } catch (err: any) {
      console.error("Update error caught in modal:", err);
      setError(err.message || "Failed to update item. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Render nothing if modal is not open ---
  if (!isOpen) return null;

  // --- Render Modal ---
  return (
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="mb-4">
          <h4
            id="modal-title"
            className="text-xl font-semibold text-gray-900 dark:text-white"
          >
            {/* Change Title */}
            {/* Edit Return Item (ID: {itemData.id}) */}
            Edit Return Item
          </h4>
        </div>

        {/* Form Inside Modal */}
        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Error Display */}
            {error && (
              <div className="col-span-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
                {error}
              </div>
            )}

            {/* Part Number Input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label
                htmlFor="partNumber"
                className="text-right text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Part Number
              </label>
              <input
                id="partNumber"
                type="text"
                value={partNumber}
                onChange={(e) => setPartNumber(e.target.value)}
                className="col-span-3 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 disabled:opacity-50"
                required
                disabled={isSubmitting}
              />
            </div>

            {/* Part Description Select */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label
                htmlFor="partDescription"
                className="text-right text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Type
              </label>
              <select
                id="partDescription"
                value={partDescription}
                onChange={(e) => setPartDescription(e.target.value)}
                className="col-span-3 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 disabled:opacity-50"
                required
                disabled={isSubmitting}
              >
                <option value="" disabled>
                  -- Select Description --
                </option>
                {descriptionOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity Input */}
            <div className="grid grid-cols-4 items-center gap-4">
              <label
                htmlFor="quantity"
                className="text-right text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Quantity
              </label>
              <input
                id="quantity"
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="col-span-3 rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 disabled:opacity-50"
                required
                min="1"
                disabled={isSubmitting}
              />
            </div>
          </div>
          {/* Modal Footer (Cancel/Submit Buttons) */}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 dark:focus:ring-offset-gray-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-800 disabled:opacity-50"
            >
              {/* Change Button Text */}
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
        {/* Optional Close Button */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          className="absolute right-4 top-4 rounded-sm p-1 text-gray-400 opacity-70 ring-offset-white transition-opacity hover:text-gray-600 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-gray-100 data-[state=open]:text-gray-500 dark:text-gray-400 dark:hover:text-gray-200 dark:ring-offset-gray-950 dark:focus:ring-gray-500 dark:data-[state=open]:bg-gray-800 dark:data-[state=open]:text-gray-400"
          aria-label="Close modal"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}
// --- END OF FILE EditItemModal.tsx ---
