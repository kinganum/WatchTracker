import React from 'react';
import { useAppContext } from '../../contexts/AppContext';
import { Icon } from '../ui/Icons';

export const AiChatButton: React.FC = () => {
    const { setIsAiChatOpen, isOnline } = useAppContext();

    if (!isOnline) {
        return (
            <div 
                className="fixed bottom-6 right-6 z-40 bg-gray-700 text-white rounded-full p-4 shadow-lg flex items-center gap-2 cursor-not-allowed"
                title="AI Chat is unavailable offline"
            >
                <Icon name="sparkles" className="h-8 w-8" />
                <span className="font-semibold hidden sm:inline">Offline</span>
            </div>
        );
    }

    return (
        <button
            onClick={() => setIsAiChatOpen(true)}
            className="fixed bottom-6 right-6 z-40 bg-black text-white rounded-full p-4 shadow-lg hover:bg-gray-800 transition-all duration-300 transform hover:scale-110 active:scale-100"
            aria-label="Open AI Chat"
            title="Open AI Discovery Chat"
        >
            <Icon name="sparkles" className="h-8 w-8" />
        </button>
    );
};
