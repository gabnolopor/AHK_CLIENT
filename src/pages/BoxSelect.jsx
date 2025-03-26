import { useState, useEffect, useRef } from 'react';
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/boxStyles.css';
import { useNavigate } from 'react-router-dom';

function BoxSelect() {
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lastTouchedBox, setLastTouchedBox] = useState(null);
  const [selectedBox, setSelectedBox] = useState(null);
  const timeoutRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(('ontouchstart' in window) || 
                 (navigator.maxTouchPoints > 0) || 
                 (navigator.msMaxTouchPoints > 0));
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    const handleOutsideTap = (e) => {
      if (isMobile && selectedBox !== null && !e.target.closest('.box__sector')) {
        setSelectedBox(null);
        setLastTouchedBox(null);
        document.querySelector('.video-container').classList.remove('blur-active');
      }
    };
    
    document.addEventListener('touchstart', handleOutsideTap);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      document.removeEventListener('touchstart', handleOutsideTap);
    };
  }, [isMobile, selectedBox]);

  const handleMouseEnter = () => {
    if (!isMobile) {
      setIsHovering(true);
      document.querySelector('.video-container').classList.add('blur-active');
    }
  };

  const handleMouseLeave = () => {
    if (!isMobile) {
      setIsHovering(false);
      document.querySelector('.video-container').classList.remove('blur-active');
    }
  };

  const handleTouchStart = (e, boxId, text) => {
    e.stopPropagation();
    
    if (isMobile) {
      if (selectedBox === boxId) {
        handleBoxClick(text);
      } else {
        setSelectedBox(boxId);
        setLastTouchedBox(boxId);
        document.querySelector('.video-container').classList.add('blur-active');
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    }
  };

  const handleTouchEnd = () => {
    if (isMobile) {
      timeoutRef.current = setTimeout(() => {
        if (!selectedBox) {
          setIsHovering(false);
          setLastTouchedBox(null);
          document.querySelector('.video-container').classList.remove('blur-active');
        }
      }, 500);
    }
  };

  const handleBoxClick = (text) => {
    if (text === 'Music') {
      navigate('/music');
    } else if (text === 'Soon') {
      navigate('/comingsoon');
    } else if (text === 'Design') {
      navigate('/design');
    } else if (text === 'Biography') {
      navigate('/biography');
    } else if (text === 'Credits') {
      navigate('/credits');
    } else if (text === 'Photos') {
      navigate('/photoroom');
    } else if (text === 'Art') {
      navigate('/artroom');
    } else if (text === 'Writing') {
      navigate('/writing');
    }
  };

  return (
    <div 
      className="box__wrapper"
      onTouchEnd={handleTouchEnd}
    >
      <div className="video-container">
        <video autoPlay muted loop playsInline className="background-video">
          <source src="/bgPremier.mp4" type="video/mp4" />
        </video>
        <img src="/newframe.png" className="frame-overlay" alt="decorative frame" />
        <Link to="/"> <img src="/black-logo.png" className="logo" alt="logo" id='logobox' /></Link>
      </div>

      <div className="boxes__grid">
        {[
          'Music', 'Photos', 'Art', 'Writing',
          'Design', 'Credits', 'Biography', 'Soon'
        ].map((text, index) => (
          <div 
            key={index}
            data-index={index}
            className={`box__sector ${selectedBox === index ? 'selected-box' : ''} ${lastTouchedBox === index ? 'touch-active' : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={(e) => handleTouchStart(e, index, text)}
            onClick={() => !isMobile && handleBoxClick(text)}
          >
            <div className={`hover-modal ${selectedBox === index ? 'selected-visible' : ''}`}>
              {text}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BoxSelect;
