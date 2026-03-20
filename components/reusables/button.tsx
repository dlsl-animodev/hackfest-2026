import React from "react";

export interface ButtonHtml extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    children: React.ReactNode;
}

const Button: React.FC<ButtonHtml> = ({
    className = "",
    children,
    ...props
}) => {
    return (
        <button
            className={`${className} inline-flex items-center gap-2 rounded-full bg-[var(--ink)] px-4 py-3 text-sm text-[var(--bg)] shadow-[0_18px_44px_rgba(33,21,13,0.16)] transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50`}
            {...props}
        >
            {children}
        </button>
    );
};

export default Button;
