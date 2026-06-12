export default function CustomerPortalPage() {
  return (
    <div className="p-6 max-w-5xl mx-auto mt-10">
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Customer Portal</h1>
      <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h2 className="text-xl font-semibold text-slate-800 mb-4">Active Jobs</h2>
        <p className="text-slate-500">You have no active jobs at this time.</p>
      </div>
    </div>
  );
}
