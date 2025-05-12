import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useApi } from '../hooks/useApi';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FaPlay, FaPause } from 'react-icons/fa';
import { IoMdHome } from 'react-icons/io';
import '../styles/bio.css';

const Biography = () => {
    const [biography, setBiography] = useState({ title: '', text: '' });
    const [isPlaying, setIsPlaying] = useState(false);
    const { loading, error, handleRequest } = useApi();

    useEffect(() => {
        const fetchBiography = async () => {
            try {
                const response = await handleRequest(apiService.getAllBiography);
                const bioData = Array.isArray(response) ? response[0] : response;
                const cleanText = bioData.text
                    .replace(/\\n/g, ' ')
                    .replace(/\s+/g, ' ')
                    .trim();
                setBiography({ 
                    title: bioData.title,
                    text: cleanText
                });
            } catch (error) {
                console.error('Error fetching biography:', error);
            }
        };

        fetchBiography();
        return () => window.speechSynthesis.cancel();
    }, [handleRequest]);

    const handleSpeech = () => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(biography.text);

        const voices = window.speechSynthesis.getVoices();
        const englishVoice = voices.find(voice => 
            voice.lang.includes('en-US') && !voice.lang.includes('es')
        );
        
        utterance.voice = englishVoice;
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;


        utterance.onend = () => setIsPlaying(false);
        utterance.onerror = () => setIsPlaying(false);

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
    };

    if (loading) return (
        <div className="bio__loading">
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity }}
                className="loader"
            />
        </div>
    );
    
    if (error) return <div className="bio__error">Error loading biography: {error}</div>;

    return (
        <div className="bio__container">

            <motion.div 
                className="bio__content-wrapper"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <div className="bio__header">
                    <Link to="/" className="home-button">
                        <IoMdHome />
                    </Link>
                    <h1>{biography.title}</h1>
                    <button 
                        className={`play-button ${isPlaying ? 'playing' : ''}`}
                        onClick={handleSpeech}
                        aria-label={isPlaying ? 'Stop Reading' : 'Start Reading'}
                    >
                        {isPlaying ? <FaPause /> : <FaPlay />}
                    </button>
                </div>

                <div className="bio__text-content">
                    {biography.text.split('\n').map((paragraph, index) => (
                        paragraph.trim() && (
                            <motion.p 
                                key={index}
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.1 }}
                            >
                                {paragraph}
                            </motion.p>
                        )
                    ))}
                </div>
            </motion.div>
        </div>
    );
};

export default Biography;   
