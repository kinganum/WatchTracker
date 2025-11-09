import React from 'react';
import { NewWatchlistItem } from '../../types';
import { Icon } from '../ui/Icons';

type ParsedResult = { toAdd: NewWatchlistItem[], duplicates: NewWatchlistItem[], unparsable: string[] };

const PreviewItem: React.FC<{item: NewWatchlistItem}> = ({ item }) => {
    const details = [
        item.type, item.sub_type, item.status, item.language,
        item.season ? `S${item.season}` : '',
        item.episode ? `E${item.episode}` : '',
        item.part ? `P${item.part}` : ''
    ].filter(Boolean).join(' · ');
    return (
         <div className="p-3 bg-background rounded-md border border-border">
            <p className="font-semibold text-foreground truncate">{item.title}</p>
            <p className="text-sm text-muted-foreground truncate">{details}</p>
        </div>
    )
};

export const SmartPastePreviewModal: React.FC<{
    result: ParsedResult;
    onClose: () => void;
    onConfirm: () => void;
}> = ({ result, onClose, onConfirm }) => {
    
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-lg p-6 w-full max-w-2xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-4 flex-shrink-0">
                    <h2 className="text-2xl font-bold">Smart Paste Preview</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-accent">
                        <Icon name="x" className="h-6 w-6"/>
                    </button>
                </div>
                <div className="overflow-y-auto space-y-6 pr-2">
                    {result.toAdd.length > 0 && (
                        <section>
                            <h3 className="text-lg font-semibold mb-2 text-green-600">Items to Add ({result.toAdd.length})</h3>
                            <div className="space-y-2 max-h-48 overflow-y-auto pr-2">{result.toAdd.map((item, i) => <PreviewItem key={i} item={item} />)}</div>
                        </section>
                    )}
                     {result.duplicates.length > 0 && (
                        <section>
                            <h3 className="text-lg font-semibold mb-2 text-yellow-600">Duplicates Skipped ({result.duplicates.length})</h3>
                             <div className="space-y-2 max-h-48 overflow-y-auto pr-2">{result.duplicates.map((item, i) => <PreviewItem key={i} item={item} />)}</div>
                        </section>
                    )}
                     {result.unparsable.length > 0 && (
                        <section>
                            <h3 className="text-lg font-semibold mb-2 text-red-600">Could Not Parse ({result.unparsable.length})</h3>
                            <div className="space-y-2 text-sm text-muted-foreground bg-secondary p-3 rounded-md">
                                {result.unparsable.map((line, i) => <p key={i} className="truncate font-mono">"{line}"</p>)}
                            </div>
                        </section>
                    )}
                </div>
                 <div className="flex justify-end space-x-3 pt-6 mt-auto flex-shrink-0">
                    <button type="button" onClick={onClose} className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold active:scale-95">Cancel</button>
                    <button type="submit" onClick={onConfirm} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold active:scale-95">Confirm & Add</button>
                </div>
            </div>
        </div>
    );
}