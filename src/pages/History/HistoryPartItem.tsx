import HistoryPartItem from "../../components/ecommerce/HistoryPartItem";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

export default function History() {
  return (
    <>
      <PageMeta title="OPLPS - History" description="" />
      <PageBreadcrumb pageTitle="History" />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-13">
          <HistoryPartItem />
        </div>
      </div>
    </>
  );
}
