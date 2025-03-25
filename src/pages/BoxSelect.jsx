import { useState, useEffect } from 'react';
import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/boxStyles.css';
import { useNavigate } from 'react-router-dom';

function BoxSelect() {
  const [isHovering, setIsHovering] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [lastTouchedBox, setLastTouchedBox] = useState(null);
  const navigate = useNavigate();

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

  const handleTouchMove = (e) => {
    if (isMobile) {
      const touch = e.touches[0];
      const elements = document.elementsFromPoint(touch.clientX, touch.clientY);
      const boxSector = elements.find(el => el.classList.contains('box__sector'));
      
      if (boxSector) {
        const boxIndex = parseInt(boxSector.dataset.index);
        if (boxIndex !== lastTouchedBox) {
          setLastTouchedBox(boxIndex);
          setIsHovering(true);
          document.querySelector('.video-container').classList.add('blur-active');
        }
      }
    }
  };

  const handleTouchStart = (boxId) => {
    if (isMobile) {
      setIsHovering(true);
      setLastTouchedBox(boxId);
      document.querySelector('.video-container').classList.add('blur-active');
    }
  };

  const handleBoxClick = (text) => {
    if (text === 'Music') {
      navigate('/music');
    }
   
    if (text === 'Soon') {
      navigate('/comingsoon');
    } 
      if (text === 'Design') {
      navigate('/design');
    } 
    if (text === 'Biography') {
      navigate('/biography');
    }  
    if (text === 'Credits') {
      navigate('/credits');
    } 
    if (text === 'Photos') {
      navigate('/photoroom');
    } 
    if (text === 'Art') {
      navigate('/artroom');
    }  
    if (text === 'Writing') {
      navigate('/writing');
    }  
    
    
  };

  return (
    <div 
      className="box__wrapper"
      onTouchMove={handleTouchMove}
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
            className={`box__sector ${lastTouchedBox === index ? 'touch-active' : ''}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onTouchStart={() => handleTouchStart(index)}
            onClick={() => handleBoxClick(text)}
          >
            <div className="hover-modal">{text}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default BoxSelect;
