import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';
import Slot from './Slot';

const BinderGrid = ({ binder, onAddCard, onEditCard, onDeleteCard }) => {
    const [currentPage, setCurrentPage] = useState(0);
    const [jumpTo, setJumpTo] = useState('');

    const { totalSlots, gridConfig, cards } = binder;
    const slotsPerPage = gridConfig.rows * gridConfig.cols;
    const totalPages = Math.ceil(totalSlots / slotsPerPage);

    const startSlot = currentPage * slotsPerPage + 1;
    const endSlot = Math.min(startSlot + slotsPerPage - 1, totalSlots);

    const currentSlots = Array.from(
        { length: Math.min(slotsPerPage, totalSlots - (startSlot - 1)) },
        (_, i) => startSlot + i
    );

    const handleNext = () => setCurrentPage((prev) => Math.min(prev + 1, totalPages - 1));
    const handlePrev = () => setCurrentPage((prev) => Math.max(prev - 1, 0));

    const handleJump = (e) => {
        e.preventDefault();
        const slot = parseInt(jumpTo);
        if (!isNaN(slot) && slot >= 1 && slot <= totalSlots) {
            const page = Math.floor((slot - 1) / slotsPerPage);
            setCurrentPage(page);
            setJumpTo('');
        }
    };

    return (
        <div className="flex flex-col h-full space-y-6">
            {/* Search & Jump Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 py-2">
                <div className="flex items-center gap-4">
                    <form onSubmit={handleJump} className="relative group">
                        <input
                            type="text"
                            placeholder="Go to slot #..."
                            value={jumpTo}
                            onChange={(e) => setJumpTo(e.target.value)}
                            className="bg-binder-slot border border-binder-border rounded-lg px-4 py-2 pl-10 text-sm focus:outline-none focus:border-pokemon-blue transition-all w-48 group-hover:border-white/20"
                        />
                        <Search className="absolute left-3 top-2.5 text-white/30" size={16} />
                    </form>
                </div>

                <div className="flex items-center gap-4 bg-binder-slot/50 rounded-xl p-1 border border-binder-border shadow-inner">
                    <button
                        onClick={handlePrev}
                        disabled={currentPage === 0}
                        className="p-2 hover:bg-white/5 disabled:opacity-30 rounded-lg transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="px-4 text-sm font-medium">
                        Page <span className="text-pokemon-blue">{currentPage + 1}</span> of {totalPages}
                        <span className="mx-2 text-white/10">|</span>
                        <span className="text-white/40">Slots {startSlot} - {endSlot}</span>
                    </div>

                    <button
                        onClick={handleNext}
                        disabled={currentPage === totalPages - 1}
                        className="p-2 hover:bg-white/5 disabled:opacity-30 rounded-lg transition-colors"
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Grid Display */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentPage}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.2 }}
                    className="grid gap-4 md:gap-6"
                    style={{
                        gridTemplateColumns: `repeat(${gridConfig.cols}, minmax(0, 1fr))`,
                    }}
                >
                    {currentSlots.map((slotNum) => (
                        <Slot
                            key={slotNum}
                            slotNumber={slotNum}
                            card={cards[slotNum]}
                            onAdd={onAddCard}
                            onEdit={onEditCard}
                            onDelete={onDeleteCard}
                        />
                    ))}
                </motion.div>
            </AnimatePresence>

            {/* Progress Footer */}
            <div className="mt-auto pt-6 border-t border-binder-border flex items-center justify-between">
                <div className="text-xs uppercase tracking-widest text-white/40">
                    Viewing Binder: <span className="text-white/80 font-bold">{binder.name}</span>
                </div>
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-24 bg-binder-slot border border-binder-border rounded-full overflow-hidden">
                            <div
                                className="h-full bg-pokemon-blue shadow-[0_0_8px_rgba(59,76,202,0.5)]"
                                style={{ width: `${(Object.keys(cards).length / totalSlots) * 100}%` }}
                            />
                        </div>
                        <span className="text-[10px] font-bold text-pokemon-blue">
                            {Math.round((Object.keys(cards).length / totalSlots) * 100)}%
                        </span>
                    </div>
                    <div className="text-xs text-white/60">
                        {Object.keys(cards).length} / {totalSlots} Collected
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BinderGrid;
