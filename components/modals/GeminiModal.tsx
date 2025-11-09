import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { getGeminiInsights, Recommendation, ReleaseInfo, getMediaByPersonFromAi } from '../../services/geminiService';
import { Icon } from '../ui/Icons';
import { parseReleaseDate } from '../../utils/textFormatters';
import { MediaDetails } from '../../types';
import * as db from '../../services/db';

// --- Sub-components for the Modal ---

const RecommendationCard: React.FC<{ 
    item: Recommendation; 
    onCopy: (title: string) => void;
    onCastClick: (personName: string) => void;
}> = ({ item, onCopy, onCastClick }) => {
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
                <span className="font-semibold">Type: {item.item_type}</span>
                <span className="font-semibold">Sub Type: {item.sub_type}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
                <span className="font-semibold">Genre: {item.genre}</span>
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
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1">
                        {item.cast.map(member => (
                            <button 
                                key={member} 
                                onClick={() => onCastClick(member)}
                                className="flex items-center gap-1.5 bg-secondary px-2 py-0.5 rounded-full hover:bg-primary/20 focus:outline-none focus:ring-1 focus:ring-ring transition-colors"
                            >
                                <Icon name="person" className="h-3 w-3 text-muted-foreground" />
                                <span className="text-xs">{member}</span>
                            </button>
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

const ReleaseInfoDisplay: React.FC<{ data: ReleaseInfo }> = ({ data }) => {
    const computedStatus = useMemo(() => {
        const dateString = data.expectedDate || data.releaseDate;
        if (!dateString || dateString === 'N/A') {
            return data.status; // Fallback to AI status if no date
        }

        const releaseDate = parseReleaseDate(dateString);
        if (releaseDate) {
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            return releaseDate < today ? 'Released' : 'Unreleased';
        }

        return data.status; // Fallback if date is unparsable (e.g., "TBA")
    }, [data.expectedDate, data.releaseDate, data.status]);


    const fields: { label: string; value: string | undefined }[] = [
        { label: 'Name', value: data.name },
        { label: 'Status', value: computedStatus },
        { label: 'Release Date', value: data.releaseDate },
        { label: 'Expected Date', value: data.expectedDate },
        { label: 'Platform', value: data.platform },
    ];

    return (
        <div className="p-3 bg-background rounded-lg border border-border font-mono text-sm text-foreground space-y-1">
            {fields.map(({ label, value }) => {
                if (!value || String(value).toLowerCase() === 'n/a') {
                    return null;
                }
                return (
                    <div key={label} className="flex">
                        <span className="w-28 flex-shrink-0 text-muted-foreground">{label}:</span>
                        <span className="flex-grow">{value}</span>
                    </div>
                );
            })}
        </div>
    );
};

// --- Main Modal Component ---

type PreviousState = {
    title: string;
    recommendations: Recommendation[];
};

export const GeminiModal = () => {
    const { geminiItem, setGeminiItem, showToast, isOnline } = useAppContext();
    const [activeTab, setActiveTab] = useState<'release' | 'recommendations'>('release');
    
    // States for the currently displayed item's data
    const [releaseInfo, setReleaseInfo] = useState<ReleaseInfo | null>(null);
    const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
    
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [promptText, setPromptText] = useState('');
    const [previousState, setPreviousState] = useState<PreviousState | null>(null);

    const fetchData = useCallback(async (mode: 'release' | 'recommendations') => {
        if (!geminiItem) return;

        // Check component state first. If we already fetched for this item, don't do it again.
        if (mode === 'release' && releaseInfo) {
            setPromptText(`Displaying release info for "${geminiItem.title}".`);
            return;
        }
        if (mode === 'recommendations' && recommendations.length > 0 && !previousState) {
            setPromptText(`Displaying recommendations for "${geminiItem.title}".`);
            return;
        }

        setLoading(true);
        setError('');
        setPromptText(`Checking cache for "${geminiItem.title}"...`);

        const cachedEntry = await db.getDiscoveryFromCache(geminiItem.id);
        const cachedData = cachedEntry?.data?.[mode];

        if (cachedData) {
            if (mode === 'release') setReleaseInfo(cachedData as ReleaseInfo);
            if (mode === 'recommendations') setRecommendations(cachedData as Recommendation[]);
            setPromptText(`Displaying cached data for "${geminiItem.title}".`);
            setLoading(false);
            return;
        }

        if (!isOnline) {
            setError("You are offline and no cached data is available for this item.");
            setLoading(false);
            return;
        }

        setPromptText(mode === 'release' 
            ? `Asking Gemini for the release status of "${geminiItem.title}"...`
            : `Asking Gemini for recommendations similar to "${geminiItem.title}"...`
        );
        
        const result = await getGeminiInsights(geminiItem, mode);
        
        if (typeof result === 'string') {
            setError(result);
        } else {
            if (mode === 'release' && 'status' in result) {
                const data = result as ReleaseInfo;
                setReleaseInfo(data);
                await db.saveDiscoveryToCache(geminiItem.id, { release: data });
            } else if (mode === 'recommendations' && Array.isArray(result)) {
                const data = result as Recommendation[];
                setRecommendations(data);
                await db.saveDiscoveryToCache(geminiItem.id, { recommendations: data });
            } else {
                setError('Received unexpected data format.');
            }
        }
        setLoading(false);
    }, [geminiItem, isOnline, releaseInfo, recommendations, previousState]);

    // Effect to reset state when the item changes.
    useEffect(() => {
        if (geminiItem) {
            setActiveTab('release');
            setError('');
            setPreviousState(null);
            // Reset data when opening the modal for a new item
            setReleaseInfo(null);
            setRecommendations([]);
        }
    }, [geminiItem]);

    // Effect to fetch data when the item or active tab changes.
    useEffect(() => {
        if (geminiItem) {
            fetchData(activeTab);
        }
    }, [geminiItem, activeTab, fetchData]);

    const handleTabClick = (tab: 'release' | 'recommendations') => {
        setActiveTab(tab);
        setPreviousState(null);
    };

    const handleCopyTitle = (title: string) => {
        navigator.clipboard.writeText(title).then(() => {
            showToast(`Copied "${title}" to clipboard!`, 'success');
        }).catch(() => {
            showToast('Failed to copy title.', 'error');
        });
    };

    const handleCastClick = async (personName: string) => {
        if (!isOnline) {
            setError("You are offline. Cannot fetch new data.");
            return;
        }
        setLoading(true);
        setError('');
        setPromptText(`Finding media starring ${personName}...`);

        if (geminiItem) {
            setPreviousState({ title: geminiItem.title, recommendations });
        }

        const result = await getMediaByPersonFromAi(personName);
        if (typeof result === 'string') {
            setError(result);
        } else {
            const newRecommendations: Recommendation[] = (result as MediaDetails[]).map(d => ({
                title: d.name,
                description: `A ${d.genre} ${d.type.toLowerCase().includes('movie') ? 'movie' : 'series'}.`,
                genre: d.genre,
                sub_type: d.sub_type,
                cast: d.cast,
                platform: d.platform,
                dub: d.language.toLowerCase().includes('dub') ? 'Available' : 'Not Available',
                item_type: d.type.toLowerCase().includes('movie') ? 'Movie' : 'TV Series',
                count: d.count,
            }));
            setRecommendations(newRecommendations);
        }
        setLoading(false);
    };

    const handleBackClick = () => {
        if (previousState) {
            setRecommendations(previousState.recommendations);
            setPromptText(`Asking Gemini for recommendations similar to "${previousState.title}"...`);
            setPreviousState(null);
            setError('');
        }
    };

    const handleClose = () => setGeminiItem(null);

    if (!geminiItem) return null;
    
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
                        <div className="flex justify-between items-center">
                            <p className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                                PROMPT
                                {loading && <Icon name="loader" className="h-4 w-4" />}
                            </p>
                            {previousState && activeTab === 'recommendations' && (
                                <button onClick={handleBackClick} className="text-xs font-semibold text-primary hover:underline">
                                    &larr; Back to "{previousState.title}"
                                </button>
                            )}
                        </div>
                        <p className="text-foreground italic mt-1 text-sm">{promptText}</p>
                    </div>
                    
                    <div className="bg-secondary p-3 rounded-lg min-h-[200px] flex flex-col">
                        <p className="text-sm font-medium text-muted-foreground mb-2">RESPONSE</p>
                        <div className="flex-grow">
                            {error && <p className="text-red-500">{error}</p>}

                            {!loading && !error && activeTab === 'release' && releaseInfo && (
                                <div className="space-y-3">
                                    <ReleaseInfoDisplay data={releaseInfo} />
                                </div>
                            )}

                            {!loading && !error && activeTab === 'recommendations' && (
                                <div className="space-y-2">
                                    {recommendations.map((rec) => <RecommendationCard key={rec.title} item={rec} onCopy={handleCopyTitle} onCastClick={handleCastClick} />)}
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