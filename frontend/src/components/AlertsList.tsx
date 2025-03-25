import React from 'react';
import { Alert } from '../hooks/useTrafficData';

interface AlertsListProps {
    alerts: Alert[];
}

export function AlertsList({ alerts }: AlertsListProps) {
    const getAlertIcon = (severity: string) => {
        switch (severity) {
            case 'high':
                return (
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                    </div>
                );
            case 'medium':
                return (
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                    </div>
                );
            default:
                return (
                    <div className="flex-shrink-0">
                        <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                        </svg>
                    </div>
                );
        }
    };

    const getAlertColor = (severity: string) => {
        switch (severity) {
            case 'high':
                return 'bg-red-50 dark:bg-red-900/20';
            case 'medium':
                return 'bg-yellow-50 dark:bg-yellow-900/20';
            default:
                return 'bg-blue-50 dark:bg-blue-900/20';
        }
    };

    return (
        <div className="flow-root">
            <ul role="list" className="-mb-8">
                {alerts.map((alert, alertIdx) => (
                    <li key={alert.id}>
                        <div className="relative pb-8">
                            {alertIdx !== alerts.length - 1 ? (
                                <span className="absolute top-5 left-5 -ml-px h-full w-0.5 bg-gray-200 dark:bg-gray-700" aria-hidden="true" />
                            ) : null}
                            <div className="relative flex items-start space-x-3">
                                {getAlertIcon(alert.severity)}
                                <div className={`flex-1 min-w-0 rounded-lg p-4 ${getAlertColor(alert.severity)}`}>
                                    <div>
                                        <div className="flex justify-between">
                                            <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                                                {alert.type}
                                            </p>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {new Date(alert.timestamp).toLocaleTimeString()}
                                            </p>
                                        </div>
                                        <p className="mt-1 text-sm text-gray-700 dark:text-gray-300">
                                            {alert.message}
                                        </p>
                                        {alert.sourceIp && (
                                            <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                                Source IP: {alert.sourceIp}
                                            </p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
} 