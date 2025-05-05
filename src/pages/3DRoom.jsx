import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { apiService } from '../services/api';
import LoadingFallback from '../components/LoadingFallback';
import { FiX } from 'react-icons/fi';
import '../styles/artStyle.css'; // Reusing the same styles as ArtRoom

const ThreeDRoom = () => {
  const mountRef = useRef(null);
  const [paintings, setPaintings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPainting, setSelectedPainting] = useState(null);

  useEffect(() => {
    // Fetch paintings data
    const fetchPaintings = async () => {
      try {
        const data = await apiService.getAllPaintings();
        setPaintings(data);
        setIsLoading(false);
      } catch (error) {
        console.error('Error fetching paintings:', error);
        setIsLoading(false);
      }
    };

    fetchPaintings();
  }, []);

  useEffect(() => {
    if (isLoading || paintings.length === 0) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    // Camera setup
    const camera = new THREE.PerspectiveCamera(
      75, 
      window.innerWidth / window.innerHeight, 
      0.1, 
      1000
    );
    camera.position.z = 0;
    camera.position.y = 2;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    // Reduce polygon count or texture quality on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // Use simpler geometries or lower resolution textures
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      controls.rotateSpeed = 0.7;
      controls.enableZoom = true;
      controls.enablePan = false; // Disable panning on mobile
      controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    }

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0, 0);
    controls.update();

    // Room dimensions - increased size
    const roomWidth = 16;
    const roomHeight = 10;
    const roomDepth = 16;

    // Load textures
    const textureLoader = new THREE.TextureLoader();
    
    // Create individual walls with different textures
    const createRoom = () => {
      // Wall material (all walls use the same texture for now)
      const wallTexture = textureLoader.load('/wallTexture.jpg');
      wallTexture.wrapS = THREE.ClampToEdgeWrapping;
      wallTexture.wrapT = THREE.ClampToEdgeWrapping;
      
      const wallMaterial = new THREE.MeshStandardMaterial({ 
        map: wallTexture,
        side: THREE.BackSide
      });
      
      // Create room as a box with BackSide material
      const room = new THREE.Mesh(
        new THREE.BoxGeometry(roomWidth, roomHeight, roomDepth),
        wallMaterial
      );
      scene.add(room);
      
      // Add floor with floor texture
      const floorTexture = textureLoader.load('/floorTexture.jpg');
      floorTexture.wrapS = THREE.ClampToEdgeWrapping;
      floorTexture.wrapT = THREE.ClampToEdgeWrapping;
      
      const floorGeometry = new THREE.PlaneGeometry(roomWidth - 0.1, roomDepth - 0.1);
      const floorMaterial = new THREE.MeshStandardMaterial({ 
        map: floorTexture
      });
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -roomHeight/2 + 0.01; // Slightly above the bottom wall
      scene.add(floor);
      
      // Add ceiling with ceiling texture
      const ceilingTexture = textureLoader.load('/ceilingTexture.jpg');
      ceilingTexture.wrapS = THREE.ClampToEdgeWrapping;
      ceilingTexture.wrapT = THREE.ClampToEdgeWrapping;
      
      const ceilingGeometry = new THREE.PlaneGeometry(roomWidth - 0.1, roomDepth - 0.1);
      const ceilingMaterial = new THREE.MeshStandardMaterial({ 
        map: ceilingTexture
      });
      const ceiling = new THREE.Mesh(ceilingGeometry, ceilingMaterial);
      ceiling.rotation.x = Math.PI / 2;
      ceiling.position.y = roomHeight/2 - 0.01; // Slightly below the top wall
      scene.add(ceiling);
    };
    
    createRoom();

    // Raycaster for detecting clicks on paintings
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const paintingMeshes = []; // Store references to painting meshes

    // Add paintings to walls
    const frameGeometry = new THREE.PlaneGeometry(3.5, 4.5); // Increased size from 2.5x3.5 to 3.5x4.5
    
    // Create canvas for text - with reduced height
    const createTextCanvas = (text, subText) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 128; // Reduced height
      
      // Background
      context.fillStyle = 'rgba(255, 255, 255, 0.8)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Calculate total text height to center vertically
      const titleFontSize = 42; // Increased from 36px to 42px
      const descFontSize = 30; // Increased from 24px to 30px
      const lineHeight = 30;
      
      // Estimate number of lines for description (simplified)
      const maxWidth = canvas.width - 40;
      context.font = `${descFontSize}px Arial`;
      const words = subText.split(' ');
      let testLine = '';
      let numLines = 1;
      
      for (let n = 0; n < words.length; n++) {
        const testWord = words[n] + ' ';
        const metrics = context.measureText(testLine + testWord);
        if (metrics.width > maxWidth) {
          numLines++;
          testLine = testWord;
          if (numLines > 2) break; // Max 2 lines
        } else {
          testLine += testWord;
        }
      }
      
      // Calculate total text height
      const totalTextHeight = titleFontSize + (numLines * lineHeight);
      
      // Calculate starting Y position to center text block
      let startY = (canvas.height - totalTextHeight) / 2 + titleFontSize;
      
      // Title text
      context.font = `bold ${titleFontSize}px Arial`;
      context.fillStyle = 'black';
      context.textAlign = 'center';
      context.fillText(text, canvas.width / 2, startY);
      
      // Description text - wrap text to fit canvas
      context.font = `${descFontSize}px Arial`;
      let y = startY + lineHeight;
      
      let line = '';
      for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        
        if (testWidth > maxWidth && n > 0) {
          context.fillText(line, canvas.width / 2, y);
          line = words[n] + ' ';
          y += lineHeight;
          
          // Limit to 2 lines
          if (y > startY + (2 * lineHeight)) {
            line += '...';
            context.fillText(line, canvas.width / 2, y);
            break;
          }
        } else {
          line = testLine;
        }
      }
      
      if (y <= startY + (2 * lineHeight)) {
        context.fillText(line, canvas.width / 2, y);
      }
      
      return canvas;
    };
    
    // Function to create a painting with info
    const createPainting = (painting, position, rotation, index) => {
      textureLoader.load(painting.imageUrl, (texture) => {
        const paintingMaterial = new THREE.MeshBasicMaterial({ map: texture });
        const paintingMesh = new THREE.Mesh(frameGeometry, paintingMaterial);
        paintingMesh.position.copy(position);
        paintingMesh.rotation.copy(rotation);
        // Move painting slightly forward from the wall
        paintingMesh.position.add(new THREE.Vector3(
          Math.sin(rotation.y) * 0.05,
          0,
          Math.cos(rotation.y) * 0.05
        ));
        // Store the painting data with the mesh for later use
        paintingMesh.userData = { 
          paintingIndex: index,
          painting: painting
        };
        scene.add(paintingMesh);
        paintingMeshes.push(paintingMesh);
        
        // Add info text below painting
        const infoCanvas = createTextCanvas(painting.name, painting.description);
        const infoTexture = new THREE.CanvasTexture(infoCanvas);
        const infoGeometry = new THREE.PlaneGeometry(3, 0.6); // Increased to match wider paintings
        const infoMaterial = new THREE.MeshBasicMaterial({ 
          map: infoTexture,
          transparent: true
        });
        const infoMesh = new THREE.Mesh(infoGeometry, infoMaterial);
        
        // Position info panel below the painting with more space
        infoMesh.position.copy(position);
        infoMesh.rotation.copy(rotation);
        infoMesh.position.y -= 2.9; // Adjusted position to account for taller paintings
        
        // Move info slightly forward from the wall
        infoMesh.position.add(new THREE.Vector3(
          Math.sin(rotation.y) * 0.06, // Slightly more forward than the painting
          0,
          Math.cos(rotation.y) * 0.06
        ));
        
        scene.add(infoMesh);
      });
    };

    // Place paintings on each wall (up to 8 paintings, 2 per wall)
    const wallPositions = [
      // Front wall (z = -roomDepth/2) - left painting
      { 
        position: new THREE.Vector3(-4, 0, -roomDepth/2 + 0.05), 
        rotation: new THREE.Euler(0, 0, 0) 
      },
      // Front wall (z = -roomDepth/2) - right painting
      { 
        position: new THREE.Vector3(4, 0, -roomDepth/2 + 0.05), 
        rotation: new THREE.Euler(0, 0, 0) 
      },
      // Right wall (x = roomWidth/2) - front painting
      { 
        position: new THREE.Vector3(roomWidth/2 - 0.05, 0, -4), 
        rotation: new THREE.Euler(0, -Math.PI/2, 0) 
      },
      // Right wall (x = roomWidth/2) - back painting
      { 
        position: new THREE.Vector3(roomWidth/2 - 0.05, 0, 4), 
        rotation: new THREE.Euler(0, -Math.PI/2, 0) 
      },
      // Back wall (z = roomDepth/2) - left painting
      { 
        position: new THREE.Vector3(-4, 0, roomDepth/2 - 0.05), 
        rotation: new THREE.Euler(0, Math.PI, 0) 
      },
      // Back wall (z = roomDepth/2) - right painting
      { 
        position: new THREE.Vector3(4, 0, roomDepth/2 - 0.05), 
        rotation: new THREE.Euler(0, Math.PI, 0) 
      },
      // Left wall (x = -roomWidth/2) - front painting
      { 
        position: new THREE.Vector3(-roomWidth/2 + 0.05, 0, -4), 
        rotation: new THREE.Euler(0, Math.PI/2, 0) 
      },
      // Left wall (x = -roomWidth/2) - back painting
      { 
        position: new THREE.Vector3(-roomWidth/2 + 0.05, 0, 4), 
        rotation: new THREE.Euler(0, Math.PI/2, 0) 
      }
    ];

    // Add paintings to walls
    for (let i = 0; i < Math.min(paintings.length, 8); i++) {
      createPainting(
        paintings[i],
        wallPositions[i].position,
        wallPositions[i].rotation,
        i
      );
    }

    // Add lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Increased ambient light
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 1);
    pointLight.position.set(0, roomHeight/2 - 1, 0);
    scene.add(pointLight);

    // Add directional lights to illuminate paintings better
    const directions = [
      new THREE.Vector3(0, 0, 1),  // Front
      new THREE.Vector3(-1, 0, 0), // Right
      new THREE.Vector3(0, 0, -1), // Back
      new THREE.Vector3(1, 0, 0)   // Left
    ];

    directions.forEach(dir => {
      const spotLight = new THREE.SpotLight(0xffffff, 0.8);
      spotLight.position.set(dir.x * -2, 1, dir.z * -2);
      spotLight.target.position.set(dir.x * roomWidth/2, 0, dir.z * roomDepth/2);
      scene.add(spotLight);
      scene.add(spotLight.target);
    });

    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', handleResize);

    // Handle mouse click
    const handleClick = (event) => {
      // Calculate mouse position in normalized device coordinates
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

      // Update the picking ray with the camera and mouse position
      raycaster.setFromCamera(mouse, camera);

      // Calculate objects intersecting the picking ray
      const intersects = raycaster.intersectObjects(paintingMeshes);

      if (intersects.length > 0) {
        // Get the first intersected object (closest to camera)
        const object = intersects[0].object;
        if (object.userData && object.userData.painting) {
          setSelectedPainting(object.userData.painting);
          setIsModalOpen(true);
        }
      }
    };
    window.addEventListener('click', handleClick);

    // Handle orientation change
    const handleOrientationChange = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('orientationchange', handleOrientationChange);

    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('click', handleClick);
      window.removeEventListener('orientationchange', handleOrientationChange);
      if (mountRef.current && mountRef.current.contains(renderer.domElement)) {
        mountRef.current.removeChild(renderer.domElement);
      }
      // Dispose of geometries and materials
      scene.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) {
          if (Array.isArray(object.material)) {
            object.material.forEach(material => material.dispose());
          } else {
            object.material.dispose();
          }
        }
      });
    };
  }, [isLoading, paintings]);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPainting(null);
  };

  if (isLoading) {
    return <LoadingFallback />;
  }

  if (paintings.length === 0 && !isLoading) {
    return <div className="no-content">No artwork available</div>;
  }

  return (
    <div className="art-container">
      <div ref={mountRef} style={{ width: '100%', height: '100vh' }}>
        {/* Three.js canvas will be inserted here */}
      </div>

      {isModalOpen && selectedPainting && (
        <div className={`painting-modalOverlay ${isModalOpen ? 'open' : ''}`} onClick={closeModal}>
          <div className="painting-modal" onClick={(e) => e.stopPropagation()}>
            <button className="imageClose-button" onClick={closeModal}>
              <FiX size={24} />
            </button>
            <img 
              src={selectedPainting.imageUrl} 
              alt={selectedPainting.name} 
              className="painting-modalImage" 
            />
            <div className="painting-plaque">
              <h3>{selectedPainting.name}</h3>
              <p>{selectedPainting.description}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ThreeDRoom;