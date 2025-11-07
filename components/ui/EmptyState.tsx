import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Icon } from './Icons';

export const EmptyState = () => {
    const { setView } = useAppContext();

    const handleAddItemClick = () => {
        setView('home');
        requestAnimationFrame(() => {
            document.getElementById('add-items-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };

    return (
        <div className="text-center py-16 px-4 col-span-1 sm:col-span-2 lg:col-span-3">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <Icon name="archive" className="h-8 w-8 text-primary" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-foreground">No items found</h3>
            <p className="mt-2 text-sm text-muted-foreground">
                Your watchlist is empty. Add your first item to get started!
            </p>
            <div className="mt-6">
                <button
                    onClick={handleAddItemClick}
                    className="inline-flex items-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-colors active:scale-95"
                >
                    <Icon name="plus" className="-ml-0.5 mr-1.5 h-5 w-5" />
                    Add Your First Item
                </button>
            </div>
        </div>
    );
};
