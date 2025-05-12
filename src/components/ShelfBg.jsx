import React from 'react'
import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import BookSelect from './BookSelect';

function ShelfBg() {
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lastTouchedBox, setLastTouchedBox] = useState(null);
  const timeoutRef = useRef(null);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [selectedSection, setSelectedSection] = useState('');

  useEffect(() => {
    const checkMobile = () => {
      const mobile = ('ontouchstart' in window) || 
                 (navigator.maxTouchPoints > 0) || 
                 (navigator.msMaxTouchPoints > 0) ||
                 window.innerWidth <= 768;
      setIsMobile(mobile);
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);



  const handleMouseEnter = (index) => {
    if (!isMobile && index !== 4) {
      setIsHovering(true);
      document.querySelector('.shelf-bg').classList.add('blur-active');
    }
  };

  const handleMouseLeave = (index) => {
    if (!isMobile && index !== 4) {
      setIsHovering(false);
      document.querySelector('.shelf-bg').classList.remove('blur-active');
    }
  };

  const handleTouchMove = (e) => {
    if (isMobile) {
      const touch = e.touches[0];
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const boxSector = elements.find(el => el.classList.contains('shelf__sector'));
      
      if (boxSector) {
        const boxIndex = parseInt(boxSector.dataset.index);
        if (boxIndex !== lastTouchedBox) {
          setLastTouchedBox(boxIndex);
          setIsHovering(true);
          document.querySelector('.shelf-bg').classList.add('blur-active');
        }
      }
    }
  };

  const handleTouchStart = (boxId) => {
    if (isMobile && boxId !== 4) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      setIsHovering(true);
      setLastTouchedBox(boxId);
      document.querySelector('.shelf-bg').classList.add('blur-active');
    }
  };

  const handleTouchEnd = () => {
    if (isMobile) {
      timeoutRef.current = setTimeout(() => {
        setIsHovering(false);
        setLastTouchedBox(null);
        document.querySelector('.shelf-bg').classList.remove('blur-active');
      }, 2500);
    }
  };

  const handleClick = (text, index) => {
    if (index !== 4) {
      console.log(`Clicked: ${text}`);
      if (isMobile && text === 'Poems & Lyrics') {
        setSelectedSection('Poems');
      } else {
        setSelectedSection(text);
      }
      setIsBookModalOpen(true);
    }
  };
    

  return (
    <>
      <Link to="/" className="logo-link">
        <img src="/black-logo.png" className="logo" alt="logo" />
      </Link>
      <div className='shelf-bg' onTouchMove={handleTouchMove}>
        <div className={`shelf-box ${isMobile ? 'mobile-grid' : ''}`}>
          {isMobile ? 
            [
              'Scripts', 'Philosophy',
              'Poems & Lyrics', 'Treatments'
            ].map((text, index) => (
              <div 
                key={index}
                data-index={index}
                className={`shelf__sector ${lastTouchedBox === index ? 'touch-activeBooks' : ''}`}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={() => handleMouseLeave(index)}
                onTouchStart={() => handleTouchStart(index)}
                onTouchEnd={handleTouchEnd}
              >
                <div 
                  className="hover-modalBooks" 
                  onClick={() => handleClick(text, index)}
                >
                  {text}
                </div>
              </div>
            ))
            :
            [
              'Scripts', 'Poems', 'Lyrics',
              'Philosophy', '', 'Treatments'
            ].map((text, index) => (
              <div 
                key={index}
                data-index={index}
                className={`shelf__sector ${lastTouchedBox === index ? 'touch-activeBooks' : ''} ${index === 4 ? 'no-interaction' : ''}`}
                onMouseEnter={() => handleMouseEnter(index)}
                onMouseLeave={() => handleMouseLeave(index)}
                onTouchStart={() => handleTouchStart(index)}
                onTouchEnd={handleTouchEnd}
              >
                <div 
                  className="hover-modalBooks" 
                  onClick={() => handleClick(text, index)}
                >
                  {text}
                </div>
              </div>
            ))
          }
        </div>
      </div>
      <BookSelect 
        isOpen={isBookModalOpen}
        onClose={() => {
          setIsBookModalOpen(false);
          setSelectedSection('');
        }}
        section={selectedSection}
      />
    </>
  )
}

export default ShelfBg