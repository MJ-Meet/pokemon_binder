import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Info, Trash2, Edit } from 'lucide-react';

const Slot = ({ slotNumber, card, onAdd, onEdit, onDelete }) => {
    const isFilled = !!card;

    return (
        <motion.div
            layout
            className={`relative aspect-[5/7] rounded-xl border-2 transition-all duration-300 group overflow-hidden
        ${isFilled
                    ? 'border-premium-gold/30 hover:border-premium-gold shadow-lg shadow-black/50'
                    : 'border-binder-border bg-binder-slot/50 hover:bg-binder-slot hover:border-pokemon-blue/50'
                }`}
        >
            <AnimatePresence mode="wait">
                {!isFilled ? (
                    <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex flex-col items-center justify-center h-full p-4"
                    >
                        <span className="text-4xl font-bold text-white/5 opacity-10 group-hover:opacity-20 transition-opacity absolute inset-0 flex items-center justify-center select-none">
                            {slotNumber}
                        </span>
                        <button
                            onClick={() => onAdd(slotNumber)}
                            className="z-10 bg-pokemon-blue/20 hover:bg-pokemon-blue text-white p-3 rounded-full opacity-0 group-hover:opacity-100 transition-all transform scale-75 group-hover:scale-100"
                        >
                            <Plus size={24} />
                        </button>
                        <span className="mt-4 text-xs font-medium text-white/30 group-hover:text-white/60 transition-colors uppercase tracking-widest">
                            Slot {slotNumber}
                        </span>
                    </motion.div>
                ) : (
                    <motion.div
                        key="filled"
                        initial={{ opacity: 0, scale: 0.9, rotateY: 90 }}
                        animate={{ opacity: 1, scale: 1, rotateY: 0 }}
                        exit={{ opacity: 0, scale: 1.1, rotateY: -90 }}
                        transition={{ type: "spring", stiffness: 260, damping: 20 }}
                        className="relative h-full w-full"
                    >
                        <img
                            src={card.image}
                            alt={card.name}
                            className="w-full h-full object-cover rounded-lg"
                        />

                        {/* Overlay Info */}
                        <div className="absolute inset-x-0 bottom-0 p-3 bg-gradient-to-t from-black/90 to-transparent transform translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                            <div className="flex justify-between items-end">
                                <div>
                                    <h3 className="text-sm font-bold truncate text-white">{card.name}</h3>
                                    <p className="text-[10px] text-white/60 uppercase tracking-tighter">{card.type} • {card.rarity}</p>
                                </div>
                                <div className="flex gap-1">
                                    <button onClick={() => onEdit(slotNumber, card)} className="p-1 hover:text-pokemon-yellow transition-colors">
                                        <Edit size={14} />
                                    </button>
                                    <button onClick={() => onDelete(slotNumber)} className="p-1 hover:text-pokemon-red transition-colors">
                                        <Trash2 size={14} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Rarity Glow */}
                        <div className={`absolute inset-0 pointer-events-none rounded-lg border-2 ${card.rarity?.toLowerCase().includes('holo') ? 'animate-pulse shadow-[inset_0_0_20px_rgba(255,255,255,0.2)]' : ''
                            }`} />
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.div>
    );
};

export default Slot;
