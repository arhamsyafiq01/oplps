// src/components/form/item-form/AddItemModal.tsx

import { useState, useEffect, FormEvent } from "react"; // Added React for React.FC
import {
  Loader2 as LuLoader,
  ScanLine as LuScanLine,
  CameraOff as LuCameraOff,
  XCircle as LuXCircle,
} from "lucide-react";
// Ensure this path correctly points to your EMBEDDED scanner component
import BarcodeScannerEmbedded from "../../ecommerce/BarcodeScannerEmbedded"; // Name matches your import

export interface TypeOption {
  id: number | string;
  description: string; // Or type_description, ensure consistency
}

export interface StatusOption {
  id: number | string;
  description: string;
}

export interface NewPartData {
  part_number: string;
  type_id: number | string;
  quantity: number;
  status_id: number | string;
}

interface AddItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (newPartData: NewPartData) => Promise<void>;
  typeOptions: TypeOption[];
  statusOptions: StatusOption[];
}

const PENDING_STATUS_DESCRIPTION_CONSTANT = "Pending";

export default function AddItemModal({
  isOpen,
  onClose,
  onSubmit,
  typeOptions = [],
  statusOptions = [],
}: AddItemModalProps) {
  const [partNumber, setPartNumber] = useState("");
  const [typeId, setTypeId] = useState<string | number>("");
  const [quantity, setQuantity] = useState<number | string>("");
  const [pendingStatusId, setPendingStatusId] = useState<
    string | number | null
  >(null);
  const [statusLookupError, setStatusLookupError] = useState<string | null>(
    null
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State to control the visibility of the embedded scanner UI
  const [isScannerUIVisible, setIsScannerUIVisible] = useState(false);

  useEffect(() => {
    if (statusOptions.length > 0) {
      const pendingOption = statusOptions.find(
        (option) =>
          option.description.toLowerCase() ===
          PENDING_STATUS_DESCRIPTION_CONSTANT.toLowerCase()
      );
      if (pendingOption) {
        setPendingStatusId(pendingOption.id);
        setStatusLookupError(null);
      } else {
        console.error(
          `AddItemModal Error: Could not find status "${PENDING_STATUS_DESCRIPTION_CONSTANT}"`
        );
        setStatusLookupError(
          `Config Error: "${PENDING_STATUS_DESCRIPTION_CONSTANT}" status not available.`
        );
        setPendingStatusId(null);
      }
    } else {
      setPendingStatusId(null);
      setStatusLookupError(null);
    }
  }, [statusOptions]);

  useEffect(() => {
    if (isOpen) {
      setPartNumber("");
      setTypeId("");
      setQuantity("");
      setError(null);
      setIsSubmitting(false);
      setIsScannerUIVisible(false); // Reset scanner UI visibility when modal opens
    } else {
      setIsScannerUIVisible(false); // Ensure scanner UI is hidden if modal is closed externally
    }
  }, [isOpen]);

  const handleScanSuccess = (scannedText: string) => {
    setPartNumber(scannedText);
    setIsScannerUIVisible(false); // Hide the scanner UI after successful scan
    setError(null);
  };

  const handleScanError = (scanError: Error) => {
    setError(
      `Scan Error: ${scanError.message}. Please try again or enter manually.`
    );
    // setIsScannerUIVisible(false); // Optionally hide scanner on error
  };

  // This function toggles the visibility of the scanner UI within the modal
  const toggleScannerUIVisibility = () => {
    setError(null); // Clear general errors when toggling scanner
    setIsScannerUIVisible((prev) => !prev);
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setError(null);
    const quantityNum = Number(quantity);

    if (!partNumber.trim()) {
      setError("Part Number is required.");
      return;
    }
    if (!typeId) {
      setError("Please select a Part Type.");
      return;
    }
    if (
      quantity === "" ||
      isNaN(quantityNum) ||
      quantityNum < 0 ||
      !Number.isInteger(quantityNum)
    ) {
      setError("Please enter a valid non-negative whole quantity.");
      return;
    }
    if (!pendingStatusId) {
      setError(
        statusLookupError ||
          "Cannot submit: Required 'Pending' status is missing."
      );
      return;
    }
    if (isScannerUIVisible) {
      setError("Please close the scanner view before submitting.");
      return;
    }

    const newPartData: NewPartData = {
      part_number: partNumber.trim(),
      type_id: typeId,
      quantity: quantityNum,
      status_id: pendingStatusId,
    };

    setIsSubmitting(true);
    try {
      await onSubmit(newPartData);
    } catch (err: any) {
      console.error("Submission error caught in AddItemModal:", err);
      setError(err.message || "Failed to add part. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const optionsLoading = typeOptions.length === 0 || statusOptions.length === 0;
  const cantSubmitReason =
    statusLookupError ||
    (!pendingStatusId && !optionsLoading
      ? "Cannot determine Pending status."
      : "");

  return (
    // The main div for the modal overlay - no <React.Fragment> needed here anymore
    <div
      className="fixed inset-0 z-[100000] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={isScannerUIVisible ? undefined : onClose} // Prevent backdrop close if scanner UI is active
      aria-labelledby="modal-title"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="relative w-full max-w-2xl rounded-lg bg-white p-6 shadow-xl dark:bg-gray-800 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-6 flex items-center justify-center relative flex-shrink-0 border-b border-gray-200 dark:border-gray-700 pb-4">
          <h4
            id="modal-title"
            className="py-1 text-xl font-semibold text-gray-900 dark:text-white text-center"
          >
            Insert New Item
          </h4>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="absolute top-0 right-0 mt-0 mr-0 p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 dark:ring-offset-gray-800 disabled:opacity-50"
            aria-label="Close modal"
          >
            <LuXCircle className="h-6 w-6" />
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-grow overflow-y-auto pr-2"
        >
          <div className="space-y-5 py-1">
            {(error || statusLookupError) && (
              <div className="col-span-4 rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-900/30 dark:text-red-300">
                {error || statusLookupError}
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4">
              <label
                htmlFor="partNumber"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-0 sm:w-25 sm:text-right flex-shrink-0"
              >
                Part Number <span className="text-red-500">*</span>
              </label>
              <div className="flex items-center gap-2 w-full sm:flex-grow">
                <input
                  id="partNumber"
                  type="text"
                  value={partNumber}
                  onChange={(e) => setPartNumber(e.target.value)}
                  className="flex-grow w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  required
                  disabled={isSubmitting}
                  placeholder="Enter or Scan Part Number"
                />
                <button
                  type="button"
                  onClick={toggleScannerUIVisibility}
                  className="p-2 border rounded-md text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 flex-shrink-0"
                  title={isScannerUIVisible ? "Hide Scanner" : "Show Scanner"}
                  disabled={isSubmitting}
                >
                  {isScannerUIVisible ? (
                    <LuCameraOff className="h-5 w-5" />
                  ) : (
                    <LuScanLine className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {isScannerUIVisible && (
              <div>
                <BarcodeScannerEmbedded
                  isActive={isScannerUIVisible}
                  onScanSuccess={handleScanSuccess}
                  onScanError={handleScanError}
                  className="w-full"
                />
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-5">
              <label
                htmlFor="typeId"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-0 sm:w-25 sm:text-right flex-shrink-0"
              >
                Type <span className="text-red-500">*</span>
              </label>
              <div className="w-full sm:flex-grow">
                <select
                  id="typeId"
                  value={typeId}
                  onChange={(e) => setTypeId(e.target.value)}
                  className="flex-grow w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white disabled:opacity-50"
                  required
                  disabled={isSubmitting || typeOptions.length === 0}
                >
                  <option value="" disabled>
                    {typeOptions.length === 0 ? "Loading..." : "Select type"}
                  </option>
                  {typeOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.description}{" "}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center sm:gap-4 mb-5">
              <label
                htmlFor="quantity"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 sm:mb-0 sm:w-25 sm:text-right flex-shrink-0"
              >
                Quantity <span className="text-red-500">*</span>
              </label>
              <div className="w-full sm:flex-grow">
                <input
                  id="quantity"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(e.target.value)}
                  className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 disabled:opacity-50"
                  required
                  min="0"
                  step="1"
                  disabled={isSubmitting}
                  placeholder="Enter quantity"
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-3 mb-5">
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
              disabled={
                isSubmitting ||
                optionsLoading ||
                !pendingStatusId ||
                isScannerUIVisible
              }
              title={
                cantSubmitReason ||
                (isScannerUIVisible
                  ? "Please close scanner view to submit"
                  : undefined)
              }
              className="inline-flex justify-center items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:bg-blue-500 dark:hover:bg-blue-600 dark:focus:ring-offset-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <LuLoader className="animate-spin h-4 w-4 mr-2" />
              ) : null}
              {isSubmitting ? "Adding..." : "Add Item"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
