'use client';

import { useState, useEffect } from 'react';
import TinderStyleAnomalyView from "@/components/TinderStyleAnomalyView";
import AnomalyDashboard from "@/components/AnomalyDashboard";
import StatisticsPanel from "@/components/StatisticsPanel";
import ImageUploader from "@/components/ImageUploader";
import SyncDataPanel from "@/components/SyncDataPanel";
import ThemeToggle from "@/components/ThemeToggle";
import DemoModeToggle from "@/components/DemoModeToggle";
import { useImageCache } from "@/services/imageCache";

export default function Home() {
  const [showDemoControls, setShowDemoControls] = useState(false);
  const [activeTab, setActiveTab] = useState('tinder');
  const [isScrolled, setIsScrolled] = useState(false);
  const [apiHealth, setApiHealth] = useState({
    status: 'loading',
    timestamp: new Date().toISOString(),
    version: '',
    lastCheck: new Date().toLocaleTimeString()
  });

  // Get cache statistics from the imageCache service
  const { cacheStats } = useImageCache();
  
  // Calculate cache hit ratio
  const cacheHitRatio = cacheStats.hits + cacheStats.misses > 0 
    ? cacheStats.hits / (cacheStats.hits + cacheStats.misses)
    : 0;

  // Effect for scroll detection to add header shadow
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effect to fetch API health status
  useEffect(() => {
    const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
    const fetchHealthStatus = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`);
        if (!response.ok) {
          throw new Error(`Health check failed with status: ${response.status}`);
        }
        const data = await response.json();
        setApiHealth({
          status: data.status || 'ok',
          timestamp: data.timestamp || new Date().toISOString(),
          version: data.version || '1.0.0',
          lastCheck: new Date().toLocaleTimeString()
        });
      } catch (error) {
        console.error('Error fetching API health:', error);
        setApiHealth({
          status: 'offline',
          timestamp: new Date().toISOString(),
          version: '',
          lastCheck: new Date().toLocaleTimeString()
        });
      }
    };

    // Fetch on component mount
    fetchHealthStatus();

    // Set up polling interval (every 30 seconds)
    const healthInterval = setInterval(fetchHealthStatus, 30000);
    
    // Clean up interval on unmount
    return () => clearInterval(healthInterval);
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <header className={`sticky top-0 z-50 bg-blue-900 dark:bg-blue-950 text-white py-2 transition-shadow ${isScrolled ? 'shadow-lg' : ''}`}>
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* App logo */}
              <div className="bg-blue-700 dark:bg-blue-800 rounded-lg p-1.5">
                <svg 
                  xmlns="http://www.w3.org/2000/svg"
                  className="h-5 w-5 text-white"
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" 
                  />
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" 
                  />
                </svg>
              </div>
              
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-blue-300">Void Scanner</h1>
                <p className="text-blue-200 text-xs">Detecting anomalies in the cosmic void</p>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center space-x-2">
              <ThemeToggle />
              
              <button 
                onClick={() => setShowDemoControls(!showDemoControls)}
                className="flex items-center space-x-1 bg-purple-600 hover:bg-purple-700 text-white py-1 px-2 rounded-lg transition-colors shadow-md text-sm"
              >
                <span className="hidden sm:inline">
                  {showDemoControls ? 'Hide Demo' : 'Demo'}
                </span>
                <svg 
                  xmlns="http://www.w3.org/2000/svg" 
                  className="h-4 w-4" 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" 
                  />
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" 
                  />
                </svg>
              </button>
            </div>
          </div>
          
          {/* Navigation Tabs */}
          <div className="mt-3 border-b border-blue-800 overflow-x-auto scrollbar-hide">
            <nav className="-mb-px flex space-x-4">
              <button
                onClick={() => setActiveTab('tinder')}
                className={`pb-2 px-2 whitespace-nowrap transition-colors ${
                  activeTab === 'tinder'
                    ? 'border-b-2 border-white font-medium'
                    : 'text-blue-200 hover:text-white hover:border-blue-300 border-b-2 border-transparent'
                }`}
              >
                <span className="flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                  <span>Review</span>
                </span>
              </button>
              
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`pb-2 px-2 whitespace-nowrap transition-colors ${
                  activeTab === 'dashboard'
                    ? 'border-b-2 border-white font-medium'
                    : 'text-blue-200 hover:text-white hover:border-blue-300 border-b-2 border-transparent'
                }`}
              >
                <span className="flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                  <span>Dashboard</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`pb-2 px-2 whitespace-nowrap transition-colors ${
                  activeTab === 'upload'
                    ? 'border-b-2 border-white font-medium'
                    : 'text-blue-200 hover:text-white hover:border-blue-300 border-b-2 border-transparent'
                }`}
              >
                <span className="flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Upload</span>
                </span>
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`pb-2 px-2 whitespace-nowrap transition-colors ${
                  activeTab === 'admin'
                    ? 'border-b-2 border-white font-medium'
                    : 'text-blue-200 hover:text-white hover:border-blue-300 border-b-2 border-transparent'
                }`}
              >
                <span className="flex items-center space-x-1">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>Admin</span>
                </span>
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-4 md:px-6 md:py-6">
        {/* Demo controls section */}
        {showDemoControls && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-4 mb-6 border border-gray-200 dark:border-gray-700 transform transition-all duration-300 hover:shadow-xl">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-semibold mb-3 text-gray-800 dark:text-gray-200">Demo Controls</h2>
              <button 
                onClick={() => setShowDemoControls(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Use demo mode to explore the application with example anomalies.
            </p>
            <div id="demo-controls-container" className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
              {/* This container will be used by the TinderStyleAnomalyView component to render demo controls */}
            </div>
          </div>
        )}
        
        {/* Content based on active tab */}
        <div className="relative transition-all duration-300">
          {activeTab === 'tinder' && (
            <section>
              <TinderStyleAnomalyView demoControlsVisible={showDemoControls} />
            </section>
          )}
          
          {activeTab === 'dashboard' && (
            <div className="space-y-8">
              <AnomalyDashboard />
            </div>
          )}
          
          {activeTab === 'upload' && (
            <section className="max-w-3xl mx-auto">
              <ImageUploader />
            </section>
          )}
          
          {activeTab === 'admin' && (
            <section className="space-y-8 max-w-4xl mx-auto">
              {/* System Overview Panel - Moved from Dashboard to Admin */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">System Overview</h2>
                <StatisticsPanel userMode={false} />
              </div>

              {/* Data Synchronization Panel */}
              <SyncDataPanel />
              
              {/* API Health Status */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">System Health</h2>
                <div className="flex items-center mb-4">
                  <div className={`h-4 w-4 rounded-full ${apiHealth.status === 'offline' ? 'bg-red-500' : 'bg-green-500'} mr-2 animate-pulse`}></div>
                  <span className="text-gray-800 dark:text-gray-200">API Status: <span className="font-medium">{apiHealth.status === 'offline' ? 'Offline' : 'Online'}</span></span>
                </div>
                <p className="text-gray-600 dark:text-gray-300">
                  {apiHealth.status === 'offline' 
                    ? 'The Anomaly Reaper API is currently experiencing issues.' 
                    : 'The Anomaly Reaper API is operating normally.'} Last health check: {apiHealth.lastCheck}
                </p>
                
                <div className="mt-6 flex flex-wrap gap-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 flex-1 min-w-[200px]">
                    <h3 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-1">API Version</h3>
                    <p className="text-2xl font-bold text-blue-800 dark:text-blue-200">{apiHealth.version || 'Unknown'}</p>
                    <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">Current version</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4 flex-1 min-w-[200px]">
                    <h3 className="text-sm font-medium text-green-700 dark:text-green-300 mb-1">Last Updated</h3>
                    <p className="text-xl font-bold text-green-800 dark:text-green-200">
                      {apiHealth.timestamp 
                        ? new Date(apiHealth.timestamp).toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})
                        : 'Unknown'}
                    </p>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      {apiHealth.timestamp 
                        ? new Date(apiHealth.timestamp).toLocaleDateString()
                        : ''}
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Cache Statistics - Moved from AnomalyDashboard */}
              <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md border border-gray-200 dark:border-gray-700">
                <h2 className="text-2xl font-bold mb-4 text-gray-800 dark:text-white">Cache Performance</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Items in cache</p>
                    <p className="text-xl font-bold" id="cache-size">{cacheStats?.size || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cache hits</p>
                    <p className="text-xl font-bold" id="cache-hits">{cacheStats?.hits || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Cache misses</p>
                    <p className="text-xl font-bold" id="cache-misses">{cacheStats?.misses || '-'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Hit ratio</p>
                    <p className="text-xl font-bold" id="cache-ratio">{(cacheHitRatio * 100).toFixed(1)}%</p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${cacheHitRatio * 100}%` }}></div>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Storage size: {(cacheStats.localStorageSize / 1024).toFixed(2)} KB
                  </p>
                </div>
              </div>
            </section>
          )}
        </div>
      </main>

      <footer className="bg-gray-800 dark:bg-gray-950 text-white py-2 mt-4">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="font-semibold">Void Scanner</span>
              <span className="text-gray-400 hidden sm:inline">• A crowdsourced anomaly detection platform</span>
            </div>
            <div className="flex items-center space-x-3">
              <span className="text-gray-400">© 2025</span>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">GitHub</span>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
                </svg>
              </a>
              <a href="#" className="text-gray-400 hover:text-white transition-colors">
                <span className="sr-only">Twitter</span>
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
