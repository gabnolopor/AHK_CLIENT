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

const MAX_PAINTINGS_3D = 10;
const ROOM_ZONE_KEY = 'paintings';

const ThreeDRoom = () => {
  const mountRef = useRef(null);
  const [paintings, setPaintings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [texturesLoaded, setTexturesLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPainting, setSelectedPainting] = useState(null);
  const hangZones = loadHangZones(ROOM_ZONE_KEY) ?? DEFAULT_HANG_ZONES;

  useEffect(() => {
    const fetchPaintings = async () => {
      try {
        const data = await apiService.getAllPaintings();
        setPaintings(data);
      } catch (error) {
        console.error('Error fetching paintings:', error);
        setIsLoading(false);
      }
    };

    fetchPaintings();
  }, []);

  useEffect(() => {
    if (paintings.length === 0) return;

    const loadingManager = new THREE.LoadingManager();
    const totalItems = 1 + Math.min(paintings.length, MAX_PAINTINGS_3D);

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
    preloadGalleryTextures(textureLoader, paintings, MAX_PAINTINGS_3D, {
      loadingManager,
    });
  }, [paintings]);

  useEffect(() => {
    if (isLoading || !texturesLoaded || paintings.length === 0 || !mountRef.current) return;

    let cancelled = false;
    let roomApi = null;

    (async () => {
      roomApi = await initGalleryRoom(
        mountRef.current,
        paintings,
        {
          maxDisplay: MAX_PAINTINGS_3D,
          itemKey: 'painting',
          initialYaw: 0,
          roomLabel: 'Sala de pinturas',
          placeArtwork: true,
          entryWallOnly: true,
          hangZones,
          showPositionDebug: false,
        },
        (painting) => {
          setSelectedPainting(painting);
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
  }, [isLoading, texturesLoaded, paintings, hangZones]);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPainting(null);
  };

  if (isLoading || !texturesLoaded) {
    return <LoadingFallback />;
  }

  if (paintings.length === 0 && !isLoading) {
    return <div className="no-content">No artwork available</div>;
  }

  return (
    <div className="three-d-room-container">
      <p className="gallery-nav-hint gallery-room-title">Sala de pinturas · máx. {MAX_PAINTINGS_3D}</p>
      <p className="gallery-nav-hint gallery-nav-controls-hint">
        Drag to look · Arrows to walk · Click artwork · R to reset
      </p>

      <Link to="/artroom" className="view-2d-button">
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
          item={selectedPainting}
          onClose={closeModal}
        />
      </div>
    </div>
  );
};

export default ThreeDRoom;
