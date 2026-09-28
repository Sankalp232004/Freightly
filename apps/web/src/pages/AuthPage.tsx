import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ApiError } from '../api/client';
import { Icon } from '../components/Icon';

export const AuthPage: React.FC = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { login, register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      if (isRegister) {
        await register(email, password);
      } else {
        await login(email, password);
      }
      const params = new URLSearchParams(location.search);
      const redirect = params.get('redirect') || '/';
      navigate(redirect);
    } catch (err: any) {
      if (err instanceof ApiError) {
        setErrorMsg(err.message);
      } else {
        setErrorMsg('Authentication failed. Check your network connection.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-12 sm:py-16">
      <div className="bg-paper-card border border-rule p-6 sm:p-8">
        {/* Header */}
        <div className="text-center mb-6">
          <h1 className="font-serif font-bold text-2xl text-ink">
            {isRegister ? 'Create Shipper Account' : 'Sign in to Freightly'}
          </h1>
          <p className="text-xs font-mono text-ink-muted mt-1">
            Access saved lanes, bookmarks, and rate history
          </p>
        </div>

        {/* Tab switcher */}
        <div className="flex border border-rule mb-6 text-xs font-mono uppercase tracking-wider">
          <button
            type="button"
            onClick={() => {
              setIsRegister(false);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-center transition-colors ${
              !isRegister ? 'bg-ink text-paper font-semibold' : 'bg-paper text-ink hover:text-ink-muted'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setIsRegister(true);
              setErrorMsg(null);
            }}
            className={`flex-1 py-2 text-center transition-colors ${
              isRegister ? 'bg-ink text-paper font-semibold' : 'bg-paper text-ink hover:text-ink-muted'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="mb-4 p-3 bg-red-50 border border-stamp text-stamp text-xs font-mono flex items-center space-x-2">
            <Icon name="alert" size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="auth-email"
              className="block text-xs font-mono uppercase tracking-wider text-ink font-semibold mb-1"
            >
              Email Address
            </label>
            <input
              id="auth-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="shipper@company.in"
              className="w-full px-3 py-2 text-sm bg-paper-input text-ink border border-rule focus:border-ink placeholder-ink-muted"
            />
          </div>

          <div>
            <label
              htmlFor="auth-password"
              className="block text-xs font-mono uppercase tracking-wider text-ink font-semibold mb-1"
            >
              Password
            </label>
            <input
              id="auth-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full px-3 py-2 text-sm bg-paper-input text-ink border border-rule focus:border-ink placeholder-ink-muted"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full mt-2 py-2.5 bg-stamp hover:bg-stamp-hover text-paper font-mono font-semibold text-xs uppercase tracking-wider transition-colors disabled:opacity-50"
          >
            {isLoading
              ? 'Authenticating...'
              : isRegister
              ? 'Create Account'
              : 'Sign In'}
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-rule-light text-center text-xs font-mono text-ink-muted">
          <span>Comparing rates does not require an account. </span>
          <a href="/" className="text-ink underline hover:text-stamp">
            Compare freely
          </a>
        </div>
      </div>
    </div>
  );
};
