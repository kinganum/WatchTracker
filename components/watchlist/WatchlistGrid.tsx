import React from 'react';
import { WatchlistItem } from '../../types';
import { WatchlistItemCard } from './WatchlistItemCard';
import { EmptyState } from '../ui/EmptyState';

export const WatchlistGrid: React.FC<{ watchlist: WatchlistItem[], multiSelect: boolean, selectedItems: string[], handleSelect: (id: string) => void, setItemRef: (node: HTMLDivElement | null, id: string) => void }> = ({ watchlist, multiSelect, selectedItems, handleSelect, setItemRef }) => {
    if (watchlist.length === 0) {
        return <EmptyState />;
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {watchlist.map(item => <WatchlistItemCard key={item.id} item={item} multiSelect={multiSelect} isSelected={selectedItems.includes(item.id)} onSelect={handleSelect} setItemRef={setItemRef} />)}
        </div>
    );
};
