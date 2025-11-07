import React, { useState, useMemo } from 'react';
import { useAppContext } from '../contexts/AppContext';
import { Status } from '../types';
import { StatCard } from '../components/ui/StatCard';
import { ManualPasteForm } from '../components/home/ManualPasteForm';
import { SmartPasteForm } from '../components/home/SmartPasteForm';


export const HomePage = () => {
    const { watchlist, setView, setInitialSearch } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const stats = useMemo(() => ({
        total: watchlist.length,
        watching: watchlist.filter(i => i.status === Status.WATCH).length,
        completed: watchlist.filter(i => i.status === Status.COMPLETED).length,
        favorites: watchlist.filter(i => i.favorite).length
    }), [watchlist]);
    
    const handleSearchSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            setInitialSearch(searchQuery.trim());
            setView('watchlist');
        }
    };
    
    return (
        <div className="space-y-8">
            <div className="text-center py-8">
                <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-wide">Welcome back!</h1>
                <p className="mt-2 text-lg text-muted-foreground">Track your favorite anime, movies, and series</p>
            </div>

            <div className="max-w-2xl mx-auto">
                <form onSubmit={handleSearchSubmit} className="relative">
                    <input 
                        type="text" 
                        placeholder="Search your watchlist..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-5 pr-32 py-3.5 rounded-full border border-input bg-card text-foreground focus:outline-none focus:ring-2 focus:ring-ring"/>
                    <button type="submit" className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground font-semibold px-6 py-2 rounded-full hover:bg-primary/90 transition-transform active:scale-95">Search</button>
                </form>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 max-w-4xl mx-auto">
                <StatCard icon="layers" title="Total" value={stats.total} />
                <StatCard icon="activity" title="Watch" value={stats.watching} />
                <StatCard icon="check-circle" title="Completed" value={stats.completed} />
                <StatCard icon="star" title="Favorites" value={stats.favorites} />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" id="add-items-section">
                <ManualPasteForm />
                <SmartPasteForm />
            </div>
        </div>
    );
};
