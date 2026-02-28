import React, { createContext, useContext, useState, useEffect } from 'react';

const BinderContext = createContext();

export const BinderProvider = ({ children }) => {
    const [binders, setBinders] = useState(() => {
        const savedBinders = localStorage.getItem('pokemon_binders');
        return savedBinders ? JSON.parse(savedBinders) : [];
    });

    const [currentBinderId, setCurrentBinderId] = useState(() => {
        return localStorage.getItem('current_binder_id') || null;
    });

    useEffect(() => {
        localStorage.setItem('pokemon_binders', JSON.stringify(binders));
    }, [binders]);

    useEffect(() => {
        if (currentBinderId) {
            localStorage.setItem('current_binder_id', currentBinderId);
        }
    }, [currentBinderId]);

    const addBinder = (name, totalSlots, gridConfig = { rows: 3, cols: 3 }) => {
        const newBinder = {
            id: crypto.randomUUID(),
            name,
            totalSlots,
            gridConfig,
            cards: {},
            createdAt: new Date().toISOString(),
        };
        setBinders([...binders, newBinder]);
        if (!currentBinderId) setCurrentBinderId(newBinder.id);
        return newBinder.id;
    };

    const deleteBinder = (id) => {
        setBinders(binders.filter(b => b.id !== id));
        if (currentBinderId === id) setCurrentBinderId(binders[0]?.id || null);
    };

    const updateBinder = (id, updates) => {
        setBinders(binders.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const addCard = (binderId, slotNumber, cardData) => {
        setBinders(prevBinders => prevBinders.map(binder => {
            if (binder.id === binderId) {
                return {
                    ...binder,
                    cards: {
                        ...binder.cards,
                        [slotNumber]: { ...cardData, id: crypto.randomUUID() }
                    }
                };
            }
            return binder;
        }));
    };

    const removeCard = (binderId, slotNumber) => {
        setBinders(prevBinders => prevBinders.map(binder => {
            if (binder.id === binderId) {
                const newCards = { ...binder.cards };
                delete newCards[slotNumber];
                return { ...binder, cards: newCards };
            }
            return binder;
        }));
    };

    const currentBinder = binders.find(b => b.id === currentBinderId);

    const value = {
        binders,
        currentBinder,
        currentBinderId,
        setCurrentBinderId,
        addBinder,
        deleteBinder,
        updateBinder,
        addCard,
        removeCard,
        stats: currentBinder ? {
            total: currentBinder.totalSlots,
            filled: Object.keys(currentBinder.cards).length,
            empty: currentBinder.totalSlots - Object.keys(currentBinder.cards).length,
            percentage: ((Object.keys(currentBinder.cards).length / currentBinder.totalSlots) * 100).toFixed(1)
        } : null
    };

    return (
        <BinderContext.Provider value={value}>
            {children}
        </BinderContext.Provider>
    );
};

export const useBinder = () => {
    const context = useContext(BinderContext);
    if (!context) throw new Error('useBinder must be used within a BinderProvider');
    return context;
};
