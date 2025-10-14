// --- START OF FILE StatisticChart.tsx ---

import { useState, useEffect, useCallback } from "react"; // Added React and useCallback
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ChartTab, { ChartPeriod } from "../common/ChartTab"; // Import ChartPeriod type and ChartTab component
import {
  Loader2 as LuLoader,
  XCircle as LuXCircle,
  Info as LuInfo,
} from "lucide-react"; // For loading, error, and info icons

const STATISTICS_API_URL = import.meta.env.VITE_STATISTICS_API_URL; // Use environment variable for API URL

// Define a type for the series data expected by ApexCharts
interface ChartSeriesData {
  // Renamed for clarity from ChartSeries to avoid conflict if ChartSeries is imported
  name: string;
  data: number[];
}

export default function StatisticsChart() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartSeries, setChartSeries] = useState<ChartSeriesData[]>([]);
  const [chartCategories, setChartCategories] = useState<string[]>([]);

  // State for the selected period, managed by this parent component
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>("monthly");

  // ApexCharts options (dynamic categories)
  const options: ApexOptions = {
    // legend: { show: false },
    colors: ["#465FFF", "#00E396"], // Primary color for the first series
    chart: {
      //   fontFamily: "Outfit, sans-serif",
      //   height: 310,
      //   type: "area",
      toolbar: { show: false },
      //   zoom: { enabled: false },
    },
    // stroke: { curve: "smooth", width: 4 },
    // fill: {
    //   type: "gradient",
    //   gradient: { opacityFrom: 0.55, opacityTo: 0.05 },
    // },
    // markers: { size: 0, hover: { size: 5 } },
    // grid: {
    //   xaxis: { lines: { show: false } },
    //   yaxis: { lines: { show: false } },
    //   borderColor: "#e0e0e0", // Use theme-aware color if possible
    //   strokeDashArray: 4,
    // },
    dataLabels: { enabled: true },
    tooltip: {
      enabled: true,
      theme: "light", // Consider making this dynamic with your app's theme
      x: { show: true }, // Show category name in tooltip
      y: {
        formatter: function (val) {
          return val.toFixed(0) + " items";
        },
      },
    },
    xaxis: {
      type: "category",
      categories: chartCategories, // Dynamically set from state
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: {
        style: {
          colors: "#6B7280", // This color might need adjustment for dark mode
          fontSize: "12px",
        },
      },
    },
    // yaxis: {
    //   labels: {
    //     style: { fontSize: "12px", colors: ["#6B7280"] }, // Same as xaxis labels
    //     formatter: function (val) {
    //       return val.toFixed(0);
    //     },
    //   },
    //   title: { text: "" },
    //   min: 0, // Ensure Y-axis starts at 0
    // },
    noData: {
      text: "Loading data or no data available for the selected period.",
      align: "center",
      verticalAlign: "middle",
      style: {
        color: "#6B7280",
        fontSize: "14px",
        fontFamily: "Outfit, sans-serif",
      },
    },
  };

  // Fetch data for the chart based on selectedPeriod
  const fetchChartData = useCallback(async (period: ChartPeriod) => {
    setIsLoading(true);
    setError(null);
    console.log(`Fetching chart data for period: ${period}`);
    try {
      const response = await fetch(`${STATISTICS_API_URL}?period=${period}`, {
        method: "GET",
        headers: { Accept: "application/json" },
        // credentials: "include", // Add if your statistics API requires auth
      });
      if (!response.ok) {
        const errData = await response
          .json()
          .catch(() => ({ message: "Failed to parse error response." }));
        throw new Error(
          errData.message || `HTTP error! Status: ${response.status}`
        );
      }
      const jsonData = await response.json();
      if (jsonData.status === "success" && jsonData.chartData) {
        setChartCategories(jsonData.chartData.categories || []);
        setChartSeries(jsonData.chartData.series || []);
        if (
          (jsonData.chartData.categories || []).length === 0 &&
          (jsonData.chartData.series[0]?.data || []).length === 0
        ) {
          // If API returns success but empty data arrays, ApexCharts will use its noData message.
          // You could set a custom error/info message here if preferred.
        }
      } else {
        throw new Error(
          jsonData.message ||
            "Invalid data structure received from statistics API."
        );
      }
    } catch (err) {
      console.error("Error fetching chart data:", err);
      setError(
        err instanceof Error ? err.message : "Could not load chart data."
      );
      setChartCategories([]);
      setChartSeries([]);
    } finally {
      setIsLoading(false);
    }
  }, []); // This function itself doesn't depend on external state to be redefined

  // Effect to fetch data when selectedPeriod changes or on initial mount
  useEffect(() => {
    fetchChartData(selectedPeriod);
  }, [selectedPeriod, fetchChartData]); // Re-run when selectedPeriod or fetchChartData (if it were to change)

  // Handler to update the selected period from ChartTab
  const handlePeriodChange = (newPeriod: ChartPeriod) => {
    setSelectedPeriod(newPeriod);
    // The useEffect above will trigger data fetching
  };

  // Dynamic title based on selected period
  const getChartTitle = () => {
    switch (selectedPeriod) {
      case "monthly":
        return "Monthly Parts Added (Current Year)";
      case "quarterly":
        return "Quarterly Parts Added (Current Year)";
      case "annually":
        return "Annual Parts Added (Last 5 Years)";
      default:
        return "Parts Added Statistics";
    }
  };
  const getChartSubTitle = () => {
    switch (selectedPeriod) {
      case "monthly":
        return "Number of new parts registered each month.";
      case "quarterly":
        return "Number of new parts registered each quarter.";
      case "annually":
        return "Number of new parts registered each year.";
      default:
        return "Overview of parts added.";
    }
  };

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            {getChartTitle()}
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            {getChartSubTitle()}
          </p>
        </div>
        <div className="flex items-start w-full sm:w-auto sm:justify-end flex-shrink-0">
          {" "}
          {/* Added flex-shrink-0 */}
          <ChartTab
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />
        </div>
      </div>

      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[600px] xl:min-w-full">
          {isLoading ? (
            <div className="flex flex-col justify-center items-center h-[310px] text-gray-500 dark:text-gray-400">
              <LuLoader className="animate-spin h-8 w-8 text-blue-500" />
              <p className="ml-2 mt-2">Loading statistics...</p>
            </div>
          ) : error ? (
            <div className="flex flex-col justify-center items-center h-[310px] text-red-600 dark:text-red-400">
              <LuXCircle className="h-10 w-10 mb-2" />
              <p className="font-medium">Error loading chart data:</p>
              <p className="text-sm">{error}</p>
            </div>
          ) : (chartSeries.length > 0 && chartSeries[0]?.data?.length > 0) ||
            chartCategories.length > 0 ? (
            <Chart
              options={options}
              series={chartSeries}
              type="area"
              height={310}
            />
          ) : (
            <div className="flex flex-col justify-center items-center h-[310px] text-gray-500 dark:text-gray-400">
              <LuInfo className="h-10 w-10 mb-2 text-blue-500" />
              <p>No data available for the selected period.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
// --- END OF FILE StatisticChart.tsx ---
