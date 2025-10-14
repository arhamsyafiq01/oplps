// src/components/utils/Calendar.tsx
import React, { forwardRef } from "react";
import { CalendarDays as LuCalendarDays } from "lucide-react";

interface Calendar {
  value?: string;
  onClick?: () => void;
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void; // Provided by DatePicker, but usually not directly used by user for selection
  placeholder?: string;
  disabled?: boolean;
  id?: string;
  className?: string; // To allow custom styling from DatePicker's className prop
}

const Calendar = forwardRef<HTMLInputElement, Calendar>(
  ({ value, onClick, onChange, placeholder, disabled, id, className }, ref) => (
    <div className="relative w-full">
      <input
        id={id}
        type="text"
        className={`w-full rounded-md border border-gray-300 px-3 py-2 pl-10 text-sm shadow-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:border-blue-400 dark:focus:ring-blue-400 disabled:opacity-50 ${
          className || ""
        }`}
        onClick={onClick} // This is what opens the DatePicker
        value={value} // DatePicker provides this formatted string
        onChange={onChange} // Usually not directly used, DatePicker handles date changes
        placeholder={placeholder}
        disabled={disabled}
        ref={ref}
        readOnly // Makes it behave more like a button, preventing manual text input
      />
      <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
        <LuCalendarDays className="h-4 w-4 text-gray-400 dark:text-gray-500" />
      </div>
    </div>
  )
);
Calendar.displayName = "Calendar";

export default Calendar;
