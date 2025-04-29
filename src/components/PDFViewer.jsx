import React, { useState } from "react";
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

  React.useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 480);
      setIsTablet(window.innerWidth > 480 && window.innerWidth <= 768);
    };
    
    handleResize(); // Initial check
    window.addEventListener('resize', handleResize);
    
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const handleBackClick = () => {
    navigate(-1);
  };

  const styles = {
    container: {
      height: "100vh",
      width: "100vw",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundImage: "url('/cinema.jpg')",
      backgroundSize: isMobile ? "auto" : "cover",
      backgroundPosition: isMobile ? "-500px center" : "center",
      backgroundRepeat: "no-repeat",
      position: "relative",
      overflow: "hidden",
    },
    content: {
      width: isMobile ? "95%" : "90%",
      height: isMobile ? "85vh" : isTablet ? "80vh" : "90vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      position: "relative",
      boxSizing: "border-box",
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
      width: "70%",
      height: "100%",
      border: "none",
      backgroundColor: "transparent",
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
    }
  };

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
        <iframe 
          src={`${pdfUrl}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`} 
          style={styles.pdfFrame}
          title={writingName}
        />
      </div>
    </div>
  );
}

export default PDFViewer;