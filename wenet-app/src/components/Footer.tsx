export default function Footer({ tenantName }: { tenantName: string }) {
  return (
    <footer className="bg-gray-50 border-t mt-20 py-12">
      <div className="max-w-6xl mx-auto px-4 text-center text-gray-500">
        <p className="font-medium text-gray-900 mb-2">{tenantName}</p>
        <p className="text-sm">
          © {new Date().getFullYear()} Wszelkie prawa zastrzeżone.
        </p>
        <div className="flex justify-center gap-4 mt-4 text-sm">
          <a href="#" className="hover:underline">
            Regulamin
          </a>
          <a href="#" className="hover:underline">
            Polityka Prywatności
          </a>
        </div>
      </div>
    </footer>
  );
}
