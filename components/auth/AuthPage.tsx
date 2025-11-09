// FIX: Correct import syntax for React hooks
import React, { useState } from 'react';
import { supabase } from '../../services/supabase';
import { Icon } from '../ui/Icons';
import { useAppContext } from '../../contexts/AppContext';

const AuthWrapper: React.FC<{children: React.ReactNode}> = ({ children }) => (
    <div className="flex flex-col items-center justify-center min-h-screen bg-secondary p-4">
        <div className="w-full max-w-md mx-auto bg-card rounded-2xl shadow-xl p-8">
           <div className="flex items-center justify-center mb-6 text-primary">
               <Icon name="clapperboard" className="h-8 w-8" />
               <h1 className="ml-2 text-3xl font-bold text-foreground">WatchTracker</h1>
           </div>
           {children}
       </div>
   </div>
);

export const AuthPage: React.FC<{}> = () => {
    const { showToast } = useAppContext();
    const [view, setView] = useState<'signIn' | 'signUp' | 'forgotPassword' | 'verifyOtp'>('signIn');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [otp, setOtp] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        const { error } = view === 'signUp'
            ? await supabase.auth.signUp({ email, password })
            : await supabase.auth.signInWithPassword({ email, password });

        if (error) {
            showToast(error.message, 'error');
        } else if (view === 'signUp') {
            showToast('Check your email for the confirmation link!', 'success');
            setView('signIn');
        }
        setLoading(false);
    };
    
    const handlePasswordRecoveryRequest = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        // Use signInWithOtp to send a code instead of a magic link
        const { error } = await supabase.auth.signInWithOtp({ email });
        setLoading(false);
        if (error) {
            showToast(error.message, 'error');
        } else {
            showToast('A 6-digit code has been sent to your email.', 'success');
            setView('verifyOtp');
        }
    };
    
    const handleOtpPasswordReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password.length < 6) {
            showToast('Password must be at least 6 characters long.', 'error');
            return;
        }
        if (password !== confirmPassword) {
            showToast('Passwords do not match.', 'error');
            return;
        }
        setLoading(true);
        // Step 1: Verify the OTP, which will sign the user in temporarily
        const { error: otpError } = await supabase.auth.verifyOtp({
            email,
            token: otp,
            type: 'email' // Use 'email' type for OTP sign-in verification
        });

        if (otpError) {
            showToast(otpError.message, 'error');
            setLoading(false);
            return;
        }
        
        // Step 2: If OTP is valid, the user is now authenticated, so we can update their password
        const { error: updateError } = await supabase.auth.updateUser({ password });
        
        if (updateError) {
            showToast(updateError.message, 'error');
            setLoading(false);
        } else {
            showToast('Password updated successfully! Please sign in.', 'success');
            // Step 3: Sign the user out for security
            await supabase.auth.signOut();
            setView('signIn');
            setEmail(''); setPassword(''); setOtp(''); setConfirmPassword('');
        }
        setLoading(false);
    };
    
    if (view === 'verifyOtp') {
        return (
            <AuthWrapper>
                <h2 className="text-2xl font-semibold text-center text-foreground mb-2">Reset Password</h2>
                <p className="text-center text-muted-foreground mb-8">
                    Enter the 6-digit code sent to <strong>{email}</strong> and set your new password.
                </p>
                 <form onSubmit={handleOtpPasswordReset} className="space-y-4">
                    <input
                        type="text"
                        placeholder="6-digit code"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                        disabled={loading}
                    />
                    <input
                        type="password"
                        placeholder="New Password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                        disabled={loading}
                    />
                     <input
                        type="password"
                        placeholder="Confirm New Password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                        disabled={loading}
                    />
                    <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors duration-300 disabled:opacity-50 flex items-center justify-center active:scale-95">
                        {loading ? <Icon name="loader" className="h-6 w-6"/> : 'Reset Password'}
                    </button>
                </form>
                <div className="text-center mt-6">
                    <button onClick={() => setView('signIn')} className="text-sm text-primary hover:underline">
                        Back to Sign In
                    </button>
                </div>
            </AuthWrapper>
        );
    }
    
    if (view === 'forgotPassword') {
        return (
            <AuthWrapper>
                <h2 className="text-2xl font-semibold text-center text-foreground mb-2">Reset Password</h2>
                <p className="text-center text-muted-foreground mb-8">Enter your email to receive a 6-digit code.</p>
                <form onSubmit={handlePasswordRecoveryRequest} className="space-y-6">
                    <div>
                        <input
                            type="email"
                            placeholder="Email address"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                            required
                            disabled={loading}
                        />
                    </div>
                    <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors duration-300 disabled:opacity-50 flex items-center justify-center active:scale-95">
                        {loading ? <Icon name="loader" className="h-6 w-6"/> : 'Send Code'}
                    </button>
                </form>
                <div className="text-center mt-6">
                    <button onClick={() => setView('signIn')} className="text-sm text-primary hover:underline">
                        Back to Sign In
                    </button>
                </div>
            </AuthWrapper>
        );
    }

    return (
        <AuthWrapper>
            <h2 className="text-2xl font-semibold text-center text-foreground mb-2">{view === 'signUp' ? 'Create Account' : 'Welcome Back!'}</h2>
            <p className="text-center text-muted-foreground mb-8">{view === 'signUp' ? 'Start tracking your favorite shows.' : 'Sign in to continue.'}</p>
            <form onSubmit={handleAuth} className="space-y-6">
                <div>
                    <input
                        type="email"
                        placeholder="Email address"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className="w-full px-4 py-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                        required
                        disabled={loading}
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
                        disabled={loading}
                    />
                </div>
                 <div className="text-right text-sm">
                    <button type="button" onClick={() => setView('forgotPassword')} className="text-primary hover:underline font-medium">
                        Forgot Password?
                    </button>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-colors duration-300 disabled:opacity-50 flex items-center justify-center active:scale-95">
                    {loading ? <Icon name="loader" className="h-6 w-6"/> : (view === 'signUp' ? 'Sign Up' : 'Sign In')}
                </button>
            </form>
            <div className="text-center mt-6">
                <button onClick={() => setView(view === 'signUp' ? 'signIn' : 'signUp')} className="text-sm text-primary hover:underline">
                    {view === 'signUp' ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
                </button>
            </div>
        </AuthWrapper>
    );
};