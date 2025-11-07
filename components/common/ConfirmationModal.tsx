import React from 'react';

export const ConfirmationModal: React.FC<{
    title: string;
    message: string;
    onConfirm: () => void;
    onClose: () => void;
}> = ({ title, message, onConfirm, onClose }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-xl shadow-lg p-6 w-full max-w-sm">
                <h2 className="text-xl font-bold mb-4">{title}</h2>
                <p className="text-muted-foreground mb-6">{message}</p>
                <div className="flex justify-end space-x-3">
                    <button onClick={onClose} className="px-5 py-2.5 rounded-lg bg-secondary text-secondary-foreground hover:bg-secondary/80 font-semibold active:scale-95">
                        Cancel
                    </button>
                    <button 
                        onClick={() => {
                            onConfirm();
                            onClose();
                        }} 
                        className="px-5 py-2.5 rounded-lg bg-destructive text-destructive-foreground hover:bg-destructive/90 font-semibold active:scale-95"
                    >
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
};
