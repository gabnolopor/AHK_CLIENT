import React from 'react';

function Paintwork({ isOpen, onClose }) {
  const handleClose = () => {
    onClose();
  };
  
  return (
    <div className={`paintwork-panel ${isOpen ? 'open' : ''}`}>
      <button 
        className="paintwork-panel__close"
        onClick={handleClose}
      >
        ×
      </button>
      <div className="paintwork-panel__content">
        Paintwork Content Here
      </div>
    </div>
  );
}

export default Paintwork;