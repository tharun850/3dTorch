import { Component, ElementRef, AfterViewInit, ViewChild } from '@angular/core';
import * as THREE from 'three';
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js';
import {TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js';

@Component({
  selector: 'app-scene',
  template: `<canvas #canvas></canvas>`,
  styles: [`
    canvas {
      width: 100%;
      height: 100vh;
      display: block;
      background: #000;
    }
  `]
})
export class SceneComponent implements AfterViewInit {
  @ViewChild('canvas') private canvasRef!: ElementRef;

  private camera!: THREE.PerspectiveCamera;
  private scene!: THREE.Scene;
  private renderer!: THREE.WebGLRenderer;
  private textMesh!: THREE.Mesh;
  private spotLight!: THREE.SpotLight;
  private mouse = new THREE.Vector2();

  constructor() {}

  ngAfterViewInit() {
    // Wait for view to initialize
    setTimeout(() => {
      this.initScene();
      this.animate();
      this.setupMouseMove();
    });
  }

  private initScene() {
    // Scene setup
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x000000);

    // Camera setup
    this.camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 5;

    // Renderer setup
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvasRef.nativeElement,
      antialias: true
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);

    // Create text
    const loader = new FontLoader();
    loader.load('assets/fonts/helvetiker_regular.typeface.json', (font) => {
      const textGeometry = new TextGeometry('Hidden Message', {
        font: font,
        size: 0.5,
        depth: 0.1,
      });
      
      const material = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        metalness: 0,
        roughness: 0.5
      });

      this.textMesh = new THREE.Mesh(textGeometry, material);
      textGeometry.center();
      this.scene.add(this.textMesh);
    });

    // Add spotlight (torch)
    this.spotLight = new THREE.SpotLight(0xffffff, 2);
    this.spotLight.angle = Math.PI / 8;
    this.spotLight.penumbra = 0.1;
    this.spotLight.decay = 2;
    this.spotLight.distance = 10;
    this.spotLight.position.set(0, 0, 5);
    this.scene.add(this.spotLight);

    // Add ambient light (very dim)
    const ambientLight = new THREE.AmbientLight(0x000000);
    this.scene.add(ambientLight);

    // Handle window resize
    window.addEventListener('resize', () => {
      this.onWindowResize();
    });
  }

  private onWindowResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // private setupMouseMove() {
  //   window.addEventListener('mousemove', (event) => {
  //     this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  //     this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  //     // Update spotlight position based on mouse
  //     const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
  //     vector.unproject(this.camera);
  //     const dir = vector.sub(this.camera.position).normalize();
  //     const distance = -this.camera.position.z / dir.z;
  //     const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
  //     this.spotLight.position.copy(new THREE.Vector3(pos.x, pos.y, 5));
  //   });
  // }

  private setupMouseMove() {
      window.addEventListener('mousemove', (event) => {
        // Calculate mouse position in normalized device coordinates
        // (-1 to +1) for both components
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  
        // Calculate the world position for the light
        const vector = new THREE.Vector3(this.mouse.x, this.mouse.y, 0.5);
        vector.unproject(this.camera);
        
        // Calculate the direction from camera to the point
        const dir = vector.sub(this.camera.position).normalize();
        
        // Calculate the distance to the plane where the text is
        const distance = -this.camera.position.z / dir.z;
        
        // Get the point on the plane
        const pos = this.camera.position.clone().add(dir.multiplyScalar(distance));
        
        // Position the light slightly in front of the camera
        this.spotLight.position.set(pos.x, pos.y, 3);
        
        // Make the spotlight point at the text
        this.spotLight.target.position.set(pos.x, pos.y, 0);
        this.scene.add(this.spotLight.target); // Important: add the target to the scene
      });
  }
  

  private animate() {
    requestAnimationFrame(() => this.animate());
    this.renderer.render(this.scene, this.camera);
  }
}
