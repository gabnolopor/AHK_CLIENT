import { useState, useEffect } from 'react';
import Lottie from 'lottie-react';
import loadingAnimation from '../assets/hand-loading.json';
import '../styles/loadingFallback.css';

function LoadingFallback({ onLoadingComplete }) {
  const [show, setShow] = useState(true);
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);

  useEffect(() => {
    // Fade in effect
    const fadeInTimer = setTimeout(() => {
      setIsVisible(true);
    }, 100);

    return () => {
      clearTimeout(fadeInTimer);
    };
  }, []);

  // Function to handle smooth fade out
  const handleFadeOut = () => {
    setIsFadingOut(true);
    // Remove from DOM after animation completes
    setTimeout(() => {
      setShow(false);
      if (onLoadingComplete) {
        onLoadingComplete();
      }
    }, 1000); // Match the CSS transition duration
  };

  // Start fade out after a minimum time to ensure animation is visible
  useEffect(() => {
    const minLoadingTime = 2500; // Increased to 2.5 seconds to allow components to load
    const timer = setTimeout(() => {
      handleFadeOut();
    }, minLoadingTime);

    return () => clearTimeout(timer);
  }, [onLoadingComplete]);

  if (!show) return null;

  return (
    <div className={`loading-container ${isVisible ? 'visible' : ''} ${isFadingOut ? 'fade-out' : ''}`}>
      <div className="loading-animation">
        <Lottie 
          animationData={loadingAnimation}
          loop={true}
          autoplay={true}
          style={{ 
            width: 300,
            height: 300
          }}
          rendererSettings={{
            preserveAspectRatio: 'xMidYMid slice'
          }}
        />
      </div>
    </div>
  );
}

export default LoadingFallback;
