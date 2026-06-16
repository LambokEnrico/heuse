import Link from "next/link";
import { Header } from "@/components/public/header";
import { Footer } from "@/components/public/footer";

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cartItemCount = 0; // Will be passed via context in real impl

  return (
    <>
      <Header cartItemCount={cartItemCount} />
      <main className="flex-1">{children}</main>
      <Footer />
    </>
  );
}