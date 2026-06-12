export default function CustomerSiteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#f8fafc] min-h-screen text-slate-900 selection:bg-blue-500/20 selection:text-blue-900">
      {/* Customer Header will go here */}
      {children}
      {/* Customer Footer will go here */}
    </div>
  );
}
