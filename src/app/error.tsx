"use client";

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto grid max-w-md justify-items-start gap-4 py-12">
      <h1 className="text-2xl font-bold">कुछ गड़बड़ हो गई</h1>
      <p className="text-muted">कृपया दोबारा कोशिश करें। समस्या बनी रहे तो हेल्पलाइन पर बताएँ।</p>
      <button onClick={reset} className="btn-primary">दोबारा कोशिश करें</button>
    </div>
  );
}
