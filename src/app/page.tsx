'use client';  // This must be the first line for client-side React features

import TinderStyleAnomalyView from "@/components/TinderStyleAnomalyView";
import { useState } from 'react';

export default function Home() {
  const [showDemoControls, setShowDemoControls] = useState(false);
  
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
        
        {/* Main anomaly visualization dashboard */}
        <section>
          <TinderStyleAnomalyView demoControlsVisible={showDemoControls} />
        </section>
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
