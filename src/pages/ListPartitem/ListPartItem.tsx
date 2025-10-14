import ListPartItem from "../../components/ecommerce/ListPartIem";
import PageMeta from "../../components/common/PageMeta";
import PageBreadcrumb from "../../components/common/PageBreadCrumb";

export default function ListPartIem() {
  return (
    <>
      <PageMeta title="OPLPS - List Part Item" description="" />
      <PageBreadcrumb pageTitle="List Part Item" />
      <div className="grid grid-cols-12 gap-4 md:gap-6">
        <div className="col-span-12 xl:col-span-13">
          <ListPartItem />
        </div>
      </div>
    </>
  );
}
