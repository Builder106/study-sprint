import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

export interface ChargeSceneState {
  charge: number;
  minutes: number;
  still: boolean;
  dark: boolean;
  tilt: { x: number; y: number };
}

export interface ChargeScene {
  update: (state: ChargeSceneState) => void;
  dispose: () => void;
}

export async function createChargeScene(
  host: HTMLDivElement,
  anchors: { goal: HTMLDivElement; charge: HTMLDivElement },
  initial: ChargeSceneState,
  ready: (available: boolean) => void,
): Promise<ChargeScene> {
  const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.5;
  renderer.domElement.setAttribute('aria-hidden', 'true');
  host.append(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-3, 3, 2.4, -2.4, 0.1, 100);
  camera.position.set(2.3, 1.5, 9);
  camera.lookAt(0, 0, 0);
  const ambient = new THREE.HemisphereLight(0xffffff, 0x566047, 3);
  scene.add(ambient);
  const key = new THREE.DirectionalLight(0xffffff, 5);
  key.position.set(-3, 5, 6);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xdfffaa, 3);
  rim.position.set(4, 1, -2);
  scene.add(rim);
  let model: THREE.Group;
  try {
    model = (await new GLTFLoader().loadAsync('/landing/charge-sculpture.glb')).scene;
  } catch (error) {
    renderer.dispose();
    renderer.domElement.remove();
    throw error;
  }
  scene.add(model);
  const bounds = new THREE.Box3().setFromObject(model);
  const center = bounds.getCenter(new THREE.Vector3());
  model.position.sub(center);
  const pivot = new THREE.Group();
  scene.add(pivot);
  pivot.add(model);
  const height = bounds.max.y - bounds.min.y;
  const fill = { value: initial.charge / 100 };
  const pulse = { value: 0 };
  const lightMode = { value: initial.dark ? 0 : 1 };
  const chargeMaterials: THREE.MeshStandardMaterial[] = [];
  const lightChargeColor = getComputedStyle(host)
    .getPropertyValue('--brand-lime')
    .trim() || '#ccff00';
  let activeChargeColor = initial.dark ? '#c8f522' : lightChargeColor;
  model.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (!object.name.includes('Lime')) return;
    const geometry = object.geometry as THREE.BufferGeometry;
    geometry.computeBoundingBox();
    const box = geometry.boundingBox!;
    const axis = box.max.y - box.min.y > box.max.z - box.min.z ? 'y' : 'z';
    const bottom = box.min[axis];
    const span = box.max[axis] - bottom;
    const material = new THREE.MeshStandardMaterial({
      color: activeChargeColor,
      metalness: 0.32,
      roughness: 0.27,
    });
    chargeMaterials.push(material);
    material.onBeforeCompile = (shader) => {
      shader.uniforms.chargeFill = fill;
      shader.uniforms.chargePulse = pulse;
      shader.uniforms.lightMode = lightMode;
      shader.vertexShader = `varying float vChargeHeight;\n${shader.vertexShader}`.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>\nvChargeHeight = (position.${axis} - ${bottom.toFixed(6)}) / ${
          span.toFixed(6)
        };`,
      );
      shader.fragmentShader =
        `uniform float chargeFill;\nuniform float chargePulse;\nuniform float lightMode;\nvarying float vChargeHeight;\n${shader.fragmentShader}`
          .replace(
            '#include <color_fragment>',
            `#include <color_fragment>
float charged = 1.0 - smoothstep(chargeFill - 0.008, chargeFill + 0.008, vChargeHeight);
vec3 darkUncharged = vec3(0.035, 0.045, 0.025);
vec3 lightUncharged = vec3(0.12, 0.12, 0.12);
vec3 uncharged = mix(darkUncharged, lightUncharged, lightMode);
diffuseColor.rgb = mix(uncharged, diffuseColor.rgb, charged);`,
          ).replace(
            '#include <emissivemap_fragment>',
            '#include <emissivemap_fragment>\nfloat chargeEdge = 1.0 - smoothstep(0.0, 0.035, abs(vChargeHeight - chargeFill));\ntotalEmissiveRadiance += vec3(0.5, 0.8, 0.015) * chargeEdge * chargePulse * 0.65;',
          );
    };
    const old = object.material;
    if (Array.isArray(old)) old.forEach((entry) => entry.dispose());
    else old.dispose();
    object.material = material;
  });
  let state = initial;
  let frame = 0;
  let disposed = false;
  let visible = true;
  let lost = false;
  let announcedReady = false;
  let started = 0;
  let fromCharge = initial.charge / 100;
  let width = 1;
  let viewHeight = 1;
  const projected = new THREE.Vector3();
  function positionAnchor(element: HTMLDivElement, x: number, y: number) {
    projected.set(x, y, 0);
    projected.applyMatrix4(pivot.matrixWorld);
    projected.project(camera);
    element.style.setProperty('--anchor-x', `${(projected.x * 0.5 + 0.5) * width}px`);
    element.style.setProperty('--anchor-y', `${(-projected.y * 0.5 + 0.5) * viewHeight}px`);
  }
  function draw(time: number) {
    frame = 0;
    if (disposed || lost || !visible || document.hidden) return;
    if (width <= 1 || viewHeight <= 1) return;
    const nextChargeColor = state.dark ? '#c8f522' : lightChargeColor;
    lightMode.value = state.dark ? 0 : 1;
    if (nextChargeColor !== activeChargeColor) {
      chargeMaterials.forEach((material) => material.color.set(nextChargeColor));
      activeChargeColor = nextChargeColor;
    }
    const progress = state.still || !started ? 1 : Math.min((time - started) / 700, 1);
    const fillProgress = Math.max(0, (progress - 0.14) / 0.86);
    fill.value = THREE.MathUtils.lerp(fromCharge, state.charge / 100, fillProgress);
    pulse.value = progress < 1 && state.charge / 100 > fromCharge
      ? Math.sin(progress * Math.PI)
      : 0;
    const targetX = state.still ? 0 : state.tilt.y * Math.PI / 180;
    const targetY = state.still ? 0 : state.tilt.x * Math.PI / 180;
    pivot.rotation.x = state.still ? 0 : THREE.MathUtils.lerp(pivot.rotation.x, targetX, 0.2);
    pivot.rotation.y = state.still ? 0 : THREE.MathUtils.lerp(pivot.rotation.y, targetY, 0.2);
    ambient.intensity = state.dark ? 2.3 : 3;
    renderer.render(scene, camera);
    if (!announcedReady) {
      announcedReady = true;
      ready(true);
    }
    positionAnchor(anchors.goal, 0.55, height * 0.43);
    positionAnchor(
      anchors.charge,
      0.95,
      Math.max((fill.value - 0.5) * height, -0.05 * height),
    );
    if (
      progress < 1 ||
      Math.abs(pivot.rotation.x - targetX) + Math.abs(pivot.rotation.y - targetY) > 0.001
    ) schedule();
  }
  function schedule() {
    if (!frame && !disposed && !lost && visible && !document.hidden) {
      frame = requestAnimationFrame(draw);
    }
  }
  const resize = new ResizeObserver(() => {
    width = host.clientWidth;
    viewHeight = host.clientHeight;
    renderer.setSize(width, viewHeight, false);
    const halfHeight = width < 700 ? 2.45 : 2.35;
    const halfWidth = Math.max(1.6, halfHeight * width / viewHeight);
    camera.left = -halfWidth;
    camera.right = halfWidth;
    camera.top = halfHeight - 0.3;
    camera.bottom = -halfHeight - 0.3;
    camera.updateProjectionMatrix();
    schedule();
  });
  resize.observe(host);
  const intersection = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting;
    if (!visible) cancelAnimationFrame(frame);
    if (!visible) frame = 0;
    schedule();
  });
  intersection.observe(host);
  const visibility = () => {
    if (document.hidden) {
      cancelAnimationFrame(frame);
      frame = 0;
    } else schedule();
  };
  const contextLost = (event: Event) => {
    event.preventDefault();
    lost = true;
    cancelAnimationFrame(frame);
    frame = 0;
    ready(false);
  };
  document.addEventListener('visibilitychange', visibility);
  renderer.domElement.addEventListener('webglcontextlost', contextLost);
  schedule();
  return {
    update(next) {
      if (next.minutes > state.minutes) {
        if (next.charge === state.charge) {
          started = 0;
          fill.value = next.charge / 100;
          pulse.value = 0;
        } else {
          fromCharge = fill.value;
          started = performance.now();
        }
      }
      if (next.minutes < state.minutes) {
        started = 0;
        fill.value = next.charge / 100;
      }
      state = next;
      schedule();
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frame);
      resize.disconnect();
      intersection.disconnect();
      document.removeEventListener('visibilitychange', visibility);
      renderer.domElement.removeEventListener('webglcontextlost', contextLost);
      model.traverse((object) => {
        if (!(object instanceof THREE.Mesh)) return;
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material: THREE.Material) => material.dispose());
      });
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
