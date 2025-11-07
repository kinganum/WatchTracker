import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { useAppContext } from '../../contexts/AppContext';
import { Icon } from '../ui/Icons';

export const Header: React.FC<{ currentView: string; }> = ({ currentView }) => {
    const { user, setView } = useAppContext();
    const [menuOpen, setMenuOpen] = useState(false);

    const handleNav = (targetView: 'home' | 'watchlist') => {
        if (currentView === targetView) {
            // If already on the page, smooth scroll to top.
            window.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            // If changing to a new page, set the view and instantly scroll to top.
            setView(targetView);
            window.scrollTo({ top: 0, behavior: 'auto' });
        }
        setMenuOpen(false);
    };

    return (
        <header className="bg-background/80 backdrop-blur-lg shadow-sm sticky top-0 z-50">
            <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center cursor-pointer" onClick={() => handleNav('home')}>
                            <span className="text-2xl font-bold text-foreground">WatchTracker</span>
                        </div>
                         <div className="hidden md:block">
                            <div className="ml-10 flex items-baseline space-x-4">
                                <button onClick={() => handleNav('home')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${currentView === 'home' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}><Icon name="home" className="h-4 w-4"/> Home</button>
                                <button onClick={() => handleNav('watchlist')} className={`flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium ${currentView === 'watchlist' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:bg-accent'}`}><Icon name="list" className="h-4 w-4"/> Watchlist</button>
                            </div>
                        </div>
                    </div>
                    <div className="hidden md:block">
                        <div className="ml-4 flex items-center md:ml-6">
                            <div className="ml-3 relative">
                                <button onClick={() => setMenuOpen(!menuOpen)} className="max-w-xs bg-card rounded-full flex items-center text-sm focus:outline-none border border-border px-3 py-1.5 hover:border-ring">
                                    <Icon name="user" className="h-5 w-5 text-muted-foreground" />
                                </button>
                                {menuOpen && (
                                    <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg py-1 bg-card ring-1 ring-black ring-opacity-5">
                                        <div className="px-4 py-2 text-sm text-muted-foreground truncate">{user?.email}</div>
                                        <button onClick={() => { supabase.auth.signOut(); setMenuOpen(false); }} className="block w-full text-left px-4 py-2 text-sm text-foreground hover:bg-accent">Sign out</button>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                     <div className="flex items-center md:hidden">
                        <button onClick={() => setMenuOpen(!menuOpen)} className="ml-2 inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:bg-accent focus:outline-none">
                            <Icon name={menuOpen ? 'x' : 'list'} className="h-6 w-6" />
                        </button>
                    </div>
                </div>
                 {menuOpen && (
                    <div className="md:hidden">
                        <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                            <button onClick={() => handleNav('home')} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-accent">Home</button>
                            <button onClick={() => handleNav('watchlist')} className="block w-full text-left px-3 py-2 rounded-md text-base font-medium text-muted-foreground hover:bg-accent">Watchlist</button>
                        </div>
                        <div className="pt-4 pb-3 border-t border-border">
                             <div className="flex items-center px-5">
                                <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center">
                                   <Icon name="user" className="h-6 w-6 text-muted-foreground" />
                                </div>
                                <div className="ml-3">
                                    <div className="text-base font-medium leading-none text-foreground truncate max-w-[150px]">{user?.email}</div>
                                </div>
                            </div>
                             <div className="mt-3 px-2 space-y-1">
                                <button onClick={() => { supabase.auth.signOut(); setMenuOpen(false); }} className="block w-full text-left rounded-md px-3 py-2 text-base font-medium text-muted-foreground hover:text-foreground hover:bg-accent">Sign out</button>
                            </div>
                        </div>
                    </div>
                )}
            </nav>
        </header>
    );
};