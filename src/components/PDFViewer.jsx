import React, { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../styles/writingsStyles.css";

function PDFViewer() {
  const location = useLocation();
  const navigate = useNavigate();
  const { writingName, pdfUrl } = location.state || {
    writingName: "",
    pdfUrl: "",
  };
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 480);
  const [isTablet, setIsTablet] = useState(window.innerWidth > 480 && window.innerWidth <= 768);
  const [isIOS, setIsIOS] = useState(false);
  const iframeRef = useRef(null);

  useEffect(() => {
    // Detectar si es iOS - usando método moderno sin navigator.platform
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) || 
                        (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1);
    setIsIOS(isIOSDevice);
    
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
      setIsTablet(window.innerWidth > 480 && window.innerWidth <= 768);
    };
    
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    
    // Enable scrolling on the body and all parent elements
    document.body.style.overflow = 'auto';
    document.body.style.touchAction = 'auto';
    document.documentElement.style.overflow = 'auto';
    document.documentElement.style.touchAction = 'auto';
    
    // For iOS, we need to ensure the iframe can be scrolled
    if (isIOSDevice && iframeRef.current) {
      // Force layout recalculation
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.style.height = '100%';
          iframeRef.current.style.width = '100%';
        }
      }, 500);
    }
    
    return () => {
      window.removeEventListener('resize', handleResize);
      // Reset body styles when component unmounts
      document.body.style.overflow = '';
      document.body.style.touchAction = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.touchAction = '';
    };
  }, []);

  const handleBackClick = () => {
    navigate(-1);
  };

  // Función para abrir el PDF en una nueva pestaña (solución alternativa para iOS)
  const openPDFInNewTab = () => {
    window.open(pdfUrl, '_blank');
  };

  const styles = {
    container: {
      height: "100vh",
      width: "100vw",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundImage: "url('/cinema.jpg')",
      backgroundSize: "cover",
      backgroundPosition: "center",
      backgroundRepeat: "no-repeat",
      position: "relative",
      overflow: "auto",
      WebkitOverflowScrolling: "touch", // Para mejor desplazamiento en iOS
    },
    content: {
      width: isMobile ? "95%" : "90%",
      height: isMobile ? "85vh" : isTablet ? "80vh" : "90vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      position: "relative",
      boxSizing: "border-box",
      overflow: "auto",
      WebkitOverflowScrolling: "touch", // Para mejor desplazamiento en iOS
    },
    title: {
      color: "#FFB80A",
      marginBottom: "15px",
      fontSize: isMobile ? "1.5rem" : isTablet ? "1.8rem" : "2.5rem",
      textTransform: "uppercase",
      fontFamily: "Cinema",
      textShadow: "1px 1px 2px rgba(0, 0, 0, 0.2)",
      wordWrap: "break-word",
      hyphens: "auto",
    },
    pdfFrame: {
      width: "100%",
      height: isIOS ? "80vh" : "100%", // Altura fija para iOS
      border: "none",
      backgroundColor: "transparent",
      overflow: "auto",
      WebkitOverflowScrolling: "touch", // Para mejor desplazamiento en iOS
      maxWidth: "100%",
    },
    backButton: {
      backgroundColor: "#8b4513",
      border: "none",
      cursor: "pointer",
      position: "fixed",
      top: isMobile ? "10px" : "20px",
      left: isMobile ? "10px" : "20px",
      borderRadius: "50%",
      width: isMobile ? "35px" : "40px",
      height: isMobile ? "35px" : "40px",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      zIndex: "1000",
      opacity: "0.3",
      transition: "opacity 0.3s ease",
    },
    openExternalButton: {
      backgroundColor: "#8b4513",
      color: "white",
      border: "none",
      borderRadius: "5px",
      padding: "10px 15px",
      margin: "10px 0",
      cursor: "pointer",
      fontSize: "14px",
      display: isIOS ? "block" : "none", // Solo mostrar en iOS
    }
  };

  // Construir la URL del PDF con parámetros optimizados
  const optimizedPdfUrl = `${pdfUrl}#toolbar=0&navpanes=0&scrollbar=1&view=FitW&pagemode=thumbs`;

  return (
    <div style={styles.container}>
      <button
        onClick={handleBackClick}
        style={styles.backButton}
        onMouseOver={(e) => e.currentTarget.style.opacity = "1"}
        onMouseOut={(e) => e.currentTarget.style.opacity = "0.3"}
        onTouchStart={(e) => e.currentTarget.style.opacity = "1"}
        onTouchEnd={(e) => {
          setTimeout(() => {
            e.currentTarget.style.opacity = "0.3";
          }, 300);
        }}
      >
        <FaArrowLeft size={isMobile ? 14 : 16} color="#f5f5f5" />
      </button>
      
      <div style={styles.content}>
        <h1 style={styles.title}>{writingName}</h1>
        
        {isIOS && (
          <button 
            style={styles.openExternalButton}
            onClick={openPDFInNewTab}
          >
            Abrir PDF en nueva pestaña
          </button>
        )}
        
        <iframe 
          ref={iframeRef}
          src={optimizedPdfUrl}
          style={styles.pdfFrame}
          title={writingName}
          frameBorder="0"
          allowFullScreen={true}
          scrolling="auto"
        />
      </div>
    </div>
  );
}

export default PDFViewer;