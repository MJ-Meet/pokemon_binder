import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

const BinderContext = createContext();

export const BinderProvider = ({ children, token }) => {
    const [binders, setBinders] = useState([]);
    const [currentBinderId, setCurrentBinderId] = useState(null);
    const [isLoading, setIsLoading] = useState(true);

    const API_BASE = 'http://localhost:5000/api';

    const getHeaders = useCallback(() => {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        };
    }, [token]);

    // Fetch all binders on mount
    useEffect(() => {
        const fetchBinders = async () => {
            if (!token) return;
            try {
                const res = await fetch(`${API_BASE}/binders`, { headers: getHeaders() });
                if (res.ok) {
                    const data = await res.json();
                    setBinders(data);

                    const savedId = localStorage.getItem('current_binder_id');
                    if (savedId && data.find(b => b.id === savedId)) {
                        setCurrentBinderId(savedId);
                    } else if (data.length > 0) {
                        setCurrentBinderId(data[0].id);
                    }
                }
            } catch (err) {
                console.error("Failed to fetch binders", err);
            } finally {
                setIsLoading(false);
            }
        };

        fetchBinders();
    }, [token, getHeaders]);

    useEffect(() => {
        if (currentBinderId) {
            localStorage.setItem('current_binder_id', currentBinderId);
        }
    }, [currentBinderId]);

    const addBinder = async (name, totalSlots, gridConfig = { rows: 3, cols: 3 }) => {
        try {
            const res = await fetch(`${API_BASE}/binders`, {
                method: 'POST',
                headers: getHeaders(),
                body: JSON.stringify({ name, total_slots: totalSlots, gridConfig }) // Note: sending gridConfig to backend but not saving in mongo for this implementation, we handle mostly name/slots
            });
            if (res.ok) {
                const newBinder = await res.json();
                newBinder.gridConfig = gridConfig; // store it on the frontend only for now
                setBinders(prev => [...prev, newBinder]);
                if (!currentBinderId) setCurrentBinderId(newBinder.id);
                return newBinder.id;
            }
        } catch (err) {
            console.error("Failed to add binder", err);
        }
        return null;
    };

    const deleteBinder = async (id) => {
        try {
            const res = await fetch(`${API_BASE}/binders/${id}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (res.ok) {
                setBinders(prev => prev.filter(b => b.id !== id));
                if (currentBinderId === id) setCurrentBinderId(binders[0]?.id || null);
            }
        } catch (err) {
            console.error("Failed to delete binder", err);
        }
    };

    const updateBinder = (id, updates) => {
        setBinders(prev => prev.map(b => b.id === id ? { ...b, ...updates } : b));
    };

    const addCard = async (binderId, slotNumber, cardData, imageFile = null) => {
        try {
            const formData = new FormData();
            formData.append('binder_id', binderId);
            formData.append('slot_number', slotNumber);
            formData.append('name', cardData.name || '');
            formData.append('type', cardData.type || '');
            formData.append('rarity', cardData.rarity || '');
            formData.append('notes', cardData.notes || '');

            // imageFile should be appended if exists, but we are using base64 preview currently in the app.
            // If the app passes a File, we handle it:
            if (cardData.imageFile) {
                formData.append('image', cardData.imageFile);
            }

            const res = await fetch(`${API_BASE}/cards`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`
                    // Do NOT set Content-Type header when sending FormData; browser does it automatically
                },
                body: formData
            });

            if (res.ok) {
                const updatedCard = await res.json();
                setBinders(prevBinders => prevBinders.map(binder => {
                    if (binder.id === binderId) {
                        return {
                            ...binder,
                            cards: {
                                ...binder.cards,
                                [slotNumber]: updatedCard
                            }
                        };
                    }
                    return binder;
                }));
            }
        } catch (err) {
            console.error("Failed to add card", err);
        }
    };

    const removeCard = async (binderId, slotNumber) => {
        try {
            const res = await fetch(`${API_BASE}/cards/${binderId}/${slotNumber}`, {
                method: 'DELETE',
                headers: getHeaders()
            });
            if (res.ok) {
                setBinders(prevBinders => prevBinders.map(binder => {
                    if (binder.id === binderId) {
                        const newCards = { ...binder.cards };
                        delete newCards[slotNumber];
                        return { ...binder, cards: newCards };
                    }
                    return binder;
                }));
            }
        } catch (err) {
            console.error("Failed to delete card", err);
        }
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
        isLoading,
        stats: currentBinder ? {
            total: currentBinder.total_slots || 60,
            filled: Object.keys(currentBinder.cards || {}).length,
            empty: (currentBinder.total_slots || 60) - Object.keys(currentBinder.cards || {}).length,
            percentage: ((Object.keys(currentBinder.cards || {}).length / (currentBinder.total_slots || 60)) * 100).toFixed(1)
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
