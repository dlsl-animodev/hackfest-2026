import React from "react";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
    children: React.ReactNode;
}

const Badge: React.FC<BadgeProps> = ({
    children,
    className = "",
    ...props
}) => {
    return (
        <span
            className={`${className} inline-flex items-center gap-1 rounded-full  px-2 py-1 text-xs text-neutral-700 border border-neutral-300 `}
            {...props}
        >
            {children}
        </span>
    );
};

export default Badge;
