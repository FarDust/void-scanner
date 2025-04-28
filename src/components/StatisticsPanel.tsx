'use client';

import { useState, useEffect } from 'react';
import { getStatistics } from '../services/anomalyService';

// New interface to define the statistics structure
interface StatisticData {
  total_images: number;
  anomalies_detected: number;
  classified_images: number;
  average_anomaly_score: number;
  storage_type: string;
  storage_location: string;
}

// New interface for user stats
interface UserStats {
  contributions: number;
  accuracy: number;
  lastActive: string;
  rank: number;
  totalParticipants: number;
  contributionStreak: number;
}

export default function StatisticsPanel({ userMode = false }: { userMode?: boolean }) {
  const [stats, setStats] = useState<StatisticData | null>(null);
  const [userStats, setUserStats] = useState<UserStats>({
    contributions: 56,
    accuracy: 92,
    lastActive: '2 hours ago',
    rank: 4,
    totalParticipants: 120,
    contributionStreak: 5,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'system' | 'contributions' | 'trends'>(
    userMode ? 'contributions' : 'system'
  );

  useEffect(() => {
    const fetchStatistics = async () => {
      try {
        setLoading(true);
        const data = await getStatistics();
        setStats({
          total_images: data.total_images,
          anomalies_detected: data.anomalies_detected || data.anomaly_count || 0,
          classified_images: data.classified_images || 0,
          average_anomaly_score: data.average_anomaly_score || 0,
          storage_type: data.storage_type || 'Unknown',
          storage_location: data.storage_location || 'Unknown'
        });
      } catch (err) {
        console.error('Error fetching statistics:', err);
        setError('Failed to load statistics. Please try again later.');
      } finally {
        setLoading(false);
      }
    };

    fetchStatistics();
    
    // In a real app, we would fetch user statistics here as well
    // For now, we're using mock data
  }, []);

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-4"></div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-16 bg-gray-200 dark:bg-gray-700 rounded"></div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-lg">
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
      {/* Tabs for switching between different stat views */}
      {userMode ? (
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-5">
          <button
            onClick={() => setActiveTab('contributions')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'contributions'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Your Contributions
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'trends'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Community Trends
          </button>
        </div>
      ) : (
        <div className="flex border-b border-gray-200 dark:border-gray-700 mb-5">
          <button
            onClick={() => setActiveTab('system')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'system'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            System Overview
          </button>
          <button
            onClick={() => setActiveTab('trends')}
            className={`py-2 px-4 text-sm font-medium ${
              activeTab === 'trends'
                ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400'
                : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Data Trends
          </button>
        </div>
      )}

      {/* System Stats View - For Admins */}
      {activeTab === 'system' && (
        <>
          <h2 className="text-2xl font-bold mb-4">System Statistics</h2>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Images</p>
              <p className="text-2xl font-bold">{stats?.total_images.toLocaleString()}</p>
            </div>
            
            <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Anomalies Detected</p>
              <p className="text-2xl font-bold">{stats?.anomalies_detected.toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                ({((stats?.anomalies_detected / stats?.total_images) * 100 || 0).toFixed(1)}%)
              </p>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Classified</p>
              <p className="text-2xl font-bold">{stats?.classified_images.toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                ({((stats?.classified_images / stats?.total_images) * 100 || 0).toFixed(1)}%)
              </p>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Avg. Anomaly Score</p>
              <p className="text-2xl font-bold">{stats?.average_anomaly_score.toFixed(3)}</p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">User Agreement</p>
              <p className="text-2xl font-bold">82%</p>
              <p className="text-xs text-gray-500">
                AI vs. human classification
              </p>
            </div>
            
            <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Needs Review</p>
              <p className="text-2xl font-bold">{Math.floor(stats?.total_images * 0.15).toLocaleString()}</p>
              <p className="text-xs text-gray-500">
                High disagreement cases
              </p>
            </div>
            
            <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg col-span-2 sm:col-span-2">
              <p className="text-sm text-gray-500 dark:text-gray-400">Storage</p>
              <p className="font-medium">{stats?.storage_type}</p>
              <p className="text-sm truncate" title={stats?.storage_location}>
                {stats?.storage_location}
              </p>
            </div>
            
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold">42</p>
              <p className="text-xs text-gray-500">
                Last 24 hours
              </p>
            </div>
          </div>

          {/* Action items for admins */}
          <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="font-medium mb-2">Recommended Actions</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                <span>15 anomalies need expert review due to high disagreement</span>
              </li>
              <li className="flex items-center gap-2 text-blue-700 dark:text-blue-400">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Database synchronization recommended (last sync: 3 days ago)</span>
              </li>
            </ul>
          </div>
        </>
      )}

      {/* User Contributions View - For Users */}
      {activeTab === 'contributions' && (
        <>
          <h2 className="text-2xl font-bold mb-4">Your Contributions</h2>
          
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Total Contributions</p>
              <p className="text-2xl font-bold">{userStats.contributions}</p>
            </div>
            
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Accuracy Rate</p>
              <p className="text-2xl font-bold">{userStats.accuracy}%</p>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Current Streak</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold">{userStats.contributionStreak}</p>
                <p className="ml-1 text-sm text-gray-500">days</p>
              </div>
            </div>
            
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Community Rank</p>
              <div className="flex items-center">
                <p className="text-2xl font-bold">#{userStats.rank}</p>
                <p className="ml-1 text-xs text-gray-500">of {userStats.totalParticipants}</p>
              </div>
            </div>
          </div>
          
          {/* Badges & Achievements - Gamification element */}
          <div className="mb-6">
            <h3 className="font-medium mb-3 text-gray-700 dark:text-gray-300">Your Badges</h3>
            <div className="flex flex-wrap gap-2">
              {[
                { name: 'Early Adopter', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200' },
                { name: 'Expert Classifier', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200' },
                { name: '50+ Contributions', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' },
              ].map((badge, i) => (
                <span key={i} className={`text-xs px-2 py-1 rounded-full ${badge.color}`}>
                  {badge.name}
                </span>
              ))}
            </div>
          </div>
          
          {/* Next goals - Engagement */}
          <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="font-medium mb-2">Next Goals</h3>
            <ul className="space-y-3 text-sm">
              <li>
                <div className="flex justify-between mb-1">
                  <span>Next badge: 100 Contributions</span>
                  <span>{userStats.contributions}/100</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div className="bg-blue-600 h-2 rounded-full" style={{width: `${(userStats.contributions/100)*100}%`}}></div>
                </div>
              </li>
              <li>
                <div className="flex justify-between mb-1">
                  <span>7-day streak</span>
                  <span>{userStats.contributionStreak}/7</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div className="bg-amber-500 h-2 rounded-full" style={{width: `${(userStats.contributionStreak/7)*100}%`}}></div>
                </div>
              </li>
            </ul>
          </div>
        </>
      )}

      {/* Data Trends View - Both Users and Admins */}
      {activeTab === 'trends' && (
        <>
          <h2 className="text-2xl font-bold mb-4">Data Trends</h2>
          
          {/* Simple chart visualization (mockup) */}
          <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
            <h3 className="text-sm font-medium mb-4 text-gray-700 dark:text-gray-300">Anomalies Detected Over Time</h3>
            <div className="h-32 flex items-end space-x-2">
              {[35, 42, 28, 55, 64, 72, 60, 52, 48, 68, 75, 62].map((value, i) => (
                <div key={i} className="flex-1 flex flex-col items-center">
                  <div 
                    className="w-full bg-blue-500 dark:bg-blue-600 rounded-t" 
                    style={{height: `${value}%`}}
                  ></div>
                  <span className="text-xs text-gray-500 mt-1">{i+1}</span>
                </div>
              ))}
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">Months (trailing 12)</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Most Common</p>
              <p className="font-medium">Nebulae (42%)</p>
              <p className="text-xs text-gray-500">Based on user classifications</p>
            </div>
            
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
              <p className="text-sm text-gray-500 dark:text-gray-400">Rarest Type</p>
              <p className="font-medium">Black Holes (3%)</p>
              <p className="text-xs text-gray-500">Based on user classifications</p>
            </div>
          </div>
          
          {/* Insights section */}
          <div className="mt-4 p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800">
            <h3 className="font-medium mb-2">Insights</h3>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-blue-500 rounded-full"></span>
                <span>Anomaly detection rate increased 15% this month</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                <span>Community consensus rate is 87% for verified objects</span>
              </li>
              <li className="flex items-center gap-2">
                <span className="w-2 h-2 bg-amber-500 rounded-full"></span>
                <span>Most active region: RA 83.82, Dec -5.39 (Orion Nebula)</span>
              </li>
            </ul>
          </div>
        </>
      )}
    </div>
  );
}