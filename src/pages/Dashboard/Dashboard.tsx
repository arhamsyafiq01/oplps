import DashboardMetrics from "../../components/ecommerce/DashboardMetrics";
import StatisticsChart from "../../components/ecommerce/StatisticsChart";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";
import HomeMetrics from "../../components/ecommerce/HomeMetrics";

export default function Home() {
  return (
    <>
      <PageMeta title="OPLPS - Dashboard" description="" />
      <PageBreadcrumb pageTitle="Dashboard" />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 space-y-6 xl:col-span-13">
          <DashboardMetrics />
          <HomeMetrics />
        </div>

        <div className="col-span-12 space-y-6 xl:col-span-13">
          <StatisticsChart />
        </div>
      </div>
    </>
  );
}
