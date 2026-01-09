/**
 * Enhanced Navigation Component
 * Features:
 * - Consistent role-based access control
 * - Collapsible admin sections on desktop
 * - Beautiful, proportional design
 * - Mobile-first responsive layout
 * - Proper RT PIC access restrictions
 */

'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  FiUser, FiDroplet, FiBarChart2, FiLogOut, FiMenu, FiX, FiHome, 
  FiChevronDown, FiChevronUp, FiDollarSign, FiSettings, FiUsers, 
  FiUpload, FiClock, FiShield, FiChevronRight 
} from 'react-icons/fi';
import ThemeToggle from './ThemeToggle';
import OptimizedOfflineIndicator from './OptimizedOfflineIndicator';

interface NavigationProps {
  user: any;
  currentPage: string;
}

// Navigation configuration with proper grouping
const NAVIGATION_CONFIG = {
  // Core navigation items available to all users (Dashboard removed - handled by logo)
  core: [
    { 
      name: 'Meter Reading', 
      href: '/meter', 
      icon: FiDroplet,
      key: 'meter'
    },
    { 
      name: 'Meter History', 
      href: '/meter-history', 
      icon: FiClock,
      key: 'meter-history'
    },
    { 
      name: 'Reports', 
      href: '/reports', 
      icon: FiBarChart2,
      key: 'reports'
    },
    { 
      name: 'Financial', 
      href: '/financial', 
      icon: FiDollarSign,
      key: 'financial'
    }
  ],
  
  // Admin-only sections (collapsible)
  admin: {
    title: 'Administration',
    icon: FiShield,
    items: [
      { 
        name: 'Customers', 
        href: '/customers', 
        icon: FiUser,
        key: 'customers'
      },
      { 
        name: 'User Management', 
        href: '/admin/users', 
        icon: FiUsers,
        key: 'admin'
      },
      { 
        name: 'Meter Adjustments', 
        href: '/admin/meter-adjustments', 
        icon: FiSettings,
        key: 'meter-adjustments'
      },
      { 
        name: 'Data Import', 
        href: '/admin/import', 
        icon: FiUpload,
        key: 'data-import'
      }
    ]
  },
  
  // RT PIC restricted navigation (Dashboard removed - handled by logo)
  rtPic: [
    { 
      name: 'Meter Reading', 
      href: '/meter', 
      icon: FiDroplet,
      key: 'meter'
    },
    { 
      name: 'Meter History', 
      href: '/meter-history', 
      icon: FiClock,
      key: 'meter-history'
    }
  ]
};

