import { requireAdminPage } from "@/lib/auth";
import { PageHeader } from "@/components/admin/admin-ui";
import { ProductEditor } from "@/components/admin/product-editor";
import { getEditorOptions } from "../editor-data";

export const metadata = { title: "New product" };

export default async function NewProductPage() {
  await requireAdminPage("products.manage");
  const options = await getEditorOptions();
  return (
    <div>
      <PageHeader title="New product" />
      <ProductEditor options={options} initial={null} />
    </div>
  );
}
