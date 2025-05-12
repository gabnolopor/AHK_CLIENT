import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom';
import '../styles/photoStyles.css';
import { apiService } from '../services/api';
import { FiX } from 'react-icons/fi';
import LoadingFallback from '../components/LoadingFallback';
import { motion, AnimatePresence } from 'framer-motion';
import { FaCube } from 'react-icons/fa';

function PhotoRoom() {
  const [photos, setPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [direction, setDirection] = useState(0);
  
  // Mínima distancia requerida para un swipe
  const minSwipeDistance = 50;

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const data = await apiService.getAllPhotography();
        setTimeout(() => {
          setPhotos(data);
          setIsLoading(false);
        }, 3000);
      } catch (error) {
        console.error('Error fetching photos:', error);
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  const handleNext = () => {
    setDirection(1);
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  };

  // Funciones para manejar eventos táctiles
  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;
    
    if (isLeftSwipe) {
      handleNext();
    } else if (isRightSwipe) {
      handlePrev();
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  // Variantes de animación para el deslizamiento
  const slideVariants = {
    enter: (direction) => ({
      x: direction > 0 ? '100%' : '-100%',
      opacity: 0
    }),
    center: {
      x: 0,
      opacity: 1
    },
    exit: (direction) => ({
      x: direction < 0 ? '100%' : '-100%',
      opacity: 0
    })
  };

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (photos.length === 0) {
    return <div className="no-content">No photos available</div>;
  }

  const currentPhoto = photos[currentIndex];

  return (
    <div className="photo-room">
      <Link to="/" className="logo-link">
        <img src="/black-logo.png" className="logo" alt="logo" />
      </Link>
      
      <Link to="/photo3DRoom" className="view-3d-button">
        <FaCube className="view-3d-icon" />
        <span className="view-3d-tooltip">View in 3D</span>
      </Link>
      
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
          className="photo-container"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <div className="photo-text">
            <div className="photo-title-container">
              <h2 className="photo-title">{currentPhoto.name}</h2>
            </div>
            <div className="photo-description-container">
              <p className="photo-description">{currentPhoto.description}</p>
            </div>
          </div>
          <div className="photo-image">
            <img src={currentPhoto.imageUrl} alt={currentPhoto.name} onClick={openModal} />
          </div>
        </motion.div>
      </AnimatePresence>
      
      <div className="photo-navigation">
        <button onClick={handlePrev} className="photo-nav-button">←</button>
        <button onClick={handleNext} className="photo-nav-button">→</button>
      </div>

      {isModalOpen && (
        <div className="photo-modalOverlay open" onClick={closeModal}>
          <div className="photo-modal" onClick={(e) => e.stopPropagation()}>
            <button className="photo-close-button" onClick={closeModal}>
              <FiX size={24} />
            </button>
            <img 
              src={currentPhoto.imageUrl} 
              alt={currentPhoto.name} 
              className="photo-modalImage" 
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default PhotoRoom
