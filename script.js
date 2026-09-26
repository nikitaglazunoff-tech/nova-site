(() => {
  'use strict';

  const qs = (s, root = document) => root.querySelector(s);
  const qsa = (s, root = document) => [...root.querySelectorAll(s)];

  const loader = qs('#loader');
  const loadLine = qs('#loadLine');
  const loadPercent = qs('#loadPercent');
  const sceneEl = qs('#scene');
  const nav = qs('#nav');
  const cursor = qs('#cursor');
  const prefersReduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let scene, camera, renderer, vehicle, vehicleRoot, clock;
  let targetMouseX = 0, targetMouseY = 0, smoothMouseX = 0, smoothMouseY = 0;
  let dragging = false, lastPointerX = 0;
  let fallback = false;
  let currentColor = new THREE.Color('#0a0c0e');

  function setLoad(p) {
    const v = Math.max(0, Math.min(100, Math.round(p)));
    loadLine.style.width = `${v}%`;
    loadPercent.textContent = `${v}%`;
  }

  function hideLoader() {
    setLoad(100);
    window.setTimeout(() => loader.classList.add('is-hidden'), 450);
    if (window.gsap) {
      gsap.fromTo('.hero-title', { y: 55, opacity: 0 }, { y: 0, opacity: 1, duration: 1.15, ease: 'power4.out', delay: .25 });
      gsap.to('.reveal', { y: 0, opacity: 1, duration: .9, stagger: .11, ease: 'power3.out', delay: .55 });
    } else {
      qsa('.reveal').forEach(el => { el.style.opacity = 1; el.style.transform = 'none'; });
    }
  }

  function makeFallbackCar() {
    fallback = true;
    const group = new THREE.Group();
    const bodyMat = new THREE.MeshPhysicalMaterial({ color: currentColor, metalness: .82, roughness: .22, clearcoat: 1, clearcoatRoughness: .1 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0x0a1014, metalness: .1, roughness: .08, transmission: .15, transparent: true, opacity: .92 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x060708, metalness: .85, roughness: .26 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(4.8, 1.0, 2.08, 8, 4, 8), bodyMat);
    body.position.y = 1.02;
    body.scale.z = .98;
    group.add(body);

    const hood = new THREE.Mesh(new THREE.BoxGeometry(1.65, .33, 1.92, 4, 2, 4), bodyMat);
    hood.position.set(1.62, 1.41, 0);
    group.add(hood);

    const cabin = new THREE.Mesh(new THREE.CylinderGeometry(1.05, 1.15, 2.0, 32), glassMat);
    cabin.rotation.z = Math.PI / 2;
    cabin.scale.set(1, .52, .92);
    cabin.position.set(.05, 1.76, 0);
    group.add(cabin);

    const lower = new THREE.Mesh(new THREE.BoxGeometry(4.95, .45, 2.14), darkMat);
    lower.position.y = .56;
    group.add(lower);

    for (const x of [-1.65, 1.65]) {
      for (const z of [-1.03, 1.03]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.46, .46, .28, 32), darkMat);
        wheel.rotation.x = Math.PI / 2;
        wheel.position.set(x, .49, z);
        group.add(wheel);
      }
    }

    const lightMat = new THREE.MeshStandardMaterial({ color: 0xf4f8ff, emissive: 0xa9c6ff, emissiveIntensity: 4.5 });
    for (const z of [-.83, .83]) {
      const light = new THREE.Mesh(new THREE.BoxGeometry(.42, .08, .12), lightMat);
      light.position.set(2.48, 1.12, z);
      group.add(light);
    }

    const rearLight = new THREE.Mesh(new THREE.BoxGeometry(.35, .09, 1.3), new THREE.MeshStandardMaterial({ color: 0x7c1015, emissive: 0x41070a, emissiveIntensity: 2.5 }));
    rearLight.position.set(-2.48, 1.14, 0);
    group.add(rearLight);

    group.scale.setScalar(.95);
    return group;
  }

  function init3D() {
    if (!window.THREE) return;

    scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x060708, .032);
    camera = new THREE.PerspectiveCamera(32, innerWidth / innerHeight, .1, 100);
    camera.position.set(7.2, 3.7, 9.1);

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setSize(innerWidth, innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    sceneEl.appendChild(renderer.domElement);

    clock = new THREE.Clock();

    scene.add(new THREE.HemisphereLight(0xc8d1d6, 0x08090a, 2.1));
    const key = new THREE.DirectionalLight(0xffffff, 4.2);
    key.position.set(6, 8, 7);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    scene.add(key);
    const rim = new THREE.DirectionalLight(0x7c9fbd, 3.1);
    rim.position.set(-7, 4, -5);
    scene.add(rim);

    const floor = new THREE.Mesh(new THREE.CircleGeometry(18, 64), new THREE.MeshStandardMaterial({ color: 0x090b0c, metalness: .12, roughness: .58, transparent: true, opacity: .8 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -.06;
    floor.receiveShadow = true;
    scene.add(floor);

    vehicleRoot = new THREE.Group();
    scene.add(vehicleRoot);

    const fallbackIn = () => {
      vehicle = makeFallbackCar();
      vehicleRoot.add(vehicle);
      hideLoader();
    };

    if (!window.THREE.GLTFLoader) {
      fallbackIn();
      return;
    }

    const loader3d = new THREE.GLTFLoader();
    loader3d.load('assets/car.glb', (gltf) => {
      vehicle = gltf.scene;
      vehicle.traverse(obj => {
        if (obj.isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      const box = new THREE.Box3().setFromObject(vehicle);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const scale = 5.25 / maxDim;
      vehicle.scale.setScalar(scale);
      vehicle.position.sub(center.multiplyScalar(scale));
      vehicle.position.y += .18;
      vehicleRoot.add(vehicle);
      fallback = false;
      hideLoader();
    }, (xhr) => {
      if (xhr.total) setLoad(Math.min(92, xhr.loaded / xhr.total * 100));
      else setLoad(Math.min(88, parseInt(loadPercent.textContent, 10) + 2));
    }, () => fallbackIn());
  }

  function applyCarColor(color) {
    currentColor.copy(color);
    if (!vehicle) return;
    vehicle.traverse(obj => {
      if (!obj.isMesh || !obj.material) return;
      const name = String(obj.material.name || obj.name || '').toLowerCase();
      const looksLikePaint = /body|paint|car|exterior|shell|metal/.test(name);
      if (fallback || looksLikePaint) {
        if (obj.material.color) obj.material.color.copy(color);
        if ('metalness' in obj.material) obj.material.metalness = .82;
        if ('roughness' in obj.material) obj.material.roughness = .22;
      }
    });
  }

  function animate3D() {
    if (!renderer) return;
    requestAnimationFrame(animate3D);
    const t = clock.getElapsedTime();
    smoothMouseX += (targetMouseX - smoothMouseX) * .045;
    smoothMouseY += (targetMouseY - smoothMouseY) * .045;

    if (vehicleRoot) {
      if (!dragging && !prefersReduced) vehicleRoot.rotation.y += .0018;
      vehicleRoot.rotation.x += (smoothMouseY * .06 - vehicleRoot.rotation.x) * .04;
      vehicleRoot.rotation.z += (-smoothMouseX * .028 - vehicleRoot.rotation.z) * .04;
      camera.position.x += (7.2 + smoothMouseX * 1.05 - camera.position.x) * .025;
      camera.position.y += (3.7 - smoothMouseY * .45 - camera.position.y) * .025;
      camera.lookAt(0, 1.05, 0);
      if (vehicle) vehicle.position.y = .18 + Math.sin(t * .72) * .028;
    }

    renderer.render(scene, camera);
  }

  function setupPointer() {
    window.addEventListener('pointermove', e => {
      targetMouseX = (e.clientX / innerWidth - .5) * 2;
      targetMouseY = (e.clientY / innerHeight - .5) * 2;
      if (cursor && window.innerWidth > 700) {
        cursor.style.left = `${e.clientX}px`;
        cursor.style.top = `${e.clientY}px`;
      }
    });

    sceneEl.addEventListener('pointerdown', e => {
      dragging = true;
      lastPointerX = e.clientX;
    });
    window.addEventListener('pointerup', () => dragging = false);
    sceneEl.addEventListener('pointermove', e => {
      if (!dragging || !vehicleRoot) return;
      vehicleRoot.rotation.y += (e.clientX - lastPointerX) * .008;
      lastPointerX = e.clientX;
    });

    window.addEventListener('resize', () => {
      if (!renderer || !camera) return;
      camera.aspect = innerWidth / innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(innerWidth, innerHeight);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    });

    window.addEventListener('scroll', () => nav.classList.toggle('scrolled', scrollY > 35), { passive: true });
  }

  function setupConfigurator() {
    const colorName = qs('#colorName');
    qsa('.swatch').forEach(btn => btn.addEventListener('click', () => {
      qsa('.swatch').forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
      colorName.textContent = btn.dataset.name;
      applyCarColor(new THREE.Color(btn.dataset.color));
    }));

    qsa('.segmented').forEach(group => qsa('button', group).forEach(btn => btn.addEventListener('click', () => {
      qsa('button', group).forEach(x => x.classList.remove('active'));
      btn.classList.add('active');
    })));
  }

  function setupMenu() {
    const btn = qs('#menuBtn');
    btn.addEventListener('click', () => {
      const open = nav.classList.toggle('mobile-open');
      btn.setAttribute('aria-expanded', String(open));
    });
    qsa('#navLinks a').forEach(a => a.addEventListener('click', () => {
      nav.classList.remove('mobile-open');
      btn.setAttribute('aria-expanded', 'false');
    }));
  }

  function setupCursor() {
    if (!cursor || window.innerWidth <= 700) return;
    qsa('a,button,.magnetic').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add('big'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('big'));
    });
  }

  function setupAnimations() {
    if (!window.gsap) return;
    gsap.registerPlugin(ScrollTrigger);

    qsa('.tech-card').forEach((el, i) => gsap.from(el, {
      opacity: 0, y: 55, duration: .9, delay: i * .05, ease: 'power3.out',
      scrollTrigger: { trigger: el, start: 'top 85%' }
    }));

    qsa('.stat').forEach(stat => {
      const target = parseFloat(qs('strong', stat).dataset.value);
      ScrollTrigger.create({
        trigger: stat,
        start: 'top 82%',
        once: true,
        onEnter: () => gsap.fromTo(qs('strong', stat), { textContent: 0 }, {
          textContent: target,
          duration: 1.45,
          ease: 'power2.out',
          snap: { textContent: target % 1 === 0 ? 1 : .1 }
        })
      });
    });

    gsap.to('.cinematic-content', {
      y: -80,
      ease: 'none',
      scrollTrigger: { trigger: '.cinematic', start: 'top bottom', end: 'bottom top', scrub: true }
    });
    gsap.to('.cinematic-orb', {
      scale: 1.18,
      ease: 'none',
      scrollTrigger: { trigger: '.cinematic', start: 'top bottom', end: 'bottom top', scrub: true }
    });
    gsap.from('.configurator-panel', {
      x: 65, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: '.configurator', start: 'top 72%' }
    });
  }

  setLoad(6);
  init3D();
  setupPointer();
  setupConfigurator();
  setupMenu();
  setupCursor();
  setupAnimations();
  animate3D();
})();
