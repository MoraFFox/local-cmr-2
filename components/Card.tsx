import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className = '' }) => {
  return (
    <div className={`bg-cream border border-hairline rounded-xl p-5 sm:p-6 lg:p-8 shadow-sm ${className}`}>
      {title && (
        <h2 className="text-xl sm:text-2xl font-bold text-ink mb-6 sm:mb-8">
          {title}
        </h2>
      )}
      {children}
    </div>
  );
};

export default Card;
