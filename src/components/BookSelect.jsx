import React, { useEffect, useState } from "react";
import { BookCover } from "book-cover-3d";
import { PulseLoader } from "react-spinners";
import { useNavigate } from 'react-router-dom';
import { apiService } from '../services/api'; // Import your API service


function BookSelect({ isOpen, onClose, section }) {
  const [writings, setWritings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadedImages, setLoadedImages] = useState(new Set());
  const [isMobile, setIsMobile] = useState(false);
  const navigate = useNavigate();

  const coverImages = [
    "bookCover2.png",
    "bookCover3.jpg",
    "bookCover4.jpg",
    "bookCover5.jpg"
  ];

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setLoadedImages(new Set());

      // Fetch writings from the API
      const fetchWritings = async () => {
        try {
          const response = await apiService.getAllWritings(); // Adjust this to your actual API call
          const filteredWritings = response.filter(writing => writing.genre === section);
          setWritings(filteredWritings);
        } catch (error) {
          console.error('Error fetching writings:', error);
        } finally {
          setLoading(false);
        }
      };

      fetchWritings();
    }
  }, [isOpen, section]);

  const handleImageLoad = (index) => {
    setLoadedImages(prev => {
      const newSet = new Set(prev);
      newSet.add(index);
      if (newSet.size === writings.length) {
        setLoading(false);
      }
      return newSet;
    });
  };

  const getRandomCoverImage = () => {
    const randomIndex = Math.floor(Math.random() * coverImages.length);
    return coverImages[randomIndex];
  };

  const handleBookClick = async (writing) => {
    try {
      const response = await fetch(writing.imageUrl);
      if (!response.ok) {
        throw new Error('Failed to fetch text content');
      }
      const textContent = await response.text();

      // Navigate to the TextContentPage with the writing name and text content
      navigate('/text-content', { state: { writingName: writing.name, textContent } });
    } catch (error) {
      console.error('Error loading text content:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="book-modal-overlay" onClick={onClose}>
      <div className="book-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>&times;</button>
        
        <h2 className="modal-genre-title">{section}</h2>
        
        {loading && (
          <div className="loader-container">
            <PulseLoader color="#60450c" size={15} />
          </div>
        )}
        
        {!loading && writings.length === 0 && (
          <p style={{fontSize: "2rem", color: "#8B4513", textAlign: "center"}}>No texts available at the moment.</p>
        )}

        <div className={`books-grid ${loading ? 'loading' : 'loaded'}`}>
          {writings.map((writing, index) => (
            <div key={writing._id} className="book-cover-container" onClick={() => handleBookClick(writing)}>
              <BookCover 
                height={isMobile ? 200 : 240} 
                width={isMobile ? 110 : 140} 
                rotate={30} 
                pagesOffset={4} 
                thickness={35} 
                bgColor="#400101"
              >
                <div className="book-cover">
                  <img 
                    className="book-cover-image" 
                    src={getRandomCoverImage()} // Use a random cover image
                    alt={writing.name}
                    onLoad={() => handleImageLoad(index)}
                    onError={(e) => {
                      e.target.src = "bookCover2.png"; // Fallback image
                      handleImageLoad(index);
                    }}
                    style={{ opacity: loadedImages.has(index) ? 1 : 0}}
                  />
                </div>
              </BookCover>
              <div className="book-info">
                <h3 className="book-title">{writing.name}</h3>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default BookSelect;