import React from 'react';
import { Icon } from './Icons';

export const StatusCard: React.FC<{
    icon: string;
    title: string;
    value?: number;
    onClick: () => void;
    isActive?: boolean;
    iconBgClass: string;
    iconTextClass: string;
    badgeBgClass: string;
    badgeTextClass: string;
    "aria-label": string;
}> = ({ icon, title, value, onClick, isActive = false, iconBgClass, iconTextClass, badgeBgClass, badgeTextClass, "aria-label": ariaLabel }) => (
    <button
        onClick={onClick}
        role="button"
        aria-pressed={isActive}
        aria-label={ariaLabel}
        tabIndex={0}
        className={`w-full flex items-center justify-between p-4 bg-card rounded-2xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary active:scale-95 ${isActive ? 'ring-2 ring-primary ring-offset-background' : 'border border-transparent hover:border-border'}`}
    >
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-full ${iconBgClass}`}>
                <Icon name={icon} className={`h-5 w-5 ${iconTextClass}`} />
            </div>
            <span className="font-semibold text-foreground">{title}</span>
        </div>
        {typeof value !== 'undefined' && (
            <div className={`px-2.5 py-0.5 rounded-full text-sm font-semibold ${badgeBgClass} ${badgeTextClass}`}>
                {value}
            </div>
        )}
    </button>
);
