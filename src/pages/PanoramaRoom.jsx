import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSettings } from 'react-icons/fi';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import {
  PANORAMA_HOTSPOTS,
  HOTSPOT_RADIUS,
  hotspotToVector3,
  vector3ToHotspotAngles,
  formatHotspotsForConfig,
} from '../config/panoramaHotspots';
import SiteNavMenu from '../components/SiteNavMenu';
import WritingCategoryModal from '../components/WritingCategoryModal';
import BookSelect from '../components/BookSelect';
import '../styles/artStyle.css';
import '../styles/landpage.css';
import '../styles/writingsStyles.css';
import '../styles/panorama.css';

const PANORAMA_IMAGE = '/sphere.jpg';

const PanoramaRoom = () => {
  const mountRef = useRef(null);
  const labelsMountRef = useRef(null);
  const navigate = useNavigate();
  const [isReady, setIsReady] = useState(false);
  const [exportText, setExportText] = useState('');
  const [copyStatus, setCopyStatus] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isWritingCategoryOpen, setIsWritingCategoryOpen] = useState(false);
  const [isBookModalOpen, setIsBookModalOpen] = useState(false);
  const [writingSection, setWritingSection] = useState('');
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const isAuthenticated =
    localStorage.getItem('isAdminAuthenticated') === 'true';
  const openMenuRef = useRef(() => {});
  const openWritingRef = useRef(() => {});
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

  const searchParams = new URLSearchParams(window.location.search);
  const isEdit = searchParams.get('edit') === '1';
  const isDebug = searchParams.get('debug') === '1';

  const updateExport = useCallback((hotspots) => {
    setExportText(formatHotspotsForConfig(hotspots));
  }, []);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!mountRef.current || !labelsMountRef.current) return;

    const hotspots = PANORAMA_HOTSPOTS.map((h) => ({ ...h }));
    updateExport(hotspots);

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

    const menuHotspot = PANORAMA_HOTSPOTS.find((h) => h.id === 'menu');
    if (menuHotspot) {
      const viewDirection = hotspotToVector3(menuHotspot.yaw, menuHotspot.pitch, 1);
      camera.position.copy(viewDirection.clone().multiplyScalar(-0.1));
    } else {
      camera.position.set(0, 0, 0.1);
    }
    controls.target.set(0, 0, 0);
    controls.update();

    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      controls.rotateSpeed = -0.25;
      controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    }

    let sphere = null;
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const setPointerFromEvent = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const positionFromPointer = (clientX, clientY) => {
      if (!sphere) return null;
      setPointerFromEvent(clientX, clientY);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObject(sphere);
      if (!hits.length) return null;
      return hits[0].point.clone().normalize().multiplyScalar(HOTSPOT_RADIUS);
    };

    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
      PANORAMA_IMAGE,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        texture.generateMipmaps = true;
        texture.minFilter = THREE.LinearMipmapLinearFilter;
        texture.magFilter = THREE.LinearFilter;
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();

        const geometry = new THREE.SphereGeometry(500, 64, 40);
        geometry.scale(-1, 1, 1);
        const material = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
        });
        sphere = new THREE.Mesh(geometry, material);
        scene.add(sphere);
        setIsReady(true);
      },
      undefined,
      (err) => console.error('Error loading panorama:', err)
    );

    let dragging = null;

    hotspots.forEach((hotspot) => {
      const el = document.createElement('button');
      el.type = 'button';
      const isMenuHotspot = hotspot.action === 'menu';
      el.className = `panorama-hotspot${isMenuHotspot ? ' panorama-hotspot--menu' : ''}${isEdit ? ' panorama-hotspot--draggable' : ''}`;
      el.setAttribute('aria-label', hotspot.label);
      el.innerHTML = `<span class="panorama-hotspot__dot"></span><span class="panorama-hotspot__label">${hotspot.label}</span>`;

      const label = new CSS2DObject(el);
      label.position.copy(hotspotToVector3(hotspot.yaw, hotspot.pitch));
      scene.add(label);

      if (isEdit) {
        const onPointerDown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          dragging = { label, hotspot, el };
          el.classList.add('panorama-hotspot--dragging');
          controls.enabled = false;
        };
        el.addEventListener('mousedown', onPointerDown);
        el.addEventListener('touchstart', (e) => {
          e.preventDefault();
          onPointerDown(e);
        }, { passive: false });
      } else {
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
      }
    });

    const onPointerMove = (clientX, clientY) => {
      if (!dragging) return;
      const pos = positionFromPointer(clientX, clientY);
      if (!pos) return;
      dragging.label.position.copy(pos);
      const angles = vector3ToHotspotAngles(pos);
      dragging.hotspot.yaw = angles.yaw;
      dragging.hotspot.pitch = angles.pitch;
    };

    const endDrag = () => {
      if (!dragging) return;
      dragging.el.classList.remove('panorama-hotspot--dragging');
      dragging = null;
      controls.enabled = true;
      updateExport(hotspots);
    };

    const onMouseMove = (e) => onPointerMove(e.clientX, e.clientY);
    const onMouseUp = () => endDrag();
    const onTouchMove = (e) => {
      if (!dragging || !e.touches[0]) return;
      onPointerMove(e.touches[0].clientX, e.touches[0].clientY);
    };
    const onTouchEnd = () => endDrag();

    if (isEdit) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      window.addEventListener('touchmove', onTouchMove, { passive: false });
      window.addEventListener('touchend', onTouchEnd);
    }

    let onDebugClick;
    if (isDebug) {
      onDebugClick = (event) => {
        if (dragging) return;
        const pos = positionFromPointer(event.clientX, event.clientY);
        if (!pos) return;
        const angles = vector3ToHotspotAngles(pos);
        console.log(
          `[panorama debug] { id: 'new', label: 'Label', path: '/ruta', yaw: ${angles.yaw}, pitch: ${angles.pitch} },`
        );
      };
      renderer.domElement.addEventListener('click', onDebugClick);
    }

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
      if (onDebugClick) {
        renderer.domElement.removeEventListener('click', onDebugClick);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      controls.dispose();
      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          const mats = Array.isArray(object.material)
            ? object.material
            : [object.material];
          mats.forEach((m) => {
            if (m.map) m.map.dispose();
            m.dispose();
          });
        }
      });
      renderer.dispose();
      if (mountRef.current?.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      if (labelsMountRef.current?.contains(labelRenderer.domElement)) {
        labelsMountRef.current.removeChild(labelRenderer.domElement);
      }
    };
  }, [navigate, isEdit, isDebug, updateExport]);

  const handleCopyConfig = async () => {
    const wrapped = `export const PANORAMA_HOTSPOTS = [\n${exportText}\n];`;
    try {
      await navigator.clipboard.writeText(wrapped);
      setCopyStatus('Copiado al portapapeles');
    } catch {
      setCopyStatus('Selecciona el texto y cópialo manualmente (Ctrl+C)');
    }
    setTimeout(() => setCopyStatus(''), 3000);
  };

  return (
    <div className={`panorama-room${isEdit ? ' panorama-room--edit' : ''}`}>
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

      {isEdit && (
        <aside className="panorama-edit-panel">
          <h2 className="panorama-edit-panel__title">Modo colocación</h2>
          <p className="panorama-edit-panel__hint">
            Arrastra cada punto sobre la escena. Luego copia el config y pégalo en{' '}
            <code>panoramaHotspots.js</code> (o envíamelo).
          </p>
          <textarea
            className="panorama-edit-panel__output"
            readOnly
            value={exportText}
            aria-label="Configuración de hotspots"
          />
          <button
            type="button"
            className="panorama-edit-panel__copy"
            onClick={handleCopyConfig}
          >
            Copiar config
          </button>
          {copyStatus && (
            <p className="panorama-edit-panel__status">{copyStatus}</p>
          )}
          <Link to="/" className="panorama-edit-panel__done">
            Ver tour final (sin arrastre)
          </Link>
        </aside>
      )}

      {isDebug && !isEdit && (
        <div className="panorama-debug-banner">
          Modo debug: clic en la escena → consola (F12)
        </div>
      )}

      {!isReady && (
        <div className="panorama-loading" aria-live="polite">
          Loading 360°…
        </div>
      )}
    </div>
  );
};

export default PanoramaRoom;
