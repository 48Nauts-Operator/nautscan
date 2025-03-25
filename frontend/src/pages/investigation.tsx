import Investigation from '../components/Investigation';
import Link from 'next/link';

export default function InvestigationPage() {
  return (
    <div className="container mx-auto p-4">
      <header className="mb-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Network Investigation</h1>
          <Link href="/" className="text-blue-600 hover:text-blue-800">
            Back to Home
          </Link>
        </div>
        <p className="text-slate-600 dark:text-slate-300 mb-4">
          Trace route and investigate network connectivity
        </p>
      </header>
      
      <Investigation />
    </div>
  );
} 