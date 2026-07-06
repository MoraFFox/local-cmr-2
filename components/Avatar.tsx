import React from 'react';

interface AvatarProps {
    name: string;
}

const Avatar: React.FC<AvatarProps> = ({ name }) => {
    const getInitials = (nameStr: string) => {
        if (!nameStr) return '?';
        const names = nameStr.trim().split(' ');
        if (names.length === 1 && names[0] === '') return '?';
        const initials = names.map(n => n[0]).join('');
        return initials.slice(0, 2).toUpperCase();
    };

    // Simple hash function to get a color based on the name
    const stringToColor = (str: string) => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            hash = str.charCodeAt(i) + ((hash << 5) - hash);
        }
        let color = '#';
        for (let i = 0; i < 3; i++) {
            const value = (hash >> (i * 8)) & 0xFF;
            color += ('00' + value.toString(16)).substr(-2);
        }
        return color;
    };
    
    // Function to check if a color is light or dark
    const isColorLight = (hexcolor: string) => {
        if (!hexcolor || hexcolor.length < 7) return true;
        const r = parseInt(hexcolor.substr(1, 2), 16);
        const g = parseInt(hexcolor.substr(3, 2), 16);
        const b = parseInt(hexcolor.substr(5, 2), 16);
        const yiq = ((r * 299) + (g * 587) + (b * 114)) / 1000;
        return yiq >= 128;
    }

    const bgColor = stringToColor(name || 'Default');
    const textColor = isColorLight(bgColor) ? 'text-ink' : 'text-white';


    return (
        <div 
            className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${textColor} flex-shrink-0`}
            style={{ backgroundColor: bgColor }}
        >
            {getInitials(name)}
        </div>
    );
};

export default Avatar;
