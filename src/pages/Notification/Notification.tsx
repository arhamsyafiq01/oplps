import NotificationList from "../../components/ecommerce/NotificationList";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

export default function Notification() {
  return (
    <>
      <PageMeta title="OPLPS - Notification" description="" />
      <PageBreadcrumb pageTitle="Notification" />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-13">
          <NotificationList />
        </div>
      </div>
    </>
  );
}
