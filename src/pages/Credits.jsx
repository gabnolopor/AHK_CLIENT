import React, { useEffect, useState } from 'react'
import '../styles/credits.css'
import { Link } from 'react-router-dom';

function Credits() {
  const [isAnimationComplete, setIsAnimationComplete] = useState(false);

  useEffect(() => {
    startAnimation();
  }, []);

  const startAnimation = () => {
    setIsAnimationComplete(false);
    const content = document.querySelector('.simulation__content');
    content.classList.remove('completed');
    content.classList.add('scrolling');

    setTimeout(() => {
      setIsAnimationComplete(true);
      content.classList.remove('scrolling');
      content.classList.add('completed');
    }, 42000);
  }

  return (
    <div className="simulation__wrapper">
      <Link to="/boxselect" className="logo-link">
        <img src="/black-logo.png" alt="Logo" className="logo" />
      </Link>

      <div className="simulation__content">
        <div className="header">
          <h1>CREDITS</h1>
          <p className="plus-symbol">+</p>
          <h2>THANX</h2>
        </div>
        
        <div className="column">
          <p className="credit-item">Art Direction</p>
          <p className="credit-item">Andrew H. King</p>
          <p className="credit-item">All Art is created</p>
          <p className="credit-item">By</p>
          <p className="credit-item">Andrew H. King</p>
          <p className="credit-text">
            Suspended somewhere between the digital and analog realms, lives the Art & Music of ZigZag aka Andrew H. King. Contact: andrew@zigzagworx.com
          </p>
        </div>

        <div className="column">
          <p className="credit-text">
            This is where tradition meets innovation,
            converge to create something entirely new...
          </p>
          <p className="credit-text">
            Software Development by Judith Rios & Gabino López.
          </p>
          <p className="credit-text">
            &copy; 2025 ZigZag        
          </p>
        </div>
      </div>
    </div>
  )
}

export default Credits
