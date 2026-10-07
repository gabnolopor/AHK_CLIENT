import React from 'react';
import { FiX } from 'react-icons/fi';

function GalleryLightbox({ isOpen, item, onClose, titleKey = 'name', descriptionKey = 'description' }) {
  if (!isOpen || !item) return null;

  const title = item[titleKey];
  const description = item[descriptionKey];

  return (
    <div
      className={`gallery-lightbox ${isOpen ? 'gallery-lightbox--open' : ''}`}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Artwork detail'}
    >
      <button
        type="button"
        className="gallery-lightbox__close"
        onClick={onClose}
        aria-label="Close"
      >
        <FiX size={22} />
      </button>

      <figure className="gallery-lightbox__figure" onClick={(e) => e.stopPropagation()}>
        <img
          src={item.imageUrl}
          alt={title || 'Artwork'}
          className="gallery-lightbox__image"
        />
        {(title || description) && (
          <figcaption className="gallery-lightbox__caption">
            {title && <h3>{title}</h3>}
            {description && <p>{description}</p>}
          </figcaption>
        )}
      </figure>
    </div>
  );
}

export default GalleryLightbox;
