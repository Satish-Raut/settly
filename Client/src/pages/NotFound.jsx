import React from 'react';
import { Link } from 'react-router-dom';

const NotFound = () => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white font-sans text-slate-800 px-8">
      <span className="text-8xl font-black font-serif text-brand/20 select-none leading-none mb-4">
        404
      </span>
      <h1 className="text-2xl font-bold font-serif text-brand-text tracking-tight mb-2">
        Page not found
      </h1>
      <p className="text-sm text-slate-500 text-center max-w-xs mb-8">
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link
        to="/"
        className="px-6 py-2.5 bg-brand-light text-brand font-bold text-sm rounded-full hover:bg-brand hover:text-white transition-all"
      >
        ← Back to Home
      </Link>
    </div>
  );
};

export default NotFound;
