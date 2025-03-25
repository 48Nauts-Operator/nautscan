import React, { useState } from 'react';
import { useTrafficData, Connection, TrafficStats } from '../hooks/useTrafficData';
import { StatsCard } from './StatsCard';
import { ConnectionList } from './ConnectionList';
import { AlertsList } from './AlertsList';

export function Dashboard() {
    const { connections, stats, alerts, loading, error, refresh } = useTrafficData({
        historyDuration: '1h',
        refreshInterval: 60000,
    });

    const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 dark:border-white"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-red-600 dark:text-red-400">
                    Error: {error}
                    <button
                        onClick={refresh}
                        className="ml-4 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200 dark:bg-red-900 dark:text-red-200"
                    >
                        Retry
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Stats Overview */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4 mb-8">
                    <StatsCard
                        title="Active Connections"
                        value={stats?.activeConnections || 0}
                        subtitle="Current active network connections"
                    />
                    <StatsCard
                        title="Traffic Rate"
                        value={`${formatBytes(10240)}/s`}
                        subtitle="Current network throughput"
                    />
                    <StatsCard
                        title="Total Traffic"
                        value={formatBytes(stats?.totalBytes || 0)}
                        subtitle="Total data transferred"
                    />
                    <StatsCard
                        title="Connection Rate"
                        value={`${stats?.totalConnections || 0}/min`}
                        subtitle="New connections per minute"
                    />
                </div>

                {/* Main Content */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Connections Panel */}
                    <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-lg shadow">
                        <div className="p-6">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                Active Connections
                            </h2>
                            <ConnectionList
                                connections={connections}
                                onSelectConnection={setSelectedConnection}
                            />
                        </div>
                    </div>

                    {/* Alerts Panel */}
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
                        <div className="p-6">
                            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                                System Alerts
                            </h2>
                            <AlertsList alerts={alerts} />
                        </div>
                    </div>
                </div>

                {/* Connection Details Modal */}
                {selectedConnection && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
                        <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full p-6">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                                    Connection Details
                                </h3>
                                <button
                                    onClick={() => setSelectedConnection(null)}
                                    className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                                >
                                    <span className="sr-only">Close</span>
                                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className="mt-4">
                                <pre className="bg-gray-50 dark:bg-gray-900 rounded p-4 overflow-auto">
                                    {JSON.stringify(selectedConnection, null, 2)}
                                </pre>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
} 