import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

@Component({
  selector: 'app-scene',
  templateUrl: './scene.component.html',
  styleUrls: ['./scene.component.css']
})
export class SceneComponent implements AfterViewInit {
  @ViewChild('canvas') private canvasRef!: ElementRef;

  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private textMesh!: THREE.Mesh;
  private spotLight!: THREE.SpotLight;
  private torch!: THREE.Group;
  private mouse = new THREE.Vector2();
  private raycaster = new THREE.Raycaster();
  private isTorchSelected = false;
  private returnAnimationInProgress = false;
  private torchCapacity: number = 3.5;
  private resizeObserver: ResizeObserver;  
  private torchYPosition: number = 3;

  private displayText: string = 'Hello Indu';

  private loadingManager!: THREE.LoadingManager;
  private loadingScreen!: HTMLDivElement;

  private readonly TORCH_COLOR = 0xff9900; // Orange-red color


  constructor() { 
    this.resizeObserver = new ResizeObserver(this.onWindowResize.bind(this));
    this.setupLoadingManager();
  }

  ngAfterViewInit() {
    setTimeout(() => {
      this.initScene();
      this.createResponsiveText();
      this.addCanvasStyles();
      this.animate();
      this.setupMouseEvents();
      // Observe canvas element for size changes
      this.resizeObserver.observe(this.canvasRef.nativeElement);
    });
  }


