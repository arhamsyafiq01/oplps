// src/components/common/ChartTab.tsx

import React from "react"; // No useState needed here anymore

// Define the possible period values
export type ChartPeriod = "monthly" | "quarterly" | "annually";

interface ChartTabProps {
  selectedPeriod: ChartPeriod;
  onPeriodChange: (period: ChartPeriod) => void;
}

const periods: ChartPeriod[] = ["monthly", "quarterly", "annually"];

const ChartTab: React.FC<ChartTabProps> = ({
  selectedPeriod,
  onPeriodChange,
}) => {
  const getButtonClass = (option: ChartPeriod) =>
    selectedPeriod === option
      ? "shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800"
      : "text-gray-500 dark:text-gray-400";

  return (
    <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
      {periods.map((period) => (
        <button
          key={period}
          onClick={() => onPeriodChange(period)}
          aria-pressed={selectedPeriod === period}
          className={`px-3 py-2 font-medium w-full rounded-md text-theme-sm hover:text-gray-900 dark:hover:text-white ${getButtonClass(
            period
          )}`}
        >
          {period.charAt(0).toUpperCase() + period.slice(1)}
        </button>
      ))}
    </div>
  );
};

export default ChartTab;
