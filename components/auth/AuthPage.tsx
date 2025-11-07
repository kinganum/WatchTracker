import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { Icon } from '../ui/Icons';
import { useAppContext } from '../../contexts/AppContext';

export const AuthPage: React.FC<{}> = () => {
    const { showToast } = useAppContext();
    const [isSignUp, setIsSignUp] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = isSignUp
            ? await supabase.auth.signUp({ email, password })
            : await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            showToast(error.message, 'error');
        } else if (isSignUp) {
            showToast('Check your email for the confirmation link!', 'success');
        }
        setLoading(false);
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4">
             <div className="w-full max-w-md mx-auto bg-card rounded-2xl shadow-xl p-8">
                <div className="flex items-center justify-center mb-6 text-primary">
                    <Icon name="clapperboard" className="h-8 w-8" />
                    <h1 className="ml-2 text-3xl font-bold text-foreground">WatchTracker</h1>
                </div>
                <h2 className="text-2xl font-semibold text-center text-foreground mb-2">{isSignUp ? 'Create Account' : 'Welcome Back!'}</h2>
                <p className="text-center text-muted-foreground mb-8">{isSignUp ? 'Start tracking your favorite shows.' : 'Sign in to continue.'}</p>
                <form onSubmit={handleAuth} className="space-y-6">
                    <div>
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            required
                        />
                    </div>
                    <div>
                        <input
                            type="password"
                            placeholder="Password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            required
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors duration-300 disabled:opacity-50 flex items-center justify-center active:scale-95">
                        {loading ? <Icon name="loader" className="h-6 w-6"/> : (isSignUp ? 'Sign Up' : 'Sign In')}
                    </button>
                </form>
                <div className="text-center mt-6">
                    <button onClick={() => setIsSignUp(!isSignUp)} className="text-sm text-primary hover:underline">
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                    </button>
                </div>
            </div>
        </div>
    );
};
