import React, { useState } from 'react';
import { NewWatchlistItem } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { parseSmartPasteText } from '../../utils/smartPasteParser';
import { Icon } from '../ui/Icons';
import { SmartPastePreviewModal } from '../modals/SmartPastePreviewModal';

type ParsedResult = { toAdd: NewWatchlistItem[], duplicates: NewWatchlistItem[], unparsable: string[] };

export const SmartPasteForm = () => {
    const { addMultipleItems, watchlist, showToast, setView } = useAppContext();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [preview, setPreview] = useState<ParsedResult | null>(null);
    
    const handleSubmit = async () => {
        if (!text.trim()) return;
        setLoading(true);
        try {
            const parsedResult = parseSmartPasteText(text, watchlist);
            if (parsedResult.toAdd.length === 0 && parsedResult.duplicates.length === 0 && parsedResult.unparsable.length === 0) {
                 showToast("Couldn't find any items to parse.", 'error');
            } else {
                 setPreview(parsedResult);
            }
        } catch (error) {
            console.error("Error parsing text:", error);
            showToast("An unexpected error occurred while parsing.", 'error');
        } finally {
            setLoading(false);
        }
    };
    
    const handleConfirmPreview = async () => {
        if (!preview || preview.toAdd.length === 0) {
            if (preview && preview.duplicates.length > 0) {
                 showToast(`Skipped ${preview.duplicates.length} duplicate(s).`, 'success');
            }
            setPreview(null);
            setText('');
            return;
        };

        await addMultipleItems(preview.toAdd);
        
        setText('');
        setPreview(null);
        setView('watchlist');
    };

    return (
        <>
            <div className="bg-card p-6 rounded-2xl shadow-md border border-primary/20 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring/70 transition-all">
                <div className="flex items-center mb-4">
                    <Icon name="sparkles" className="h-6 w-6 text-primary" />
                    <h3 className="text-xl font-bold ml-2 text-foreground">Smart Paste</h3>
                </div>
                <p className="text-muted-foreground mb-6">Paste multiple entries and let the new parser handle them</p>
                <div className="space-y-4">
                     <textarea
                        placeholder={"Anime continue old\none piece s1 e1 p1 series dub old\ndemon slayer movie"}
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-48 p-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                     <button onClick={handleSubmit} disabled={loading} className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 flex items-center justify-center disabled:opacity-50 active:scale-95">
                         {loading ? <Icon name="loader" className="h-6 w-6" /> : "Parse & Preview"}
                    </button>
                    <p className="text-xs text-muted-foreground text-center">Supports context headers (e.g. 'Anime Continue Old'), season, episode, language, status, and type detection.</p>
                </div>
            </div>
            {preview && (
                <SmartPastePreviewModal
                    result={preview}
                    onClose={() => setPreview(null)}
                    onConfirm={handleConfirmPreview}
                />
            )}
        </>
    );
};