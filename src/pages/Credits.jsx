import React, { useEffect, useState } from 'react'
import '../styles/credits.css'

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
      <div className="simulation__content">
        <div className="header">
          <h1>CREDITS</h1>
          <p style={{fontSize: '1.5rem', marginBottom: '0rem'}}>TO</p>
          <h2>THE DIGITAL FRONTIER</h2>
        </div>
        <div className="column">
          <p>
            In a digital realm far beyond traditional boundaries, 
            a new era of artistic expression emerges...
          </p>
          <p>
            Through the vast expanse of virtual space,
            creators and innovators push the boundaries
            of what's possible in digital art and design.
          </p>
          <p>
            This is where tradition meets innovation,
            where the physical and digital worlds
            converge to create something entirely new...
          </p>
          <br />
        </div>
        <div className="column">
          <p>
            Software Development by Judith Rios & Gabino López.
          </p>
          <br />
          <p>All art is created by Andrew H. King.</p>
          <br />
          <p>
            The website is hosted on your <ion-icon name="heart"></ion-icon>.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Credits