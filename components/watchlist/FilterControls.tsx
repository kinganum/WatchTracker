import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { TYPE_OPTIONS, SUB_TYPE_OPTIONS, STATUS_OPTIONS, RELEASE_TYPE_OPTIONS } from '../../constants';
import { Icon } from '../ui/Icons';

const FilterSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { options: string[], defaultLabel: string, counts: { [key: string]: number } }> = ({ options, defaultLabel, counts, ...props}) => (
    <select {...props} className="w-full md:w-auto px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent focus:outline-none">
        <option value="">{defaultLabel} ({counts.ALL || 0})</option>
        {options.map(opt => <option key={opt} value={opt}>{opt} ({counts[opt] || 0})</option>)}
    </select>
);

export const FilterControls: React.FC<{
    filter: any, setFilter: (f: any) => void,
    sortBy: string, setSortBy: (s: string) => void,
    clearFiltersAndSort: () => void,
    multiSelect: boolean, setMultiSelect: (b: boolean) => void,
    selectedItems: string[], setSelectedItems: (s: string[]) => void,
    setShowDeleteModal: (b: boolean) => void,
    optionCounts: any,
}> = ({ filter, setFilter, sortBy, setSortBy, clearFiltersAndSort, multiSelect, setMultiSelect, selectedItems, setSelectedItems, setShowDeleteModal, optionCounts }) => {
    const { deleteMultipleItems, setConfirmation } = useAppContext();
    const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFilter((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
    };
    
    const handleDeleteSelected = () => {
        if (selectedItems.length > 0) {
            setConfirmation({
                title: 'Delete Selected Items',
                message: `Are you sure you want to delete ${selectedItems.length} selected item(s)? This action cannot be undone.`,
                onConfirm: () => {
                    deleteMultipleItems(selectedItems);
                    setSelectedItems([]);
                    setMultiSelect(false);
                }
            });
        }
    }

    const toggleMultiSelect = () => {
        if (multiSelect) {
            // If turning multi-select off, clear selections
            setSelectedItems([]);
        }
        setMultiSelect(!multiSelect);
    };

    return (
         <div className="space-y-4 bg-card p-4 rounded-xl">
            <input type="text" name="search" placeholder="Search your watchlist..." value={filter.search} onChange={handleFilterChange} className="w-full p-3 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"/>
            <div className="flex flex-col md:flex-row md:flex-wrap gap-2 items-center">
                 <FilterSelect name="type" value={filter.type} onChange={handleFilterChange} options={TYPE_OPTIONS} defaultLabel="All Types" counts={optionCounts.type} />
                 <FilterSelect name="sub_type" value={filter.sub_type} onChange={handleFilterChange} options={SUB_TYPE_OPTIONS} defaultLabel="All Sub Types" counts={optionCounts.sub_type} />
                 <FilterSelect name="status" value={filter.status} onChange={handleFilterChange} options={STATUS_OPTIONS} defaultLabel="All Status" counts={optionCounts.status} />
                 <FilterSelect name="release" value={filter.release} onChange={handleFilterChange} options={RELEASE_TYPE_OPTIONS} defaultLabel="All Releases" counts={optionCounts.release} />
                 <select
                    name="sort"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className="w-full md:w-auto px-4 py-2 text-sm font-medium text-foreground bg-background border border-border rounded-lg hover:bg-accent focus:outline-none"
                >
                    <option value="created_at_desc">Date Added (Newest)</option>
                    <option value="updated_at_desc">Last Updated (Newest)</option>
                    <option value="title_asc">Title (A-Z)</option>
                    <option value="title_desc">Title (Z-A)</option>
                </select>
                 <button onClick={clearFiltersAndSort} className="w-full md:w-auto px-4 py-2 text-sm font-medium text-muted-foreground bg-background border border-border rounded-lg hover:bg-accent">Clear Filters</button>
                 <div className="hidden md:block flex-grow"/>
                 <div className="flex gap-2 w-full md:w-auto pt-2 md:pt-0 border-t border-border md:border-none">
                    <button onClick={toggleMultiSelect} className={`flex-grow md:flex-grow-0 px-4 py-2 text-sm font-medium rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed ${multiSelect ? 'bg-primary text-primary-foreground border-primary' : 'bg-background border-border text-foreground'}`}>
                        Multi Select
                    </button>
                    {multiSelect && selectedItems.length > 0 ? (
                        <button onClick={handleDeleteSelected} className="flex-grow md:flex-grow-0 px-4 py-2 text-sm font-medium text-white bg-red-500 border border-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 disabled:cursor-not-allowed">
                            Delete ({selectedItems.length})
                        </button>
                    ) : (
                        <button onClick={() => setShowDeleteModal(true)} className="flex-grow md:flex-grow-0 flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-100 border border-red-200 rounded-lg hover:bg-red-200 disabled:opacity-50 disabled:cursor-not-allowed">
                            <Icon name="trash" className="h-4 w-4"/> Delete by Category
                        </button>
                    )}
                 </div>
            </div>
         </div>
    );
};