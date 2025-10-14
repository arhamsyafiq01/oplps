// --- START OF FILE AppSidebar.tsx ---

import React, { useCallback, useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "../context/SidebarContext";
import {
  Home,
  PieChart,
  Table,
  Bell,
  History,
  UserPlus,
  ChevronRight,
  UserCog,
} from "lucide-react"; // Added ChevronRight for submenu
import { useNotificationRefresh } from "../context/NotificationRefreshContext";

// --- API URL and Interfaces (aligned with NotificationList.tsx) ---
const PARTS_API_URL = import.meta.env.VITE_PARTS_API_URL;
const SUPERVISOR_ROLE_CODE = "SUPV";
const ADMIN_ROLE_CODE = "ADMIN";

// Interface for items fetched from part.php (consistent with ListPartItem/NotificationList)
interface ApiListItem {
  part_id: string;
  part_number: string;
  quantity: number | string;
  type_description: string;
  status_description: string;
  updated_on: string;
  created_by_user: string | null;
  approved_by_user: string | null; // Used to filter for approved items
  approved_on: string | null;
  type?: string;
  status?: string;
  created_on: string; // This is the key date for notification calculation
}

// Type for notification status, similar to NotificationList.tsx
type NotificationBadgeStatus = "ok" | "gt14" | "gt30" | "gt90";

// --- NavItem Definition (No changes needed to the interface itself) ---
type NavItem = {
  name: string;
  icon?: React.ReactNode;
  path?: string;
  subItems?: { name: string; path: string }[];
  isTitle?: boolean;
  roles?: string[]; // This property already exists
};

// --- Helper Function to Calculate Notification Status for Badge ---
const getNotificationStatusForBadge = (
  createdOnDateString: string | null | undefined // Expects 'YYYY-MM-DD HH:MM:SS'
): NotificationBadgeStatus => {
  if (!createdOnDateString || createdOnDateString.startsWith("0000-00-00")) {
    return "ok";
  }
  try {
    const itemCreationDate = new Date(
      createdOnDateString.replace(" ", "T") + "Z"
    );
    if (isNaN(itemCreationDate.getTime())) {
      console.warn(
        `Invalid date for badge notification calculation: ${createdOnDateString}`
      );
      return "ok";
    }

    const today = new Date();
    const todayUTCStart = Date.UTC(
      today.getUTCFullYear(),
      today.getUTCMonth(),
      today.getUTCDate()
    );
    const itemCreationDateUTCStart = Date.UTC(
      itemCreationDate.getUTCFullYear(),
      itemCreationDate.getUTCMonth(),
      itemCreationDate.getUTCDate()
    );

    const diffTime = todayUTCStart - itemCreationDateUTCStart;
    if (diffTime < 0) return "ok";

    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays > 90) return "gt90";
    if (diffDays > 30) return "gt30";
    if (diffDays >= 14) return "gt14";
    return "ok";
  } catch (e) {
    console.error(
      "Error calculating date difference for badge:",
      createdOnDateString,
      e
    );
    return "ok";
  }
};

// --- NAV ITEMS Data ---
const navItemsData: NavItem[] = [
  { icon: <Home />, name: "Home", path: "/home" },
  {
    icon: <PieChart />,
    name: "Dashboard",
    path: "/dashboard",
    roles: [SUPERVISOR_ROLE_CODE, ADMIN_ROLE_CODE],
  },
  { icon: <Table />, name: "List Part Item", path: "/list-part-item" },
  { icon: <Bell />, name: "Notification", path: "/notification" },
  { icon: <History />, name: "History", path: "/history-part-item" },

  {
    icon: <UserPlus />,
    name: "Add User",
    path: "/add-user",
    roles: [ADMIN_ROLE_CODE],
  },
  {
    icon: <UserCog />,
    name: "Manage User",
    path: "/user-management",
    roles: [ADMIN_ROLE_CODE],
  },
];
const othersItems: NavItem[] = [];

