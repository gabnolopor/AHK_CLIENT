import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { useApi } from '../hooks/useApi';
import { motion, AnimatePresence } from 'framer-motion';
import '../styles/digital.css';

const DigitalArt = () => {
    const [digitalArts, setDigitalArts] = useState([]);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const { loading, error, handleRequest } = useApi();

    useEffect(() => {
        const loadDigitalArts = async () => {
            try {
                const data = await handleRequest(apiService.getAllDigitalArt);
                setDigitalArts(data);
            } catch (err) {
                console.error('Error:', err);
            }
        };

        loadDigitalArts();
    }, [handleRequest]);

    const slideVariants = {
        enter: (direction) => ({
            x: direction > 0 ? 1000 : -1000,
            opacity: 0
        }),
        center: {
            zIndex: 1,
            x: 0,
            opacity: 1
        },
        exit: (direction) => ({
            zIndex: 0,
            x: direction < 0 ? 1000 : -1000,
            opacity: 0
        })
    };

    const swipeConfidenceThreshold = 10000;
    const swipePower = (offset, velocity) => {
        return Math.abs(offset) * velocity;
    };

    const paginate = (newDirection) => {
        setDirection(newDirection);
        setCurrentIndex((prevIndex) => (prevIndex + newDirection + digitalArts.length) % digitalArts.length);
    };

    if (loading) return <div className="loading">Cargando...</div>;
    if (error) return <div className="error">{error}</div>;
    if (digitalArts.length === 0) return null;

    const currentArt = digitalArts[currentIndex];

    return (
        <div className="digital-container">
            <Link to="/boxselect" className="logo-link">
                <img src="/black-logo.png" alt="Logo" className="logo" />
            </Link>

            <div className="carousel">
                <AnimatePresence initial={false} custom={direction}>
                    <motion.div
                        key={currentIndex}
                        custom={direction}
                        variants={slideVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{
                            x: { type: "spring", stiffness: 300, damping: 30 },
                            opacity: { duration: 0.2 }
                        }}
                        drag="x"
                        dragConstraints={{ left: 0, right: 0 }}
                        dragElastic={1}
                        onDragEnd={(e, { offset, velocity }) => {
                            const swipe = swipePower(offset.x, velocity.x);

                            if (swipe < -swipeConfidenceThreshold) {
                                paginate(1);
                            } else if (swipe > swipeConfidenceThreshold) {
                                paginate(-1);
                            }
                        }}
                        className="carousel-slide"
                    >
                        <div className="digital-card">
                            <img 
                                src={`https://res.cloudinary.com/andrewking/image/upload/${currentArt.filename}`}
                                alt={currentArt.name}
                                className="digital-image"
                                onError={(e) => {
                                    console.log('Error loading image:', currentArt.filename);
                                    e.target.onerror = null;
                                    e.target.src = '/placeholder.png';
                                }}
                            />
                            <div className="digital-info">
                                <h2>{currentArt.name}</h2>
                                <p>{currentArt.description}</p>
                            </div>
                        </div>
                    </motion.div>
                </AnimatePresence>

                <button className="nav-button prev" onClick={() => paginate(-1)}>
                    &#8249;
                </button>
                <button className="nav-button next" onClick={() => paginate(1)}>
                    &#8250;
                </button>

                <div className="dots-container">
                    {digitalArts.map((_, index) => (
                        <button
                            key={index}
                            className={`dot ${index === currentIndex ? 'active' : ''}`}
                            onClick={() => {
                                setDirection(index > currentIndex ? 1 : -1);
                                setCurrentIndex(index);
                            }}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
};

export default DigitalArt;