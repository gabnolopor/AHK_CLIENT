import React from 'react';
import { Link } from 'react-router-dom';
import '../styles/coming.css'
import ConstructionAnimation from '../components/ConstructionAnimation';

function ComingSoon() {
    return (
        <div className="coming__container">
            <div className="coming__content">
                <h1 className="coming__title">Coming Soon</h1>
                <p className="coming__description">This section is under construction. Please check back soon.</p>
                <ConstructionAnimation />
            </div>
            <Link to="/boxselect">
                <img src="/black-logo.png" className="logo" alt="logo" />
            </Link>
        </div>
    );
}

export default ComingSoon; 