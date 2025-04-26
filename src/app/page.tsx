'use client';  // This must be the first line for client-side React features

import TinderStyleAnomalyView from "@/components/TinderStyleAnomalyView";
import AnomalyDashboard from "@/components/AnomalyDashboard";
import StatisticsPanel from "@/components/StatisticsPanel";
import ImageUploader from "@/components/ImageUploader";
import SyncDataPanel from "@/components/SyncDataPanel";
import { useState } from 'react';

export default function Home() {
  const [showDemoControls, setShowDemoControls] = useState(false);
  const [activeTab, setActiveTab] = useState('tinder');
  
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-blue-900 text-white py-6">
        <div className="container mx-auto px-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl md:text-4xl font-bold">Void Scanner</h1>
              <p className="text-blue-200 mt-2">Detecting anomalies in the cosmic void</p>
            </div>
            <button 
              onClick={() => setShowDemoControls(!showDemoControls)}
              className="bg-purple-600 hover:bg-purple-700 text-white py-2 px-4 rounded-lg transition-colors shadow-md text-sm"
            >
              Demo Mode
            </button>
          </div>
          
          {/* Navigation Tabs */}
          <div className="mt-8 border-b border-blue-800">
            <nav className="-mb-px flex space-x-6">
              <button
                onClick={() => setActiveTab('tinder')}
                className={`pb-3 px-1 ${
                  activeTab === 'tinder'
                    ? 'border-b-2 border-white font-medium'
                    : 'text-blue-200 hover:text-white hover:border-blue-300 border-b-2 border-transparent'
                }`}
              >
                Anomaly Review
              </button>
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`pb-3 px-1 ${
                  activeTab === 'dashboard'
                    ? 'border-b-2 border-white font-medium'
                    : 'text-blue-200 hover:text-white hover:border-blue-300 border-b-2 border-transparent'
                }`}
              >
                Dashboard
              </button>
              <button
                onClick={() => setActiveTab('upload')}
                className={`pb-3 px-1 ${
                  activeTab === 'upload'
                    ? 'border-b-2 border-white font-medium'
                    : 'text-blue-200 hover:text-white hover:border-blue-300 border-b-2 border-transparent'
                }`}
              >
                Upload Image
              </button>
              <button
                onClick={() => setActiveTab('admin')}
                className={`pb-3 px-1 ${
                  activeTab === 'admin'
                    ? 'border-b-2 border-white font-medium'
                    : 'text-blue-200 hover:text-white hover:border-blue-300 border-b-2 border-transparent'
                }`}
              >
                Admin Tools
              </button>
            </nav>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Demo controls section */}
        {showDemoControls && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
            <h2 className="text-lg font-semibold mb-3">Demo Controls</h2>
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Use demo mode to explore the application with example anomalies.
            </p>
            <div id="demo-controls-container">
              {/* This container will be used by the TinderStyleAnomalyView component to render demo controls */}
            </div>
          </div>
        )}
        
        {/* Content based on active tab */}
        {activeTab === 'tinder' && (
          <section>
            <TinderStyleAnomalyView demoControlsVisible={showDemoControls} />
          </section>
        )}
        
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <StatisticsPanel />
            <AnomalyDashboard />
          </div>
        )}
        
        {activeTab === 'upload' && (
          <section>
            <ImageUploader />
          </section>
        )}
        
        {activeTab === 'admin' && (
          <section className="space-y-8">
            <SyncDataPanel />
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
              <h2 className="text-2xl font-bold mb-4">System Health</h2>
              <div className="flex items-center mb-4">
                <div className="h-4 w-4 rounded-full bg-green-500 mr-2"></div>
                <span>API Status: Online</span>
              </div>
              <p className="text-gray-600 dark:text-gray-300">
                The Anomaly Reaper API is operating normally. Last health check: {new Date().toLocaleTimeString()}
              </p>
            </div>
          </section>
        )}
      </main>

      <footer className="bg-gray-800 text-white py-8 mt-16">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div>
              <h3 className="text-xl font-bold">Void Scanner</h3>
              <p className="text-gray-400 mt-1">A crowdsourced anomaly detection platform for astronomical data</p>
            </div>
            <div className="mt-4 md:mt-0">
              <p>© 2025 Void Scanner Project</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
