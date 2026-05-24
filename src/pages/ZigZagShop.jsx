import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/coming.css';

function ZigZagShop() {
  return (
    <div className="coming__container">
      <div className="coming__content">
        <h1 className="coming__title">The Zig Zag Shop</h1>
      </div>
      <Link to="/" className="logo-link">
        <img src="/black-logo.png" className="logo" alt="logo" />
      </Link>
    </div>
  );
}

export default ZigZagShop;