// --- Component ---
const AppSidebar: React.FC = () => {
  const {
    isExpanded,
    isMobileOpen,
    isHovered,
    setIsHovered,
    toggleMobileSidebar,
  } = useSidebar();
  const location = useLocation();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [openSubmenu, setOpenSubmenu] = useState<{
    type: string;
    index: number;
  } | null>(null);
  const [subMenuHeight, setSubMenuHeight] = useState<Record<string, number>>(
    {}
  );
  const subMenuRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [combinedNotificationInfo, setCombinedNotificationInfo] = useState<{
    total: number;
    isCritical: boolean;
  }>({ total: 0, isCritical: false });

  const { refreshKey } = useNotificationRefresh(); // USE THE CONTEXT HOOK

  useEffect(() => {
    const storedRoleCode = sessionStorage.getItem("user_role_code");
    setUserRole(storedRoleCode);
  }, []);

  const handleLinkClick = () => {
    if (isMobileOpen) {
      toggleMobileSidebar(); // This will set isMobileOpen to false in your context
    }
  };

  const fetchNotificationCounts = useCallback(async () => {
    try {
      const response = await fetch(PARTS_API_URL, {
        method: "GET",
        credentials: "include", // 🔒 important for session-based auth
        headers: {
          Accept: "application/json",
          "Cache-Control": "no-cache",
        },
      });

      const jsonData = await response.json();
      if (jsonData.status === "success" && Array.isArray(jsonData.items)) {
        let totalOverdueCount = 0;
        let hasCritical = false;

        const relevantItems = (jsonData.items as ApiListItem[]).filter(
          (item) =>
            item.approved_by_user !== null && Number(item.quantity || 0) > 0
        );

        relevantItems.forEach((item: ApiListItem) => {
          const status = getNotificationStatusForBadge(item.created_on);
          if (status !== "ok") {
            totalOverdueCount++;
            if (status === "gt90") hasCritical = true;
          }
        });

        setCombinedNotificationInfo({
          total: totalOverdueCount,
          isCritical: hasCritical,
        });
      } else {
        console.error("Invalid data for notifications:", jsonData);
        setCombinedNotificationInfo({ total: 0, isCritical: false });
      }
    } catch (error) {
      console.error("AppSidebar: Error fetching notification counts:", error);
      setCombinedNotificationInfo({ total: 0, isCritical: false });
    }
  }, []);

  useEffect(() => {
    fetchNotificationCounts();
    const intervalId = setInterval(fetchNotificationCounts, 60000); // Refresh every 30 seconds
    return () => clearInterval(intervalId);
  }, [fetchNotificationCounts, refreshKey]);

  const isActive = useCallback(
    (path?: string) => (path ? location.pathname === path : false),
    [location.pathname]
  );

  useEffect(() => {
    let submenuMatched = false;
    ["main", "others"].forEach((menuType) => {
      const items = menuType === "main" ? navItemsData : othersItems;
      items.forEach((nav, index) => {
        if (nav.subItems) {
          nav.subItems.forEach((subItem) => {
            if (isActive(subItem.path)) {
              setOpenSubmenu({ type: menuType as "main" | "others", index });
              submenuMatched = true;
            }
          });
        }
      });
    });
    if (!submenuMatched) {
      setOpenSubmenu(null);
    }
  }, [location, isActive]);

  useEffect(() => {
    if (openSubmenu !== null) {
      const key = `${openSubmenu.type}-${openSubmenu.index}`;
      if (subMenuRefs.current[key]) {
        setSubMenuHeight((prev) => ({
          ...prev,
          [key]: subMenuRefs.current[key]?.scrollHeight || 0,
        }));
      }
    }
  }, [openSubmenu]);

  const renderMenuItems = (items: NavItem[], menuType: "main" | "others") => (
    <ul className="flex flex-col gap-1">
      {/* Your class */}
      {items
        .filter((navItem) => {
          if (!navItem.roles || navItem.roles.length === 0) return true;
          return userRole ? navItem.roles.includes(userRole) : false;
        })
        .map((nav, index) => (
          <li key={`${menuType}-${nav.name}-${index}`}>
            {/* Your key */}
            {(isExpanded || isHovered || isMobileOpen) && nav.isTitle ? (
              <h2 className="menu-title mt-4 mb-1 px-4 text-xs font-semibold uppercase text-gray-500 dark:text-gray-400">
                {nav.name}
              </h2>
            ) : nav.subItems ? (
              <button
                className={`menu-item group w-full flex items-center justify-between px-3 py-2 rounded-md text-sm font-medium ${
                  openSubmenu?.type === menuType && openSubmenu?.index === index
                    ? "text-blue-600 bg-gray-100 dark:text-blue-400 dark:bg-gray-800"
                    : "text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-gray-800"
                }`}
                onClick={() => {
                  // const key = `${menuType}-${index}`; // REMOVED THIS LINE
                  if (
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                  ) {
                    setOpenSubmenu(null);
                  } else {
                    setOpenSubmenu({
                      type: menuType as "main" | "others",
                      index,
                    });
                  }
                }}
              >
                <span className="flex items-center">
                  <span
                    className={`menu-item-icon-size mr-3 ${
                      openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                        ? "text-blue-600 dark:text-blue-400"
                        : "text-gray-400 group-hover:text-gray-500 dark:text-gray-500 dark:group-hover:text-gray-400"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                </span>
                {(isExpanded || isHovered || isMobileOpen) && (
                  <ChevronRight
                    className={`w-4 h-4 transition-transform duration-200 ${
                      openSubmenu?.type === menuType &&
                      openSubmenu?.index === index
                        ? "rotate-90"
                        : ""
                    }`}
                  />
                )}
              </button>
            ) : (
              nav.path && (
                <Link
                  to={nav.path}
                  onClick={handleLinkClick}
                  className={`menu-item group flex items-center px-3 py-2 rounded-md text-sm font-medium ${
                    isActive(nav.path)
                      ? "menu-item-active bg-blue-50 text-blue-600 dark:bg-gray-800 dark:text-blue-400"
                      : "menu-item-inactive text-gray-700  hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                  }`}
                >
                  <span
                    className={`menu-item-icon-size mr-1 ${
                      isActive(nav.path)
                        ? "menu-item-icon-active text-blue-600 dark:text-blue-400"
                        : "menu-item-icon-inactive text-gray-700 group-hover:text-blue-700 dark:text-gray-500 dark:group-hover:text-gray-400"
                    }`}
                  >
                    {nav.icon}
                  </span>
                  {(isExpanded || isHovered || isMobileOpen) && (
                    <span className="menu-item-text">{nav.name}</span>
                  )}
                  {(isExpanded || isHovered || isMobileOpen) &&
                    nav.name === "Notification" &&
                    combinedNotificationInfo.total > 0 && (
                      <span className="ml-auto flex items-center">
                        <span
                          className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                            combinedNotificationInfo.isCritical
                              ? "bg-red-200 text-red-800 dark:bg-red-700 dark:text-red-100"
                              : "bg-yellow-200 text-yellow-800 dark:bg-yellow-700 dark:text-yellow-100"
                          }`}
                          title={
                            combinedNotificationInfo.isCritical
                              ? `${combinedNotificationInfo.total} overdue items, some critical (>90 days)`
                              : `${combinedNotificationInfo.total} overdue items`
                          }
                        >
                          {combinedNotificationInfo.total}
                        </span>
                      </span>
                    )}
                </Link>
              )
            )}
            {nav.subItems && (isExpanded || isHovered || isMobileOpen) && (
              <div
                ref={(el) => {
                  subMenuRefs.current[`${menuType}-${index}`] = el;
                }}
                className="overflow-hidden transition-all duration-300"
                style={{
                  height:
                    openSubmenu?.type === menuType &&
                    openSubmenu?.index === index
                      ? `${subMenuHeight[`${menuType}-${index}`]}px`
                      : "0px",
                }}
              >
                <ul className="mt-1 space-y-1 ml-9 pl-3 border-l border-gray-200 dark:border-gray-700">
                  {nav.subItems.map((subItem) => (
                    <li key={subItem.name}>
                      <Link
                        to={subItem.path}
                        onClick={handleLinkClick}
                        className={`block px-3 py-2 text-sm rounded-md ${
                          isActive(subItem.path)
                            ? "bg-gray-100 dark:bg-gray-700 text-blue-600 dark:text-blue-400 font-medium"
                            : "text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white"
                        }`}
                      >
                        {subItem.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </li>
        ))}
    </ul>
  );

  return (
    <aside
      className={`fixed mt-16 flex flex-col lg:mt-0 top-0 px-5 left-0 bg-white dark:bg-gray-900 dark:border-gray-800 text-gray-900 h-screen transition-all duration-300 ease-in-out z-50 border-r border-gray-200 ${
        isExpanded || isMobileOpen
          ? "w-[290px]"
          : isHovered
          ? "w-[290px]"
          : "w-[90px]"
      } ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full"
      } lg:translate-x-0`}
      onMouseEnter={() => !isExpanded && setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div
        className={`py-8 flex ${
          !isExpanded && !isHovered ? "lg:justify-center" : "justify-start"
        }`}
      >
        <Link to="/home">
          {isExpanded || isHovered || isMobileOpen ? (
            <>
              <img
                className="dark:hidden"
                src="/Logo BR.png"
                alt="Logo"
                width={235}
                height={40}
              />
              <img
                className="hidden dark:block"
                src="/Logo BR.png"
                alt="Logo"
                width={235}
                height={40}
              />
            </>
          ) : (
            <img src="/Icon BR.png" alt="Logo" width={32} height={32} />
          )}
        </Link>
      </div>

      <div className="flex flex-col flex-grow overflow-y-auto duration-300 ease-linear no-scrollbar">
        <nav className="flex-grow mb-6">
          <div className="flex flex-col gap-4">
            <div>{renderMenuItems(navItemsData, "main")}</div>
            {othersItems.length > 0 && (
              <div>{renderMenuItems(othersItems, "others")}</div>
            )}
          </div>
        </nav>
      </div>
      {/* Copyright Section */}
      {(isExpanded || isHovered || isMobileOpen) && (
        <div className="py-1 text-center text-xs text-gray-500 dark:text-gray-400">
          Copyright © 2025 OPLPS. All Rights Reserved
        </div>
      )}
      {/* Copyright Section */}
      {(isExpanded || isHovered || isMobileOpen) && (
        <div className="py-4 text-center text-xs text-gray-500 dark:text-gray-400">
          Version 1.0
        </div>
      )}
    </aside>
  );
};

export default AppSidebar;

// --- END OF FILE AppSidebar.tsx ---