  private createTorch() {

    this.torch = new THREE.Group();

    const handleGeometry = new THREE.CylinderGeometry(0.1, 0.12, 0.8, 32);
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0xC0C0C0,
      metalness: 0.7,
      roughness: 0.3,
      map: new THREE.TextureLoader().load('assets/textures/metal.jpg')
    });
    const handle = new THREE.Mesh(handleGeometry, handleMaterial);

    // Create grip details (rings around handle)
    const gripGeometry = new THREE.TorusGeometry(0.12, 0.02, 16, 32);
    const gripMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.8,
      roughness: 0.2,
      map: new THREE.TextureLoader().load('assets/textures/metal.jpg')
    });

    // Add multiple grip rings
    for (let i = 0; i < 3; i++) {
      const grip = new THREE.Mesh(gripGeometry, gripMaterial);
      grip.position.y = -0.2 + (i * 0.2);
      grip.rotation.x = Math.PI / 2;
      handle.add(grip);
    }

    // Create torch head (main part)
    const headGeometry = new THREE.CylinderGeometry(0.2, 0.15, 0.2, 32);
    const headMaterial = new THREE.MeshStandardMaterial({
      color: 0x666666,
      metalness: 0.8,
      roughness: 0.2,
      emissive: 0xff9900,
      emissiveIntensity: 0.5
    });
    const head = new THREE.Mesh(headGeometry, headMaterial);
    head.position.y = 0.4;

    // Create torch rim (top ring)
    const rimGeometry = new THREE.TorusGeometry(0.2, 0.03, 16, 32);
    const rimMaterial = new THREE.MeshStandardMaterial({
      color: 0x777777,
      metalness: 0.8,
      roughness: 0.2
    });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.position.y = 0.5;
    rim.rotation.x = Math.PI / 2;

    // Create flame effect
    const createFlame = () => {
      const flameGroup = new THREE.Group();

      // Inner flame (brighter)
      const innerFlameGeometry = new THREE.ConeGeometry(0.1, 0.3, 50, 1, true);
      const innerFlameMaterial = new THREE.MeshBasicMaterial({
        color: 0xffff00,
        transparent: true,
        opacity: 0.9
      });
      const innerFlame = new THREE.Mesh(innerFlameGeometry, innerFlameMaterial);

      // Outer flame
      const outerFlameGeometry = new THREE.ConeGeometry(0.15, 0.4, 32, 1, true);
      const outerFlameMaterial = new THREE.MeshBasicMaterial({
        color: 0xff4500,
        transparent: true,
        opacity: 0.6
      });
      const outerFlame = new THREE.Mesh(outerFlameGeometry, outerFlameMaterial);

      flameGroup.add(innerFlame);
      flameGroup.add(outerFlame);
      flameGroup.position.y = 0.6;

      return flameGroup;
    };

    // Create glow effect
    const createGlow = () => {
      const glowGeometry = new THREE.SphereGeometry(0.2, 32, 32);
      const glowMaterial = new THREE.MeshBasicMaterial({
        color: 0xff9900,
        transparent: true,
        opacity: 0.15
      });
      const glow = new THREE.Mesh(glowGeometry, glowMaterial);
      glow.scale.set(1, 1.2, 1);
      glow.position.y = 0.6;
      return glow;
    };

    // Add point light for flame
    const flameLight = new THREE.PointLight(0xff9900, 1, 3);
    flameLight.position.y = 0.6;
    this.torch.add(flameLight);

    // Add all parts to torch group
    this.torch.add(handle);
    this.torch.add(head);
    this.torch.add(rim);
    this.torch.add(createFlame());
    this.torch.add(createGlow());

    // Position torch at the top of the scene
    this.torch.position.set(0, this.torchYPosition, 0);
    this.torch.rotation.x = Math.PI / 4;

    // Add torch to scene
    this.scene.add(this.torch);

    // Add animation for flame and glow
    const animateFlame = () => {
      requestAnimationFrame(animateFlame);

      // Animate flame
      this.torch.children.forEach(child => {
        if (child instanceof THREE.Group && child.children.length === 2) { // Flame group
          const time = Date.now() * 0.003;
          child.scale.x = 1 + Math.sin(time) * 0.1;
          child.scale.y = 1 + Math.sin(time * 1.5) * 0.1;
          child.scale.z = 1 + Math.sin(time * 2) * 0.1;
        }
        if (child instanceof THREE.PointLight) { // Flame light
          const time = Date.now() * 0.003;
          child.intensity = 1 + Math.sin(time * 2) * 0.2;
        }
      });
    };

    animateFlame();
  }

  private initScene() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Add ambient light with very low intensity
    const ambientLight = new THREE.AmbientLight(0x000000, 0.05);
    this.scene.add(ambientLight);

    // Camera setup with responsive position
    this.camera = new THREE.PerspectiveCamera(
        75,
        window.innerWidth / window.innerHeight,
        0.1,
        1000
    );
    this.updateCameraPosition();

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
        canvas: this.canvasRef.nativeElement,
        antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.createBackground();
    this.createTorch();

    // Add responsive spotlight
    this.setupResponsiveSpotlight();
}
    private setupResponsiveSpotlight() {
    const width = window.innerWidth;

    
    this.spotLight = new THREE.SpotLight(this.TORCH_COLOR, 3);
    
    if (width < 768) { // Mobile
      this.spotLight.angle = Math.PI / 5;
      this.spotLight.distance = 12;
      this.spotLight.intensity = 4;
    } else if (width < 1024) { // Tablet
      this.spotLight.angle = Math.PI / 6;
      this.spotLight.distance = 15;
      this.spotLight.intensity = 3.5;
    } else { // Desktop
      this.spotLight.angle = Math.PI / 7;
      this.spotLight.distance = 15;
      this.spotLight.intensity = 5;
    }
  
    // Enhance spotlight parameters
    this.spotLight.penumbra = 0.3;
    this.spotLight.decay = 2;
    this.spotLight.castShadow = true;
    
    // Add shadow parameters
    this.spotLight.shadow.bias = -0.0001;
    this.spotLight.shadow.mapSize.width = 1024;
    this.spotLight.shadow.mapSize.height = 1024;
    this.spotLight.shadow.camera.near = 0.5;
    this.spotLight.shadow.camera.far = 20;
    
  
    this.scene.add(this.spotLight);
    // Position spotlight relative to torch
    this.spotLight.position.copy(this.torch.position);
    this.spotLight.target.position.set(this.torch.position.x, this.torch.position.y, 50);
    this.scene.add(this.spotLight.target);

  
    // Enable shadow rendering
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    // this.backgroundMesh.receiveShadow = true;
  }

