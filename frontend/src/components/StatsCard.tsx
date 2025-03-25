import React from 'react';

interface StatsCardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    trend?: number;
    icon?: React.ReactNode;
}

export function StatsCard({ title, value, subtitle, trend, icon }: StatsCardProps) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                        {title}
                    </h3>
                    <div className="mt-1 flex items-baseline">
                        <p className="text-2xl font-semibold text-gray-900 dark:text-white">
                            {value}
                        </p>
                        {trend !== undefined && (
                            <span className={`ml-2 text-sm font-medium ${
                                trend >= 0 
                                    ? 'text-green-600 dark:text-green-500' 
                                    : 'text-red-600 dark:text-red-500'
                            }`}>
                                {trend >= 0 ? '↑' : '↓'} {Math.abs(trend)}%
                            </span>
                        )}
                    </div>
                    {subtitle && (
                        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                            {subtitle}
                        </p>
                    )}
                </div>
                {icon && (
                    <div className="text-gray-400 dark:text-gray-500">
                        {icon}
                    </div>
                )}
            </div>
        </div>
    );
} 