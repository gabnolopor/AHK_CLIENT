import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import '../styles/artStyle.css';
import { apiService } from '../services/api';
import { FiX } from 'react-icons/fi';
import { FaCube } from 'react-icons/fa';
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
      <Link to="/" className="logo-link">
        <img src="/black-logo.png" className="logo" alt="logo" />
      </Link>
      
      <Link to="/3dRoom" className="view-3d-button">
        <FaCube className="view-3d-icon" />
        <span className="view-3d-tooltip">View in 3D</span>
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
                <div className="painting-spotlight" aria-hidden="true">
                  <svg
                    className="painting-spotlight-svg"
                    viewBox="0 0 100 93"
                    xmlns="http://www.w3.org/2000/svg"
                    preserveAspectRatio="xMidYMax meet"
                  >
                    <defs>
                      <linearGradient id={`spot-ma-${painting._id}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#6b6560" />
                        <stop offset="35%" stopColor="#353230" />
                        <stop offset="55%" stopColor="#181716" />
                        <stop offset="100%" stopColor="#4a4540" />
                      </linearGradient>
                      <linearGradient id={`spot-mb-${painting._id}`} x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#5a5550" />
                        <stop offset="100%" stopColor="#221f1d" />
                      </linearGradient>
                      <radialGradient id={`spot-lens-${painting._id}`} cx="45%" cy="40%" r="55%">
                        <stop offset="0%" stopColor="#fffaf0" stopOpacity="0.95" />
                        <stop offset="45%" stopColor="#e8dcc8" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#2a2826" stopOpacity="0.9" />
                      </radialGradient>
                      <linearGradient id={`spot-in-${painting._id}`} x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#0d0c0b" />
                        <stop offset="50%" stopColor="#2e2b28" />
                        <stop offset="100%" stopColor="#0d0c0b" />
                      </linearGradient>
                    </defs>
                    <rect x="47" y="0" width="6" height="36" rx="1.5" fill={`url(#spot-mb-${painting._id})`} />
                    <rect x="48.5" y="1" width="3" height="34" rx="1" fill="#3a3835" opacity="0.55" />
                    <ellipse cx="50" cy="38" rx="8" ry="5" fill={`url(#spot-ma-${painting._id})`} />
                    <ellipse cx="50" cy="37" rx="5" ry="3" fill="#1a1918" opacity="0.6" />
                    <path
                      d="M 34 40 L 66 40 L 72 52 L 70 86 L 30 86 L 28 52 Z"
                      fill={`url(#spot-ma-${painting._id})`}
                      stroke="#0a0908"
                      strokeWidth="0.35"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M 36 42 L 64 42 L 69 52 L 67.5 82 L 32.5 82 L 31 52 Z"
                      fill={`url(#spot-in-${painting._id})`}
                      opacity="0.85"
                    />
                    <ellipse cx="50" cy="86" rx="21" ry="6.5" fill="#121110" stroke="#2a2826" strokeWidth="0.6" />
                    <ellipse cx="50" cy="84.5" rx="15" ry="4.5" fill={`url(#spot-lens-${painting._id})`} />
                    <ellipse cx="46" cy="83" rx="4" ry="2" fill="#ffffff" opacity="0.22" />
                  </svg>
                </div>
                <img 
                  src={painting.imageUrl} 
                  alt={painting.name} 
                  className="painting" 
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
