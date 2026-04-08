import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiService } from '../services/api';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX } from 'react-icons/fi';
import '../styles/digital.css';
import LoadingFallback from '../components/LoadingFallback';

const DigitalArt = () => {
    const [digitalArts, setDigitalArts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [direction, setDirection] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);

    useEffect(() => {
        const fetchDigitalArts = async () => {
            try {
                const data = await apiService.getAllDigitalArt();
                setTimeout(() => {
                    setDigitalArts(data);
                    setIsLoading(false);
                }, 2000);
            } catch (error) {
                console.error('Error fetching digital art:', error);
                setIsLoading(false);
            }
        };

        fetchDigitalArts();
    }, []);

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

    const openModal = () => {
        setIsModalOpen(true);
    };

    const closeModal = () => {
        setIsModalOpen(false);
    };

    if (isLoading) return <LoadingFallback />;
    if (digitalArts.length === 0) return <div className="no-content">No digital art available</div>;

    const currentArt = digitalArts[currentIndex];

    return (
        <div className="digital-container">
            <Link to="/" className="logo-link">
                <img src="/black-logo.png" alt="Logo" className="logo" />
            </Link>

            <div className="carousel">
                <AnimatePresence initial={false} custom={direction} mode="wait">
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
                                src={currentArt.imageUrl}
                                alt={currentArt.name}
                                className="digital-image"
                                onClick={openModal}
                                onError={(e) => {
                                    console.log('Error loading image:', currentArt.imageUrl);
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
            </div>

            {/* Modal for full-size image with digital-specific classes */}
            {isModalOpen && (
                <div className="digital-modalOverlay open" onClick={closeModal}>
                    <div className="digital-modal" onClick={(e) => e.stopPropagation()}>
                        <button className="digital-close-button" onClick={closeModal}>
                            <FiX size={24} />
                        </button>
                        <img 
                            src={currentArt.imageUrl} 
                            alt={currentArt.name} 
                            className="digital-modalImage" 
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default DigitalArt;
