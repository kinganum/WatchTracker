import React, { useState } from 'react';
import { Status } from '../../types';
import { STATUS_OPTIONS } from '../../constants';
import { useAppContext } from '../../contexts/AppContext';
import { Icon } from '../ui/Icons';

export const DeleteByCategoryModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { watchlist, deleteMultipleItems, setConfirmation, showToast } = useAppContext();
    const [deleteCategory, setDeleteCategory] = useState<Status | 'ALL'>(Status.COMPLETED);
    const [confirmText, setConfirmText] = useState('');

    const handleDelete = () => {
        if (deleteCategory === 'ALL') {
            if (confirmText.toLowerCase() !== 'delete') {
                showToast('Please type "Delete" to confirm.', 'error');
                return;
            }
            setConfirmation({
                title: 'Delete All Items',
                message: `Are you sure you want to delete ALL ${watchlist.length} items? This action cannot be undone.`,
                onConfirm: () => {
                    const ids = watchlist.map(item => item.id);
                    deleteMultipleItems(ids);
                    onClose();
                }
            });
        } else {
            const itemsToDelete = watchlist.filter(item => item.status === deleteCategory);
            if (itemsToDelete.length === 0) {
                showToast(`No items with status "${deleteCategory}" to delete.`, 'error');
                return;
            }
            setConfirmation({
                title: `Delete ${deleteCategory} Items`,
                message: `Are you sure you want to delete ${itemsToDelete.length} item(s) with status "${deleteCategory}"?`,
                onConfirm: () => {
                    const ids = itemsToDelete.map(item => item.id);
                    deleteMultipleItems(ids);
                    onClose();
                }
            });
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-lg p-6 w-full max-w-md">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-bold">Delete by Category</h2>
                    <button onClick={onClose} className="p-1 rounded-full hover:bg-accent">
                        <Icon name="x" className="h-6 w-6"/>
                    </button>
                </div>
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-muted-foreground mb-1.5">Select a category to delete</label>
                        <select
                            value={deleteCategory}
                            onChange={e => {
                                setDeleteCategory(e.target.value as Status | 'ALL');
                                setConfirmText('');
                            }}
                            className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                            <option value="ALL">All Items</option>
                            {STATUS_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                    </div>

                    {deleteCategory === 'ALL' && (
                        <div>
                             <p className="text-sm text-red-600 mb-2">This will permanently delete all {watchlist.length} items. To proceed, type "Delete" below.</p>
                            <input
                                type="text"
                                value={confirmText}
                                onChange={e => setConfirmText(e.target.value)}
                                placeholder='Type "Delete" to confirm'
                                className="w-full px-3 py-2 rounded-lg border border-input bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-destructive"
                            />
                        </div>
                    )}

                    <button
                        onClick={handleDelete}
                        disabled={(deleteCategory === 'ALL' && confirmText.toLowerCase() !== 'delete')}
                        className="w-full px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground font-semibold hover:bg-destructive/90 disabled:bg-gray-400 disabled:cursor-not-allowed active:scale-95"
                    >
                        Delete
                    </button>
                </div>
            </div>
        </div>
    );
};