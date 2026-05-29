import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/coming.css';

function ZigZagShop() {
  return (
    <div className="coming__container">
      <div className="coming__content">
        <h1 className="coming__title">The Zig Zag Shop</h1>
        <p className="coming__description">Closed for stock taking</p>
      </div>
      <Link to="/" className="logo-link" aria-label="Back to gallery">
        <img src="/black-logo.png" className="logo" alt="" />
      </Link>
    </div>
  );
}

export default ZigZagShop;
