import React from 'react'

interface DivisionProps {
    text: string;
    className?: string;
}

const Division: React.FC<DivisionProps> = ({ text, className = '' }) => {
    return (
        <div className={`flex items-center gap-3 ${className}`}>
            <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="flex-shrink-0"
            >
                <path
                    d="M8 0L9.67697 6.32303L16 8L9.67697 9.67697L8 16L6.32303 9.67697L0 8L6.32303 6.32303L8 0Z"
                    fill="currentColor"
                />
            </svg>
            <p className="text-lg font-normal tracking-[0.25em] uppercase">
                {text}
            </p>
        </div>
    )
}

export default Division