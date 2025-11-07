import React from 'react';
import { useAppContext } from '../../contexts/AppContext';

export const Footer: React.FC<{ currentView: 'home' | 'watchlist' }> = ({ currentView }) => {
    const { setView, setInitialListFilter } = useAppContext();

    const handleNav = (target: 'home' | 'watchlist' | 'add-items' | 'favorites') => {
        if (target === 'home') {
            setView('home');
            window.scrollTo({ top: 0, behavior: 'auto' });
        } else if (target === 'watchlist') {
            setView('watchlist');
            window.scrollTo({ top: 0, behavior: 'auto' });
        } else if (target === 'add-items') {
            setView('home');
            requestAnimationFrame(() => {
                document.getElementById('add-items-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        } else if (target === 'favorites') {
            setInitialListFilter('favorites');
            setView('watchlist');
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
    };
    
    const FooterLink: React.FC<{children: React.ReactNode, onClick: () => void, 'aria-label': string}> = ({ children, onClick, 'aria-label': ariaLabel }) => (
        <button onClick={onClick} aria-label={ariaLabel} className="text-muted-foreground hover:text-foreground transition-colors text-left focus:outline-none focus:ring-2 focus:ring-ring rounded-sm p-0.5 -m-0.5">
            {children}
        </button>
    );

    return (
        <footer className="bg-background border-t border-border mt-auto">
            <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-foreground">WatchTracker</h3>
                        <p className="text-muted-foreground text-sm">Your personal hub for tracking anime, movies, and series.</p>
                        <p className="text-xs text-muted-foreground">&copy; {new Date().getFullYear()} WatchTracker. All rights reserved.</p>
                    </div>
                    <div className="space-y-3">
                        <h4 className="font-semibold text-foreground">Quick Links</h4>
                        <ul className="space-y-2 text-sm flex flex-col items-start">
                            <li><FooterLink onClick={() => handleNav('home')} aria-label="Navigate to Home page">Home</FooterLink></li>
                            <li><FooterLink onClick={() => handleNav('watchlist')} aria-label="Navigate to Watchlist page">Watchlist</FooterLink></li>
                            <li><FooterLink onClick={() => handleNav('add-items')} aria-label="Navigate to Add Items section">Add Items</FooterLink></li>
                            <li><FooterLink onClick={() => handleNav('favorites')} aria-label="Navigate to filtered Favorites view">Favorites</FooterLink></li>
                        </ul>
                    </div>
                </div>
                <div className="mt-8 pt-4 border-t border-border text-center text-xs text-muted-foreground">
                    <p>Built with React, Tailwind CSS, and Supabase.</p>
                </div>
            </div>
        </footer>
    );
};