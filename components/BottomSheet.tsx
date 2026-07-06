import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { XMarkIcon } from '@heroicons/react/24/outline';

interface BottomSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    maxHeight?: string;
    showHandle?: boolean;
    contentClassName?: string;
}

const BottomSheet: React.FC<BottomSheetProps> = ({ 
    isOpen, 
    onClose, 
    title, 
    children,
    maxHeight = '85vh',
    showHandle = true,
    contentClassName
}) => {
    const [isVisible, setIsVisible] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [dragStartY, setDragStartY] = useState(0);
    const [dragOffset, setDragOffset] = useState(0);

    useEffect(() => {
        if (isOpen) {
            // Prevent body scroll when sheet is open
            document.body.style.overflow = 'hidden';
            setTimeout(() => setIsVisible(true), 10);
        } else {
            setIsVisible(false);
            document.body.style.overflow = '';
        }

        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleTouchStart = (e: React.TouchEvent) => {
        setIsDragging(true);
        setDragStartY(e.touches[0].clientY);
    };

    const handleTouchMove = (e: React.TouchEvent) => {
        if (!isDragging) return;
        
        const currentY = e.touches[0].clientY;
        const offset = Math.max(0, currentY - dragStartY);
        setDragOffset(offset);
    };

    const handleTouchEnd = () => {
        if (dragOffset > 100) {
            // If dragged down more than 100px, close the sheet
            onClose();
        }
        setIsDragging(false);
        setDragOffset(0);
    };

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget) {
            onClose();
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div 
            className={`fixed inset-0 z-[9999] flex items-end justify-center transition-opacity duration-300 ${
                isVisible ? 'opacity-100' : 'opacity-0'
            }`}
            onClick={handleBackdropClick}
        >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

            {/* Sheet Content */}
            <div
                role="dialog"
                aria-modal="true"
                className={`relative w-full bg-espresso dark:bg-espresso rounded-t-3xl shadow-sm transition-transform duration-300 ease-out transform pb-safe ${
                    isVisible ? 'translate-y-0' : 'translate-y-full'
                }`}
                style={{ 
                    maxHeight,
                    transform: isDragging ? `translateY(${dragOffset}px)` : (isVisible ? 'translateY(0)' : 'translateY(100%)'),
                    transition: isDragging ? 'none' : undefined
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
            >
                {/* Drag Handle */}
                {showHandle && (
                    <div className="flex justify-center pt-3 pb-1 pt-safe cursor-grab active:cursor-grabbing w-full"
                         onMouseDown={(e) => {
                             // Add mouse support for drag handle if needed, or keep it touch only
                         }}
                    >
                        <div className="w-12 h-1.5 bg-hairline dark:bg-hairline rounded-full" />
                    </div>
                )}

                {/* Header */}
                {(title) && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-hairline dark:border-hairline">
                        <h3 className="text-lg font-bold text-cream dark:text-cream">
                            {title}
                        </h3>
                        <button
                            onClick={onClose}
                            aria-label="إغلاق"
                            className="p-2 -mr-2 text-latte hover:text-cream dark:hover:text-cream rounded-full hover:bg-espresso-light dark:hover:bg-espresso-light transition-colors"
                        >
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>
                )}

                {/* Content */}
                <div className={contentClassName || "overflow-y-auto w-full"} style={{ maxHeight: `calc(${maxHeight} - ${title ? '70px' : '40px'})` }}>
                    {children}
                </div>
            </div>
        </div>,
        document.body
    );
};

export default BottomSheet;
