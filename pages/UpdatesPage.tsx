import React, { useMemo, useState, useCallback, useEffect } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { WatchlistItem, ItemType, SubType } from '../types';
import { UpdateCard } from '../components/updates/UpdateCard';
import { Icon } from '../components/ui/Icons';
import { SkeletonCard } from '../components/ui/SkeletonCard';

const Column = ({ title, items, isLoading, isFetchTriggered, onFetch }: { title: string; items: WatchlistItem[]; isLoading: boolean; isFetchTriggered: boolean; onFetch: () => void; }) => {
    const [loadingChildrenCount, setLoadingChildrenCount] = useState(0);
    const [foundUpdates, setFoundUpdates] = useState(false);

    const isFetchingUpdates = isFetchTriggered && loadingChildrenCount > 0;

    useEffect(() => {
        if (isFetchTriggered) {
            setLoadingChildrenCount(items.length);
            setFoundUpdates(false);
        }
    }, [items, isFetchTriggered]);

    const handleLoadComplete = useCallback((hasUpdate: boolean) => {
        setLoadingChildrenCount(prev => Math.max(0, prev - 1));
        if (hasUpdate) {
            setFoundUpdates(true);
        }
    }, []);

    const allChildrenLoaded = isFetchTriggered && !isLoading && loadingChildrenCount === 0;

    return (
        <div className="bg-card p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-foreground">{title}</h2>
                {!isFetchTriggered && (
                    <button
                        onClick={onFetch}
                        className="flex items-center justify-center gap-2 px-3 py-1.5 text-sm font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-all active:scale-95"
                        aria-label={`Fetch updates for ${title}`}
                    >
                        <Icon name="zap" className="h-4 w-4" />
                        Fetch
                    </button>
                )}
            </div>
            <div className="space-y-4">
                {isLoading ? (
                    <>
                        <SkeletonCard />
                        <SkeletonCard />
                    </>
                ) : !isFetchTriggered ? (
                    <div className="text-center p-4 bg-secondary rounded-lg">
                        <p className="text-sm text-muted-foreground">Click "Fetch" to check for updates.</p>
                    </div>
                ) : (
                    <>
                        {isFetchingUpdates && (
                            <div className="flex items-center justify-center gap-2 p-4 text-muted-foreground bg-secondary rounded-lg">
                                <Icon name="loader" className="h-5 w-5" />
                                <span>Fetching updates...</span>
                            </div>
                        )}
                        {allChildrenLoaded && !foundUpdates && items.length > 0 && (
                             <div className="text-center p-4 bg-secondary rounded-lg">
                                <Icon name="check-circle" className="h-8 w-8 text-green-500 mx-auto" />
                                <p className="mt-2 text-sm font-semibold text-foreground">All caught up!</p>
                                <p className="text-xs text-muted-foreground">No new announcements found.</p>
                            </div>
                        )}
                        {items.length > 0 ? (
                            items.map(item => <UpdateCard key={item.id} item={item} onLoadComplete={handleLoadComplete} isFetchTriggered={isFetchTriggered} />)
                        ) : (
                            <p className="text-muted-foreground text-sm p-4 text-center bg-secondary rounded-lg">
                                No items of this type in your watchlist.
                            </p>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};

export const UpdatesPage = () => {
    const { watchlist, loading, isOnline, showToast } = useAppContext();
    
    const [fetchTriggered, setFetchTriggered] = useState(() => {
        // FIX: Restore individual fetch state for each category from sessionStorage.
        try {
            const storedState = sessionStorage.getItem('updatesFetchState');
            if (storedState) {
                return JSON.parse(storedState);
            }
        } catch (e) {
            console.error("Could not parse updates fetch state from sessionStorage", e);
        }
        return { anime: false, tvSeries: false, movies: false };
    });

    // FIX: Persist the fetch state to sessionStorage whenever it changes.
    useEffect(() => {
        sessionStorage.setItem('updatesFetchState', JSON.stringify(fetchTriggered));
    }, [fetchTriggered]);

    const categorizedItems = useMemo(() => {
        const anime: WatchlistItem[] = [];
        const tvSeries: WatchlistItem[] = [];
        const movies: WatchlistItem[] = [];

        watchlist.forEach(item => {
            if (item.sub_type === SubType.ANIME) {
                anime.push(item);
            } else if (item.type === ItemType.TV_SERIES) {
                tvSeries.push(item);
            } else if (item.type === ItemType.MOVIES) {
                movies.push(item);
            }
        });

        return { anime, tvSeries, movies };
    }, [watchlist]);

    const handleFetch = (category: 'anime' | 'tvSeries' | 'movies') => {
        if (!isOnline) {
            showToast('You are offline. Showing cached updates where available.', 'success');
        }
        setFetchTriggered(prev => ({ ...prev, [category]: true }));
    };

    const handleFetchAll = () => {
        if (!isOnline) {
            showToast('You are offline. Showing cached updates where available.', 'success');
        }
        setFetchTriggered({
            anime: true,
            tvSeries: true,
            movies: true,
        });
    };

    const isAnyFetchTriggered = fetchTriggered.anime || fetchTriggered.tvSeries || fetchTriggered.movies;

    return (
        <div className="space-y-8">
            <div className="text-center py-8">
                <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-wide">Upcoming Releases</h1>
                <p className="mt-2 text-lg text-muted-foreground flex items-center justify-center gap-2">
                    <Icon name="sparkles" className="h-5 w-5 text-primary" />
                    AI updates for this year & the next two years
                </p>
            </div>

            {!isAnyFetchTriggered && (
                <div className="flex justify-center mb-6">
                    <button
                        onClick={handleFetchAll}
                        className="flex items-center justify-center gap-2 px-6 py-3 text-lg font-semibold text-primary-foreground bg-primary rounded-lg hover:bg-primary/90 transition-all active:scale-95 shadow-lg"
                        aria-label="Fetch all updates"
                    >
                        <Icon name="zap" className="h-5 w-5" />
                        Fetch All Updates
                    </button>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <Column title="Anime" items={categorizedItems.anime} isLoading={loading} isFetchTriggered={fetchTriggered.anime} onFetch={() => handleFetch('anime')} />
                <Column title="TV Series" items={categorizedItems.tvSeries} isLoading={loading} isFetchTriggered={fetchTriggered.tvSeries} onFetch={() => handleFetch('tvSeries')} />
                <Column title="Movies" items={categorizedItems.movies} isLoading={loading} isFetchTriggered={fetchTriggered.movies} onFetch={() => handleFetch('movies')} />
            </div>
        </div>
    );
};