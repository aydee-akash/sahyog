import { requireAdmin } from "@/lib/auth";
import { NewSchemeForm } from "./NewSchemeForm";

export const metadata = { title: "नई योजना · एडमिन" };

export default async function NewScheme() {
  await requireAdmin();
  return (
    <div className="mx-auto grid max-w-2xl gap-6">
      <div>
        <h1 className="text-[1.75rem] font-bold">नई योजना</h1>
        <p className="text-muted">आधिकारिक सूचना चिपकाएँ। अगले पेज पर AI उसका सरल हिंदी ड्राफ़्ट बना सकता है।</p>
      </div>
      <NewSchemeForm />
    </div>
  );
}
