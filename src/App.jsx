import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Book, Trash2, Search, Filter, Moon, Sun, Laptop, Menu, X } from 'lucide-react';
import { useBinder } from './context/BinderContext';
import BinderGrid from './components/BinderGrid';
import CardModal from './components/CardModal';
import BinderModal from './components/BinderModal';
import Login from './components/Login';

function App() {
  const {
    binders, currentBinder, currentBinderId, setCurrentBinderId,
    addBinder, deleteBinder, addCard, removeCard, stats
  } = useBinder();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [trainerName, setTrainerName] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCardModalOpen, setIsCardModalOpen] = useState(false);
  const [isBinderModalOpen, setIsBinderModalOpen] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [editingCard, setEditingCard] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('All');

  const filteredBinder = useMemo(() => {
    if (!currentBinder) return null;
    if (!searchTerm && filterType === 'All') return currentBinder;

    const filteredCards = Object.entries(currentBinder.cards).reduce((acc, [slot, card]) => {
      const matchesSearch = card.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesType = filterType === 'All' || card.type === filterType;

      if (matchesSearch && matchesType) {
        acc[slot] = card;
      }
      return acc;
    }, {});

    return { ...currentBinder, cards: filteredCards };
  }, [currentBinder, searchTerm, filterType]);

  const handleAddCard = (slotNumber) => {
    setSelectedSlot(slotNumber);
    setEditingCard(null);
    setIsCardModalOpen(true);
  };

  const handleEditCard = (slotNumber, card) => {
    setSelectedSlot(slotNumber);
    setEditingCard(card);
    setIsCardModalOpen(true);
  };

  const handleDeleteCard = (slotNumber) => {
    if (confirm(`Remove card from slot ${slotNumber}?`)) {
      removeCard(currentBinderId, slotNumber);
    }
  };

  const handleSaveCard = (slotNumber, cardData) => {
    addCard(currentBinderId, slotNumber, cardData);
  };

  const handleLogin = (name) => {
    setTrainerName(name);
    setIsLoggedIn(true);
  };

  if (!isLoggedIn) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <div className="flex h-screen bg-binder-dark text-white overflow-hidden">
      {/* Sidebar */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.aside
            initial={{ x: -280 }}
            animate={{ x: 0 }}
            exit={{ x: -280 }}
            className="w-[280px] border-r border-binder-border bg-binder-dark/50 backdrop-blur-xl flex flex-col z-40"
          >
            <div className="p-6 flex items-center gap-3">
              <div className="w-8 h-8 bg-pokemon-red rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(255,28,28,0.4)]">
                <div className="w-4 h-4 bg-white rounded-full border-2 border-black" />
              </div>
              <h1 className="text-xl font-black tracking-tighter uppercase italic">PokeBinder</h1>
            </div>

            <div className="px-4 flex-1 overflow-y-auto space-y-2 py-4">
              <div className="flex items-center justify-between px-2 mb-4">
                <span className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em]">Your Binders</span>
                <button
                  onClick={() => setIsBinderModalOpen(true)}
                  className="p-1 hover:bg-white/5 rounded text-pokemon-blue"
                >
                  <Plus size={16} />
                </button>
              </div>

              {binders.map(binder => (
                <div
                  key={binder.id}
                  onClick={() => setCurrentBinderId(binder.id)}
                  className={`group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all border
                    ${currentBinderId === binder.id
                      ? 'bg-pokemon-blue/10 border-pokemon-blue/30 text-pokemon-blue'
                      : 'border-transparent hover:bg-white/5 text-white/60 hover:text-white'}`}
                >
                  <div className="flex items-center gap-3 truncate">
                    <Book size={18} className={currentBinderId === binder.id ? 'text-pokemon-blue' : 'text-white/20'} />
                    <span className="text-sm font-medium truncate">{binder.name}</span>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); deleteBinder(binder.id); }}
                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-pokemon-red transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}

              {binders.length === 0 && (
                <div className="py-12 px-4 text-center">
                  <Book className="mx-auto text-white/5 mb-4" size={48} />
                  <p className="text-sm text-white/30">No binders yet.</p>
                  <button
                    onClick={() => setIsBinderModalOpen(true)}
                    className="mt-4 text-xs font-bold text-pokemon-blue hover:underline"
                  >
                    Create your first binder
                  </button>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-binder-border">
              <div className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5">
                <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pokemon-red to-pokemon-blue flex items-center justify-center font-black text-lg">
                  {trainerName ? trainerName[0].toUpperCase() : 'T'}
                </div>
                <div className="truncate flex-1">
                  <p className="text-xs font-bold truncate">{trainerName || 'Trainer Account'}</p>
                  <p className="text-[10px] text-white/40">Offline Mode</p>
                </div>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 flex flex-col overflow-hidden relative">
        {/* Top Header */}
        <header className="h-16 border-b border-binder-border flex items-center justify-between px-6 bg-binder-dark/30 backdrop-blur-md sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-2 hover:bg-white/5 rounded-lg text-white/60 hover:text-white transition-colors"
            >
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="h-4 w-px bg-white/10 mx-2" />
            <div className="flex items-center gap-4">
              <div className="relative">
                <Search size={16} className="absolute left-3 top-2.5 text-white/30" />
                <input
                  type="text"
                  placeholder="Search your collection..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-white/5 border border-white/5 rounded-lg pl-10 pr-4 py-2 text-sm focus:outline-none focus:border-pokemon-blue w-64 transition-all"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-white/5 border border-white/5 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-pokemon-blue transition-all"
              >
                <option value="All">All Types</option>
                <option value="Grass">Grass</option>
                <option value="Fire">Fire</option>
                <option value="Water">Water</option>
                <option value="Psychic">Psychic</option>
                {/* Add other types as needed */}
              </select>
            </div>
          </div>

          {currentBinder && (
            <div className="flex items-center gap-6">
              <div className="text-right">
                <p className="text-[10px] font-black uppercase tracking-widest text-white/30">Total Progress</p>
                <p className="text-sm font-bold text-pokemon-yellow">{stats?.percentage}% Complete</p>
              </div>
              <div className="h-10 w-px bg-white/10" />
              <button
                onClick={() => setIsBinderModalOpen(true)}
                className="bg-white text-black text-xs font-black px-4 py-2 rounded-lg hover:bg-white/90 transition-all uppercase tracking-tighter"
              >
                New Binder
              </button>
            </div>
          )}
        </header>

        {/* Dynamic Content area */}
        <div className="flex-1 overflow-y-auto p-6 md:p-10">
          {filteredBinder ? (
            <div className="max-w-6xl mx-auto">
              <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                  <h2 className="text-3xl font-black italic uppercase text-white mb-2 tracking-tighter">
                    {filteredBinder.name}
                  </h2>
                  <p className="text-white/40 text-sm max-w-lg">
                    Manage your card placements and track your collection progress for this set.
                  </p>
                </div>
              </div>
              <BinderGrid
                binder={filteredBinder}
                onAddCard={handleAddCard}
                onEditCard={handleEditCard}
                onDeleteCard={handleDeleteCard}
              />
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-8 rotate-12 border border-white/10">
                <Book size={48} className="text-white/20" />
              </div>
              <h2 className="text-2xl font-bold mb-4 tracking-tight">Ready to start collecting?</h2>
              <p className="text-white/40 mb-8 leading-relaxed">
                Create a digital binder to organize your physical Pokémon TCG collection. You can customize slots, pages, and track your progress.
              </p>
              <button
                onClick={() => setIsBinderModalOpen(true)}
                className="bg-pokemon-blue text-white font-bold px-8 py-4 rounded-2xl shadow-xl shadow-pokemon-blue/20 hover:scale-105 transition-all"
              >
                Create My First Binder
              </button>
            </div>
          )}
        </div>
      </main>

      {/* Modals */}
      <CardModal
        isOpen={isCardModalOpen}
        onClose={() => setIsCardModalOpen(false)}
        onSave={handleSaveCard}
        initialData={editingCard}
        slotNumber={selectedSlot}
      />

      <BinderModal
        isOpen={isBinderModalOpen}
        onClose={() => setIsBinderModalOpen(false)}
        onCreate={(name, total, grid) => {
          const id = addBinder(name, total, grid);
          setCurrentBinderId(id);
        }}
      />
    </div>
  );
}

export default App;
