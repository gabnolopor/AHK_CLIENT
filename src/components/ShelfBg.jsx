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
      setIsMobile(('ontouchstart' in window) || 
                 (navigator.maxTouchPoints > 0) || 
                 (navigator.msMaxTouchPoints > 0));
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
      setSelectedSection(text);
      setIsBookModalOpen(true);
    }
  };
    
  return (
    <>
      <Link to="/boxselect" className="logo-link">
        <img src="/black-logo.png" className="logo" alt="logo" />
      </Link>
      <div className='shelf-bg' onTouchMove={handleTouchMove}>
        <div className='shelf-box'>
          {[
            'Scripts', 'Poems', 'Lyrics',
            'Philosophy', '', 'Treatments'
          ].map((text, index) => (
            <div 
              key={index}
              data-index={index}
              className={`shelf__sector ${lastTouchedBox === index ? 'touch-active' : ''} ${index === 4 ? 'no-interaction no-frame' : ''}`}
              onMouseEnter={() => handleMouseEnter(index)}
              onMouseLeave={() => handleMouseLeave(index)}
              onTouchStart={() => handleTouchStart(index)}
              onTouchEnd={handleTouchEnd}
            >
              <div 
                className="hover-modal" 
                onClick={() => handleClick(text, index)}
              >
                {text}
              </div>
            </div>
          ))}
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