import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const Button = ({
    children,
    variant = 'primary',
    size = 'md',
    isLoading = false,
    leftIcon,
    rightIcon,
    className = '',
    disabled,
    type = 'button',
    ...props
}) => {
    const variants = {
        primary: 'btn-primary',
        secondary: 'btn-secondary',
        outline: 'btn-outline',
        ghost: 'btn-ghost',
        danger: 'btn-danger',
    };

    const sizes = {
        sm: 'btn-sm',
        md: 'btn-md',
        lg: 'btn-lg',
    };

    return (
        <button
            type={type}
            className={`${variants[variant] || 'btn-primary'} ${sizes[size] || 'btn-md'} ${className} ${isLoading ? 'opacity-80 cursor-wait' : ''}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading && (
                <LoadingSpinner size="sm" className="mr-2" />
            )}
            {!isLoading && leftIcon && <span>{leftIcon}</span>}
            {children}
            {!isLoading && rightIcon && <span>{rightIcon}</span>}
        </button>
    );
};

export default Button;
