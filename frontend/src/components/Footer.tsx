import Link from "next/link";

export default function Footer() {
  return (
    <footer className="mt-auto border-t bg-stone-100">
      <div className="mx-auto max-w-7xl px-4 py-6 text-center text-sm text-stone-600">
        <Link href="/" className="font-semibold text-amber-900">
          BrewLite
        </Link>
        <p className="mt-2">Cà phê ngon, ngày thêm vui.</p>
        <p className="mt-1">© 2026 BrewLite</p>
      </div>
    </footer>
  );
}
