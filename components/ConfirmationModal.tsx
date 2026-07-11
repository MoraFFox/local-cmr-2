import React from 'react';

interface ConfirmationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title: string;
    message: string;
    isConfirming?: boolean;
}

const ConfirmationModal: React.FC<ConfirmationModalProps> = ({ isOpen, onClose, onConfirm, title, message, isConfirming = false }) => {
    if (!isOpen) {
        return null;
    }

    return (
        <div 
            className="fixed inset-0 bg-black bg-opacity-60 dark:bg-opacity-80 z-50 flex justify-center items-center transition-opacity duration-300"
            aria-labelledby="modal-title"
            role="dialog"
            aria-modal="true"
            onClick={onClose}
        >
            <div
                className="bg-cream dark:bg-espresso-light rounded-2xl shadow-xl p-6 sm:p-8 w-full max-w-md m-4 transform transition-all duration-300 scale-95 opacity-0 animate-fade-in-scale"
                onClick={(e) => e.stopPropagation()}
            >
                <h2 id="modal-title" className="text-xl font-bold text-ink dark:text-cream">{title}</h2>
                <p className="mt-2 text-latte dark:text-cream/70">{message}</p>
                <div className="mt-8 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        disabled={isConfirming}
                        className="px-5 py-2.5 text-sm font-semibold text-ink dark:text-cream bg-cream dark:bg-espresso-light border border-hairline rounded-lg hover:bg-cream-2 dark:hover:bg-espresso-light/50 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary/30 disabled:opacity-50 transform active:scale-95"
                    >
                        No
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isConfirming}
                        className="px-5 py-2.5 text-sm font-semibold text-white bg-ember-600 rounded-lg hover:bg-ember-700 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-ember-500 disabled:opacity-50 disabled:cursor-wait transform active:scale-95"
                    >
                        {isConfirming ? 'Deleting...' : 'Yes, Delete'}
                    </button>
                </div>
            </div>
            <style>{`
                @keyframes fade-in-scale {
                    from { transform: scale(0.95); opacity: 0; }
                    to { transform: scale(1); opacity: 1; }
                }
                .animate-fade-in-scale {
                    animation: fade-in-scale 0.2s ease-out forwards;
                }
            `}</style>
        </div>
    );
};

export default ConfirmationModal;