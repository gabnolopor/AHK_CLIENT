import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { FiSettings } from 'react-icons/fi';
import '../styles/landpage.css';

const Header = () => {
    const navigate = useNavigate();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [showIntro, setShowIntro] = useState(() => {
        // Verificar si es la primera vez
        return !localStorage.getItem('hasSeenMenuIntro');
    });
    const [currentWordIndex, setCurrentWordIndex] = useState(0);
    const isAuthenticated = localStorage.getItem('isAdminAuthenticated') === 'true';
    const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

    const palabras = [
        'Works',    // English
        'Obras',    // Spanish
        'Œuvres',   // French
        '作品',     // Chinese
        '작품',     // Korean
        'أعمال',    // Arabic
        'कार्य'     // Hindi
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentWordIndex((prevIndex) => 
                prevIndex === palabras.length - 1 ? 0 : prevIndex + 1
            );
        }, 3000); 


        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (showIntro) {
            const timer = setTimeout(() => {
                setShowIntro(false);
                localStorage.setItem('hasSeenMenuIntro', 'true');
            }, 20000);
            return () => clearTimeout(timer);
        }
    }, [showIntro]);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth <= 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    const menuItems = [
        { title: 'Art', path: '/artroom' },
        { title: 'Digital', path: '/digitalart' },
        { title: 'Music', path: '/music' },
        { title: 'Photos', path: '/photoroom' },
        { title: 'Design', path: '/design' },
        { title: 'Writing', path: '/writing' },
        { title: 'Bio', path: '/biography' },
        { title: 'Credits', path: '/credits' }
    ];

    const handleMenuClick = () => {
        setIsMenuOpen(!isMenuOpen);
    };

    return (
        <>
            <header className="header">
                <button 
                    className={`menu-button ${isMenuOpen ? 'open' : ''}`}
                    onClick={() => setIsMenuOpen(!isMenuOpen)}
                >
                    <span></span>
                    <span></span>
                    <span></span>
                </button>

                {isMenuOpen && (
                    <nav className="nav-menu">
                        <video
                            autoPlay
                            muted
                            loop
                            playsInline
                            src="/bgPremier.mp4"
                        />
                        
                        {showIntro && (
                            <div className="intro-message">
                                <p>The following pages are a retrospective of my life as a creator.</p>
                                <p>It includes music, fine art, craftsmanship, writing photography and design etc</p>
                                <p>Enjoy.</p>
                                <p>Currently, none of this work is for sale.</p>
                            </div>
                        )}

                        <ul className={`nav-list ${showIntro ? 'compact' : ''}`}>
                            {menuItems.map((item) => (
                                <li key={item.path} className="nav-item">
                                    <button onClick={() => {
                                        navigate(item.path);
                                        setIsMenuOpen(false);
                                    }}>
                                        {item.title}
                                    </button>
                                </li>
                            ))}
                        </ul>
                    </nav>
                )}

                {isAuthenticated && (
                    <button 
                        className="control-panel-button"
                        onClick={() => navigate('/admin')}
                        style={{
                            position: 'fixed',
                            top: isMobile ? '10px' : '1rem',
                            right: isMobile ? '10px' : '1rem',
                            zIndex: 10000,
                            padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
                            fontSize: isMobile ? '0.9rem' : '1.1rem'
                        }}
                    >
                        <FiSettings /> {isMobile ? 'Admin' : 'Control Panel'}
                    </button>
                )}
            </header>

            <div className="encabezado">
                <div className="imagen-container">
                    <img 
                        src="/landpagefinal.png" 
                        alt="logo" 
                        className="encabezado__imagen"
                        onClick={() => setIsMenuOpen(!isMenuOpen)}                    />
                    <h1 className="encabezado__titulo">
                        <AnimatePresence mode="wait">
                            <motion.span
                                key={currentWordIndex}
                                className="encabezado__texto"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.5 }}
                            >
                                {palabras[currentWordIndex]}
                            </motion.span>
                        </AnimatePresence>
                    </h1>
                </div>
            </div>
        </>
    );
};

export default Header;