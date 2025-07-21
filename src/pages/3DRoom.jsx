import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { apiService } from '../services/api';
import LoadingFallback from '../components/LoadingFallback';
import { FiX } from 'react-icons/fi';
import '../styles/artStyle.css'; // Reusing the same styles as ArtRoom
import { Link } from 'react-router-dom';
import { FaImage } from 'react-icons/fa'; // Import image icon for 2D gallery

const ThreeDRoom = () => {
  const mountRef = useRef(null);
  const [paintings, setPaintings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [texturesLoaded, setTexturesLoaded] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPainting, setSelectedPainting] = useState(null);

  // Fetch paintings data
  useEffect(() => {
    const fetchPaintings = async () => {
      try {
        const data = await apiService.getAllPaintings();
        setPaintings(data);
        // No desactivamos isLoading aquí, esperamos a que las texturas también se carguen
      } catch (error) {
        console.error('Error fetching paintings:', error);
        setIsLoading(false); // En caso de error, sí desactivamos la carga
      }
    };

    fetchPaintings();
  }, []);

  useEffect(() => {
    if (paintings.length === 0) return;

    // Create a texture loader with a loading manager to track progress
    const loadingManager = new THREE.LoadingManager();
    let totalItems = 3; // Wall, floor, ceiling textures
    totalItems += Math.min(paintings.length, 8); // Add paintings count (max 8)
    let loadedItems = 0;

    loadingManager.onProgress = (url, itemsLoaded, itemsTotal) => {
      loadedItems++;
      // Solo cuando se han cargado todas las texturas, marcamos como listo
      if (loadedItems >= totalItems) {
        setTexturesLoaded(true);
        // Añadimos un pequeño retraso para asegurar que todo esté renderizado
        setTimeout(() => {
          setIsLoading(false);
        }, 500);
      }
    };

    loadingManager.onError = (url) => {
      console.error('Error loading texture:', url);
      setIsLoading(false);
    };

    const textureLoader = new THREE.TextureLoader(loadingManager);
    
    // Preload essential textures
    textureLoader.load('/wallTexture.jpg');
    textureLoader.load('/floorTexture.jpg');
    textureLoader.load('/ceilingTexture.jpg');
    textureLoader.load('/ceilingTexture2.jpg');

    // Preload painting textures
    for (let i = 0; i < Math.min(paintings.length, 8); i++) {
      textureLoader.load(paintings[i].imageUrl);
    }

  }, [paintings]);

  useEffect(() => {
    if (isLoading || !texturesLoaded || paintings.length === 0) return;

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
    camera.position.set(0, 0.7, 0); // Posición centrada en la habitación
    camera.lookAt(0, 2, 0); // Seguimos mirando hacia la pared frontal

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputEncoding = THREE.sRGBEncoding;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2; // Aumenta para más brillo
    mountRef.current.appendChild(renderer.domElement);

    // Reduce polygon count or texture quality on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (isMobile) {
      // Use simpler geometries or lower resolution textures
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.target.set(0, 0.7, 0);
    controls.update();
    
    if (isMobile) {
      controls.rotateSpeed = 0.7;
      controls.enableZoom = true;
      controls.enablePan = false; // Disable panning on mobile
      controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
    }

    // Room dimensions - increased width and depth
    const roomWidth = 20; // Aumentado de 16 a 20
    const roomHeight = 11; // Mantenemos la altura
    const roomDepth = 20; // Aumentado de 16 a 20

    // Load textures
    const textureLoader = new THREE.TextureLoader();
    
    // Create individual walls with different textures
    const createRoom = () => {
      // Wall material with Rajkot Blue color and texture
      const wallTexture = textureLoader.load('/wallTexture.jpg');
      wallTexture.wrapS = THREE.ClampToEdgeWrapping;
      wallTexture.wrapT = THREE.ClampToEdgeWrapping;
   
      
      // Crear un material con color azul Rajkot
      const wallMaterial = new THREE.MeshStandardMaterial({ 
        map: wallTexture,
        side: THREE.BackSide,
        roughness: 0.5,
        metalness: 0.1,
        bumpMap: wallTexture,
        bumpScale: 0.02,
        color: 0xB3BDD1  // Color azul Rajkot (equivalente argb(80, 95, 128))
      });
      
      // Ajustar la mezcla del color con la textura
      wallMaterial.map.colorSpace = THREE.SRGBColorSpace;
      
      // Create room as a box with BackSide material
      const room = new THREE.Mesh(
        new THREE.BoxGeometry(roomWidth, roomHeight, roomDepth),
        wallMaterial
      );
      scene.add(room);
      
      // Floor with appropriate properties for dark wood
      const floorTexture = textureLoader.load('/floorTexture.jpg');
      floorTexture.wrapS = THREE.RepeatWrapping;
      floorTexture.wrapT = THREE.RepeatWrapping;
      floorTexture.repeat.set(8, 8); // More repetition for detailed floor
      
      const floorMaterial = new THREE.MeshStandardMaterial({ 
        map: floorTexture,
        roughness: 0.5, // Aumentado para madera oscura (menos reflectante)
        metalness: 0.1, // Reducido para madera
        envMapIntensity: 0.3, // Reducido para menos reflejo
        color: 0xA68C6A// Tinte marrón oscuro para enfatizar el color de la madera
      });

      // Create environment map for reflections
      const pmremGenerator = new THREE.PMREMGenerator(renderer);
      pmremGenerator.compileEquirectangularShader();

      // Simple environment map (you can replace with a real HDR later)
      const cubeRenderTarget = pmremGenerator.fromScene(new THREE.Scene());
      const envMap = cubeRenderTarget.texture;
      floorMaterial.envMap = envMap;
      
      const floorGeometry = new THREE.PlaneGeometry(roomWidth - 0.1, roomDepth - 0.1);
      const floor = new THREE.Mesh(floorGeometry, floorMaterial);
      floor.rotation.x = -Math.PI / 2;
      floor.position.y = -roomHeight/2 + 0.01; // Slightly above the bottom wall
      scene.add(floor);
      
      // Add ceiling with ceiling texture
      const ceilingTexture = textureLoader.load('/ceilingTexture2.jpg');
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

    // Enable shadows
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // Raycaster for detecting clicks on paintings
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    const paintingMeshes = []; // Store references to painting meshes

    
    // Create canvas for text - with improved readability
    const createTextCanvas = (text, subText) => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('2d');
      canvas.width = 512;
      canvas.height = 128; // Reduced height
      
      // Background - fully opaque white
      context.fillStyle = 'rgb(255, 255, 255)';
      context.fillRect(0, 0, canvas.width, canvas.height);
      
      // Add a border for better definition
      context.strokeStyle = 'rgb(200, 200, 200)';
      context.lineWidth = 4;
      context.strokeRect(2, 2, canvas.width-4, canvas.height-4);
      
      // Calculate total text height to center vertically
      const titleFontSize = 48; // Increased from 42px to 48px
      const descFontSize = 32; // Increased from 30px to 32px
      const lineHeight = 36; // Increased line height
      
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
      
      // Title text - with stronger font
      context.font = `bold ${titleFontSize}px Arial`;
      context.fillStyle = 'rgb(0, 0, 0)'; // Pure black for better contrast
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
    
    // Function to create a painting with info and frame
    const createPainting = (painting, position, rotation, index) => {
      textureLoader.load(painting.imageUrl, (texture) => {
        // Crear el material para la pintura
        const paintingMaterial = new THREE.MeshBasicMaterial({ map: texture });
        
        // Dimensiones del lienzo (la imagen)
        const canvasWidth = 3.5;
        const canvasHeight = 4.5;
        const canvasGeometry = new THREE.PlaneGeometry(canvasWidth, canvasHeight);
        const paintingMesh = new THREE.Mesh(canvasGeometry, paintingMaterial);
        
        // Crear un grupo para contener la pintura y su marco
        const paintingGroup = new THREE.Group();
        paintingGroup.position.copy(position);
        paintingGroup.rotation.copy(rotation);
        
        // Mover la pintura ligeramente hacia adelante para evitar z-fighting con el marco
        paintingMesh.position.z = 0.02;
        paintingGroup.add(paintingMesh);
        
        // Crear el marco - usando geometría similar al tragaluz
        const frameThickness = 0.2;
        const frameDepth = 0.05;
        const frameMaterial = new THREE.MeshStandardMaterial({
          color: 0x888888,
          roughness: 0.5,
          metalness: 0.5
        });
        
        // Marco superior
        const topFrame = new THREE.Mesh(
          new THREE.BoxGeometry(canvasWidth + frameThickness*2, frameThickness, frameDepth),
          frameMaterial
        );
        topFrame.position.set(0, canvasHeight/2 + frameThickness/2, 0);
        paintingGroup.add(topFrame);
        
        // Marco inferior
        const bottomFrame = new THREE.Mesh(
          new THREE.BoxGeometry(canvasWidth + frameThickness*2, frameThickness, frameDepth),
          frameMaterial
        );
        bottomFrame.position.set(0, -canvasHeight/2 - frameThickness/2, 0);
        paintingGroup.add(bottomFrame);
        
        // Marco izquierdo
        const leftFrame = new THREE.Mesh(
          new THREE.BoxGeometry(frameThickness, canvasHeight, frameDepth),
          frameMaterial
        );
        leftFrame.position.set(-canvasWidth/2 - frameThickness/2, 0, 0);
        paintingGroup.add(leftFrame);
        
        // Marco derecho
        const rightFrame = new THREE.Mesh(
          new THREE.BoxGeometry(frameThickness, canvasHeight, frameDepth),
          frameMaterial
        );
        rightFrame.position.set(canvasWidth/2 + frameThickness/2, 0, 0);
        paintingGroup.add(rightFrame);
        
        // Mover todo el grupo ligeramente hacia adelante desde la pared
        paintingGroup.position.add(new THREE.Vector3(
          Math.sin(rotation.y) * 0.05,
          0,
          Math.cos(rotation.y) * 0.05
        ));
        
        // Almacenar los datos de la pintura con el grupo para uso posterior
        paintingGroup.userData = { 
          paintingIndex: index,
          painting: painting
        };
        
        scene.add(paintingGroup);
        paintingMeshes.push(paintingGroup); // Añadir el grupo en lugar de solo el mesh
        
        // Add info text below painting
        const infoCanvas = createTextCanvas(painting.name, painting.description);
        const infoTexture = new THREE.CanvasTexture(infoCanvas);
        const infoGeometry = new THREE.PlaneGeometry(3, 0.6);
        const infoMaterial = new THREE.MeshBasicMaterial({ 
          map: infoTexture,
          transparent: false // Changed from true to false for full opacity
        });
        const infoMesh = new THREE.Mesh(infoGeometry, infoMaterial);
        
        // Position info panel below the painting with more space
        infoMesh.position.copy(position);
        infoMesh.rotation.copy(rotation);
        infoMesh.position.y -= 2.9; // Adjusted position to account for taller paintings
        
        // Move info slightly forward from the wall
        infoMesh.position.add(new THREE.Vector3(
          Math.sin(rotation.y) * 0.06,
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
        position: new THREE.Vector3(-5, 0, -roomDepth/2 + 0.05), // Movido de -6 a -5
        rotation: new THREE.Euler(0, 0, 0) 
      },
      // Front wall (z = -roomDepth/2) - right painting
      { 
        position: new THREE.Vector3(5, 0, -roomDepth/2 + 0.05), // Movido de 6 a 5
        rotation: new THREE.Euler(0, 0, 0) 
      },
      // Right wall (x = roomWidth/2) - front painting
      { 
        position: new THREE.Vector3(roomWidth/2 - 0.05, 0, -5), // Movido de -6 a -5
        rotation: new THREE.Euler(0, -Math.PI/2, 0) 
      },
      // Right wall (x = roomWidth/2) - back painting
      { 
        position: new THREE.Vector3(roomWidth/2 - 0.05, 0, 5), // Movido de 6 a 5
        rotation: new THREE.Euler(0, -Math.PI/2, 0) 
      },
      // Back wall (z = roomDepth/2) - left painting
      { 
        position: new THREE.Vector3(-5, 0, roomDepth/2 - 0.05), // Movido de -6 a -5
        rotation: new THREE.Euler(0, Math.PI, 0) 
      },
      // Back wall (z = roomDepth/2) - right painting
      { 
        position: new THREE.Vector3(5, 0, roomDepth/2 - 0.05), // Movido de 6 a 5
        rotation: new THREE.Euler(0, Math.PI, 0) 
      },
      // Left wall (x = -roomWidth/2) - front painting
      { 
        position: new THREE.Vector3(-roomWidth/2 + 0.05, 0, -5), // Movido de -6 a -5
        rotation: new THREE.Euler(0, Math.PI/2, 0) 
      },
      // Left wall (x = -roomWidth/2) - back painting
      { 
        position: new THREE.Vector3(-roomWidth/2 + 0.05, 0, 5), // Movido de 6 a 5
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
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8); // Aumentado de 0.5 a 0.7
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0xffffff, 0.8);
    pointLight.position.set(0, roomHeight/2 - 1, 0);
    scene.add(pointLight);

    // Añade la luz direccional específica para el suelo aquí
    const floorLight = new THREE.DirectionalLight(0xffffff, 0.3);
    floorLight.position.set(0, 8, 0);
    floorLight.target.position.set(0, -5, 0);
    scene.add(floorLight);
    scene.add(floorLight.target);

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

    // Add spotlights for each painting position
    wallPositions.forEach((wallPos, index) => {
      const spotLight = new THREE.SpotLight(0xffffff, 0.8);
      
      // Posicionar la luz por encima del cuadro
      const lightPos = wallPos.position.clone();
      lightPos.y += 5; // Subir la luz 2 unidades por encima del centro del cuadro
      
      // Mover la luz hacia adelante desde la pared
      lightPos.add(new THREE.Vector3(
        Math.sin(wallPos.rotation.y) * 1.5,
        0,
        Math.cos(wallPos.rotation.y) * 1.5
      ));
      
      spotLight.position.copy(lightPos);
      
      // Point light at the painting
      spotLight.target.position.copy(wallPos.position);
      
      // Configure shadow and light properties
      spotLight.castShadow = true;
      spotLight.angle = 0.4; // Ángulo más estrecho para un efecto más focalizado
      spotLight.penumbra = 0.7;
      spotLight.decay = 2;
      spotLight.distance = 10;
      
      // Shadow map settings
      spotLight.shadow.mapSize.width = 512;
      spotLight.shadow.mapSize.height = 512;
      spotLight.shadow.camera.near = 0.5;
      spotLight.shadow.camera.far = 10;
      
      scene.add(spotLight);
      scene.add(spotLight.target);
    });

    // Add architectural details
    const addArchitecturalDetails = () => {
      // Add baseboards along the walls
      const baseboardHeight = 0.3;
      const baseboardDepth = 0.05;
      const baseboardMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xCCCCCC, 
        roughness: 0.7,
        metalness: 0.1
      });
      
      // Create baseboards for each wall
      const createBaseboard = (width, height, depth, position, rotation) => {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const baseboard = new THREE.Mesh(geometry, baseboardMaterial);
        baseboard.position.copy(position);
        baseboard.rotation.copy(rotation);
        baseboard.castShadow = true;
        baseboard.receiveShadow = true;
        scene.add(baseboard);
      };
      
      // Front wall baseboard
      createBaseboard(
        roomWidth - baseboardDepth*2, 
        baseboardHeight, 
        baseboardDepth,
        new THREE.Vector3(0, -roomHeight/2 + baseboardHeight/2, -roomDepth/2 + baseboardDepth/2),
        new THREE.Euler(0, 0, 0)
      );
      
      // Back wall baseboard
      createBaseboard(
        roomWidth - baseboardDepth*2, 
        baseboardHeight, 
        baseboardDepth,
        new THREE.Vector3(0, -roomHeight/2 + baseboardHeight/2, roomDepth/2 - baseboardDepth/2),
        new THREE.Euler(0, Math.PI, 0)
      );
      
      // Left wall baseboard
      createBaseboard(
        roomDepth - baseboardDepth*2, 
        baseboardHeight, 
        baseboardDepth,
        new THREE.Vector3(-roomWidth/2 + baseboardDepth/2, -roomHeight/2 + baseboardHeight/2, 0),
        new THREE.Euler(0, Math.PI/2, 0)
      );
      
      // Right wall baseboard
      createBaseboard(
        roomDepth - baseboardDepth*2, 
        baseboardHeight, 
        baseboardDepth,
        new THREE.Vector3(roomWidth/2 - baseboardDepth/2, -roomHeight/2 + baseboardHeight/2, 0),
        new THREE.Euler(0, -Math.PI/2, 0)
      );
      
      // Añadir molduras de techo (crown molding)
      const crownMoldingHeight = 0.4; // Un poco más grande que los zócalos
      const crownMoldingDepth = 0.08; // Un poco más profundo para más detalle
      const crownMoldingMaterial = new THREE.MeshStandardMaterial({ 
        color: 0xFFFFFF, // Blanco para las molduras del techo
        roughness: 0.5,
        metalness: 0.2
      });
      
      // Función para crear molduras de techo
      const createCrownMolding = (width, height, depth, position, rotation) => {
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const crownMolding = new THREE.Mesh(geometry, crownMoldingMaterial);
        crownMolding.position.copy(position);
        crownMolding.rotation.copy(rotation);
        crownMolding.castShadow = true;
        crownMolding.receiveShadow = true;
        scene.add(crownMolding);
      };
      
      // Pared frontal - moldura de techo
      createCrownMolding(
        roomWidth - crownMoldingDepth*2, 
        crownMoldingHeight, 
        crownMoldingDepth,
        new THREE.Vector3(0, roomHeight/2 - crownMoldingHeight/2, -roomDepth/2 + crownMoldingDepth/2),
        new THREE.Euler(0, 0, 0)
      );
      
      // Pared trasera - moldura de techo
      createCrownMolding(
        roomWidth - crownMoldingDepth*2, 
        crownMoldingHeight, 
        crownMoldingDepth,
        new THREE.Vector3(0, roomHeight/2 - crownMoldingHeight/2, roomDepth/2 - crownMoldingDepth/2),
        new THREE.Euler(0, Math.PI, 0)
      );
      
      // Pared izquierda - moldura de techo
      createCrownMolding(
        roomDepth - crownMoldingDepth*2, 
        crownMoldingHeight, 
        crownMoldingDepth,
        new THREE.Vector3(-roomWidth/2 + crownMoldingDepth/2, roomHeight/2 - crownMoldingHeight/2, 0),
        new THREE.Euler(0, Math.PI/2, 0)
      );
      
      // Pared derecha - moldura de techo
      createCrownMolding(
        roomDepth - crownMoldingDepth*2, 
        crownMoldingHeight, 
        crownMoldingDepth,
        new THREE.Vector3(roomWidth/2 - crownMoldingDepth/2, roomHeight/2 - crownMoldingHeight/2, 0),
        new THREE.Euler(0, -Math.PI/2, 0)
      );
    };

    addArchitecturalDetails();

    // Crear un tragaluz en el centro del techo
    const createSkylight = () => {
      // Geometría para el marco del tragaluz - más grande para la habitación más amplia
      const skylightFrameGeometry = new THREE.BoxGeometry(roomWidth/3, 0.2, roomWidth/3);
      const skylightFrameMaterial = new THREE.MeshStandardMaterial({
        color: 0x888888,
        roughness: 0.5,
        metalness: 0.5
      });
      
      const skylightFrame = new THREE.Mesh(skylightFrameGeometry, skylightFrameMaterial);
      skylightFrame.position.y = roomHeight/2;
      scene.add(skylightFrame);
      
      // Cristal del tragaluz
      const skylightGlassGeometry = new THREE.PlaneGeometry(roomWidth/3 - 0.4, roomWidth/3 - 0.4);
      
      // Usar la textura del cielo para el cristal
      const skylightTexture = textureLoader.load('/ceilingTexture.jpg');
      const skylightGlassMaterial = new THREE.MeshStandardMaterial({
        map: skylightTexture,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide,
        roughness: 0.1,
        metalness: 0.2
      });
      
      const skylightGlass = new THREE.Mesh(skylightGlassGeometry, skylightGlassMaterial);
      skylightGlass.position.y = roomHeight/2 - 0.11;
      skylightGlass.rotation.x = Math.PI/2;
      scene.add(skylightGlass);
      
      // Añadir luz intensa que viene del tragaluz - con ajustes para evitar sombras en la pared
      const skylightLight = new THREE.SpotLight(0xFFFFFF, 1.2); // Reducida intensidad
      skylightLight.position.y = roomHeight/2 - 0.2;
      skylightLight.target.position.set(0, -roomHeight/2, 0);
      skylightLight.angle = Math.PI/4; // Ángulo más amplio
      skylightLight.penumbra = 0.9; // Bordes de sombra más suaves
      
      // Ajustar el tamaño de los rayos de luz
      const skylightRaysGeometry = new THREE.CylinderGeometry(roomWidth/6, roomWidth/3, roomHeight, 32, 1, true);
      
      const skylightRaysMaterial = new THREE.MeshBasicMaterial({
        color: 0x87CEEB,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide
      });
      
      const skylightRays = new THREE.Mesh(skylightRaysGeometry, skylightRaysMaterial);
      skylightRays.position.y = 0;
      scene.add(skylightRays);
    };

    createSkylight();

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
      const intersects = raycaster.intersectObjects(paintingMeshes, true); // true para incluir descendientes

      if (intersects.length > 0) {
        // Get the first intersected object (closest to camera)
        let object = intersects[0].object;
        
        // Buscar el grupo padre que contiene los datos de la pintura
        while (object && !object.userData.painting) {
          object = object.parent;
        }
        
        if (object && object.userData && object.userData.painting) {
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
  }, [isLoading, texturesLoaded, paintings]);

  const closeModal = () => {
    setIsModalOpen(false);
    setSelectedPainting(null);
  };

  // Render loading screen until everything is ready
  if (isLoading || !texturesLoaded) {
    return <LoadingFallback />;
  }

  if (paintings.length === 0 && !isLoading) {
    return <div className="no-content">No artwork available</div>;
  }

  return (
    <div className="three-d-room-container">
      {/* Navigation button to 2D Art Room */}
      <Link to="/artroom" className="view-2d-button">
        <FaImage className="view-2d-icon" />
        <span className="view-2d-tooltip">View in 2D Gallery</span>
      </Link>
      
      <div className="art-container" style={{
        position: 'fixed',  // Use fixed instead of relative
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        overflow: 'hidden',  // Intentionally hidden for the 3D container
        touchAction: 'none'  // Prevents default touch actions to allow Three.js controls
      }}>
        <div ref={mountRef} style={{ width: '100%', height: '100%' }}>
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
    </div>
  );
};

export default ThreeDRoom;