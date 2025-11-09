import React, { useState } from 'react';
import { NewWatchlistItem, ItemType, SubType, Status, Language, ReleaseType } from '../../types';
import { useAppContext } from '../../contexts/AppContext';
import { TYPE_OPTIONS, SUB_TYPE_OPTIONS, STATUS_OPTIONS, LANGUAGE_OPTIONS, RELEASE_TYPE_OPTIONS } from '../../constants';
import { Icon } from '../ui/Icons';
import { FormInput } from '../ui/FormInput';
import { FormSelect } from '../ui/FormSelect';
import { formatTitle } from '../../utils/textFormatters';

export const ManualPasteForm = () => {
    const { addItem, setView } = useAppContext();
    const [formData, setFormData] = useState<NewWatchlistItem>({ title: '', type: ItemType.TV_SERIES, sub_type: SubType.ANIME, status: Status.WATCH, language: Language.SUB, release_type: ReleaseType.NEW });
    const [loading, setLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let finalValue: any = value;

        if (name === 'season' || name === 'episode' || name === 'part') {
            finalValue = value ? parseInt(value, 10) : undefined;
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
        if (!formData.title) return;
        setLoading(true);
        const newId = await addItem(formData);
        if (newId) {
            setFormData({ title: '', type: TYPE_OPTIONS[0], sub_type: SubType.ANIME, status: STATUS_OPTIONS[0], language: Language.SUB, release_type: ReleaseType.NEW });
            setView('watchlist');
        }
        setLoading(false);
    };

    return (
        <div className="bg-card p-6 rounded-2xl shadow-md border border-primary/20 focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-ring/70 transition-all">
            <div className="flex items-center mb-4">
                <Icon name="plus" className="h-6 w-6 text-primary" />
                <h3 className="text-xl font-bold ml-2 text-foreground">Manual Paste</h3>
            </div>
            <p className="text-muted-foreground mb-6">Add items individually with full control over each field</p>
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput label="Title" name="title" value={formData.title} onChange={handleChange} onBlur={handleBlur} required placeholder="Enter title..."/>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormSelect label="Type" name="type" value={formData.type} onChange={handleChange} options={TYPE_OPTIONS}/>
                    <FormSelect label="Sub Type" name="sub_type" value={formData.sub_type} onChange={handleChange} options={SUB_TYPE_OPTIONS}/>
                    <FormSelect label="Status" name="status" value={formData.status} onChange={handleChange} options={STATUS_OPTIONS}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <FormInput label="Season (optional)" name="season" type="number" inputMode="numeric" value={formData.season || ''} onChange={handleChange}/>
                    <FormInput label="Episode (optional)" name="episode" type="number" inputMode="numeric" value={formData.episode || ''} onChange={handleChange}/>
                    <FormInput label="Part (optional)" name="part" type="number" inputMode="numeric" value={formData.part || ''} onChange={handleChange}/>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <FormSelect label="Language" name="language" value={formData.language} onChange={handleChange} options={LANGUAGE_OPTIONS}/>
                    <FormSelect label="Release Type" name="release_type" value={formData.release_type} onChange={handleChange} options={RELEASE_TYPE_OPTIONS}/>
                </div>
                <button type="submit" disabled={loading} className="w-full bg-primary text-primary-foreground font-bold py-3 px-4 rounded-lg hover:bg-primary/90 transition-all duration-300 flex items-center justify-center disabled:opacity-50 active:scale-95">
                    {loading ? <Icon name="loader" className="h-6 w-6" /> : "Add to Watchlist"}
                </button>
            </form>
        </div>
    );
};