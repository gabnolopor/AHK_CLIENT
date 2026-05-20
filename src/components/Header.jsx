import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FiSettings } from "react-icons/fi";
import SiteNavMenu from "./SiteNavMenu";
import "../styles/artStyle.css";
import "../styles/landpage.css";

const Header = () => {
  const navigate = useNavigate();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const isAuthenticated =
    localStorage.getItem("isAdminAuthenticated") === "true";
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const palabras = [
    "Works",
    "Obras",
    "Œuvres",
    "作品",
    "작품",
    "أعمال",
    "कार्य",
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentWordIndex((prevIndex) =>
        prevIndex === palabras.length - 1 ? 0 : prevIndex + 1
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <>
      <header className="header">
        <button
          type="button"
          className={`menu-button ${isMenuOpen ? "open" : ""}`}
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          aria-label={isMenuOpen ? "Cerrar menú" : "Abrir menú"}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>

        <SiteNavMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        {isAuthenticated && !isMenuOpen && (
          <button
            className="control-panel-button"
            onClick={() => navigate("/admin")}
            style={{
              position: "fixed",
              top: isMobile ? "10px" : "1rem",
              right: isMobile ? "10px" : "1rem",
              zIndex: 10000,
              padding: isMobile ? "0.5rem 1rem" : "0.75rem 1.5rem",
              fontSize: isMobile ? "0.9rem" : "1.1rem",
            }}
          >
            <FiSettings /> {isMobile ? "Admin" : "Control Panel"}
          </button>
        )}
      </header>

      <div className="encabezado">
        <div
          className="imagen-container"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          <img
            src="/ZIGZAGBG.png"
            alt="logo"
            className="encabezado__imagen"
          />
          <h1 className="encabezado__titulo">
            <AnimatePresence mode="wait">
              <motion.span
                key={currentWordIndex}
                className="encabezado__texto"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.5 }}
              >
                {palabras[currentWordIndex]}
              </motion.span>
            </AnimatePresence>
          </h1>
        </div>
      </div>
    </>
  );
};

export default Header;
