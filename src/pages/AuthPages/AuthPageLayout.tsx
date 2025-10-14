import React from "react";

// import ThemeTogglerTwo from "../../components/common/ThemeTogglerTwo";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative p-6 bg-neutral-50 z-1 dark:bg-gray-900 sm:p-0">
      <div className="relative flex flex-col justify-center w-full h-screen lg:flex-row dark:bg-gray-900 sm:p-0">
        {children}
        <div className="items-center w-full hidden h-full lg:w-1/2 bg-gradient-to-r dark:bg-gray-900 lg:grid">
          <div className="w-full h-full">
            <img
              className="w-full h-full object-fill"
              src="/image3.png"
              alt="Image"
            />
          </div>
        </div>
        {/* <div className="fixed z-50  bottom-6 right-6 sm:block">
          <ThemeTogglerTwo />
        </div> */}
      </div>
    </div>
  );
}
