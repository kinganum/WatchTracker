import React, { useState, useEffect, useCallback, useRef } from 'react';
import { WatchlistItem, UpcomingRelease } from '../../types';
import { getUpcomingRelease } from '../../services/geminiService';
import * as db from '../../services/db';
import { Icon } from '../ui/Icons';
import { useAppContext } from '../../contexts/AppContext';
import { parseReleaseDate } from '../../utils/textFormatters';

const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

const UpdateCardSkeleton = () => (
    <div className="bg-secondary p-4 rounded-lg animate-pulse">
        <div className="h-5 bg-muted rounded w-3/4 mb-3"></div>
        <div className="space-y-2">
            <div className="h-4 bg-muted rounded w-1/2"></div>
            <div className="h-4 bg-muted rounded w-1/3"></div>
            <div className="h-4 bg-muted rounded w-1/4"></div>
            <div className="h-4 bg-muted rounded w-full mt-1"></div>
        </div>
    </div>
);

const getStatusBadgeClass = (status: 'Confirmed' | 'Rumored' | 'No Update Found') => {
    switch(status) {
        case 'Confirmed': return 'bg-green-100 text-green-800';
        case 'Rumored': return 'bg-yellow-100 text-yellow-800';
        default: return 'bg-gray-100 text-gray-800';
    }
};

export const UpdateCard: React.FC<{
    item: WatchlistItem;
    onLoadComplete: (hasUpdate: boolean) => void;
    isFetchTriggered: boolean;
}> = ({ item, onLoadComplete, isFetchTriggered }) => {
    const { isOnline } = useAppContext();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<UpcomingRelease | null>(null);
    const [isReleased, setIsReleased] = useState<boolean | null>(null);
    const [startFetch, setStartFetch] = useState(false);
    const cardRef = useRef<HTMLDivElement | null>(null);

    const fetchData = useCallback(async () => {
        setError(null);
        setLoading(true);
        let hasUpdateResult = false;
        let finalData: UpcomingRelease | null = null;

        try {
            const cached = await db.getUpdateFromCache(item.id);
            if (cached) {
                finalData = cached.data;
                if ((Date.now() - cached.timestamp < CACHE_DURATION) || !isOnline) {
                    setData(finalData);
                    hasUpdateResult = finalData.status !== 'No Update Found';
                    setLoading(false);
                    onLoadComplete(hasUpdateResult);
                    return;
                }
            }
            
            if (isOnline) {
                const result = await getUpcomingRelease(item);
                if (typeof result === 'string') {
                    if (!finalData) setError(result);
                } else {
                    finalData = result;
                    await db.saveUpdateToCache(item.id, result);
                }
            } else if (!finalData) {
                // If offline and we don't have cached data, we won't show an error.
                // The global toast on the page is sufficient. The card will just not render.
            }

        } catch (e) {
            console.error("Error in fetchData:", e);
            if (!finalData) setError("An unexpected error occurred.");
        } finally {
            if (finalData) {
                setData(finalData);
                hasUpdateResult = finalData.status !== 'No Update Found';
            }
            setLoading(false);
            onLoadComplete(hasUpdateResult);
        }
    }, [item.id, isOnline, onLoadComplete]);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setStartFetch(true);
                    observer.disconnect();
                }
            },
            { rootMargin: '200px' }
        );

        if (cardRef.current) {
            observer.observe(cardRef.current);
        }

        return () => observer.disconnect();
    }, []);

    useEffect(() => {
        if (startFetch && isFetchTriggered) {
            fetchData();
        }
    }, [startFetch, isFetchTriggered, fetchData]);

    useEffect(() => {
        if (data?.release_date) {
            const releaseDate = parseReleaseDate(data.release_date);
            if (releaseDate) {
                const today = new Date();
                today.setHours(0, 0, 0, 0); // Compare dates only, not time
                setIsReleased(releaseDate < today);
            } else {
                setIsReleased(null); // Date is unparsable, like 'TBA'
            }
        }
    }, [data]);

    if (!startFetch) {
        return <div ref={cardRef}><UpdateCardSkeleton /></div>;
    }
    
    if (loading) {
        return <UpdateCardSkeleton />;
    }

    if (error) {
        // The global toast on the Updates page is enough when offline.
        // Don't show individual card errors if there's no cached data to display.
        if (!isOnline && !data) {
            return null;
        }

        const isOfflineError = error.includes("offline");
        return (
            <div className={`border p-4 rounded-lg text-sm space-y-2 ${isOfflineError ? 'bg-gray-50 border-gray-200 text-gray-600' : 'bg-red-50 border-red-200 text-red-700'}`}>
                <p className="font-semibold">Could not fetch update for "{item.title}"</p>
                <p className="text-xs">{error}</p>
                {!isOfflineError && (
                    <button 
                        onClick={fetchData} 
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                    >
                        Retry
                    </button>
                )}
            </div>
        );
    }
    
    if (!data || data.status === 'No Update Found') {
        return null; // Don't render a card if no update is found
    }

    return (
        <div className="bg-secondary p-4 rounded-lg border border-border">
            <div className="flex justify-between items-start gap-2">
                <h4 className="font-bold text-foreground">{data.new_title}</h4>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${getStatusBadgeClass(data.status)}`}>
                    {data.status}
                </span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Based on: {item.title}</p>

            <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2">
                    <Icon name="tv" className="h-4 w-4 text-primary" />
                    <span>{data.next_installment}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Icon name="calendar" className="h-4 w-4 text-primary" />
                    <span>{data.release_date}</span>
                </div>
                <div className="flex items-center gap-2">
                    <Icon name="play" className="h-4 w-4 text-primary" />
                    <span>{data.platform}</span>
                </div>
                {isReleased !== null && (
                    <div className="flex items-center gap-2">
                        <Icon name="zap" className="h-4 w-4 text-primary" />
                         <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${isReleased ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                            {isReleased ? 'Released' : 'Coming Soon'}
                        </span>
                    </div>
                )}
            </div>
        </div>
    );
};