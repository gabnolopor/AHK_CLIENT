import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiSettings } from 'react-icons/fi';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import {
  PANORAMA_HOTSPOTS,
  PANORAMA_INITIAL_VIEW,
  hotspotToVector3,
  applyHotspotDimensions,
} from '../config/panoramaHotspots';
import SiteNavMenu from '../components/SiteNavMenu';
import WritingCategoryModal from '../components/WritingCategoryModal';
import BookSelect from '../components/BookSelect';
import '../styles/artStyle.css';
import '../styles/landpage.css';
import '../styles/writingsStyles.css';
import '../styles/panorama.css';

import {
  getPanoramaAmbience,
  getAmbienceImage,
  getMsUntilNextAmbienceChange,
  PANORAMA_CROSSFADE_MS,
} from '../config/panoramaAmbience';

const PanoramaRoom = () => {
  const mountRef = useRef(null);
  const labelsMountRef = useRef(null);
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWritingCategoryOpen, setIsWritingCategoryOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [writingSection, setWritingSection] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const isAuthenticated =
    localStorage.getItem('isAdminAuthenticated') === 'true';
  const openMenuRef = useRef(() => {});
  const openWritingRef = useRef(() => {});
  const registryRef = useRef(new Map());
  openMenuRef.current = () => setIsMenuOpen(true);
  openWritingRef.current = () => setIsWritingCategoryOpen(true);

  const handleWritingCategorySelect = (section) => {
    setIsWritingCategoryOpen(false);
    setWritingSection(section);
    setIsBookModalOpen(true);
  };

  const closeBookModal = () => {
    setIsBookModalOpen(false);
    setWritingSection('');
  };

  const handleBookModalBack = () => {
    setIsBookModalOpen(false);
    setIsWritingCategoryOpen(true);
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!mountRef.current || !labelsMountRef.current) return;

    const hotspots = PANORAMA_HOTSPOTS;
    registryRef.current.clear();

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    camera.position.set(0, 0, 0.1);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mountRef.current.appendChild(renderer.domElement);

    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.className = 'panorama-label-layer';
    labelsMountRef.current.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableZoom = false;
    controls.enablePan = false;
    controls.rotateSpeed = -0.35;

    const viewDirection = hotspotToVector3(
      PANORAMA_INITIAL_VIEW.yaw,
      PANORAMA_INITIAL_VIEW.pitch,
      1
    );
    camera.position.copy(viewDirection.clone().multiplyScalar(-0.1));
    controls.target.set(0, 0, 0);
    controls.update();

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      controls.rotateSpeed = -0.25;
      controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    }

    const textureLoader = new THREE.TextureLoader();
    const textureCache = new Map();
    let ambienceTimer = null;
    let fadeFrameId = null;
    let cancelled = false;
    let currentAmbience = getPanoramaAmbience(new Date());
    let activeIsA = true;

    const sharedGeometry = new THREE.SphereGeometry(500, 64, 40);
    sharedGeometry.scale(-1, 1, 1);

    const createPanoramaMaterial = () =>
      new THREE.MeshBasicMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      });

    const meshA = new THREE.Mesh(sharedGeometry, createPanoramaMaterial());
    const meshB = new THREE.Mesh(sharedGeometry, createPanoramaMaterial());
    meshA.renderOrder = 0;
    meshB.renderOrder = 1;
    scene.add(meshA, meshB);

    const getActiveMesh = () => (activeIsA ? meshA : meshB);
    const getInactiveMesh = () => (activeIsA ? meshB : meshA);

    const configureTexture = (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      texture.generateMipmaps = true;
      texture.minFilter = THREE.LinearMipmapLinearFilter;
      texture.magFilter = THREE.LinearFilter;
      texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      return texture;
    };

    const loadAmbienceTexture = (ambience) =>
      new Promise((resolve, reject) => {
        if (textureCache.has(ambience)) {
          resolve(textureCache.get(ambience));
          return;
        }
        textureLoader.load(
          getAmbienceImage(ambience),
          (texture) => {
            configureTexture(texture);
            textureCache.set(ambience, texture);
            resolve(texture);
          },
          undefined,
          reject
        );
      });

    const crossfadeToAmbience = (nextAmbience) =>
      new Promise((resolve, reject) => {
        if (cancelled || nextAmbience === currentAmbience) {
          resolve();
          return;
        }

        loadAmbienceTexture(nextAmbience)
          .then((texture) => {
            if (cancelled) {
              resolve();
              return;
            }

            const outgoing = getActiveMesh();
            const incoming = getInactiveMesh();

            incoming.material.map = texture;
            incoming.material.opacity = 0;
            incoming.material.needsUpdate = true;
            incoming.renderOrder = 1;
            outgoing.renderOrder = 0;

            const start = performance.now();

            const tick = (now) => {
              if (cancelled) {
                resolve();
                return;
              }

              const t = Math.min(1, (now - start) / PANORAMA_CROSSFADE_MS);
              const eased = t * t * (3 - 2 * t);
              outgoing.material.opacity = 1 - eased;
              incoming.material.opacity = eased;

              if (t < 1) {
                fadeFrameId = requestAnimationFrame(tick);
              } else {
                outgoing.material.opacity = 0;
                incoming.material.opacity = 1;
                activeIsA = !activeIsA;
                currentAmbience = nextAmbience;
                fadeFrameId = null;
                resolve();
              }
            };

            fadeFrameId = requestAnimationFrame(tick);
          })
          .catch(reject);
      });

    const scheduleAmbienceChange = () => {
      if (ambienceOverride || cancelled) return;
      clearTimeout(ambienceTimer);
      const delay = getMsUntilNextAmbienceChange(new Date()) + 100;
      ambienceTimer = setTimeout(async () => {
        if (cancelled) return;
        const next = getPanoramaAmbience(new Date());
        try {
          await crossfadeToAmbience(next);
        } catch (err) {
          console.error('Error al cambiar ambiente del panorama:', err);
        }
        scheduleAmbienceChange();
      }, delay);
    };

    loadAmbienceTexture(currentAmbience)
      .then((texture) => {
        if (cancelled) return;
        meshA.material.map = texture;
        meshA.material.opacity = 1;
        meshA.material.needsUpdate = true;
        activeIsA = true;
        setIsReady(true);
        scheduleAmbienceChange();
      })
      .catch((err) => console.error('Error loading panorama:', err));

    const compactMobile = window.innerWidth <= 768;

    const syncEntry = (entry) => {
      applyHotspotDimensions(entry.el, entry.hotspot, { compactMobile });
      entry.el.classList.toggle(
        'panorama-hotspot--sized',
        entry.hotspot.hitW != null || entry.hotspot.hitH != null
      );
    };

    const refreshAllHotspotSizes = () => {
      const compact = window.innerWidth <= 768;
      registryRef.current.forEach((entry) => {
        applyHotspotDimensions(entry.el, entry.hotspot, { compactMobile: compact });
      });
    };

    hotspots.forEach((hotspot) => {
      const el = document.createElement('button');
      el.type = 'button';
      const isMenuHotspot = hotspot.action === 'menu';
      el.className = `panorama-hotspot${isMenuHotspot ? ' panorama-hotspot--menu' : ''}`;
      el.setAttribute('aria-label', hotspot.label);
      el.innerHTML = `<span class="panorama-hotspot__dot"></span><span class="panorama-hotspot__label">${hotspot.label}</span>`;

      const entry = { el, hotspot, label: null };
      syncEntry(entry);

      const label = new CSS2DObject(el);
      label.position.copy(hotspotToVector3(hotspot.yaw, hotspot.pitch));
      entry.label = label;
      scene.add(label);
      registryRef.current.set(hotspot.id, entry);

      el.addEventListener('click', (e) => {
        e.stopPropagation();
        if (hotspot.action === 'menu') {
          openMenuRef.current();
        } else if (hotspot.action === 'writing') {
          openWritingRef.current();
        } else {
          navigate(hotspot.path);
        }
      });
    });

    const onWindowResizeHotspots = () => refreshAllHotspotSizes();
    window.addEventListener('resize', onWindowResizeHotspots);

    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      cancelled = true;
      clearTimeout(ambienceTimer);
      if (fadeFrameId) cancelAnimationFrame(fadeFrameId);
      window.removeEventListener('resize', onWindowResizeHotspots);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      controls.dispose();
      textureCache.forEach((texture) => texture.dispose());
      meshA.material.dispose();
      meshB.material.dispose();
      sharedGeometry.dispose();
      renderer.dispose();
      registryRef.current.clear();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (labelsMountRef.current?.contains(labelRenderer.domElement)) {
        labelsMountRef.current.removeChild(labelRenderer.domElement);
      }
    };
  }, [navigate]);

  return (
    <div className="panorama-room">
      <div
        className="panorama-canvas-wrap"
        ref={mountRef}
        style={{ touchAction: 'none' }}
      />
      <div className="panorama-labels-mount" ref={labelsMountRef} />

      {isAuthenticated && !isMenuOpen && (
        <button
          type="button"
          className="control-panel-button"
          onClick={() => navigate('/admin')}
          style={{
            position: 'fixed',
            top: isMobile ? '10px' : '1rem',
            right: isMobile ? '10px' : '1rem',
            zIndex: 10000,
            padding: isMobile ? '0.5rem 1rem' : '0.75rem 1.5rem',
            fontSize: isMobile ? '0.9rem' : '1.1rem',
          }}
        >
          <FiSettings /> {isMobile ? 'Admin' : 'Control Panel'}
        </button>
      )}

      <button
        type="button"
        className="logo-link panorama-logo-menu"
        onClick={() => setIsMenuOpen(true)}
        aria-label="Open menu"
      >
        <img src="/black-logo.png" className="logo" alt="" />
      </button>

      <SiteNavMenu isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

      <WritingCategoryModal
        isOpen={isWritingCategoryOpen}
        onClose={() => setIsWritingCategoryOpen(false)}
        onSelectCategory={handleWritingCategorySelect}
      />

      <BookSelect
        isOpen={isBookModalOpen}
        onClose={closeBookModal}
        onBack={handleBookModalBack}
        section={writingSection}
      />

      {!isReady && (
        <div className="panorama-loading" aria-live="polite">
          Loading 360°…
        </div>
      )}
    </div>
  );
};

export default PanoramaRoom;