export default function Navigation({ user, currentPage }: NavigationProps) {
  const router = useRouter();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [adminSectionOpen, setAdminSectionOpen] = useState(false);

  // Determine user role and permissions
  const isAdmin = user?.email === 'admin@example.com' || 
                  user?.role === 'admin' || 
                  (user?.email && user.email.includes('admin')) || 
                  user?.isDemo === true;
  
  const isRTPIC = user?.role === 'rt_pic';

  // Get navigation items based on user role
  const getNavigationItems = () => {
    if (isRTPIC) {
      return NAVIGATION_CONFIG.rtPic;
    }
    return NAVIGATION_CONFIG.core;
  };

  // Check if current page matches navigation item
  const isCurrentPage = (itemKey: string, itemName: string) => {
    const normalizedCurrent = currentPage.toLowerCase().replace(/\s+/g, '-');
    const normalizedKey = itemKey.toLowerCase();
    const normalizedName = itemName.toLowerCase().replace(/\s+/g, '-');
    
    return normalizedCurrent === normalizedKey || 
           normalizedCurrent === normalizedName ||
           currentPage === itemName;
  };

  // Check if any admin item is active
  const isAdminSectionActive = () => {
    if (!isAdmin) return false;
    return NAVIGATION_CONFIG.admin.items.some(item => 
      isCurrentPage(item.key, item.name)
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('user');
    router.push('/');
  };

  const navigationItems = getNavigationItems();

  return (
    <header className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-lg border-b border-gray-200/50 dark:border-gray-700/50 sticky top-0 z-50 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo and Brand - Clickable Dashboard Link */}
          <div className="flex items-center flex-shrink-0">
            <Link href="/dashboard" className="flex items-center group transition-all duration-200 hover:scale-105">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-2xl flex items-center justify-center shadow-modern group-hover:shadow-modern-lg transition-all duration-300">
                <FiDroplet className="h-6 w-6 text-white" />
              </div>
              <div className="ml-4 hidden sm:block">
                <div className="text-xl font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                  PAMDes Berkah Ridho
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Water Meter Management
                </div>
              </div>
              <div className="ml-3 sm:hidden">
                <div className="text-lg font-bold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                  PAMDes
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                  Dashboard
                </div>
              </div>
            </Link>
          </div>
          
          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center space-x-2">
            {/* Core Navigation Items */}
            {navigationItems.map((item) => {
              const Icon = item.icon;
              const isActive = isCurrentPage(item.key, item.name);
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center transition-all duration-200 ${
                    isActive
                      ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 font-semibold shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <Icon className="mr-2.5 h-4 w-4" />
                  <span className="hidden xl:block">{item.name}</span>
                </Link>
              );
            })}
            
            {/* Admin Section (Collapsible) */}
            {isAdmin && (
              <div className="relative">
                <button
                  onClick={() => setAdminSectionOpen(!adminSectionOpen)}
                  className={`px-5 py-2.5 rounded-xl text-sm font-medium flex items-center transition-all duration-200 ${
                    isAdminSectionActive()
                      ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-300 font-semibold shadow-sm'
                      : 'text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-gray-100 hover:bg-gray-100 dark:hover:bg-gray-800'
                  }`}
                >
                  <FiShield className="mr-2.5 h-4 w-4" />
                  <span className="hidden xl:block">Admin</span>
                  <FiChevronDown className={`ml-1.5 h-3 w-3 transition-transform duration-200 ${
                    adminSectionOpen ? 'rotate-180' : ''
                  }`} />
                </button>
                
                {/* Admin Dropdown */}
                {adminSectionOpen && (
                  <div className="absolute top-full left-0 mt-2 w-56 rounded-xl shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 border border-gray-200 dark:border-gray-700 animate-scale-in z-50">
                    <div className="py-2">
                      {NAVIGATION_CONFIG.admin.items.map((item) => {
                        const Icon = item.icon;
                        const isActive = isCurrentPage(item.key, item.name);
                        return (
                          <Link
                            key={item.key}
                            href={item.href}
                            className={`flex items-center px-4 py-3 text-sm transition-all duration-200 ${
                              isActive
                                ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-300 font-semibold'
                                : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            }`}
                            onClick={() => setAdminSectionOpen(false)}
                          >
                            <Icon className="mr-3 h-4 w-4" />
                            {item.name}
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Right Side Controls */}
          <div className="flex items-center space-x-3">
            {/* Theme Toggle */}
            <div className="hidden sm:block">
              <ThemeToggle />
            </div>
            
            {/* Offline Indicator */}
            <div className="hidden sm:block">
              <OptimizedOfflineIndicator />
            </div>
            
            {/* User Menu */}
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center text-sm font-medium text-gray-700 dark:text-gray-300 rounded-xl focus:outline-none bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 px-3 py-2 transition-all duration-200 touch-target"
              >
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center mr-3">
                  <span className="text-white text-xs font-bold">
                    {user?.email?.charAt(0).toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="hidden sm:block text-left">
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    {isRTPIC ? `RT PIC - ${user?.assigned_rt}` : isAdmin ? 'Admin' : 'User'}
                  </div>
                  <div className="text-sm font-medium truncate max-w-[100px]">
                    {user?.email?.split('@')[0]}
                  </div>
                </div>
                {userMenuOpen ? (
                  <FiChevronUp className="text-gray-500 dark:text-gray-400 w-4 h-4 ml-2" />
                ) : (
                  <FiChevronDown className="text-gray-500 dark:text-gray-400 w-4 h-4 ml-2" />
                )}
              </button>
              
              {userMenuOpen && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl shadow-lg bg-white dark:bg-gray-800 ring-1 ring-black ring-opacity-5 z-50 border border-gray-200 dark:border-gray-700 animate-scale-in">
                  <div className="py-2">
                    <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                      <div className="text-sm font-medium text-gray-900 dark:text-gray-100">
                        {user?.email}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {isRTPIC ? `RT PIC - ${user?.assigned_rt}` : isAdmin ? 'Administrator' : 'User'}
                      </div>
                    </div>
                    <button
                      onClick={handleLogout}
                      className="block w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center transition-all duration-200 touch-target"
                      role="menuitem"
                    >
                      <FiLogOut className="mr-3 w-4 h-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
            
            {/* Mobile Navigation Button */}
            <div className="lg:hidden">
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="text-gray-700 dark:text-gray-300 p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800 transition-all duration-200 touch-target"
              >
                {mobileMenuOpen ? <FiX className="h-5 w-5" /> : <FiMenu className="h-5 w-5" />}
              </button>
            </div>
          </div>
        </div>
        
        {/* Mobile Navigation Menu */}
        {mobileMenuOpen && (
          <div className="lg:hidden pb-4 animate-slide-up">
            <div className="space-y-1 pt-2 pb-3">
              {/* Core Navigation Items */}
              {navigationItems.map((item) => {
                const Icon = item.icon;
                const isActive = isCurrentPage(item.key, item.name);
                return (
                  <Link
                    key={item.key}
                    href={item.href}
                    className={`block px-4 py-3 rounded-xl text-base font-medium flex items-center transition-all duration-200 touch-target ${
                      isActive
                        ? 'text-blue-600 bg-blue-50 dark:bg-blue-900/20 dark:text-blue-300 font-semibold'
                        : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <Icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                );
              })}
              
              {/* Admin Section Mobile */}
              {isAdmin && (
                <>
                  <div className="px-4 py-2 text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider border-t border-gray-200 dark:border-gray-700 mt-3 pt-3">
                    Administration
                  </div>
                  {NAVIGATION_CONFIG.admin.items.map((item) => {
                    const Icon = item.icon;
                    const isActive = isCurrentPage(item.key, item.name);
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        className={`block px-4 py-3 rounded-xl text-base font-medium flex items-center transition-all duration-200 touch-target ${
                          isActive
                            ? 'text-purple-600 bg-purple-50 dark:bg-purple-900/20 dark:text-purple-300 font-semibold'
                            : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                        }`}
                        onClick={() => setMobileMenuOpen(false)}
                      >
                        <Icon className="mr-3 h-5 w-5" />
                        {item.name}
                      </Link>
                    );
                  })}
                </>
              )}
              
              {/* Mobile Controls */}
              <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 mt-3 pt-3">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Theme</span>
                  <ThemeToggle />
                </div>
                <OptimizedOfflineIndicator />
              </div>
              
              <button 
                onClick={handleLogout}
                className="w-full text-left text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 px-4 py-3 rounded-xl text-base font-medium flex items-center transition-all duration-200 touch-target border-t border-gray-200 dark:border-gray-700 mt-3 pt-3"
              >
                <FiLogOut className="mr-3 h-5 w-5" />
                Logout
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}