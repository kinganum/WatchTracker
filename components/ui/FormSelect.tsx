import React from 'react';

export const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label:string, options: (string | {label: string, value: string})[] }> = ({ label, options, ...props }) => (
     <div>
        <label className="block text-sm font-medium text-muted-foreground mb-1.5">{label}</label>
        <select {...props} className="w-full px-3 py-2 rounded-md border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring appearance-none bg-chevron">
            {options.map(opt => {
                const value = typeof opt === 'string' ? opt : opt.value;
                const labelText = typeof opt === 'string' ? opt : opt.label;
                return <option key={value} value={value}>{labelText}</option>
            })}
        </select>
    </div>
);
