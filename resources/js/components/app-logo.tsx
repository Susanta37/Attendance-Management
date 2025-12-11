import React from 'react';

export default function AppLogo() {
    return (
        <div className="flex items-center space-x-3">
            {/* LOGO IMAGE */}
            <img
                src="/assets/images/logo.png"
                alt="Logo"
                className="h-10 w-auto"
            />

            {/* TEXT */}
            <h1 className="text-base font-bold tracking-tight leading-tight">
                Attendance
                <span className="text-orange-600"> Management</span>
            </h1>
        </div>
    );
}
