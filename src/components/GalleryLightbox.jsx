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
      <figure className="gallery-lightbox__figure" onClick={(e) => e.stopPropagation()}>
        <div className="gallery-lightbox__image-wrap">
          <img
            src={item.imageUrl}
            alt={title || 'Artwork'}
            className="gallery-lightbox__image"
          />
          <button
            type="button"
            className="gallery-lightbox__close"
            onClick={(e) => {
              e.stopPropagation();
              onClose();
            }}
            aria-label="Cerrar"
          >
            <FiX size={20} strokeWidth={2.25} />
          </button>
        </div>
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
