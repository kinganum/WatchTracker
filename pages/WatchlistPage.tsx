import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Status } from '../types';
import { StatusCard } from '../components/ui/StatusCard';
import { FilterControls } from '../components/watchlist/FilterControls';
import { WatchlistGrid } from '../components/watchlist/WatchlistGrid';
import { Icon } from '../components/ui/Icons';
import { SkeletonCard } from '../components/ui/SkeletonCard';
import { DeleteByCategoryModal } from '../components/modals/DeleteByCategoryModal';

export const WatchlistPage: React.FC<{ initialSearch: string, setInitialSearch: (q: string) => void }> = ({ initialSearch, setInitialSearch }) => {
    const { watchlist, loading, setScrollToId, scrollToId, setView, initialListFilter, setInitialListFilter } = useAppContext();
    const [filter, setFilter] = useState({ search: '', type: '', sub_type: '', status: '', release: '' });
    const [activeStatusFilter, setActiveStatusFilter] = useState<Status | null>(null);
    const [showFavorites, setShowFavorites] = useState(false);
    const [sortBy, setSortBy] = useState('created_at_desc');
    const [multiSelect, setMultiSelect] = useState(false);
    const [selectedItems, setSelectedItems] = useState<string[]>([]);
    const [showDeleteModal, setShowDeleteModal] = useState(false);
    const itemRefs = useRef(new Map<string, HTMLDivElement>());
    const [isInitialSearch, setIsInitialSearch] = useState(false);
    
    useEffect(() => {
        if (initialSearch) {
            // Reset all filters for a clean search experience from the home page
            setActiveStatusFilter(null);
            setShowFavorites(false);
            setFilter({ search: initialSearch, type: '', sub_type: '', status: '', release: '' });
            setIsInitialSearch(true); // Flag that we need to scroll after the next render
            setInitialSearch('');
        }
    }, [initialSearch, setInitialSearch]);
    
    useEffect(() => {
        if (initialListFilter === 'favorites') {
            setShowFavorites(true);
            setActiveStatusFilter(null);
            scrollToTopResult(null, true);
            setInitialListFilter(null);
        }
    }, [initialListFilter, setInitialListFilter]);

    const sortedAndFilteredWatchlist = useMemo(() => {
        const filtered = watchlist.filter(item => {
            const matchesStatus = activeStatusFilter ? item.status === activeStatusFilter : true;
            const matchesFavorites = showFavorites ? item.favorite : true;
            
            return (
                item.title.toLowerCase().includes(filter.search.toLowerCase()) &&
                matchesStatus &&
                matchesFavorites &&
                (filter.type ? item.type === filter.type : true) &&
                (filter.sub_type ? item.sub_type === filter.sub_type : true) &&
                (filter.status ? item.status === filter.status : true) &&
                (filter.release ? item.release_type === filter.release : true)
            );
        });

        const sorted = [...filtered];
        switch (sortBy) {
            case 'title_asc':
                sorted.sort((a, b) => a.title.localeCompare(b.title));
                break;
            case 'title_desc':
                sorted.sort((a, b) => b.title.localeCompare(a.title));
                break;
            case 'updated_at_desc':
                sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
                break;
            case 'created_at_desc':
            default:
                sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
                break;
        }
        return sorted;
    }, [watchlist, filter, activeStatusFilter, showFavorites, sortBy]);

    useEffect(() => {
        if (isInitialSearch) {
            if (sortedAndFilteredWatchlist.length > 0) {
                setScrollToId(sortedAndFilteredWatchlist[0].id);
            }
            setIsInitialSearch(false); // Reset the flag after attempting to scroll
        }
    }, [isInitialSearch, sortedAndFilteredWatchlist, setScrollToId]);
    
    const optionCounts = useMemo(() => {
        const initialList = watchlist.filter(item => item.title.toLowerCase().includes(filter.search.toLowerCase()));

        const calculateCountsFor = (targetKey: 'type' | 'sub_type' | 'status' | 'release_type') => {
            const counts: { [key: string]: number } = {};
            const preFilteredList = initialList.filter(item => {
                if (targetKey !== 'type' && filter.type && item.type !== filter.type) return false;
                if (targetKey !== 'sub_type' && filter.sub_type && item.sub_type !== filter.sub_type) return false;
                if (targetKey !== 'status' && filter.status && item.status !== filter.status) return false;
                if (targetKey !== 'release_type' && filter.release && item.release_type !== filter.release) return false;
                return true;
            });

            for (const item of preFilteredList) {
                const key = item[targetKey];
                if (key) {
                    counts[key] = (counts[key] || 0) + 1;
                }
            }
            
            counts.ALL = preFilteredList.length;
            return counts;
        };

        return {
            type: calculateCountsFor('type'),
            sub_type: calculateCountsFor('sub_type'),
            status: calculateCountsFor('status'),
            release: calculateCountsFor('release_type'),
        };
    }, [watchlist, filter.search, filter.type, filter.sub_type, filter.status, filter.release]);

    const scrollToTopResult = useCallback((newStatus: Status | null, newFavorites: boolean) => {
        const tempFiltered = watchlist.filter(item => {
           const matchesStatus = newStatus ? item.status === newStatus : true;
           const matchesFavorites = newFavorites ? item.favorite : true;
           return (
               item.title.toLowerCase().includes(filter.search.toLowerCase()) &&
               matchesStatus &&
               matchesFavorites &&
               (filter.type ? item.type === filter.type : true) &&
               (filter.sub_type ? item.sub_type === filter.sub_type : true) &&
               (filter.status ? item.status === filter.status : true) &&
               (filter.release ? item.release_type === filter.release : true)
           );
       });

       if (tempFiltered.length > 0) {
           const sorted = [...tempFiltered];
           switch (sortBy) {
               case 'title_asc': sorted.sort((a, b) => a.title.localeCompare(b.title)); break;
               case 'title_desc': sorted.sort((a, b) => b.title.localeCompare(a.title)); break;
               case 'updated_at_desc': sorted.sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()); break;
               default: sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()); break;
           }
            setScrollToId(sorted[0].id);
       }
   }, [watchlist, filter, sortBy, setScrollToId]);
   
    useEffect(() => {
        if (scrollToId) {
            const isReducedMotion = window.matchMedia(`(prefers-reduced-motion: reduce)`).matches === true;
            requestAnimationFrame(() => {
                const node = itemRefs.current.get(scrollToId);
                if (node) {
                    node.scrollIntoView({ behavior: isReducedMotion ? 'auto' : 'smooth', block: 'center' });
                    node.setAttribute('tabindex', '-1');
                    node.focus({ preventScroll: true }); // Prevent scroll since we already scrolled
                    node.addEventListener('blur', () => node.removeAttribute('tabindex'), { once: true });
                    setScrollToId(null);
                }
            });
        }
    }, [scrollToId, sortedAndFilteredWatchlist, setScrollToId]);

    const handleSelect = useCallback((id: string) => {
        if(selectedItems.includes(id)) {
            setSelectedItems(prev => prev.filter(i => i !== id));
        } else {
            setSelectedItems(prev => [...prev, id]);
        }
    }, [selectedItems]);
    
    const setItemRef = useCallback((node: HTMLDivElement | null, id: string) => {
        if (node) {
            itemRefs.current.set(id, node);
        } else {
            itemRefs.current.delete(id);
        }
    }, []);

    const clearFiltersAndSort = () => {
        setFilter({ search: '', type: '', sub_type: '', status: '', release: '' });
        setActiveStatusFilter(null);
        setShowFavorites(false);
        setSortBy('created_at_desc');
    };
    
    const handleFilterClick = (status: Status | 'ALL') => {
        const newStatus = status === 'ALL' ? null : (activeStatusFilter === status ? null : status);
        setActiveStatusFilter(newStatus);
        setShowFavorites(false);
        scrollToTopResult(newStatus, false);
    };

    const handleFavoritesClick = () => {
        const newShowFavorites = !showFavorites;
        setShowFavorites(newShowFavorites);
        setActiveStatusFilter(null);
        scrollToTopResult(null, newShowFavorites);
    };

    const handleAddNew = () => {
        setView('home');
        requestAnimationFrame(() => {
            document.getElementById('add-items-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
    };
    
    const counts = useMemo(() => ({
        [Status.WATCH]: watchlist.filter(i => i.status === Status.WATCH).length,
        [Status.WAITING]: watchlist.filter(i => i.status === Status.WAITING).length,
        [Status.COMPLETED]: watchlist.filter(i => i.status === Status.COMPLETED).length,
        [Status.STOPPED]: watchlist.filter(i => i.status === Status.STOPPED).length,
        favorites: watchlist.filter(i => i.favorite).length,
    }), [watchlist]);

    return (
        <div className="space-y-6">
            <div className="space-y-4">
                <h2 className="text-xl font-bold text-foreground">Status Overview</h2>
                
                <StatusCard
                    title="Total Items"
                    icon="play"
                    value={watchlist.length}
                    onClick={() => handleFilterClick('ALL')}
                    isActive={!activeStatusFilter && !showFavorites}
                    iconBgClass="bg-purple-100" iconTextClass="text-purple-600"
                    badgeBgClass="bg-purple-100" badgeTextClass="text-purple-800"
                    aria-label="Filter all items"
                />

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <StatusCard title="Watch" icon="play" value={counts[Status.WATCH]} onClick={() => handleFilterClick(Status.WATCH)} isActive={activeStatusFilter === Status.WATCH} iconBgClass="bg-purple-100" iconTextClass="text-purple-600" badgeBgClass="bg-purple-100" badgeTextClass="text-purple-800" aria-label={`Filter items with status Watch, ${counts[Status.WATCH]} items`} />
                    <StatusCard title="Waiting" icon="clock" value={counts[Status.WAITING]} onClick={() => handleFilterClick(Status.WAITING)} isActive={activeStatusFilter === Status.WAITING} iconBgClass="bg-gray-100" iconTextClass="text-gray-600" badgeBgClass="bg-gray-100" badgeTextClass="text-gray-800" aria-label={`Filter items with status Waiting, ${counts[Status.WAITING]} items`} />
                    <StatusCard title="Completed" icon="check-circle" value={counts[Status.COMPLETED]} onClick={() => handleFilterClick(Status.COMPLETED)} isActive={activeStatusFilter === Status.COMPLETED} iconBgClass="bg-purple-100" iconTextClass="text-purple-600" badgeBgClass="bg-purple-100" badgeTextClass="text-purple-800" aria-label={`Filter items with status Completed, ${counts[Status.COMPLETED]} items`} />
                    <StatusCard title="Stopped" icon="x-circle" value={counts[Status.STOPPED]} onClick={() => handleFilterClick(Status.STOPPED)} isActive={activeStatusFilter === Status.STOPPED} iconBgClass="bg-red-100" iconTextClass="text-red-600" badgeBgClass="bg-red-100" badgeTextClass="text-red-800" aria-label={`Filter items with status Stopped, ${counts[Status.STOPPED]} items`} />
                </div>

                <StatusCard
                    title="Favorites"
                    icon="star"
                    value={counts.favorites}
                    onClick={handleFavoritesClick}
                    isActive={showFavorites}
                    iconBgClass="bg-yellow-100" iconTextClass="text-yellow-600"
                    badgeBgClass="bg-yellow-100" badgeTextClass="text-yellow-800"
                    aria-label={`Filter favorite items, ${counts.favorites} items`}
                />
                
                <button
                    onClick={handleAddNew}
                    className="w-full flex items-center justify-center gap-3 p-4 bg-primary text-primary-foreground rounded-2xl shadow-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary active:scale-95"
                    aria-label="Add new items"
                >
                    <Icon name="plus" className="h-5 w-5" />
                    <span className="font-semibold text-base">Add New Items</span>
                </button>
            </div>
           
            <FilterControls 
                filter={filter} 
                setFilter={setFilter} 
                sortBy={sortBy}
                setSortBy={setSortBy}
                clearFiltersAndSort={clearFiltersAndSort}
                multiSelect={multiSelect} 
                setMultiSelect={setMultiSelect} 
                selectedItems={selectedItems} 
                setSelectedItems={setSelectedItems} 
                setShowDeleteModal={setShowDeleteModal}
                optionCounts={optionCounts}
            />
            {loading ? (
                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, index) => <SkeletonCard key={index} />)}
                </div>
            ) : (
                <WatchlistGrid watchlist={sortedAndFilteredWatchlist} multiSelect={multiSelect} selectedItems={selectedItems} handleSelect={handleSelect} setItemRef={setItemRef} />
            )}
            {showDeleteModal && <DeleteByCategoryModal onClose={() => setShowDeleteModal(false)} />}
        </div>
    );
};