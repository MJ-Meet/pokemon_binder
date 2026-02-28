import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, Image as ImageIcon, Save } from 'lucide-react';

const CardModal = ({ isOpen, onClose, onSave, initialData, slotNumber }) => {
    const [formData, setFormData] = useState({
        name: '',
        type: 'Grass',
        rarity: 'Common',
        notes: '',
        image: null
    });
    const [isDragging, setIsDragging] = useState(false);
    const fileInputRef = useRef(null);

    const types = ["Grass", "Fire", "Water", "Lightning", "Psychic", "Fighting", "Darkness", "Metal", "Fairy", "Dragon", "Colorless"];
    const rarities = ["Common", "Uncommon", "Rare", "Holo Rare", "Ultra Rare", "Secret Rare", "Promo", "Full Art"];

    useEffect(() => {
        if (initialData) {
            setFormData(initialData);
        } else {
            setFormData({ name: '', type: 'Grass', rarity: 'Common', notes: '', image: null });
        }
    }, [initialData, isOpen]);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setIsDragging(false);
        const file = e.dataTransfer.files[0];
        if (file && file.type.startsWith('image/')) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setFormData(prev => ({ ...prev, image: reader.result }));
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(slotNumber, formData);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-binder-dark border border-binder-border w-full max-w-2xl rounded-2xl overflow-hidden shadow-2xl"
                >
                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-binder-border bg-gradient-to-r from-pokemon-red/10 to-transparent">
                        <div>
                            <h2 className="text-xl font-bold text-white">
                                {initialData ? 'Edit Card' : 'Add Pokémon Card'}
                            </h2>
                            <p className="text-xs text-white/40 uppercase tracking-widest mt-1">Assigning to Slot #{slotNumber}</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors">
                            <X size={20} />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Image Upload Area */}
                            <div
                                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                                onDragLeave={() => setIsDragging(false)}
                                onDrop={handleDrop}
                                onClick={() => fileInputRef.current?.click()}
                                className={`relative aspect-[5/7] rounded-xl border-2 border-dashed transition-all cursor-pointer flex flex-col items-center justify-center overflow-hidden
                  ${formData.image ? 'border-pokemon-blue/50' : 'border-white/10'}
                  ${isDragging ? 'border-pokemon-blue bg-pokemon-blue/5' : 'hover:border-white/20 hover:bg-white/5'}
                `}
                            >
                                {formData.image ? (
                                    <>
                                        <img src={formData.image} alt="Preview" className="w-full h-full object-cover" />
                                        <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                            <p className="text-xs font-bold text-white uppercase tracking-widest">Change Image</p>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center p-6">
                                        <div className="bg-white/5 p-4 rounded-full mb-4 inline-block">
                                            <Upload size={32} className="text-white/40" />
                                        </div>
                                        <p className="text-sm font-medium text-white/60">Drag & drop image here</p>
                                        <p className="text-xs text-white/30 mt-2 italic">or click to browse</p>
                                    </div>
                                )}
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleFileChange}
                                    accept="image/*"
                                    className="hidden"
                                />
                            </div>

                            {/* Details Form */}
                            <div className="space-y-5">
                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Pokémon Name</label>
                                    <input
                                        required
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                        className="w-full bg-binder-slot border border-binder-border rounded-lg p-3 text-white focus:outline-none focus:border-pokemon-blue transition-colors"
                                        placeholder="e.g. Charizard"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Type</label>
                                        <select
                                            value={formData.type}
                                            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                                            className="w-full bg-binder-slot border border-binder-border rounded-lg p-3 text-white focus:outline-none focus:border-pokemon-blue transition-colors"
                                        >
                                            {types.map(t => <option key={t} value={t}>{t}</option>)}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Rarity</label>
                                        <select
                                            value={formData.rarity}
                                            onChange={(e) => setFormData({ ...formData, rarity: e.target.value })}
                                            className="w-full bg-binder-slot border border-binder-border rounded-lg p-3 text-white focus:outline-none focus:border-pokemon-blue transition-colors"
                                        >
                                            {rarities.map(r => <option key={r} value={r}>{r}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-xs font-bold text-white/40 uppercase tracking-widest mb-2">Notes</label>
                                    <textarea
                                        value={formData.notes || ''}
                                        onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                                        rows={4}
                                        className="w-full bg-binder-slot border border-binder-border rounded-lg p-3 text-white focus:outline-none focus:border-pokemon-blue transition-colors resize-none"
                                        placeholder="Condition, origin, or other details..."
                                    />
                                </div>

                                <div className="pt-4">
                                    <button
                                        type="submit"
                                        className="w-full bg-pokemon-blue hover:bg-pokemon-blue/80 text-white font-bold py-4 rounded-xl shadow-lg shadow-pokemon-blue/20 transition-all flex items-center justify-center gap-2"
                                    >
                                        <Save size={20} />
                                        {initialData ? 'Update Card' : 'Add to Collection'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
};

export default CardModal;
