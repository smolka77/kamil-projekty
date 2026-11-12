import * as THREE from 'three';

/**
 * Styl "animowanej kreskówki": płaskie cieniowanie (2 tony) + czarny kontur
 * metodą odwróconej powłoki (inverted hull). Grubość konturu rośnie z odległością,
 * więc na ekranie wygląda na stałą, jak linia narysowana ręcznie.
 */

let gradient = null;
export function toonGradient() {
  if (gradient) return gradient;
  const data = new Uint8Array([135, 255]);
  gradient = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  gradient.minFilter = THREE.NearestFilter;
  gradient.magFilter = THREE.NearestFilter;
  gradient.generateMipmaps = false;
  gradient.needsUpdate = true;
  return gradient;
}

let softGradient = null;
/** Łagodniejszy cień — dla skóry, żeby twarz nie była przecięta ostrą krawędzią. */
export function toonGradientSoft() {
  if (softGradient) return softGradient;
  const data = new Uint8Array([190, 255]);
  softGradient = new THREE.DataTexture(data, data.length, 1, THREE.RedFormat);
  softGradient.minFilter = THREE.NearestFilter;
  softGradient.magFilter = THREE.NearestFilter;
  softGradient.generateMipmaps = false;
  softGradient.needsUpdate = true;
  return softGradient;
}

export function toonMat(color, opts = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: toonGradient(), ...opts });
}

export function makeOutlineMaterial(thickness = 0.0042, color = 0x17121f) {
  return new THREE.ShaderMaterial({
    uniforms: {
      thickness: { value: thickness },
      color: { value: new THREE.Color(color) },
    },
    vertexShader: /* glsl */ `
      uniform float thickness;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vec3 nv = normalize(normalMatrix * normal);
        mv.xyz += nv * thickness * clamp(-mv.z, 0.5, 14.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 color;
      void main() {
        gl_FragColor = vec4(color, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide,
  });
}

const noRaycast = () => {};

export function addOutline(mesh, mat) {
  const o = new THREE.Mesh(mesh.geometry, mat);
  o.castShadow = false;
  o.receiveShadow = false;
  o.userData.outline = true;
  o.raycast = noRaycast;
  mesh.add(o);
  return o;
}
