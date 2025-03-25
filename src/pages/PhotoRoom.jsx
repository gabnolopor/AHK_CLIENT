import React, { useState, useEffect } from 'react'
import { Link } from 'react-router-dom';
import '../styles/photoStyles.css';
import { apiService } from '../services/api';
import { FiX } from 'react-icons/fi';

function PhotoRoom() {
  const [photos, setPhotos] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const data = await apiService.getAllPhotography();
        setPhotos(data);
      } catch (error) {
        console.error('Error fetching photos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  const handleNext = () => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % photos.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prevIndex) => (prevIndex - 1 + photos.length) % photos.length);
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  if (isLoading) {
    return <div className="loading">Loading...</div>;
  }

  if (photos.length === 0) {
    return <div className="no-content">No photos available</div>;
  }

  const currentPhoto = photos[currentIndex];

  return (
    <div className="photo-room">
      <Link to="/boxselect" className="logo-link">
        <img src="/black-logo.png" className="logo" alt="logo" />
      </Link>
      <div className="photo-container">
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
      </div>
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