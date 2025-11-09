import React, { useState, useEffect } from 'react';
import { WatchlistItem, ItemType, SubType, ReleaseType, Status, Language } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { Icon } from '../ui/Icons';

const formatDateTime = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
    }).replace(',', '');
};

const getSubTypeIcon = (subType?: SubType): string => {
    switch (subType) {
        case SubType.ANIME: return 'sparkles';
        case SubType.BOLLYWOOD: return 'music';
        case SubType.HOLLYWOOD: return 'clapperboard';
        case SubType.KOREAN:
        case SubType.JAPANESE:
        case SubType.TURKISH:
        case SubType.TOLLYWOOD:
        case SubType.KOLLYWOOD:
        case SubType.SANDALWOOD:
        case SubType.CHINESE:
            return 'globe';
        default: return 'layers';
    }
}

const getStatusIcon = (status: Status): string => {
    switch (status) {
        case Status.WATCH: return 'activity';
        case Status.WAITING: return 'pause-circle';
        case Status.COMPLETED: return 'check-circle';
        case Status.STOPPED: return 'x-circle';
        default: return 'activity';
    }
}

const CardInfoItem: React.FC<{ icon: string; text?: string | number | null; children?: React.ReactNode }> = ({ icon, text, children }) => {
    if (!text && !children) return null;
    return (
        <div className="flex items-center gap-1.5 text-gray-700" title={typeof text === 'string' ? text : ''}>
            <Icon name={icon} className="h-4 w-4 flex-shrink-0" />
            <span className="text-sm truncate">{children || text}</span>
        </div>
    );
}

type WatchlistItemCardProps = {
    item: WatchlistItem,
    multiSelect: boolean,
    isSelected: boolean,
    onSelect: (id: string) => void,
    setItemRef: (node: HTMLDivElement | null, id: string) => void
};

