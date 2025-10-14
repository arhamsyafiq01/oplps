import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import PageMeta from "../../components/common/PageMeta";
import AddUserPage from "../../components/form/user-form/AddUserPage";

export default function UserProfiles() {
  return (
    <>
      <PageMeta title="OPLPS Profile" description="" />
      <PageBreadcrumb pageTitle="Add New User" />
      <div className="rounded-2xl border border-gray-200 bg-white p-5 dark:border-gray-800 dark:bg-white/[0.03] lg:p-6">
        <div className="space-y-6">
          <AddUserPage />
        </div>
      </div>
    </>
  );
}
