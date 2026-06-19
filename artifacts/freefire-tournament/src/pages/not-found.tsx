import { Link } from "wouter";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="text-8xl font-black text-[#ff6b00] mb-4 leading-none">404</div>
        <h1 className="text-2xl font-black text-white uppercase tracking-wider mb-3">
          Page Not Found
        </h1>
        <p className="text-[#a0a0b0] text-sm mb-8 leading-relaxed">
          The page you&apos;re looking for doesn&apos;t exist or has been moved.
        </p>
        <Link href="/">
          <a className="inline-flex items-center gap-2 px-6 py-3 bg-[#ff6b00] text-white font-bold uppercase rounded-lg hover:bg-[#e66000] transition-colors">
            <Home className="w-4 h-4" />
            Go Home
          </a>
        </Link>
      </div>
    </div>
  );
}
