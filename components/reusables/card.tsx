import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    children: React.ReactNode;
}

export const Card = ({ children, className = "", ...props }: CardProps) => {
    return (
        <div
            className={`${className}
                    rounded-[1.7rem] border border-[var(--line)] bg-[rgba(255,255,255,0.56)] px-5 py-4 shadow-[0_20px_54px_rgba(108,82,54,0.07)]
                `}
            {...props}
        >
            {children}
        </div>
    );
};
