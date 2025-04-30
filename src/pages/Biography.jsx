import React, { useState, useEffect } from 'react';
import { apiService } from '../services/api';
import { useApi } from '../hooks/useApi';
import '../styles/bio.css';
import { Link } from 'react-router-dom';

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
                    .replace(/[^\w\s.,]/g, '')  
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

        return () => {
            window.speechSynthesis.cancel();
        };
    }, [handleRequest]);

    const handleSpeech = () => {
        if (isPlaying) {
            window.speechSynthesis.cancel();
            setIsPlaying(false);
            return;
        }

        const utterance = new SpeechSynthesisUtterance(biography.text);
        utterance.lang = 'en-US';
        utterance.rate = 0.8;
        utterance.pitch = 1;
        utterance.volume = 1;

        utterance.onend = () => {
            console.log('Lectura completada');
            setIsPlaying(false);
        };

        utterance.onerror = (event) => {
            console.error('Error en la reproducción:', event);
            setIsPlaying(false);
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
        setIsPlaying(true);
    };

    if (loading) return <div>Loading...</div>;
    if (error) return <div>Error loading biography: {error}</div>;

    return (
        <div className="bio__container">
            <div className="bio__frame">
                <img src="/framebionew.jpg" alt="frame" />
                <div className="bio__content">
                    <h1>{biography.title}</h1>
                    <div className="bio__scroll-link" 
                         onClick={() => document.querySelector('.bio__speech-button').scrollIntoView({ behavior: 'smooth' })}>
                        Listen Bio
                    </div>
                    {biography.text.split('\n').map((paragraph, index) => (
                        paragraph.trim() && <p key={index}>{paragraph}</p>
                    ))}
                    <button 
                        className="bio__speech-button"
                        onClick={handleSpeech}
                    >
                        {isPlaying ? 'Stop Reading' : 'Listen Biography'}
                    </button>
                </div>
            </div>
            <Link to="/boxselect">
                <img src="/black-logo.png" className="logo" alt="logo" />
            </Link>
        </div>
    );
};

export default Biography;   