export const WatchlistItemCard: React.FC<WatchlistItemCardProps> = React.memo(({ item, multiSelect, isSelected, onSelect, setItemRef }) => {
    const { setEditingItem, setGeminiItem, updateItem, deleteItem, highlightedIds, setHighlightedIds, showToast, setConfirmation, pendingSyncIds, isOnline } = useAppContext();
    const [copied, setCopied] = useState(false);
    const isHighlighted = highlightedIds.includes(item.id);
    const isPendingSync = pendingSyncIds.includes(item.id);
    const highlightIndex = isHighlighted ? highlightedIds.indexOf(item.id) : -1;
    const animationDelay = highlightIndex !== -1 ? `${highlightIndex * 150}ms` : undefined;

    useEffect(() => {
        if (isHighlighted) {
            const timer = setTimeout(() => {
                setHighlightedIds(current => current.filter(id => id !== item.id));
            }, 2500); // Animation duration
            return () => clearTimeout(timer);
        }
    }, [isHighlighted, item.id, setHighlightedIds]);


    const toggleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation();
        setHighlightedIds(current => [...current, item.id]);
        updateItem(item.id, { favorite: !item.favorite }, { successMessage: null });
    };
    
    const handleCopyDetails = (e: React.MouseEvent) => {
        e.stopPropagation();
        const progressParts = [];
        if (item.season) progressParts.push(`Season ${item.season}`);
        if (item.part) progressParts.push(`Part ${item.part}`);
        if (item.episode) progressParts.push(`Episode ${item.episode}`);

        const detailsToCopy = [
            item.title,
            progressParts.join(' '),
            item.type,
        ].filter(Boolean).join(' ').trim();

        if (navigator.clipboard) {
            navigator.clipboard.writeText(detailsToCopy).then(() => {
                showToast('Details copied to clipboard!', 'success');
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
            }).catch(err => {
                console.error('Failed to copy details:', err);
                showToast('Failed to copy details.', 'error');
            });
        } else {
            showToast('Clipboard not available.', 'error');
        }
    };
    
    const handleDelete = (e: React.MouseEvent) => {
        e.stopPropagation();
        setConfirmation({
            title: 'Delete Item',
            message: `Are you sure you want to delete "${item.title}"? This action cannot be undone.`,
            onConfirm: () => deleteItem(item.id),
        });
    };

    const handleAskGemini = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (isOnline) {
            setGeminiItem(item);
        }
    };

    const progressInfo = [
        item.season ? `Season: ${item.season}` : '',
        item.episode ? `Episode: ${item.episode}` : '',
        item.part ? `Part: ${item.part}` : ''
    ].filter(Boolean).join(' · ');

    return (
        <div 
            ref={(node) => setItemRef(node, item.id)}
            style={animationDelay ? { animationDelay } : undefined}
            className={`bg-card border-2 border-primary rounded-2xl shadow-sm p-4 flex flex-col justify-between transition-all duration-300 relative ${multiSelect ? 'cursor-pointer' : ''} hover:scale-[1.03] hover:shadow-lg ${isHighlighted ? (item.sub_type === SubType.ANIME ? 'animate-glow-anime' : 'animate-glow-neutral') : ''} ${isSelected ? 'ring-2 ring-primary' : ''}`} 
            onClick={() => multiSelect && onSelect(item.id)}>
            
            {isPendingSync && (
                <div className="absolute top-3 right-3" title="Changes pending sync">
                    <Icon name="cloud" className="h-5 w-5 text-blue-500" />
                </div>
            )}
            
            <div className="flex-grow space-y-2.5">
                {/* Line 1: Title */}
                <h3 className="text-lg sm:text-xl font-bold tracking-wide text-foreground truncate pr-6" title={item.title}>{item.title}</h3>

                {/* Line 2: Season / Episode / Part */}
                <p className="text-sm text-muted-foreground h-5">{progressInfo || <>&nbsp;</>}</p>

                {/* Line 3: Details with Icons */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-muted-foreground">
                    <CardInfoItem icon={item.type === ItemType.MOVIES ? 'film' : 'tv'} text={item.type} />
                    <CardInfoItem icon={getSubTypeIcon(item.sub_type)} text={item.sub_type} />
                    <CardInfoItem icon={getStatusIcon(item.status)} text={item.status} />
                    <CardInfoItem icon="languages" text={item.language} />
                    <CardInfoItem icon={item.release_type === ReleaseType.NEW ? 'zap' : 'archive'} text={item.release_type} />
                </div>
                
                {/* Line 4 & 5: Dates */}
                <div className="text-xs text-gray-500 italic pt-1 space-y-1">
                    <p className="flex items-center gap-1.5"><Icon name="clock" className="h-3.5 w-3.5" /> Added: {formatDateTime(item.created_at)}</p>
                    <p className="flex items-center gap-1.5"><Icon name="clock" className="h-3.5 w-3.5" /> Updated: {formatDateTime(item.updated_at)}</p>
                </div>
            </div>

            {/* Line 6: Buttons */}
            <div className="border-t border-border mt-3 pt-2 flex items-center justify-end space-x-0.5">
                <button 
                    title={isOnline ? "Ask Gemini" : "Gemini is unavailable offline"} 
                    onClick={handleAskGemini}
                    disabled={!isOnline}
                    className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-primary active:scale-95 transition-transform disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    <Icon name="sparkles" className="h-5 w-5"/>
                </button>
                <button title="Copy" onClick={handleCopyDetails} className={`w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-primary active:scale-95 transition-transform ${copied ? 'text-green-500' : ''}`}>
                    <Icon name={copied ? 'check-circle' : 'copy'} className="h-5 w-5"/>
                </button>
                <button title="Edit" onClick={(e) => { e.stopPropagation(); setEditingItem(item); }} className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-primary active:scale-95 transition-transform">
                    <Icon name="edit" className="h-5 w-5"/>
                </button>
                <button title={item.favorite ? 'Unfavorite' : 'Favorite'} onClick={toggleFavorite} className={`w-10 h-10 flex items-center justify-center rounded-full active:scale-95 transition-transform hover:bg-yellow-100 ${item.favorite ? 'text-yellow-500' : 'text-muted-foreground'}`}>
                    <Icon name="star" className={`h-5 w-5 ${item.favorite ? 'fill-current' : ''}`}/>
                </button>
                <button title="Delete" onClick={handleDelete} className="w-10 h-10 flex items-center justify-center rounded-full text-muted-foreground hover:bg-red-100 hover:text-red-600 active:scale-95 transition-transform">
                    <Icon name="trash" className="h-5 w-5" />
                </button>
            </div>
        </div>
    );
});