private addCanvasStyles() {
  const canvas = this.canvasRef.nativeElement;
  canvas.style.width = '100%';
  canvas.style.height = '100vh';
  canvas.style.touchAction = 'none';
  canvas.style.userSelect = 'none';
}


  private setupMouseEvents() {
    let startPosition = new THREE.Vector3();
    let startRotation = new THREE.Euler();
    let isDragging = false;

    const returnToOriginal = () => {
        if (!this.returnAnimationInProgress) return;

        const originalPosition = new THREE.Vector3(0, this.torchYPosition, 0);
        // Interpolate position
        this.torch.position.lerp(originalPosition, 0.1);

        // Update spotlight
        this.spotLight.position.copy(this.torch.position);
        this.spotLight.target.position.set(this.torch.position.x, this.torch.position.y, 50);
        requestAnimationFrame(returnToOriginal);
    };

    // Convert screen coordinates to normalized device coordinates
    const getNormalizedCoords = (event: MouseEvent | Touch): THREE.Vector2 => {
        const x = (event.clientX / window.innerWidth) * 2 - 1;
        const y = -(event.clientY / window.innerHeight) * 2 + 1;
        return new THREE.Vector2(x, y);
    };

    // Update torch position based on coordinates
    const updateTorchPosition = (coords: THREE.Vector2) => {
        if (!this.isTorchSelected || !isDragging) return;
        const vector = new THREE.Vector3(coords.x, coords.y, 0.5);
        vector.unproject(this.camera);
        const dir = vector.sub(this.camera.position).normalize();
        const distance = -this.camera.position.z / dir.z;
        const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));

        // Update torch position
        this.torch.position.copy(new THREE.Vector3(pos.x, pos.y, this.torchCapacity));
        this.torch.lookAt(pos.x, pos.y, 0);

        // Update spotlight position
        this.spotLight.position.copy(this.torch.position);
        this.spotLight.target.position.set(pos.x, pos.y, 0);
    };

    // Check if torch is clicked/touched
    const checkTorchIntersection = (coords: THREE.Vector2): boolean => {
        this.raycaster.setFromCamera(coords, this.camera);
        const intersects = this.raycaster.intersectObject(this.torch, true);
        return intersects.length > 0;
    };

    // Mouse Events
    window.addEventListener('mousedown', (event) => {
        const coords = getNormalizedCoords(event);
        if (checkTorchIntersection(coords)) {
            isDragging = true;
            this.isTorchSelected = true;
            this.returnAnimationInProgress = false;
        }
    });

    

    window.addEventListener('mousemove', (event) => {
        const coords = getNormalizedCoords(event);
        updateTorchPosition(coords);
    });

    window.addEventListener('mouseup', () => {
        if (isDragging) {
            isDragging = false;
            this.isTorchSelected = false;
            this.returnAnimationInProgress = true;
            startPosition.copy(this.torch.position);
            startRotation.copy(this.torch.rotation);
            returnToOriginal();
        }
    });

    // Touch Events
    window.addEventListener('touchstart', (event) => {
        event.preventDefault();
        const coords = getNormalizedCoords(event.touches[0]);
        if (checkTorchIntersection(coords)) {
            isDragging = true;
            this.isTorchSelected = true;
            this.returnAnimationInProgress = false;
        }
    }, { passive: false });

    window.addEventListener('touchmove', (event) => {
        event.preventDefault();
        const coords = getNormalizedCoords(event.touches[0]);
        updateTorchPosition(coords);
    }, { passive: false });

    window.addEventListener('touchend', () => {
        if (isDragging) {
            isDragging = false;
            this.isTorchSelected = false;
            this.returnAnimationInProgress = true;
            startPosition.copy(this.torch.position);
            startRotation.copy(this.torch.rotation);
            returnToOriginal();
        }
    });

    // Handle wheel/pinch zoom for torch distance
    window.addEventListener('wheel', (event) => {

            if (event.deltaY > 0) {
                this.torchCapacity = Math.min(this.torchCapacity + 0.1, 5.5);
            }
            else if (event.deltaY < 0) {
                this.torchCapacity = Math.max(this.torchCapacity - 0.1, 0.5);
            }
        
    });

    // Handle touch pinch zoom
    let initialPinchDistance: number | null = null;
    
    window.addEventListener('touchstart', (event) => {
        if (event.touches.length === 2) {
            initialPinchDistance = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY
            );
        }
    });

    window.addEventListener('touchmove', (event) => {
        if (event.touches.length === 2 && initialPinchDistance !== null) {
            const currentDistance = Math.hypot(
                event.touches[0].clientX - event.touches[1].clientX,
                event.touches[0].clientY - event.touches[1].clientY
            );

            const delta = initialPinchDistance - currentDistance;
            if (Math.abs(delta) > 10) { // Threshold to prevent tiny adjustments
                if (delta > 0) {
                    this.torchCapacity = Math.min(this.torchCapacity + 0.1, 4.5);
                } else {
                    this.torchCapacity = Math.max(this.torchCapacity - 0.1, 0.5);
                }
                initialPinchDistance = currentDistance;
            }
        }
    });

    window.addEventListener('touchend', () => {
        initialPinchDistance = null;
    });

    // Handle window resize
    window.addEventListener('resize', () => this.onWindowResize());
}

  
  private onWindowResize = () => {
    if (!this.camera || !this.renderer) return;

    // Update camera
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    // Update renderer
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (this.backgroundMesh) {
      const fov = this.camera.fov * Math.PI / 180;
      const frustumHeight = 2.0 * Math.abs(-2) * Math.tan(fov / 2);
      const frustumWidth = frustumHeight * this.camera.aspect;
      
      this.backgroundMesh.scale.set(frustumWidth, frustumHeight, 1);
    }

    // Update text
    this.createResponsiveText();

    // Adjust camera position based on screen size
    this.updateCameraPosition();
}

