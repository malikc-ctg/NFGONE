import Link from 'next/link';

export default function CustomerLoginPage() {
  return (
    <div className="flex min-h-[80vh] items-center justify-center p-6">
      <div className="w-full max-w-sm bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 mb-6 text-center">Sign In</h1>
        <p className="text-sm text-slate-500 mb-6 text-center">
          Access your Sea of Blue customer portal.
        </p>
        <button className="w-full bg-blue-600 text-white rounded-lg py-2.5 font-medium hover:bg-blue-500 transition-colors">
          Sign In
        </button>
        <p className="mt-4 text-center text-sm text-slate-600">
          <Link href="/customer-site" className="text-blue-600 hover:underline">
            Back to Home
          </Link>
        </p>
      </div>
    </div>
  );
}
