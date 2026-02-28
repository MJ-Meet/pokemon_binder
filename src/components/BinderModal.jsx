import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, LayoutGrid, Layers, BookOpen } from 'lucide-react';

const BinderModal = ({ isOpen, onClose, onCreate }) => {
    const [formData, setFormData] = useState({
        name: '',
        totalSlots: 60,
        rows: 3,
        cols: 3
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        onCreate(formData.name, parseInt(formData.totalSlots), {
            rows: parseInt(formData.rows),
            cols: parseInt(formData.cols)
        });
        setFormData({ name: '', totalSlots: 60, rows: 3, cols: 3 });
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, rotateX: -20 }}
                    animate={{ opacity: 1, scale: 1, rotateX: 0 }}
                    exit={{ opacity: 0, scale: 0.9, rotateX: 20 }}
                    className="bg-binder-dark border border-binder-border w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-r from-pokemon-blue/10 to-transparent">
                        <div className="flex items-center gap-3">
                            <div className="bg-pokemon-blue/20 p-2 rounded-lg text-pokemon-blue">
                                <BookOpen size={20} />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Create New Binder</h2>
                                <p className="text-xs text-white/40 uppercase tracking-widest mt-0.5">Initialize a custom collection</p>
                            </div>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-8 space-y-6">
                        <div>
                            <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Binder Name</label>
                            <input
                                required
                                autoFocus
                                type="text"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-pokemon-blue focus:ring-1 focus:ring-pokemon-blue transition-all"
                                placeholder="e.g. Generation I Master Set"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Total Slots</label>
                                <div className="relative">
                                    <input
                                        required
                                        type="number"
                                        min="1"
                                        max="5000"
                                        value={formData.totalSlots}
                                        onChange={(e) => setFormData({ ...formData, totalSlots: e.target.value })}
                                        className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-pokemon-blue transition-all pl-12"
                                    />
                                    <Layers className="absolute left-4 top-4 text-white/20" size={18} />
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-3">Grid Layout</label>
                                <div className="flex gap-2">
                                    <div className="relative flex-1">
                                        <input
                                            required
                                            type="number"
                                            placeholder="Rows"
                                            min="1"
                                            max="10"
                                            value={formData.rows}
                                            onChange={(e) => setFormData({ ...formData, rows: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-pokemon-blue transition-all"
                                        />
                                        <span className="absolute right-4 top-4 text-[10px] text-white/20 uppercase">Rows</span>
                                    </div>
                                    <div className="relative flex-1">
                                        <input
                                            required
                                            type="number"
                                            placeholder="Cols"
                                            min="1"
                                            max="10"
                                            value={formData.cols}
                                            onChange={(e) => setFormData({ ...formData, cols: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:outline-none focus:border-pokemon-blue transition-all"
                                        />
                                        <span className="absolute right-4 top-4 text-[10px] text-white/20 uppercase">Cols</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white/5 rounded-xl p-4 border border-white/5">
                            <div className="flex items-center gap-3 text-white/40">
                                <LayoutGrid size={16} />
                                <p className="text-xs">
                                    This binder will contain <span className="text-white font-bold">{formData.totalSlots}</span> slots
                                    arranged in a <span className="text-white font-bold">{formData.rows}x{formData.cols}</span> grid per page.
                                </p>
                            </div>
                        </div>

                        <div className="pt-4">
                            <button
                                type="submit"
                                className="w-full bg-white text-black hover:bg-white/90 font-bold py-4 rounded-xl shadow-xl transition-all flex items-center justify-center gap-2 transform active:scale-[0.98]"
                            >
                                Assemble Binder
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default BinderModal;
