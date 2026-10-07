import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { apiService } from '../services/api';
import LoadingFallback from '../components/LoadingFallback';
import GalleryLightbox from '../components/GalleryLightbox';
import '../styles/artStyle.css';
import { Link } from 'react-router-dom';
import { FaImage } from 'react-icons/fa';
import {
  initGalleryRoom,
  preloadGalleryTextures,
  createGalleryTextureLoader,
} from '../utils/galleryRoom3D';
import { DEFAULT_HANG_ZONES, loadHangZones } from '../utils/wallZoneConfig';

const MAX_PHOTOS_3D = 20;
/** Mismo almacén 3D que pinturas (`merge_xyz.glb` en galleryRoom3D). Zonas propias o las de paintings. */
const ROOM_ZONE_KEY = 'photos';
const PAINTINGS_ZONE_KEY = 'paintings';

const Photo3DRoom = () => {
  const mountRef = useRef(null);
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [texturesLoaded, setTexturesLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState(null);
  const hangZones =
    loadHangZones(ROOM_ZONE_KEY)
    ?? loadHangZones(PAINTINGS_ZONE_KEY)
    ?? DEFAULT_HANG_ZONES;

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const data = await apiService.getAllPhotography();
        setPhotos(data);
      } catch (error) {
        console.error('Error fetching photos:', error);
        setIsLoading(false);
      }
    };

    fetchPhotos();
  }, []);

  useEffect(() => {
    if (photos.length === 0) return;

    const loadingManager = new THREE.LoadingManager();
    const totalItems = 1 + Math.min(photos.length, MAX_PHOTOS_3D);

    loadingManager.onLoad = () => {
      setTexturesLoaded(true);
      setTimeout(() => setIsLoading(false), 400);
    };

    loadingManager.onProgress = (_, itemsLoaded) => {
      if (itemsLoaded >= totalItems) {
        setTexturesLoaded(true);
        setTimeout(() => setIsLoading(false), 400);
      }
    };

    loadingManager.onError = (url) => {
      console.error('Error loading texture:', url);
    };

    const textureLoader = createGalleryTextureLoader(loadingManager);
    preloadGalleryTextures(textureLoader, photos, MAX_PHOTOS_3D, {
      loadingManager,
    });
  }, [photos]);

  useEffect(() => {
    if (isLoading || !texturesLoaded || photos.length === 0 || !mountRef.current) return;

    let cancelled = false;
    let roomApi = null;

    (async () => {
      roomApi = await initGalleryRoom(
        mountRef.current,
        photos,
        {
          maxDisplay: MAX_PHOTOS_3D,
          itemKey: 'photo',
          initialYaw: 0,
          roomLabel: 'Sala de fotos',
          placeArtwork: true,
          entryWallOnly: true,
          hangZones,
          showPositionDebug: false,
        },
        (photo) => {
          setSelectedPhoto(photo);
          setIsModalOpen(true);
        }
      );

      if (cancelled) {
        roomApi.dispose();
      }
    })();

    return () => {
      cancelled = true;
      roomApi?.dispose();
    };
  }, [isLoading, texturesLoaded, photos, hangZones]);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPhoto(null);
  };

  if (isLoading || !texturesLoaded) {
    return <LoadingFallback />;
  }

  if (photos.length === 0 && !isLoading) {
    return <div className="no-content">No photos available</div>;
  }

  return (
    <div className="three-d-room-container">
      <p className="gallery-nav-hint gallery-nav-controls-hint">
        Drag to look · Arrows to walk · Click photo · R to reset
      </p>

      <Link to="/photoroom" className="view-2d-button">
        <FaImage className="view-2d-icon" />
        <span className="view-2d-tooltip">View in 2D Gallery</span>
      </Link>

      <div
        className="art-container"
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          touchAction: 'none',
        }}
      >
        <div ref={mountRef} style={{ width: '100%', height: '100%' }} />

        <GalleryLightbox
          isOpen={isModalOpen}
          item={selectedPhoto}
          onClose={closeModal}
        />
      </div>
    </div>
  );
};

export default Photo3DRoom;
