import React, { createContext, useContext, useState, useRef } from 'react';

const LoadingContext = createContext(null);

export function LoadingProvider({ children }) {
    const [isLoading, setIsLoading] = useState(false);
    const [loadingMessage, setLoadingMessage] = useState('Loading...');
    const timerRef = useRef(null);

    const runWithLoader = async (asyncTask, message = 'Loading...') => {
        // Clear any existing timers
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }

        setLoadingMessage(message);

        // Start a timer for 100ms (0.1 seconds)
        timerRef.current = setTimeout(() => {
            setIsLoading(true);
        }, 100);

        try {
            const result = await asyncTask;
            return result;
        } finally {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            setIsLoading(false);
        }
    };

    const showLoader = (message = 'Loading...') => {
        setLoadingMessage(message);
        setIsLoading(true);
    };

    const hideLoader = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
        setIsLoading(false);
    };

    return (
        <LoadingContext.Provider value={{
            isLoading,
            loadingMessage,
            runWithLoader,
            showLoader,
            hideLoader
        }}>
            {children}
        </LoadingContext.Provider>
    );
}

export function useLoading() {
    const context = useContext(LoadingContext);
    if (!context) {
        throw new Error('useLoading must be used within a LoadingProvider');
    }
    return context;
}
