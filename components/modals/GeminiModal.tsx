import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { getGeminiInsights, Recommendation, ReleaseInfoResponse } from '../../services/geminiService';
import { Icon } from '../ui/Icons';

// --- Sub-components for the Modal ---

const RecommendationCard: React.FC<{ item: Recommendation; onCopy: (title: string) => void }> = ({ item, onCopy }) => {
    const countLabel = item.item_type === 'TV Series' ? 'Seasons' : 'Parts';
    const castLabel = item.sub_type === 'Anime' ? 'Characters' : 'Cast';
    
    return (
     <div className="p-3 bg-background rounded-lg border border-border">
        <div className="flex items-start justify-between gap-2 mb-2">
            <p className="font-semibold text-foreground flex-grow">{item.title}</p>
            <button 
                onClick={() => onCopy(item.title)}
                title={`Copy title: ${item.title}`}
                className="flex-shrink-0 p-2 -m-2 rounded-full text-muted-foreground hover:bg-primary/10 hover:text-primary active:scale-95 transition-all">
                <Icon name="copy" className="h-4 w-4" />
            </button>
        </div>
        <div className="space-y-2 text-sm">
            <p className="text-muted-foreground italic">"{item.description}"</p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="font-semibold">Genre: {item.genre}</span>
                <span className="font-semibold">Language: {item.sub_type}</span>
            </div>
             <div className="text-xs">
                <span className="font-semibold">Dub: {item.dub || 'N/A'}</span>
            </div>
            {item.count > 0 && (
                <div className="text-xs">
                    <span className="font-semibold">{countLabel}: {item.count}</span>
                </div>
            )}
             {item.cast && item.cast.length > 0 && (
                <div>
                    <p className="font-semibold text-xs mt-1">{castLabel}:</p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1">
                        {item.cast.map(member => (
                            <div key={member} className="flex items-center gap-1.5 bg-secondary px-2 py-0.5 rounded-full">
                                <Icon name="person" className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs">{member}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
            {item.platform && item.platform !== 'N/A' && (
                <div className="text-xs">
                    <span className="font-semibold">Platform: {item.platform}</span>
                </div>
            )}
        </div>
    </div>
)};

const ReleaseInfoTable: React.FC<{ data: Record<string, string> }> = ({ data }) => (
    <div className="p-3 bg-background rounded-lg border border-border font-mono text-sm text-foreground">
        {Object.entries(data).map(([key, value]) => {
            // FIX: Coerce value to string before calling toLowerCase to prevent type errors.
            if (!value || String(value).toLowerCase() === 'n/a') return null;
            return (
                 <div key={key} className="flex">
                    <span className="w-28 flex-shrink-0 text-muted-foreground">{key}:</span>
                    <span className="flex-grow">{value}</span>
                </div>
            )
        })}
    </div>
);


// --- Main Modal Component ---

export const GeminiModal = () => {
    const { geminiItem, setGeminiItem, showToast, isOnline } = useAppContext();
    const [activeTab, setActiveTab] = useState<'release' | 'recommendations'>('release');
    
    const [releaseInfo, setReleaseInfo] = useState<ReleaseInfoResponse | null>(null);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const parsedReleaseInfo = useMemo(() => {
        if (!releaseInfo?.text) return null;
        const lines = releaseInfo.text.split('\n').filter(line => line.includes(':'));
        const info: Record<string, string> = {};
        lines.forEach(line => {
            const parts = line.split(':');
            const key = parts[0].trim();
            const value = parts.slice(1).join(':').trim();
            if (key && value) {
                info[key] = value;
            }
        });
        return info;
    }, [releaseInfo]);

    const fetchData = useCallback(async (mode: 'release' | 'recommendations') => {
        if (!geminiItem) return;

        if (!isOnline) {
            setError("You are currently offline. Please connect to the internet to use the Discovery Hub.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError('');

        const result = await getGeminiInsights(geminiItem, mode);
        
        if (typeof result === 'string') {
            setError(result);
        } else if (mode === 'release' && 'text' in result) {
            setReleaseInfo(result);
        } else if (mode === 'recommendations' && Array.isArray(result)) {
            setRecommendations(result);
        } else {
            setError('Received unexpected data format.');
        }

        setLoading(false);
    }, [geminiItem, isOnline]);

    useEffect(() => {
        if (geminiItem) {
            setActiveTab('release');
            setReleaseInfo(null);
            setRecommendations([]);
            setError('');
            fetchData('release');
        }
    }, [geminiItem, fetchData]);

    const handleTabClick = (tab: 'release' | 'recommendations') => {
        setActiveTab(tab);
        if (tab === 'recommendations' && recommendations.length === 0 && !error) {
            fetchData('recommendations');
        }
        if (tab === 'release' && !releaseInfo && !error) {
            fetchData('release');
        }
    };

    const handleCopyTitle = (title: string) => {
        navigator.clipboard.writeText(title).then(() => {
            showToast(`Copied "${title}" to clipboard!`, 'success');
        }).catch(() => {
            showToast('Failed to copy title.', 'error');
        });
    };

    const handleClose = () => setGeminiItem(null);

    if (!geminiItem) return null;

    const promptText = activeTab === 'release' 
        ? `Asking Gemini for the release status of "${geminiItem.title}"...`
        : `Asking Gemini for recommendations similar to "${geminiItem.title}"...`;
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <Icon name="sparkles" className="h-6 w-6 text-primary"/>
                        <h2 className="text-xl font-bold truncate" title={`Ask Gemini about ${geminiItem.title}`}>Discovery Hub</h2>
                    </div>
                    <button onClick={handleClose} className="p-1 rounded-full hover:bg-accent disabled:opacity-50">
                        <Icon name="x" className="h-6 w-6"/>
                    </button>
                </div>
                
                <div className="border-b border-border flex-shrink-0">
                    <div className="flex space-x-4">
                        <button onClick={() => handleTabClick('release')} className={`py-2 px-1 border-b-2 font-semibold ${activeTab === 'release' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Release Info</button>
                        <button onClick={() => handleTabClick('recommendations')} className={`py-2 px-1 border-b-2 font-semibold ${activeTab === 'recommendations' ? 'border-primary text-primary' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>Recommendations</button>
                    </div>
                </div>

                <div className="overflow-y-auto pr-2 space-y-4 py-4">
                    <div className="bg-secondary p-3 rounded-lg">
                        <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                            PROMPT
                            {loading && <Icon name="loader" className="h-4 w-4" />}
                        </p>
                        <p className="text-foreground italic mt-1 text-sm">{promptText}</p>
                    </div>
                    
                    <div className="bg-secondary p-3 rounded-lg min-h-[200px] flex flex-col">
                        <p className="text-sm font-medium text-muted-foreground mb-2">RESPONSE</p>
                        <div className="flex-grow">
                            {error && <p className="text-red-500">{error}</p>}

                            {!loading && !error && activeTab === 'release' && parsedReleaseInfo && (
                                <div className="space-y-3">
                                    <ReleaseInfoTable data={parsedReleaseInfo} />
                                    {releaseInfo?.sources && releaseInfo.sources.length > 0 && (
                                        <div>
                                            <h4 className="text-xs font-semibold text-muted-foreground uppercase mb-1.5">Sources</h4>
                                            <ul className="space-y-1">
                                                {releaseInfo.sources.map((source, index) => (
                                                    <li key={index}>
                                                        <a href={source.web?.uri} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline truncate block">
                                                           {index + 1}. {source.web?.title || source.web?.uri}
                                                        </a>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                </div>
                            )}

                            {!loading && !error && activeTab === 'recommendations' && (
                                <div className="space-y-2">
                                    {recommendations.map((rec) => <RecommendationCard key={rec.title} item={rec} onCopy={handleCopyTitle} />)}
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                 <div className="flex justify-end pt-4 mt-auto flex-shrink-0">
                    <button type="button" onClick={handleClose} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold active:scale-95">Close</button>
                </div>
            </div>
        </div>
    );
};