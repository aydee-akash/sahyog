import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto grid max-w-md justify-items-start gap-4 py-12">
      <h1 className="text-2xl font-bold">यह पेज नहीं मिला</h1>
      <p className="text-muted">हो सकता है लिंक पुराना हो या योजना अभी प्रकाशित न हुई हो।</p>
      <Link href="/" className="btn-primary">होम पेज पर जाएँ</Link>
    </div>
  );
}
