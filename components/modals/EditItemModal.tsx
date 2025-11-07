import React, { useState, useEffect } from 'react';
import { WatchlistItem } from '../../types';
import { useAppContext, formatTitle } from '../../contexts/AppContext';
import { TYPE_OPTIONS, SUB_TYPE_OPTIONS, STATUS_OPTIONS, LANGUAGE_OPTIONS, RELEASE_TYPE_OPTIONS } from '../../constants';
import { Icon } from '../ui/Icons';
import { FormInput } from '../ui/FormInput';
import { FormSelect } from '../ui/FormSelect';

export const EditItemModal = () => {
    const { editingItem, setEditingItem, updateItem, setHighlightedIds, setScrollToId } = useAppContext();
    const [formData, setFormData] = useState<Partial<WatchlistItem>>({});
    const [isSaving, setIsSaving] = useState(false);
    
    useEffect(() => {
        if (editingItem) {
            setFormData(editingItem);
        }
    }, [editingItem]);
    
    if (!editingItem) return null;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let finalValue: any = value;

        if (name === 'season' || name === 'episode' || name === 'part') {
            finalValue = value ? parseInt(value, 10) : null;
        }
        
        setFormData(prev => ({ ...prev, [name]: finalValue }));
    };

    const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        if (name === 'title') {
            setFormData(prev => ({ ...prev, title: formatTitle(value) }));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);
        const success = await updateItem(
            editingItem.id, 
            formData, 
            { successMessage: '✅ Changes saved successfully!' }
        );
        setIsSaving(false);

        if (success) {
            setEditingItem(null); // Close modal
            setHighlightedIds(current => [...current, editingItem.id]); // Trigger highlight
            setScrollToId(editingItem.id); // Trigger scroll
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-lg p-6 w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6 flex-shrink-0">
                    <h2 className="text-2xl font-bold">Edit Item</h2>
                    <button onClick={() => setEditingItem(null)} disabled={isSaving} className="p-1 rounded-full hover:bg-accent disabled:opacity-50">
                        <Icon name="x" className="h-6 w-6"/>
                    </button>
                </div>
                <div className="overflow-y-auto pr-2">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <FormInput label="Title" name="title" value={formData.title || ''} onChange={handleChange} onBlur={handleBlur} required disabled={isSaving} />
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormSelect label="Type" name="type" value={formData.type} onChange={handleChange} options={TYPE_OPTIONS} disabled={isSaving} />
                            <FormSelect label="Sub Type" name="sub_type" value={formData.sub_type || ''} onChange={handleChange} options={[{label: 'None', value: ''}, ...SUB_TYPE_OPTIONS]} disabled={isSaving} />
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormSelect label="Status" name="status" value={formData.status} onChange={handleChange} options={STATUS_OPTIONS} disabled={isSaving} />
                            <FormSelect label="Language" name="language" value={formData.language || ''} onChange={handleChange} options={LANGUAGE_OPTIONS} disabled={isSaving} />
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                            <FormInput label="Season" name="season" type="number" inputMode="numeric" value={formData.season || ''} onChange={handleChange} disabled={isSaving} />
                            <FormInput label="Episode" name="episode" type="number" inputMode="numeric" value={formData.episode || ''} onChange={handleChange} disabled={isSaving} />
                            <FormInput label="Part" name="part" type="number" inputMode="numeric" value={formData.part || ''} onChange={handleChange} disabled={isSaving} />
                        </div>
                        <FormSelect label="Release Type" name="release_type" value={formData.release_type || ''} onChange={handleChange} options={RELEASE_TYPE_OPTIONS} disabled={isSaving} />
                        <div className="flex justify-end space-x-3 pt-4">
                            <button type="button" onClick={() => setEditingItem(null)} disabled={isSaving} className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold active:scale-95 disabled:opacity-50">Cancel</button>
                            <button type="submit" disabled={isSaving} className="px-5 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 font-semibold active:scale-95 w-36 flex justify-center items-center disabled:opacity-50">
                                {isSaving ? <Icon name="loader" className="h-5 w-5"/> : "Save Changes"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};