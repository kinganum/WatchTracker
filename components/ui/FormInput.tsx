import React from 'react';

export const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">{label}</label>
        <input {...props} className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"/>
    </div>
);
