import React, { useState, useEffect } from 'react';
import '../styles/landpage.css';
import { useNavigate } from 'react-router-dom';
import { FiSettings } from 'react-icons/fi';

const Header = () => {
    const navigate = useNavigate();
    const isAuthenticated = localStorage.getItem('isAdminAuthenticated') === 'true';
    const [imagesLoaded, setImagesLoaded] = useState(false);

    const palabras = [
        'Works',    // English
        'Obras',    // Spanish
        'Œuvres',   // French
        '作品',     // Chinese
        '작품',     // Korean
        'أعمال',    // Arabic
        'कार्य'     // Hindi
    ];

    const [indice, setIndice] = useState(0);
    const [displayedText, setDisplayedText] = useState('');

    useEffect(() => {
        const landpageImage = new Image();
        
        landpageImage.onload = () => {
            setImagesLoaded(true);
        };

        landpageImage.src = '/landpagefinal.png';
    }, []);

    useEffect(() => {
        const changeWord = () => {
            const nextIndex = (indice + 1) % palabras.length;
            const nextWord = palabras[nextIndex];
            let currentText = '';
            let charIndex = 0;

            const letterInterval = setInterval(() => {
                currentText += nextWord[charIndex];
                setDisplayedText(currentText);
                charIndex++;

                if (charIndex === nextWord.length) {
                    clearInterval(letterInterval);
                    setTimeout(() => {
                        setIndice(nextIndex);
                    }, 1000);
                }
            }, 100);
        };

        changeWord();
    }, [indice]);

    const handleClick = () => {
        navigate('/boxselect');
    };

    return (
        <div className="encabezado">
            <div className="imagen-container">
                {!imagesLoaded && <div className="loading-placeholder"></div>}
                <img 
                    src="/landpagefinal.png" 
                    className={`encabezado__imagen ${imagesLoaded ? 'loaded' : ''}`}
                    alt="background with frame" 
                />
                <h1 className="encabezado__titulo">
                    <span 
                        className="encabezado__texto"
                        onClick={handleClick}
                    >
                        {displayedText}
                    </span>
                </h1>
                {isAuthenticated && (
                    <button 
                        className="control-panel-button"
                        onClick={() => navigate('/admin')}
                    >
                        <FiSettings /> Control Panel
                    </button>
                )}
            </div>
        </div>
    );
};

export default Header;
