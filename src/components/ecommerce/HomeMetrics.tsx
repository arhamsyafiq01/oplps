import { useEffect, useState } from "react";
import {
  Package, // For Total Items
  Grid, // For Total Ocell
  LayoutGrid, // For Total Panel
  Layers, // For Total Quantity
  // You can import other icons from lucide-react if needed
} from "lucide-react";

// --- Interface for data received from part.php GET endpoint ---
interface ApiPartMetricItem {
  type_description: string;
  quantity: number | string;
}

// API Endpoint
const PARTS_API_URL = import.meta.env.VITE_PARTS_API_URL;

// --- Constants for Type Descriptions (Match EXACTLY as returned by API) ---
const OCELL_TYPE_DESCRIPTION = "Ocell";
const PANEL_TYPE_DESCRIPTION = "Panel";

export default function HomeMetrics() {
  const [totalItems, setTotalItems] = useState<number>(0);
  const [totalOcell, setTotalOcell] = useState<number>(0);
  const [totalPanel, setTotalPanel] = useState<number>(0);
  const [totalQuantity, setTotalQuantity] = useState<number>(0);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      // Reset metrics
      setTotalItems(0);
      setTotalOcell(0);
      setTotalPanel(0);
      setTotalQuantity(0);

      try {
        const response = await fetch(PARTS_API_URL, {
          method: "GET",
          headers: {
            Accept: "application/json",
          },
          credentials: "include",
        });

        const contentType = response.headers.get("Content-Type");

        if (!response.ok) {
          let errorMessage = `HTTP error! status: ${response.status}`;
          if (contentType && contentType.includes("application/json")) {
            const errorData = await response.json();
            errorMessage = errorData.message || errorMessage;
          }
          throw new Error(errorMessage);
        }

        if (!contentType || !contentType.includes("application/json")) {
          throw new Error(
            "Expected JSON but received something else (e.g., HTML)."
          );
        }

        const data = await response.json();

        if (data.status === "success" && Array.isArray(data.items)) {
          const items: ApiPartMetricItem[] = data.items;

          setTotalItems(items.length);
          setTotalOcell(
            items.filter(
              (item) => item.type_description === OCELL_TYPE_DESCRIPTION
            ).length
          );
          setTotalPanel(
            items.filter(
              (item) => item.type_description === PANEL_TYPE_DESCRIPTION
            ).length
          );
          setTotalQuantity(
            items.reduce((sum, item) => sum + Number(item.quantity || 0), 0)
          );
        } else if (
          data.status === "success" &&
          (data.items === null || data.items.length === 0)
        ) {
          // No items, metrics remain 0
        } else {
          throw new Error(data.message || "Invalid data structure received.");
        }
      } catch (error) {
        console.error("Failed to fetch home metrics:", error);
        setError(
          error instanceof Error ? error.message : "An unknown error occurred"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, []);

  // Skeleton loader card function
  const renderSkeletonCard = (key: number) => (
    <div
      key={key}
      className="bg-white dark:bg-gray-800 rounded-xl p- border border-gray-200 dark:border-gray-700 animate-pulse"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="h-5 bg-gray-300 dark:bg-gray-700 rounded w-1/2"></div>{" "}
        {/* Title skeleton */}
        <div className="h-6 w-6 bg-gray-300 dark:bg-gray-700 rounded-full"></div>{" "}
        {/* Icon skeleton */}
      </div>
      <div className="h-8 bg-gray-300 dark:bg-gray-700 rounded w-1/4"></div>{" "}
      {/* Number skeleton */}
    </div>
  );

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, index) => renderSkeletonCard(index))}
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-xl relative"
        role="alert"
      >
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline ml-2">
          Error loading home metrics: {error}
        </span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {/* Total Items */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Items
          </div>
          <Package className="h-6 w-6 text-blue-500 dark:text-blue-400" />
        </div>
        <div className="text-3xl font-semibold text-center text-gray-800 dark:text-gray-100">
          {totalItems.toLocaleString()}
        </div>
      </div>

      {/* Total Ocell */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Ocell
          </div>
          <Grid className="h-6 w-6 text-purple-500 dark:text-purple-400" />
        </div>
        <div className="text-3xl font-semibold text-center text-gray-800 dark:text-gray-100">
          {totalOcell.toLocaleString()}
        </div>
      </div>

      {/* Total Panel */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Panel
          </div>
          <LayoutGrid className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
        </div>
        <div className="text-3xl font-semibold text-center text-gray-800 dark:text-gray-100">
          {totalPanel.toLocaleString()}
        </div>
      </div>

      {/* Total Quantity */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Quantity
          </div>
          <Layers className="h-6 w-6 text-green-500 dark:text-green-400" />
        </div>
        <div className="text-3xl font-semibold text-center text-gray-800 dark:text-gray-100">
          {totalQuantity.toLocaleString()}
        </div>
      </div>
    </div>
  );
}
