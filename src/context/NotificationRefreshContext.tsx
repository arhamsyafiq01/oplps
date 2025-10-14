import { createContext, useContext, useState, ReactNode } from "react";

// 1. Define the shape of the context data
interface NotificationRefreshContextType {
  refreshKey: number;
  triggerRefresh: () => void;
}

// 2. Create the context with a default undefined value
const NotificationRefreshContext = createContext<
  NotificationRefreshContextType | undefined
>(undefined);

// 3. Create the Provider component
// This component will wrap your application or layout
export const NotificationRefreshProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [refreshKey, setRefreshKey] = useState(0);

  // This function will be called by other components to trigger a refresh
  const triggerRefresh = () => {
    setRefreshKey((prevKey) => prevKey + 1); // Increment the key to force re-renders
  };

  const value = { refreshKey, triggerRefresh };

  return (
    <NotificationRefreshContext.Provider value={value}>
      {children}
    </NotificationRefreshContext.Provider>
  );
};

// 4. Create a custom hook for easy consumption
// This makes it easy for components to get the context data
export const useNotificationRefresh = () => {
  const context = useContext(NotificationRefreshContext);
  if (context === undefined) {
    throw new Error(
      "useNotificationRefresh must be used within a NotificationRefreshProvider"
    );
  }
  return context;
};
