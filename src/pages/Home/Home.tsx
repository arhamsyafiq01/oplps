// import HomeMetrics from "../../components/ecommerce/HomeMetrics";
import ReturnItem from "../../components/ecommerce/ReturnItemList";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

export default function Home() {
  return (
    <>
      <PageMeta title="OPLPS - Home" description="" />
      <PageBreadcrumb pageTitle="Home" />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-13">
          <ReturnItem />
        </div>
      </div>
    </>
  );
}
