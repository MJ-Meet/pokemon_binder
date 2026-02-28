import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Login({ onLogin }) {
    const [isLogin, setIsLogin] = useState(true);
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        if (!username.trim() || !password.trim()) {
            setError('Please fill in all fields');
            return;
        }

        setIsLoading(true);
        try {
            const endpoint = isLogin ? '/api/login' : '/api/signup';
            const res = await fetch(`http://localhost:5000${endpoint}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();

            if (res.ok) {
                // Return token and username to App.jsx
                onLogin(data.username, data.token);
            } else {
                setError(data.message || 'Authentication failed');
            }
        } catch (err) {
            setError('An error occurred. Please try again later.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-binder-dark relative overflow-hidden text-white">
            {/* Background decorations */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-pokemon-red/20 rounded-full blur-[120px]" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-pokemon-blue/20 rounded-full blur-[120px]" />

            <motion.div
                initial={{ opacity: 0, y: 30, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                className="w-full max-w-md p-8 sm:p-10 bg-binder-dark/80 backdrop-blur-2xl border border-white/10 rounded-[2rem] shadow-2xl relative z-10 mx-4"
            >
                <div className="flex flex-col items-center mb-10">
                    <motion.div
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ type: "spring", stiffness: 200, damping: 20, delay: 0.2 }}
                        className="w-20 h-20 bg-gradient-to-br from-pokemon-red to-red-700 rounded-full flex items-center justify-center shadow-[0_0_30px_rgba(255,28,28,0.5)] mb-6 relative overflow-hidden border-2 border-black/50"
                    >
                        {/* Pokeball inner lines */}
                        <div className="absolute w-full h-1 bg-black/60 top-1/2 -translate-y-1/2" />
                        <div className="absolute w-full h-full rounded-full border-t-[40px] border-white z-0" style={{ clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)' }} />

                        <div className="w-8 h-8 bg-white rounded-full border-[3px] border-black/80 relative z-10 flex items-center justify-center">
                            <div className="w-3 h-3 bg-white border border-black/30 rounded-full shadow-inner" />
                        </div>
                    </motion.div>

                    <motion.h1
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-4xl font-black tracking-tighter uppercase italic bg-gradient-to-br from-white to-white/60 text-transparent bg-clip-text"
                    >
                        PokeBinder
                    </motion.h1>
                    <motion.p
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-white/40 text-sm mt-2 font-medium"
                    >
                        {isLogin ? 'Access your digital collection' : 'Start your new collection'}
                    </motion.p>
                </div>

                <AnimatePresence>
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-red-500/20 text-red-300 text-sm p-3 rounded-xl mb-4 text-center border border-red-500/30"
                        >
                            {error}
                        </motion.div>
                    )}
                </AnimatePresence>

                <motion.form
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                    onSubmit={handleSubmit}
                    className="space-y-5"
                >
                    <div>
                        <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] pl-2 mb-1.5 block">Trainer Name</label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="e.g. Ash Ketchum"
                            className="w-full bg-white-[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-pokemon-blue focus:bg-white/5 transition-all text-white placeholder-white/20"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-[10px] font-black text-white/50 uppercase tracking-[0.2em] pl-2 mb-1.5 block">Security Code</label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            className="w-full bg-white-[0.03] border border-white/10 rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-pokemon-blue focus:bg-white/5 transition-all text-white placeholder-white/20"
                            required
                        />
                    </div>

                    <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        disabled={isLoading}
                        type="submit"
                        className="w-full bg-gradient-to-r from-pokemon-blue to-blue-500 text-white font-black uppercase tracking-[0.15em] py-4 rounded-2xl shadow-[0_0_20px_rgba(59,130,246,0.3)] mt-8 hover:shadow-[0_0_30px_rgba(59,130,246,0.5)] transition-shadow text-sm disabled:opacity-50"
                    >
                        {isLoading ? 'Processing...' : (isLogin ? 'Enter Binder' : 'Create Account')}
                    </motion.button>
                </motion.form>

                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="mt-6 text-center"
                >
                    <button
                        onClick={() => { setIsLogin(!isLogin); setError(''); }}
                        className="text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-wider"
                    >
                        {isLogin ? "New Trainer? Sign Up" : "Already a Trainer? Log In"}
                    </button>
                </motion.div>
            </motion.div>
        </div>
    );
}
