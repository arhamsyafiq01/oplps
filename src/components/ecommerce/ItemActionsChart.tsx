// src/components/charts/ItemActionsChart.tsx (Create this new file)

import { useState, useEffect, useCallback } from "react";
import Chart from "react-apexcharts";
import { ApexOptions } from "apexcharts";
import ChartTab, { ChartPeriod } from "../common/ChartTab"; // Assuming ChartTab is in common
import {
  Loader2 as LuLoader,
  XCircle as LuXCircle,
  Info as LuInfo,
} from "lucide-react";

// const STATISTICS_API_URL = `http://localhost/oplps_api/api/statistics.php`;
const STATISTICS_API_URL = import.meta.env.VITE_STATISTICS_API_URL;

interface ChartSeriesData {
  name: string;
  data: number[];
}

export default function ItemActionsChart() {
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [chartSeries, setChartSeries] = useState<ChartSeriesData[]>([]);
  const [chartCategories, setChartCategories] = useState<string[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<ChartPeriod>("monthly");

  const options: ApexOptions = {
    legend: { show: true, position: "top", horizontalAlign: "center" }, // Show legend for multiple series
    colors: ["#008FFB", "#FF4560"], // Blue for Issued, Red for Damaged
    chart: {
      fontFamily: "Outfit, sans-serif",
      height: 310,
      type: "area",
      stacked: true,
      toolbar: { show: false },
      zoom: { enabled: false },
    },
    stroke: { curve: "smooth", width: 2 },
    fill: { type: "gradient", gradient: { opacityFrom: 0.6, opacityTo: 0.1 } },
    markers: { size: 0, hover: { size: 5 } },
    grid: {
      xaxis: { lines: { show: false } },
      yaxis: { lines: { show: true } },
      borderColor: "#e0e0e0",
      strokeDashArray: 4,
    },
    dataLabels: { enabled: false },
    tooltip: {
      enabled: true,
      theme: "light",
      y: { formatter: (val) => val.toFixed(0) + " units" },
    },
    xaxis: {
      type: "category",
      categories: chartCategories,
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: "#6B7280", fontSize: "12px" } },
    },
    yaxis: {
      labels: {
        style: { fontSize: "12px", colors: ["#6B7280"] },
        formatter: (val) => val.toFixed(0),
      },
      title: { text: "" },
      min: 0,
    },
    noData: {
      text: "Loading or no data for item actions...",
      style: { color: "#6B7280", fontSize: "14px" },
    },
  };

  const fetchChartData = useCallback(async (period: ChartPeriod) => {
    setIsLoading(true);
    setError(null);
    try {
      // Request 'item_actions' type from the statistics API
      const response = await fetch(
        `${STATISTICS_API_URL}?type=item_actions&period=${period}`,
        {
          method: "GET",
          headers: { Accept: "application/json" },
        }
      );
      if (!response.ok) {
        const d = await response.json().catch(() => {});
        throw new Error(d?.message || `HTTP error! ${response.status}`);
      }
      const jsonData = await response.json();
      if (jsonData.status === "success" && jsonData.chartData) {
        setChartCategories(jsonData.chartData.categories || []);
        setChartSeries(jsonData.chartData.series || []);
      } else {
        throw new Error(
          jsonData.message || "Invalid data for item actions chart."
        );
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not load item actions data."
      );
      setChartCategories([]);
      setChartSeries([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchChartData(selectedPeriod);
  }, [selectedPeriod, fetchChartData]);

  const handlePeriodChange = (newPeriod: ChartPeriod) =>
    setSelectedPeriod(newPeriod);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white px-5 pb-5 pt-5 dark:border-gray-800 dark:bg-white/[0.03] sm:px-6 sm:pt-6">
      <div className="flex flex-col gap-5 mb-6 sm:flex-row sm:items-center sm:justify-between">
        <div className="w-full">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
            Item Actions (Issued vs. Damaged)
          </h3>
          <p className="mt-1 text-gray-500 text-theme-sm dark:text-gray-400">
            Quantity of items moved or marked as damaged (
            {selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)}).
          </p>
        </div>
        <div className="flex items-start w-full sm:w-auto sm:justify-end flex-shrink-0">
          <ChartTab
            selectedPeriod={selectedPeriod}
            onPeriodChange={handlePeriodChange}
          />
        </div>
      </div>
      <div className="max-w-full overflow-x-auto custom-scrollbar">
        <div className="min-w-[600px] xl:min-w-full">
          {isLoading ? (
            <div className="flex items-center justify-center h-48">
              <LuLoader className="animate-spin mr-2" />
              <span>Loading chart...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-48 text-red-500">
              <LuXCircle className="mr-2" />
              <span>{error}</span>
            </div>
          ) : (chartSeries.length > 0 &&
              (chartSeries[0]?.data?.length > 0 ||
                chartSeries[1]?.data?.length > 0)) ||
            chartCategories.length > 0 ? (
            <Chart
              options={options}
              series={chartSeries}
              type="area"
              height={310}
            />
          ) : (
            <div className="flex items-center justify-center h-48 text-gray-500">
              <LuInfo className="mr-2" />
              <span>No data available for the selected period.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
