import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveProducts } from "@/lib/catalog";

export const metadata = { title: "Product" };

/** /product opens the first active product. With several products, visitors browse them in /shop. */
export default async function ProductIndex() {
  const products = await getActiveProducts();
  if (products[0]) redirect(`/product/${products[0].slug}`);
  return (
    <div className="container-x py-32 text-center">
      <h1 className="text-5xl">No products yet</h1>
      <p className="mt-4 text-ink-soft">Add a product in Admin &gt; Products and set it to Active.</p>
      <Link href="/shop" className="btn btn-primary mt-8">
        Go to shop
      </Link>
    </div>
  );
}
