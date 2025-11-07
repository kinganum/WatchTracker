import React from 'react';
import { Icon } from './Icons';

export const StatCard: React.FC<{ icon: string; title: string; value: number; }> = ({ icon, title, value }) => (
    <div className="bg-card p-6 rounded-2xl shadow-md flex flex-col items-center justify-center space-y-2 text-center h-full">
        <Icon name={icon} className="h-8 w-8 text-primary" />
        <p className="text-3xl font-bold text-foreground">{value}</p>
        <p className="text-sm text-muted-foreground">{title}</p>
    </div>
);
