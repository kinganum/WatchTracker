import React, { useState, useEffect, useRef } from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { ChatMessage, MediaDetails, NewWatchlistItem, ItemType, SubType, Status, Language, ReleaseType } from '../../types';
import { getMediaDetailsFromAi, getConversationalResponse, getSuggestionsFromAi, getMediaByPersonFromAi } from '../../services/geminiService';
import { Icon } from '../ui/Icons';
import { parseReleaseDate } from '../../utils/textFormatters';

// Sub-component to display formatted media details
const MediaDetailsDisplay: React.FC<{ 
    details: MediaDetails, 
    onAddToWatchlist: (details: MediaDetails) => Promise<boolean>, 
    onContinuityClick: (title: string) => void,
    onCastClick: (personName: string) => void,
}> = ({ details, onAddToWatchlist, onContinuityClick, onCastClick }) => {
    const [isAdded, setIsAdded] = useState(false);

    // Correctly display the type as "TV Series" if it's an anime.
    const displayType = details.type.toLowerCase().includes('anime') ? 'TV Series' : details.type;
    
    const fields: { label: string; value: string | string[] | undefined; isArray?: boolean; isClickable?: boolean; isCast?: boolean }[] = [
        { label: 'Name', value: details.name },
        { label: 'Type', value: displayType },
        { label: 'Sub Type', value: details.sub_type },
        details.type.includes('Movie') ? { label: 'Sequels', value: details.season_sequel } : { label: 'Season/Sequel', value: details.season_sequel },
        { label: 'Episode', value: details.episodes },
        { label: 'Part', value: details.part },
        { label: 'Genre', value: details.genre },
        { label: 'Cast', value: details.cast, isArray: true, isCast: true },
        { label: 'Release Date', value: details.release_date },
        { label: 'End Date', value: details.end_date },
        { label: 'Upcoming Date', value: details.upcoming_date },
        { label: 'Language', value: details.language },
        { label: 'Platform', value: details.platform },
        { label: 'Continuity', value: details.continuity, isClickable: true },
    ];

    const handleAddClick = async () => {
        setIsAdded(true); // Optimistically set state
        const success = await onAddToWatchlist(details);
        if (!success) {
            setIsAdded(false); // Revert state on failure
        }
    };

    return (
        <div className="mt-2 text-sm text-foreground space-y-1.5 border-t border-primary/20 pt-3">
            {fields.map(({ label, value, isArray, isClickable, isCast }) => {
                if (!value || value.length === 0 || value === 'N/A' || value === 'Unknown') return null;
                return (
                    <div key={label} className="grid grid-cols-3 gap-2 items-start">
                        <span className="font-semibold text-muted-foreground truncate">{label}:</span>
                        <div className="col-span-2">
                            {isArray && Array.isArray(value) ? (
                                isCast ? (
                                    <div className="flex flex-wrap gap-1.5">
                                        {value.map((item, index) => (
                                            <button 
                                                key={index} 
                                                onClick={() => onCastClick(item)}
                                                className="bg-secondary text-secondary-foreground px-2 py-0.5 rounded-md hover:bg-primary/20 transition-colors"
                                            >
                                                {item}
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <ul className="list-disc list-inside">
                                        {value.map((item, index) => <li key={index}>{item}</li>)}
                                    </ul>
                                )
                            ) : isClickable ? (
                                <button onClick={() => onContinuityClick(value as string)} className="text-left text-blue-600 hover:underline">
                                    {value as string}
                                </button>
                            ) : (
                                <span>{value as string}</span>
                            )}
                        </div>
                    </div>
                );
            })}
             <div className="pt-3">
                <button 
                    onClick={handleAddClick}
                    disabled={isAdded}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-all active:scale-95 disabled:bg-green-600 disabled:cursor-not-allowed"
                >
                    <Icon name={isAdded ? "check-circle" : "plus"} className="h-4 w-4" />
                    {isAdded ? 'Added & Navigating...' : 'Add to Watchlist'}
                </button>
            </div>
        </div>
    );
};

const initialMessages: ChatMessage[] = [
    { 
        role: 'model', 
        content: "Hi! What show are you curious about today? Ask me for details on any movie, series, or anime.",
    }
];

// Main Modal Component
export const AiChatModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
    const { isOnline, addItem, showToast, setView } = useAppContext();
    const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages, isLoading]);

    const sendMessage = async (messageText: string) => {
        if (!messageText.trim() || isLoading) return;

        if (!isOnline) {
            setMessages(prev => [...prev, { role: 'model', content: "The AI chat requires an internet connection. Please connect and try again." }]);
            return;
        }

        const userMessage: ChatMessage = { role: 'user', content: messageText };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        const history = messages
            .filter(m => m.role === 'user' || (m.role === 'model' && !m.mediaDetails && !m.mediaSuggestions))
            .slice(-4)
            .map(m => ({
                role: m.role,
                parts: [{ text: m.content }]
            }));
        
        const lowerCaseMessage = messageText.toLowerCase();
        
        const isSuggestionQuery = lowerCaseMessage.includes('suggest') || lowerCaseMessage.includes('recommend');
        const isPersonQuery = lowerCaseMessage.startsWith('find media starring');
        const isPlotQuery = lowerCaseMessage.includes('plot') || lowerCaseMessage.includes('story') || lowerCaseMessage.includes('summary');
        
        const isConversational =
            lowerCaseMessage.startsWith('who') ||
            lowerCaseMessage.startsWith('what') ||
            lowerCaseMessage.startsWith('where') ||
            lowerCaseMessage.startsWith('when') ||
            lowerCaseMessage.startsWith('why') ||
            lowerCaseMessage.startsWith('how') ||
            lowerCaseMessage.startsWith('tell me') ||
            lowerCaseMessage.startsWith('explain');

        try {
            if (isSuggestionQuery) {
                const result = await getSuggestionsFromAi(messageText);
                 if (typeof result === 'string') {
                    setMessages(prev => [...prev, { role: 'model', content: result }]);
                } else {
                    setMessages(prev => [...prev, { role: 'model', content: "Here are a few suggestions I found:", mediaSuggestions: result }]);
                }
            } else if (isPersonQuery) {
                const personName = messageText.substring('find media starring '.length);
                const result = await getMediaByPersonFromAi(personName);
                if (typeof result === 'string') {
                    setMessages(prev => [...prev, { role: 'model', content: result }]);
                } else {
                    setMessages(prev => [...prev, { role: 'model', content: `Here are some works from ${personName}:`, mediaSuggestions: result }]);
                }
            } else if (isPlotQuery) {
                const result = await getConversationalResponse(messageText, history as any);
                setMessages(prev => [...prev, { role: 'model', content: result }]);
            } else if (isConversational && messages.length > 2) { 
                const result = await getConversationalResponse(messageText, history as any);
                setMessages(prev => [...prev, { role: 'model', content: result }]);
            } else {
                const result = await getMediaDetailsFromAi(messageText, history as any);
                if (typeof result === 'string') {
                    setMessages(prev => [...prev, { role: 'model', content: result }]);
                } else {
                    setMessages(prev => [...prev, { 
                        role: 'model', 
                        content: "Here are the details I found:", 
                        mediaDetails: result,
                        promptSuggestions: [
                            `Suggest similar shows to ${result.name}`,
                            `Tell me more about the plot of ${result.name}`,
                        ]
                    }]);
                }
            }
        } catch (error) {
            console.error("Error in sendMessage:", error);
            setMessages(prev => [...prev, { role: 'model', content: "Sorry, an unexpected error occurred. Please try again." }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleFormSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        sendMessage(input);
    };

    const handleClearChat = () => {
        setMessages(initialMessages);
        showToast('Chat cleared!', 'success');
    };

    const handleAddToWatchlist = async (details: MediaDetails): Promise<boolean> => {
        const newItemType = details.type.toLowerCase().includes('movie')
            ? ItemType.MOVIES
            : ItemType.TV_SERIES;

        const matchedSubType = Object.values(SubType).find(
            st => st.toLowerCase() === details.sub_type.toLowerCase()
        );
        
        const seasonNumber = newItemType === ItemType.TV_SERIES ? 1 : undefined;

        let partNumber: number | undefined = undefined;
        // More robust parsing for part number
        if (details.part) {
            const partAsString = String(details.part);
            const partMatch = partAsString.match(/\d+/);
            if (partMatch && partMatch[0]) {
                const parsed = parseInt(partMatch[0], 10);
                if (!isNaN(parsed)) {
                    partNumber = parsed;
                }
            }
        }

        const languageText = details.language.toLowerCase();
        const detectedLanguage = (languageText.includes('sub') || languageText.includes('japanese')) ? Language.SUB : Language.DUB;
        
        let detectedReleaseType = ReleaseType.NEW;
        const releaseDate = parseReleaseDate(details.release_date);
        if (releaseDate) {
            const currentYear = new Date().getFullYear();
            if (releaseDate.getFullYear() < currentYear) {
                detectedReleaseType = ReleaseType.OLD;
            }
        }

        const newItem: NewWatchlistItem = {
            title: details.name,
            type: newItemType,
            sub_type: matchedSubType,
            status: Status.WATCH,
            season: seasonNumber,
            part: partNumber,
            language: detectedLanguage,
            release_type: detectedReleaseType,
        };

        const newId = await addItem(newItem);
        if (newId) {
            setTimeout(() => {
                onClose();
                setView('watchlist');
            }, 500);
            return true;
        }
        return false;
    };
    
    const handleCastClick = (personName: string) => {
        sendMessage(`Find media starring ${personName}`);
    };


    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl shadow-lg w-full max-w-2xl max-h-[85vh] flex flex-col transform transition-all duration-300 animate-fade-in-scale">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-border">
                    <div className="flex items-center gap-3">
                        <Icon name="sparkles" className="h-6 w-6 text-primary" />
                        <h2 className="text-xl font-bold">AI Discovery Chat</h2>
                    </div>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-accent">
                        <Icon name="x" className="h-6 w-6" />
                    </button>
                </div>

                {/* Chat Area */}
                <div className="flex-grow p-4 overflow-y-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div key={index} className="space-y-2">
                            <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-md p-3 rounded-2xl ${msg.role === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-secondary text-secondary-foreground rounded-bl-none'}`}>
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    {msg.mediaDetails && <MediaDetailsDisplay details={msg.mediaDetails} onAddToWatchlist={handleAddToWatchlist} onContinuityClick={sendMessage} onCastClick={handleCastClick} />}
                                    {msg.promptSuggestions && (
                                        <div className="mt-3 space-y-2">
                                            {msg.promptSuggestions.map((suggestion, i) => (
                                                <button
                                                    key={i}
                                                    onClick={() => sendMessage(suggestion)}
                                                    disabled={isLoading}
                                                    className="w-full text-left p-2.5 rounded-lg bg-background border border-border text-primary font-medium text-sm hover:bg-accent disabled:opacity-70 transition-colors"
                                                >
                                                    {suggestion}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                             {msg.mediaSuggestions && (
                                <div className="space-y-3">
                                    {msg.mediaSuggestions.map((suggestion, i) => (
                                         <div key={i} className="flex justify-start">
                                            <div className="max-w-md p-3 rounded-2xl bg-secondary text-secondary-foreground rounded-bl-none">
                                                 <MediaDetailsDisplay details={suggestion} onAddToWatchlist={handleAddToWatchlist} onContinuityClick={sendMessage} onCastClick={handleCastClick} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    ))}
                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="max-w-md p-3 rounded-2xl bg-secondary text-secondary-foreground rounded-bl-none flex items-center gap-2">
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse"></div>
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.2s]"></div>
                                <div className="w-2 h-2 bg-muted-foreground rounded-full animate-pulse [animation-delay:0.4s]"></div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 border-t border-border">
                    <form onSubmit={handleFormSubmit} className="flex items-center gap-3">
                        <button type="button" onClick={handleClearChat} title="Clear Chat" className="p-3 rounded-lg bg-black text-white hover:bg-gray-800 disabled:opacity-50 active:scale-95 transition-all">
                            <Icon name="refresh" className="h-5 w-5" />
                        </button>
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Ask about a movie, suggest similar..."
                            className="w-full flex-grow px-4 py-2.5 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                            disabled={isLoading}
                        />
                        <button type="submit" disabled={isLoading || !input.trim()} className="p-3 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 active:scale-95 transition-all">
                            <Icon name="send" className="h-5 w-5" />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
};