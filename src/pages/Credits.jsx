import React, { useEffect, useState } from 'react'
import '../styles/credits.css'
import { Link } from 'react-router-dom';

function Credits() {
  const [showTheEnd, setShowTheEnd] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowTheEnd(true);
    }, 33000);

    return () => clearTimeout(timer);
  }, []);

  const creditsContent = (
    <>
      <h1>CREDITS</h1>
      <p className="plus-symbol">+</p>
      <h1>THANX</h1>
      
      <p className="credit-item">Art Direction</p>
      <p className="credit-item">Andrew H. King</p>
      <p className="credit-item">All Art Created</p>
      <p className="credit-item">By</p>
      <p className="credit-item">Andrew H. King</p>
      
      <h3 className="credit-section-title">THANX TO MY CREATIVE and EMOTIONAL SUPPORT SYSTEM</h3>
      <p className="credit-item">ABIGAIL SUGAR</p>
      <p className="credit-item">AMES ALLEN-KING</p>
      <p className="credit-item">BOB GRETTON</p>
      <p className="credit-item">ED ALLEN</p>
      <p className="credit-item">FREDDIE MERCURY</p>
      <p className="credit-item">INDIGO MONET</p>
      <p className="credit-item">JACK SONNI</p>
      <p className="credit-item">JERRY SEINFELD</p>
      <p className="credit-item">JUDE + GABE</p>
      <p className="credit-item">KIMBERLY ALLEN</p>
      <p className="credit-item">LUTHER HENDERSON</p>
      <p className="credit-item">LYNDA REISS</p>
      <p className="credit-item">MADONNA</p>
      <p className="credit-item">MALCOLM PAGE</p>
      <p className="credit-item">MICKEY STELLAVATO</p>
      <p className="credit-item">PAM SIMON</p>
      <p className="credit-item">ROY SUDAN</p>
      <p className="credit-item">SALLY HOSKINS</p>
      <p className="credit-item">SPACEBOI FRESH</p>
      <p className="credit-item">THE CURE</p>
      <p className="credit-item">VALE MED</p>

      <h3 className="credit-section-title">COLLABORATORS</h3>
      <p className="credit-item">ANDREW FLASHMAN</p>
      <p className="credit-item">CARL HYDE</p>
      <p className="credit-item">INDIGO MONET</p>
      <p className="credit-item">SPACEBOI FRESH</p>
      <p className="credit-item">STEVE FARRIS</p>
      <p className="credit-item">VINCE ROCCO</p>

      <p className="credit-text">
        Suspended somewhere between the digital and analog realms, 
        lives the Art & Music of ZigZag 
        <br />
        aka 
        <br />
        Andrew H. King. 
        <br />
        Contact: andrew@zigzagworx.com
      </p>

      <p className="credit-text">
        This is where tradition meets innovation,
        converge to create something entirely new...
      </p>

      <p className="credit-text">
        Software Development by <br />
        Judith Ríos & Gabino López.
      </p>

      <p className="credit-text">
        &copy; 2025 ZigZag
      </p>
    </>
  );

  return (
    <div className="simulation__wrapper">
      <Link to="/" className="logo-link">
        <img src="/black-logo.png" alt="Logo" className="logo" />
      </Link>

      <div className="simulation__content scrolling">
        {creditsContent}
      </div>

      {showTheEnd && (
        <div className="end-screen-overlay">
          <a href="mailto:andrew@zigzagworx.com">andrew@zigzagworx.com</a>
        </div>
      )}
    </div>
  )
}

export default Credits
