import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/artStyle.css';
import { apiService } from '../services/api';
import { FiX } from 'react-icons/fi';
import LoadingFallback from '../components/LoadingFallback';

function ArtRoom() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [paintings, setPaintings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  
  // Mínima distancia requerida para un swipe
  const minSwipeDistance = 50;

  useEffect(() => {
    const fetchPaintings = async () => {
      try {
        const data = await apiService.getAllPaintings();
        setTimeout(() => {
          setPaintings(data);
          setIsLoading(false);
        }, 3000); 
      } catch (error) {
        console.error('Error fetching paintings:', error);
        setIsLoading(false);
      }
    };

    fetchPaintings();
  }, []);

  const nextSlide = () => {
    if (isTransitioning) return;
    
    if (currentSlide === paintings.length - 1) {
      // If at the last slide, disable transition and jump to first
      setIsTransitioning(true);
      setCurrentSlide(0);
      setTimeout(() => setIsTransitioning(false), 50);
    } else {
      // Normal transition to next slide
      setCurrentSlide((prev) => prev + 1);
    }
  };

  const prevSlide = () => {
    if (isTransitioning) return;
    
    if (currentSlide === 0) {
      // If at the first slide, disable transition and jump to last
      setIsTransitioning(true);
      setCurrentSlide(paintings.length - 1);
      setTimeout(() => setIsTransitioning(false), 50);
    } else {
      // Normal transition to previous slide
      setCurrentSlide((prev) => prev - 1);
    }
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
      nextSlide();
    } else if (isRightSwipe) {
      prevSlide();
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (paintings.length === 0) {
    return <div className="no-content">No artwork available</div>;
  }

  return (
    <div className="art-container">
      <Link to="/boxselect" className="logo-link">
        <img src="/black-logo.png" className="logo" alt="logo" />
      </Link>
      <div 
        className="carousel-wrapper"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        <div 
          className="carousel-track"
          style={{
            transform: `translateX(-${currentSlide * 100}%)`,
            transition: isTransitioning ? 'none' : 'transform 0.5s ease-in-out'
          }}
        >
          {paintings.map((painting) => (
            <div key={painting._id} className="art-card">
              <div className="painting-container" onClick={openModal}>
                <img 
                  src={painting.imageUrl} 
                  alt={painting.name} 
                  className="painting" 
                />
                <img 
                  src="/frame copy.png" 
                  alt="Frame" 
                  className="frame-paintingOverlay"
                />
              </div>
              <div className="art-card-content">
                <h2>{painting.name}</h2>
                <p>{painting.description}</p>
              </div>
            </div>
          ))}
        </div>
        {paintings.length > 1 && (
          <div className="carousel-buttons">
            <button className="carousel-button" onClick={prevSlide}>
              <span>←</span>
            </button>
            <button className="carousel-button" onClick={nextSlide}>
              <span>→</span>
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className={`painting-modalOverlay ${isModalOpen ? 'open' : ''}`} onClick={closeModal}>
          <div className="painting-modal" onClick={(e) => e.stopPropagation()}>
            <button className="imageClose-button" onClick={closeModal}>
              <FiX size={24} />
            </button>
            <img 
              src={paintings[currentSlide].imageUrl} 
              alt={paintings[currentSlide].name} 
              className="painting-modalImage" 
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ArtRoom;
