import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { SITE_MENU_ITEMS } from '../config/siteMenuItems';
import '../styles/landpage.css';

const SiteNavMenu = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [showIntro, setShowIntro] = useState(
    () => !localStorage.getItem('hasSeenMenuIntro')
  );
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [menuWidth, setMenuWidth] = useState(
    window.innerWidth <= 768 ? -window.innerWidth : -300
  );

  useEffect(() => {
    if (!showIntro) return;
    const timer = setTimeout(() => {
      setShowIntro(false);
      localStorage.setItem('hasSeenMenuIntro', 'true');
    }, 20000);
    return () => clearTimeout(timer);
  }, [showIntro]);

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      setMenuWidth(mobile ? -window.innerWidth : -300);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isOpen, onClose]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.button
            type="button"
            className="nav-menu-backdrop"
            aria-label="Cerrar menú"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.nav
            className={`nav-menu${isMobile ? ' nav-menu--mobile' : ''}`}
            initial={{ x: menuWidth }}
            animate={{ x: 0 }}
            exit={{ x: menuWidth }}
            transition={{
              type: 'spring',
              stiffness: isMobile ? 200 : 300,
              damping: isMobile ? 25 : 30,
              duration: isMobile ? 0.4 : 0.3,
            }}
          >
            <button
              type="button"
              className="nav-menu-close"
              onClick={onClose}
              aria-label="Cerrar menú"
            >
              ×
            </button>

            <video autoPlay muted loop playsInline src="/bgPremier.mp4" />

            {showIntro && (
              <div className="intro-message">
                <p>
                  The following pages are a retrospective of my life as a
                  creator.
                </p>
                <p>
                  It includes music, fine art, craftsmanship, writing
                  photography and design etc
                </p>
                <p>Enjoy.</p>
                <p>Currently, none of this work is for sale.</p>
              </div>
            )}

            <ul className={`nav-list ${showIntro ? 'compact' : ''}`}>
              {SITE_MENU_ITEMS.map((item) => (
                <li key={item.path} className="nav-item">
                  <button
                    type="button"
                    onClick={() => {
                      navigate(item.path);
                      onClose();
                    }}
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </motion.nav>
        </>
      )}
    </AnimatePresence>
  );
};

export default SiteNavMenu;
