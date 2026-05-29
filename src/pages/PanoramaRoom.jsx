import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiSettings } from 'react-icons/fi';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer';
import {
  PANORAMA_HOTSPOTS,
  PANORAMA_INITIAL_VIEW,
  HOTSPOT_RADIUS,
  hotspotToVector3,
  vector3ToHotspotAngles,
  formatHotspotsForConfig,
  DEFAULT_HOTSPOT_HIT,
  applyHotspotDimensions,
  getHotspotHitSize,
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
  parsePanoramaTimeOverride,
  PANORAMA_CROSSFADE_MS,
} from '../config/panoramaAmbience';

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
  const hotspotsRef = useRef(PANORAMA_HOTSPOTS.map((h) => ({ ...h })));
  const registryRef = useRef(new Map());
  const selectHotspotRef = useRef(() => {});
  const syncEditSizeRef = useRef(() => {});
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
  const ambienceOverride = parsePanoramaTimeOverride(
    searchParams.get('panoramaTime')
  );

  const [selectedHotspotId, setSelectedHotspotId] = useState(null);
  const [editHitW, setEditHitW] = useState(DEFAULT_HOTSPOT_HIT.w);
  const [editHitH, setEditHitH] = useState(DEFAULT_HOTSPOT_HIT.h);

  const updateExport = useCallback((hotspots) => {
    setExportText(formatHotspotsForConfig(hotspots));
  }, []);

  const isCompactMobile = () =>
    !isEdit && window.innerWidth <= 768;

  const syncHotspotElement = useCallback((entry) => {
    const { el, hotspot } = entry;
    applyHotspotDimensions(el, hotspot, { compactMobile: isCompactMobile() });
    el.classList.toggle(
      'panorama-hotspot--sized',
      hotspot.hitW != null || hotspot.hitH != null
    );
  }, [isEdit]);

  const selectHotspotById = useCallback(
    (id) => {
      if (!id) {
        setSelectedHotspotId(null);
        registryRef.current.forEach(({ el }) => {
          el.classList.remove('panorama-hotspot--selected');
        });
        return;
      }
      setSelectedHotspotId(id);
      registryRef.current.forEach(({ el }, hid) => {
        el.classList.toggle('panorama-hotspot--selected', hid === id);
      });
      const hotspot = hotspotsRef.current.find((h) => h.id === id);
      if (hotspot) {
        const size = getHotspotHitSize(hotspot);
        setEditHitW(size.w);
        setEditHitH(size.h);
      }
    },
    []
  );

  selectHotspotRef.current = selectHotspotById;
  syncEditSizeRef.current = (w, h) => {
    setEditHitW(w);
    setEditHitH(h);
  };

  const applySizeToSelected = useCallback(
    (w, h) => {
      if (!selectedHotspotId) return;
      const entry = registryRef.current.get(selectedHotspotId);
      if (!entry) return;
      entry.hotspot.hitW = w;
      entry.hotspot.hitH = h;
      syncHotspotElement(entry);
      updateExport(hotspotsRef.current);
      setEditHitW(w);
      setEditHitH(h);
    },
    [selectedHotspotId, syncHotspotElement, updateExport]
  );

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    if (!mountRef.current || !labelsMountRef.current) return;

    const hotspots = hotspotsRef.current;
    registryRef.current.clear();
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

    let panoramaMeshes = [];
    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();

    const setPointerFromEvent = (clientX, clientY) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    };

    const positionFromPointer = (clientX, clientY) => {
      if (!panoramaMeshes.length) return null;
      setPointerFromEvent(clientX, clientY);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(panoramaMeshes);
      if (!hits.length) return null;
      return hits[0].point.clone().normalize().multiplyScalar(HOTSPOT_RADIUS);
    };

    const textureLoader = new THREE.TextureLoader();
    const textureCache = new Map();
    let ambienceTimer = null;
    let fadeFrameId = null;
    let cancelled = false;
    let currentAmbience = getPanoramaAmbience(new Date(), ambienceOverride);
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
    panoramaMeshes = [meshA, meshB];

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

    let dragging = null;
    let resizing = null;

    const compactMobile = !isEdit && window.innerWidth <= 768;

    const syncEntry = (entry) => {
      applyHotspotDimensions(entry.el, entry.hotspot, { compactMobile });
      entry.el.classList.toggle(
        'panorama-hotspot--sized',
        entry.hotspot.hitW != null || entry.hotspot.hitH != null
      );
    };

    const refreshAllHotspotSizes = () => {
      const compact = !isEdit && window.innerWidth <= 768;
      registryRef.current.forEach((entry) => {
        applyHotspotDimensions(entry.el, entry.hotspot, { compactMobile: compact });
      });
    };

    hotspots.forEach((hotspot) => {
      const el = document.createElement('button');
      el.type = 'button';
      const isMenuHotspot = hotspot.action === 'menu';
      el.className = `panorama-hotspot${isMenuHotspot ? ' panorama-hotspot--menu' : ''}${isEdit ? ' panorama-hotspot--draggable' : ''}`;
      el.setAttribute('aria-label', hotspot.label);
      el.innerHTML = `<span class="panorama-hotspot__dot"></span><span class="panorama-hotspot__label">${hotspot.label}</span><span class="panorama-hotspot__resize" aria-hidden="true"></span>`;

      const entry = { el, hotspot, label: null };
      syncEntry(entry);

      const label = new CSS2DObject(el);
      label.position.copy(hotspotToVector3(hotspot.yaw, hotspot.pitch));
      entry.label = label;
      scene.add(label);
      registryRef.current.set(hotspot.id, entry);

      const resizeHandle = el.querySelector('.panorama-hotspot__resize');

      if (isEdit) {
        const onPointerDown = (e) => {
          if (e.target === resizeHandle) return;
          e.preventDefault();
          e.stopPropagation();
          selectHotspotRef.current(hotspot.id);
          dragging = { label, hotspot, el };
          el.classList.add('panorama-hotspot--dragging');
          controls.enabled = false;
        };
        el.addEventListener('mousedown', onPointerDown);
        el.addEventListener('touchstart', (e) => {
          if (e.target === resizeHandle) return;
          e.preventDefault();
          onPointerDown(e);
        }, { passive: false });

        const onResizeDown = (e) => {
          e.preventDefault();
          e.stopPropagation();
          selectHotspotRef.current(hotspot.id);
          const size = getHotspotHitSize(hotspot);
          const clientX = e.clientX ?? e.touches?.[0]?.clientX;
          const clientY = e.clientY ?? e.touches?.[0]?.clientY;
          resizing = {
            entry,
            startX: clientX,
            startY: clientY,
            startW: size.w,
            startH: size.h,
          };
          controls.enabled = false;
        };
        resizeHandle.addEventListener('mousedown', onResizeDown);
        resizeHandle.addEventListener('touchstart', (e) => {
          e.preventDefault();
          onResizeDown(e);
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
      if (resizing) {
        const dw = clientX - resizing.startX;
        const dh = clientY - resizing.startY;
        const w = Math.round(Math.max(20, Math.min(480, resizing.startW + dw)));
        const h = Math.round(Math.max(20, Math.min(480, resizing.startH + dh)));
        resizing.entry.hotspot.hitW = w;
        resizing.entry.hotspot.hitH = h;
        syncEntry(resizing.entry);
        syncEditSizeRef.current(w, h);
        updateExport(hotspots);
        return;
      }
      if (!dragging) return;
      const pos = positionFromPointer(clientX, clientY);
      if (!pos) return;
      dragging.label.position.copy(pos);
      const angles = vector3ToHotspotAngles(pos);
      dragging.hotspot.yaw = angles.yaw;
      dragging.hotspot.pitch = angles.pitch;
    };

    const endDrag = () => {
      if (resizing) {
        resizing = null;
        controls.enabled = true;
        updateExport(hotspots);
        return;
      }
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

    const onWindowResizeHotspots = () => refreshAllHotspotSizes();
    window.addEventListener('resize', onWindowResizeHotspots);

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
      cancelled = true;
      clearTimeout(ambienceTimer);
      if (fadeFrameId) cancelAnimationFrame(fadeFrameId);
      if (onDebugClick) {
        renderer.domElement.removeEventListener('click', onDebugClick);
      }
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
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
  }, [navigate, isEdit, isDebug, ambienceOverride, updateExport]);

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
            Arrastra para mover. Ajusta ancho/alto o la esquina amarilla. Copia el config a{' '}
            <code>panoramaHotspots.js</code>.
          </p>

          <div className="panorama-edit-panel__field">
            <label htmlFor="hotspot-select">Hotspot</label>
            <select
              id="hotspot-select"
              value={selectedHotspotId ?? ''}
              onChange={(e) => selectHotspotById(e.target.value || null)}
            >
              <option value="">— Selecciona —</option>
              {PANORAMA_HOTSPOTS.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.label} ({h.id})
                </option>
              ))}
            </select>
          </div>

          {selectedHotspotId && (
            <div className="panorama-edit-panel__size-row">
              <div className="panorama-edit-panel__field">
                <label htmlFor="hit-w">Ancho (px)</label>
                <input
                  id="hit-w"
                  type="range"
                  min={20}
                  max={400}
                  value={editHitW}
                  onChange={(e) =>
                    applySizeToSelected(Number(e.target.value), editHitH)
                  }
                />
                <span className="panorama-edit-panel__size-value">{editHitW}px</span>
              </div>
              <div className="panorama-edit-panel__field">
                <label htmlFor="hit-h">Alto (px)</label>
                <input
                  id="hit-h"
                  type="range"
                  min={20}
                  max={400}
                  value={editHitH}
                  onChange={(e) =>
                    applySizeToSelected(editHitW, Number(e.target.value))
                  }
                />
                <span className="panorama-edit-panel__size-value">{editHitH}px</span>
              </div>
            </div>
          )}

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
            Ver tour final (sin edit)
          </Link>
        </aside>
      )}

      {isDebug && !isEdit && (
        <div className="panorama-debug-banner">
          Debug: clic → consola (F12). Ambiente: ?panoramaTime=day|dusk|night
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
