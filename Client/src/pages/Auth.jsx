import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { login, register, clearError } from '../store/slices/authSlice';

const Auth = ({ setCurrentPage }) => {
  const dispatch = useDispatch();
  const { error, isAuthenticated } = useSelector((state) => state.auth);
  
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isLogin) {
      dispatch(login({ email, password }));
    } else {
      dispatch(register({ username, email, password }));
    }
  };

  React.useEffect(() => {
    if (isAuthenticated) {
      setCurrentPage('dashboard');
    }
    return () => {
      dispatch(clearError());
    };
  }, [isAuthenticated, setCurrentPage, dispatch]);

  return (
    <div className="w-full bg-white text-slate-800 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="text-center text-3xl font-extrabold text-brand tracking-tight font-serif cursor-pointer" onClick={() => setCurrentPage('home')}>
          settly<span className="text-brand">.</span>
        </h2>
        <h3 className="mt-6 text-center text-2xl font-bold font-serif text-slate-900">
          {isLogin ? 'Log in to your account' : 'Create a new account'}
        </h3>
        <p className="mt-2 text-center text-sm text-slate-500">
          Or{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              dispatch(clearError());
            }}
            className="font-bold text-brand hover:text-brand-dark focus:outline-none cursor-pointer"
          >
            {isLogin ? 'register a new account' : 'log in to existing account'}
          </button>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-4 border border-slate-200 sm:rounded-xl shadow-xl shadow-slate-100 sm:px-10">
          {error && (
            <div className="mb-4 bg-rose-50 border-l-4 border-rose-400 p-4 rounded text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            {!isLogin && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Username</label>
                <div className="mt-1">
                  <input
                    type="text"
                    required
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand focus:border-brand sm:text-sm"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Email address</label>
              <div className="mt-1">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand focus:border-brand sm:text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">Password</label>
              <div className="mt-1">
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="appearance-none block w-full px-3 py-2 border border-slate-300 rounded-md shadow-sm placeholder-slate-400 focus:outline-none focus:ring-brand focus:border-brand sm:text-sm"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                className="w-full flex justify-center py-2.5 px-4 border border-transparent rounded-md shadow-md text-sm font-bold text-white bg-brand hover:bg-brand-dark transition-colors focus:outline-none cursor-pointer"
              >
                {isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </div>
          </form>

          <div className="mt-6 border-t border-slate-200 pt-6">
            <p className="text-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
              Explore with demo accounts
            </p>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  setEmail('aisha@settly.com');
                  setPassword('password123');
                  dispatch(login({ email: 'aisha@settly.com', password: 'password123' }));
                }}
                className="py-1.5 px-3 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-brand-light hover:border-brand hover:text-brand transition-colors bg-white cursor-pointer"
              >
                Aisha (Default)
              </button>
              <button
                onClick={() => {
                  setEmail('rohan@settly.com');
                  setPassword('password123');
                  dispatch(login({ email: 'rohan@settly.com', password: 'password123' }));
                }}
                className="py-1.5 px-3 border border-slate-200 rounded-md text-xs font-semibold text-slate-600 hover:bg-brand-light hover:border-brand hover:text-brand transition-colors bg-white cursor-pointer"
              >
                Rohan
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
