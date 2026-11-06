import type { Metadata } from "next";
import { Finder } from "./Finder";

export const metadata: Metadata = { title: "योजना खोजें" };

export default function FinderPage() {
  return <Finder />;
}