private updateCameraPosition() {
  const width = window.innerWidth;
  
  if (width < 768) { // Mobile
      this.camera.position.z = 6;
  } else if (width < 1024) { // Tablet
      this.camera.position.z = 5;
  } else { // Desktop
      this.camera.position.z = 6;
  }

  this.camera.updateProjectionMatrix();
}

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.animateTorchLight();

    this.renderer.render(this.scene, this.camera);
  }

  

  ngOnDestroy() {
    // Cleanup
    this.resizeObserver.disconnect();
    
    // Dispose of Three.js resources
    if (this.renderer) {
        this.renderer.dispose();
    }
    if (this.textMesh) {
        this.textMesh.geometry.dispose();
        (this.textMesh.material as THREE.Material).dispose();
    }
}

  private createResponsiveText() {
      const loader = new FontLoader();
      loader.load('assets/fonts/helvetiker_regular.typeface.json', (font) => {
          // Remove existing text if any
          if (this.textMesh) {
              this.scene.remove(this.textMesh);
              this.textMesh.geometry.dispose();
              (this.textMesh.material as THREE.Material).dispose();
          }
  
          // Get screen dimensions
          const width = window.innerWidth;
          const height = window.innerHeight;
  
          // Calculate responsive text size
          let textSize: number;
          let textHeight: number;
          let message: string;
  
          // Define breakpoints and corresponding text properties
          if (width < 768) { // Mobile
              textSize = 0.3;
              textHeight = 0.05;
              message = this.displayText; // Break into multiple lines for mobile
          } else if (width < 1024) { // Tablet
              textSize = 0.4;
              textHeight = 0.08;
              message = this.displayText;
          } else { // Desktop
              textSize = 0.7;
              textHeight = 0.1;
              message = this.displayText;
          }
  
          // Create text geometry with responsive parameters
          const textGeometry = new TextGeometry(message, {
              font: font,
              size: textSize,
              depth: textHeight,
              curveSegments: 12,
              bevelEnabled: true,
              bevelThickness: textHeight * 0.1,
              bevelSize: textHeight * 0.05,
              bevelOffset: 0,
              bevelSegments: 5
          });
  
          // Create material
          const textMaterial = new THREE.MeshStandardMaterial({
              color: 0xffffff,
              metalness: 0.3,
              roughness: 0.4,
          });
  
          // Create mesh
          this.textMesh = new THREE.Mesh(textGeometry, textMaterial);
  
          // Center the text
          textGeometry.computeBoundingBox();
          const textWidth = textGeometry.boundingBox!.max.x - textGeometry.boundingBox!.min.x;
          const textHeight1 = textGeometry.boundingBox!.max.y - textGeometry.boundingBox!.min.y;
          
          this.textMesh.position.x = -textWidth / 2;
          this.textMesh.position.y = textHeight1 / 2;

          // Add to scene
          this.scene.add(this.textMesh);
      });
  }
  

    // Add this property to your class
  private backgroundMesh!: THREE.Mesh;
  
  // Add this method to create the background
  private createBackground() {
    // Load the texture
    const textureLoader = new THREE.TextureLoader(this.loadingManager);
    textureLoader.load('assets/textures/bkg.jpg', (texture) => {
      // Calculate aspect ratio to cover the entire scene
      const imageAspect = texture.image.width / texture.image.height;
      const planeGeometry = new THREE.PlaneGeometry(20* imageAspect, 20);
      
      // Create material with the texture
      const planeMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        transparent: true,
      });
  
      // Create mesh and position it behind everything
      this.backgroundMesh = new THREE.Mesh(planeGeometry, planeMaterial);
      this.backgroundMesh.position.z = -0.5 ;
      this.scene.add(this.backgroundMesh);
    });
  }
  
  private setupLoadingManager() {
    // Create loading screen
    this.loadingScreen = document.createElement('div');
    this.loadingScreen.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: #000;
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    `;
  
    // Add loading animation
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 50px;
      height: 50px;
      border: 5px solid #f3f3f3;
      border-top: 5px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    `;
  
    // Add keyframe animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  
    this.loadingScreen.appendChild(spinner);
    document.body.appendChild(this.loadingScreen);
  
    // Setup loading manager
    this.loadingManager = new THREE.LoadingManager();
    
  
    this.loadingManager.onLoad = () => {
      this.loadingScreen.style.display = 'none';
    };
  }

  private animateTorchLight() {

  
    const flickerAngle = () => {
      const baseAngle = Math.PI / 7; // Base angle
      const flicker = (Math.random() * 0.2 - 0.05) * baseAngle; // Small angle variation
      return baseAngle + flicker;
    };
    // this.spotLight.intensity = flickerIntensity();
    this.spotLight.angle = flickerAngle();
  }
  

}
