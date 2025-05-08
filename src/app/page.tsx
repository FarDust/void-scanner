'use client';

import { useState, useEffect } from 'react';
import TinderStyleAnomalyView from "@/components/TinderStyleAnomalyView";
import StatisticsPanel from "@/components/StatisticsPanel";
import ImageUploader from "@/components/ImageUploader";
import SyncDataPanel from "@/components/SyncDataPanel";

export default function Home() {
  const [showDemoControls, setShowDemoControls] = useState(false);
  const [activeTab, setActiveTab] = useState('tinder');
  const [, setIsScrolled] = useState(false);
  const [apiHealth, setApiHealth] = useState({
    status: 'loading',
    timestamp: new Date().toISOString(),
    version: '',
    lastCheck: new Date().toLocaleTimeString()
  });


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
    const fetchHealthStatus = async () => {
      try {
        const response = await fetch(`/api/health`);
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
    <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="flex flex-1">
        {/* Side Panel with fixed height */}
        <aside className="w-16 h-full bg-blue-900 dark:bg-blue-950 text-white flex-shrink-0 flex flex-col">
          {/* Logo at top */}
          <div className="p-2 flex justify-center border-b border-blue-800 dark:border-blue-900">
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
          </div>

          {/* Navigation icons */}
          <nav className="flex-1 py-4 flex flex-col items-center space-y-4">
            <button
              onClick={() => setActiveTab('tinder')}
              className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                activeTab === 'tinder' ? 'bg-blue-700' : 'hover:bg-blue-800'
              }`}
              title="Review Anomalies"
              aria-label="Review Anomalies"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <span className="sr-only">Review</span>
            </button>
            <button
              onClick={() => setActiveTab('upload')}
              className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                activeTab === 'upload' ? 'bg-blue-700' : 'hover:bg-blue-800'
              }`}
              title="Upload Images"
              aria-label="Upload Images"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
              <span className="sr-only">Upload</span>
            </button>
            <button
              onClick={() => setActiveTab('admin')}
              className={`w-12 h-12 flex items-center justify-center rounded-lg transition-colors ${
                activeTab === 'admin' ? 'bg-blue-700' : 'hover:bg-blue-800'
              }`}
              title="Admin Dashboard"
              aria-label="Admin Dashboard"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="sr-only">Admin</span>
            </button>
          </nav>
          
          {/* Demo toggle button at bottom */}
          <div className="p-2 border-t border-blue-800 dark:border-blue-900">
            <button
              onClick={() => setShowDemoControls(!showDemoControls)}
              className={`w-full flex items-center justify-center p-2 rounded-lg transition-colors hover:bg-purple-800 ${showDemoControls ? 'bg-purple-700' : 'bg-purple-900'}`}
              title="Toggle Demo Controls"
              aria-label="Toggle Demo Controls"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="sr-only">Demo</span>
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-y-auto">
          {/* App title bar */}
          <header className="bg-white dark:bg-gray-800 shadow-sm">
            <div className="flex justify-between items-center px-6 py-3">
              <h1 className="text-xl font-bold text-gray-800 dark:text-white">Void Scanner</h1>
              <div className="flex items-center space-x-4">
                <span className={`h-2 w-2 rounded-full ${apiHealth.status === 'offline' ? 'bg-red-500' : 'bg-green-500'}`} 
                      title={`API ${apiHealth.status === 'offline' ? 'Offline' : 'Online'}`}>
                </span>
              </div>
            </div>
          </header>
          
          {/* Main content area with scrolling */}
          <main className="flex-1 p-4 overflow-y-auto">

            {/* Demo controls container */}
            {showDemoControls && (
              <div className="mb-4 bg-white dark:bg-gray-800 rounded-lg shadow p-4">
                <h2 className="text-sm font-semibold mb-2">Demo Controls</h2>
                <div id="demo-controls-container" className="bg-gray-50 dark:bg-gray-700 rounded p-2 min-h-[40px]">
                  {/* TinderStyleAnomalyView will render demo controls here */}
                </div>
              </div>
            )}

            {/* Content based on active tab */}
            <div>
              {activeTab === 'tinder' && <TinderStyleAnomalyView demoControlsVisible={showDemoControls} />}
              {activeTab === 'upload' && <ImageUploader />}
              {activeTab === 'admin' && <><SyncDataPanel /> <StatisticsPanel/></>}
            </div>
          </main>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 dark:bg-gray-950 text-white py-2">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center text-xs">
            <div className="flex items-center space-x-2">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              <span className="font-semibold">Void Scanner</span>
            </div>
            <span>FarDust © 2025</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
