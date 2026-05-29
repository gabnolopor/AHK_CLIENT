import React, { useEffect, useState } from 'react';
import { getWritingCategories } from '../config/writingCategories';
import '../styles/writingsStyles.css';
import '../styles/panorama.css';

function WritingCategoryModal({ isOpen, onClose, onSelectCategory }) {
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
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

  if (!isOpen) return null;

  const categories = getWritingCategories(isMobile);

  return (
    <div className="book-modal-overlay panorama-modal-layer" onClick={onClose}>
      <div
        className="book-modal-content writing-category-modal"
        onClick={(e) => e.stopPropagation()}
      >
        <button type="button" className="close-button" onClick={onClose}>
          &times;
        </button>
        <h2 className="writing-category-modal__title">Writing</h2>
        <p className="writing-category-modal__hint">Choose a category</p>
        <ul className="writing-category-shelf" aria-label="Writing categories">
          {categories.map((category) => (
            <li key={category} className="writing-category-shelf__item">
              <button
                type="button"
                className="writing-category-spine"
                onClick={() => onSelectCategory(category)}
              >
                <span className="writing-category-spine__lines" aria-hidden="true" />
                <span className="writing-category-spine__label">{category}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default WritingCategoryModal;
