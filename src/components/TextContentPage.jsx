import React, { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../styles/writingsStyles.css";
import { parse } from 'rtf-parser';

function TextContentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { writingName, textContent } = location.state || {
    writingName: "",
    textContent: "",
  };
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [parsedContent, setParsedContent] = useState("");

  useEffect(() => {
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

  useEffect(() => {
    // Check if content is RTF
    if (textContent && typeof textContent === 'string' && textContent.trim().startsWith("{\\rtf")) {
      // Use rtf-parser to convert RTF to plain text
      parse(textContent, (err, document) => {
        if (err) {
          console.error("Error parsing RTF:", err);
          setParsedContent(textContent);
          return;
        }
        
        // Extract text content from the parsed document
        let plainText = '';
        const extractText = (content) => {
          if (!content) return;
          
          content.forEach(item => {
            if (typeof item === 'string') {
              plainText += item;
            } else if (item.content) {
              extractText(item.content);
            }
            
            // Add newlines for paragraphs
            if (item.style && item.style.paragraph) {
              plainText += '\n';
            }
          });
        };
        
        extractText(document.content);
        setParsedContent(plainText.trim());
      });
    } else {
      // If it's not RTF, use the original content
      setParsedContent(textContent);
    }
  }, [textContent]);

  const handleBackClick = () => {
    navigate(-1);
  };

  const styles = {
    bookContainer: {
      height: "100vh",
      width: "100vw",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      backgroundImage: "url('/old-paper.jpg')",
      backgroundSize: isMobile ? "auto" : "cover",
      backgroundPosition: isMobile ? "-500px center" : "center",
      backgroundRepeat: "no-repeat",
      position: "relative",
      overflow: "hidden",
    },
    bookContent: {
      width: isMobile ? "90%" : "100%",
      maxWidth: "900px",
      height: isMobile ? "85vh" : isTablet ? "80vh" : "85vh",
      display: "flex",
      flexDirection: "column",
      padding: isMobile ? "15px 10px" : isTablet ? "25px 15px" : "40px 20px",
      position: "relative",
      boxSizing: "border-box",
    },
    bookPageContent: {
      flex: 1,
      overflowY: "auto",
      overflowX: "hidden",
      padding: isMobile ? "5px" : isTablet ? "8px" : "10px",
      scrollbarWidth: "thin",
      scrollbarColor: "#8b4513 transparent",
      boxSizing: "border-box",
    },
    bookPageTitle: {
      textAlign: "center",
      color: "#4a2511",
      marginBottom: isMobile ? "15px" : isTablet ? "20px" : "30px",
      fontSize: isMobile ? "1.5rem" : isTablet ? "1.8rem" : "2.2rem",
      textTransform: "uppercase",
      fontFamily: "'Georgia', serif",
      textShadow: "1px 1px 2px rgba(0, 0, 0, 0.2)",
      wordWrap: "break-word",
      hyphens: "auto",
    },
    bookPageText: {
      whiteSpace: "pre-wrap",
      lineHeight: isMobile ? "1.4" : isTablet ? "1.5" : "1.6",
      color: "#333",
      fontFamily: "'Georgia', serif",
      fontSize: isMobile ? "0.9rem" : isTablet ? "1rem" : "1.1rem",
      textAlign: "justify",
      overflowWrap: "break-word",
      wordWrap: "break-word",
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
    }
  };

  return (
    <div style={styles.bookContainer}>
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
      
      <div style={styles.bookContent}>
        <div style={styles.bookPageContent}>
          <h1 style={styles.bookPageTitle}>
            {writingName}
          </h1>
          <pre style={styles.bookPageText}>
            {parsedContent}
          </pre>
        </div>
      </div>
    </div>
  );
}

export default TextContentPage;