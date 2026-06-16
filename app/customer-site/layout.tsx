import Link from 'next/link';

export default function CustomerSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#001a36] min-h-screen text-white selection:bg-white/20 selection:text-white flex flex-col font-sans overflow-x-hidden">
      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}
