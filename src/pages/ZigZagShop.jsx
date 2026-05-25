import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/zigzagShop.css';

const SHOP_VIDEO = '/855412-hd_1920_1080_25fps.mp4';

function ZigZagShop() {
  return (
    <div className="zigzag-shop">
      <video
        className="zigzag-shop__video"
        src={SHOP_VIDEO}
        autoPlay
        muted
        loop
        playsInline
        aria-hidden="true"
      />

      <div className="zigzag-shop__overlay">
        <div className="zigzag-shop__content">
          <h1>The Zig Zag Shop</h1>
          <p className="zigzag-shop__status">Closed for stock taking</p>
        </div>
      </div>

      <Link to="/" className="logo-link" aria-label="Back to gallery">
        <img src="/black-logo.png" className="logo" alt="" />
      </Link>
    </div>
  );
}

export default ZigZagShop;
