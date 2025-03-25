import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { FaArrowLeft } from "react-icons/fa";
import "../styles/writingsStyles.css";

function TextContentPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { writingName, textContent } = location.state || {
    writingName: "",
    textContent: "",
  };

  const handleBackClick = () => {
    navigate(-1);
  };

  // Split the text content into larger sections
  const sections = textContent.match(/(.|[\r\n]){1,3500}/g) || []; // Adjust the number to fit your design

  return (
    <div
      style={{
        height: "100vh",
        overflowY: "scroll",
        scrollSnapType: "y mandatory",
        backgroundColor: "#f5f5f5",
        fontFamily: "system-ui",
      }}
    >
      <button
        onClick={handleBackClick}
        className="back-textButton"
      >
        <FaArrowLeft size={16} color="#f5f5f5" />
      </button>
      {sections.map((section, index) => (
        <div
          key={index}
          style={{
            height: "100vh",
            scrollSnapAlign: "start",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            padding: "20px",
          }}
        >
          {index === 0 && (
            <h1
              style={{
                textAlign: "center",
                color: "#8B4513",
                marginBottom: "20px",
                fontSize: "2rem",
                textTransform: "uppercase",
              }}
            >
              {writingName}
            </h1>
          )}
          <pre
            style={{
              whiteSpace: "pre-wrap",
              lineHeight: "2",
              color: "#333",
              flexGrow: 1,
              fontFamily: "system-ui",
              textAlign: "justify",
            }}
          >
            {section}
          </pre>
        </div>
      ))}
    </div>
  );
}

export default TextContentPage;