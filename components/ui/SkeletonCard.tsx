import React from 'react';

export const SkeletonCard = () => (
    <div className="bg-card border-2 border-primary/20 rounded-2xl shadow-sm p-4 animate-pulse">
        <div className="h-7 bg-secondary rounded w-3/4 mb-3"></div>
        <div className="h-5 bg-secondary rounded w-1/2 mb-4"></div>
        <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="h-5 bg-secondary rounded"></div>
            <div className="h-5 bg-secondary rounded"></div>
            <div className="h-5 bg-secondary rounded"></div>
            <div className="h-5 bg-secondary rounded"></div>
            <div className="h-5 bg-secondary rounded"></div>
        </div>
        <div className="space-y-2">
            <div className="h-4 bg-secondary rounded w-full"></div>
            <div className="h-4 bg-secondary rounded w-full"></div>
        </div>
        <div className="border-t border-border mt-3 pt-2 flex items-center justify-end space-x-2">
            <div className="w-10 h-10 rounded-full bg-secondary"></div>
            <div className="w-10 h-10 rounded-full bg-secondary"></div>
            <div className="w-10 h-10 rounded-full bg-secondary"></div>
            <div className="w-10 h-10 rounded-full bg-secondary"></div>
        </div>
    </div>
);
