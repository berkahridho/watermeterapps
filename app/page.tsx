'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { FiUser, FiLock, FiLogIn, FiAlertCircle, FiEye, FiEyeOff } from 'react-icons/fi';
import ThemeToggle from '@/components/ThemeToggle';

export default function Home() {
  const [credential, setCredential] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      // Import supabase here to avoid SSR issues
      const { supabase } = await import('@/lib/supabase');
      
      // Determine if credential is email or username
      const isEmail = credential.includes('@');
      let loginEmail = credential;

      // If username provided, try to find the user's email
      if (!isEmail) {
        const { data: userProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('email')
          .eq('username', credential)
          .limit(1)
          .single();

        if (profileError || !userProfile) {
          throw new Error('Username or email not found');
        } else {
          loginEmail = userProfile.email;
        }
      }

      // Try real Supabase authentication
      const { data, error } = await supabase.auth.signInWithPassword({
        email: loginEmail,
        password,
      });

      if (error) {
        console.error('❌ Login failed:', error.message);
        throw error;
      }

      if (data.user) {
        // Get user profile from database
        const { data: profile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          console.warn('⚠️ Could not load user profile, using basic info');
        }

        // Store user session with profile info
        const userSession = {
          id: data.user.id,
          email: data.user.email,
          role: profile?.role || 'rt_pic',
          full_name: profile?.full_name || data.user.email?.split('@')[0],
          assigned_rt: profile?.assigned_rt,
          phone: profile?.phone,
          isDemo: false
        };

        localStorage.setItem('user', JSON.stringify(userSession));
        
        // Redirect based on user role
        if (userSession.role === 'rt_pic') {
          // RT PIC users go directly to meter reading page
          router.push('/meter');
        } else if (userSession.role === 'viewer') {
          // Viewer users go to dashboard (read-only access)
          router.push('/dashboard');
        } else {
          // Admin, collector and other users go to dashboard
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      console.error('❌ Login error:', error);
      setError(error.message || 'Invalid username/email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
      {/* Theme Toggle - Fixed Position */}
      <div className="fixed top-4 right-4 z-50">
        <ThemeToggle />
      </div>

      {/* Login Card */}
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <div className="mx-auto flex justify-center">
            <div className="bg-gradient-to-br from-blue-500 to-cyan-500 p-3 rounded-2xl shadow-modern">
              <FiLogIn className="h-8 w-8 text-white" />
            </div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900 dark:text-white">
            Sign in to your account
          </h2>
          <p className="mt-2 text-gray-600 dark:text-gray-400">
            Enter your username or email to access your dashboard
          </p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          {error && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-3 rounded-xl mb-4 flex items-center">
              <FiAlertCircle className="h-5 w-5 text-red-400 dark:text-red-500 mr-2" />
              <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
            </div>
          )}

          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="credential" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Username or Email
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiUser className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  id="credential"
                  type="text"
                  value={credential}
                  onChange={(e) => setCredential(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white pl-10"
                  placeholder="username or email@example.com"
                  required
                  disabled={isLoading}
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <FiLock className="text-gray-400 dark:text-gray-500" />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white dark:bg-gray-700 dark:text-white pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  disabled={isLoading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400 transition-colors"
                  disabled={isLoading}
                >
                  {showPassword ? (
                    <FiEyeOff className="h-5 w-5" />
                  ) : (
                    <FiEye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600 rounded"
                  disabled={isLoading}
                />
                <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                  Remember me
                </label>
              </div>

              <div className="text-sm">
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300">
                  Forgot password?
                </a>
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={isLoading}
                className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white px-5 py-2.5 rounded-xl font-medium hover:from-blue-600 hover:to-cyan-600 transition-all duration-300 w-full relative overflow-hidden disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
              >
                <FiLogIn className="mr-2" />
                {isLoading ? 'Signing in...' : 'Sign in'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}