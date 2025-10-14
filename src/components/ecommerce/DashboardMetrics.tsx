import { useState, useEffect } from "react";
import {
  ArrowUpCircle, // For Issue Out
  ShieldAlert, // For Damaged/Broken
  AlertCircle, // For > 14 days (or a generic time icon)
  Clock, // For > 30 days (or a more urgent time icon)
  AlertTriangle, // For > 90 days (most urgent)
} from "lucide-react";

const GET_DASHBOARD_API_URL = import.meta.env.VITE_GET_DASHBOARD_API_URL;

// Define a type for your metrics data
interface DashboardMetricsData {
  totalIssuedOut: number;
  totalMoreThan14Days: number; // Represents 14-30 days old bucket
  totalMoreThan30Days: number; // Represents 31-90 days old bucket
  totalMoreThan90Days: number; // Represents > 90 days old bucket
  totalDamaged: number;
}

// API fetching function (fetchDashboardMetrics) remains the same
async function fetchDashboardMetrics(): Promise<DashboardMetricsData> {
  console.log("Fetching dashboard metrics...");

  try {
    const response = await fetch(GET_DASHBOARD_API_URL, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "Cache-Control": "no-cache",
      },
      credentials: "include", // ✅ Important for session/cookie-based login
    });

    const contentType = response.headers.get("Content-Type");

    if (!response.ok) {
      // Try to extract message if response has JSON body
      if (contentType && contentType.includes("application/json")) {
        const errorData = await response.json();
        throw new Error(errorData.message || `HTTP Error ${response.status}`);
      } else {
        // If it's not JSON, fallback to plain error
        throw new Error(
          `HTTP Error ${response.status}: ${response.statusText}`
        );
      }
    }

    if (!contentType || !contentType.includes("application/json")) {
      throw new Error(
        "Invalid response: Expected JSON but received non-JSON content."
      );
    }

    const data = await response.json();
    console.log("Metrics fetched:", data);
    return data;
  } catch (error) {
    console.error("Failed to fetch dashboard metrics from API:", error);
    throw error;
  }
}

export default function DashboardMetrics() {
  const [metrics, setMetrics] = useState<DashboardMetricsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadMetrics = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchDashboardMetrics();
        setMetrics(data);
      } catch (err) {
        console.error("Error in loadMetrics:", err);
        setError(
          err instanceof Error
            ? err.message
            : "An unknown error occurred while loading metrics."
        );
      } finally {
        setLoading(false);
      }
    };
    loadMetrics();
  }, []);

  // Skeleton loader for loading state
  const renderSkeletonCard = (key: number) => (
    <div
      key={key}
      className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 animate-pulse"
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

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {Array.from({ length: 5 }).map((_, index) => renderSkeletonCard(index))}
      </div>
    );
  }

  if (error || !metrics) {
    return (
      <div
        className="bg-red-100 dark:bg-red-900 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-200 px-4 py-3 rounded-xl relative"
        role="alert"
      >
        <strong className="font-bold">Error!</strong>
        <span className="block sm:inline ml-2">
          {error || "Could not load dashboard metrics data."}
        </span>
      </div>
    );
  }

  // Reordered the items for a more logical flow (e.g., damages often related to issues)
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
      {/* Total Issue Out */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Issue Out
          </div>
          <ArrowUpCircle className="h-6 w-6 text-blue-500 dark:text-blue-400" />
        </div>
        <div className="text-3xl font-semibold text-center text-gray-800 dark:text-gray-100">
          {metrics.totalIssuedOut}
        </div>
      </div>

      {/* Total Damaged Item */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Total Damaged
          </div>
          <ShieldAlert className="h-6 w-6 text-red-500 dark:text-red-400" />
        </div>
        <div className="text-3xl font-semibold text-center text-gray-800 dark:text-gray-100">
          {metrics.totalDamaged}
        </div>
      </div>

      {/* Parts 14-30 Days Old */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            More than 14 Days
          </div>
          <AlertCircle className="h-6 w-6 text-green-500 dark:text-green-400" />
        </div>
        <div className="text-3xl font-semibold text-center text-gray-800 dark:text-gray-100">
          {metrics.totalMoreThan14Days}
        </div>
      </div>

      {/* Parts 31-90 Days Old */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            More than 30 Days
          </div>
          <Clock className="h-6 w-6 text-yellow-500 dark:text-yellow-400" />
        </div>
        <div className="text-3xl font-semibold text-center text-gray-800 dark:text-gray-100">
          {metrics.totalMoreThan30Days}
        </div>
      </div>

      {/* Parts > 90 Days Old */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-2">
          <div className="text-sm font-medium text-gray-500 dark:text-gray-400">
            More than 90 Days
          </div>
          <AlertTriangle className="h-6 w-6 text-orange-500 dark:text-orange-400" />
        </div>
        <div className="text-3xl font-semibold text-center text-gray-800 dark:text-gray-100">
          {metrics.totalMoreThan90Days}
        </div>
      </div>
    </div>
  );
}
