import { LoginForm } from "./LoginForm";

export const metadata = { title: "लॉग इन" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;
  return (
    <div className="mx-auto grid max-w-sm gap-6 py-6">
      <div>
        <h1 className="text-[2rem] font-bold">लॉग इन</h1>
        <p className="text-muted">दानदाता और ट्रस्ट स्टाफ़ के लिए</p>
      </div>
      <LoginForm next={next} />
      <div className="card p-4 text-[0.9rem] text-muted">
        <p className="font-semibold text-ink">डेमो लॉग इन</p>
        <p>दानदाता: donor@demo.org</p>
        <p>एडमिन: admin@demo.org</p>
        <p>पासवर्ड: Demo@1234</p>
      </div>
    </div>
  );
}
