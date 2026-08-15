// GARGANTUA — Schwarzschild black hole raytracer shaders.
// Units: Schwarzschild radius rs = 1.  Rays are null geodesics integrated
// in 3D Schwarzschild coordinates with the exact equation of motion
//   d^2 x / dlambda^2 = -(3/2) * L^2 * x / r^5,  L = |x x p| (conserved).
// RK4 integration keeps the photon sphere (r = 1.5 rs) stable, which is
// what makes the critical curve / photon ring resolve cleanly.

export const FULLSCREEN_VERT = /* glsl */`
precision highp float;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

export const MAIN_FRAG = /* glsl */`
precision highp float;

uniform vec2  uResolution;
uniform float uTime;
uniform int   uFrame;
uniform vec3  uCamPos;
uniform vec3  uCamFwd;
uniform vec3  uCamRight;
uniform vec3  uCamUp;
uniform float uTanFov;
uniform float uAspect;

uniform float uDiskInner;
uniform float uDiskOuter;
uniform float uDiskBrightness;
uniform float uDiskOpacity;
uniform float uDiskTurbulence;
uniform float uDiskSpeed;
uniform float uDiskThickness;
uniform float uDiskTempK;

uniform float uStarBrightness;
uniform float uGalaxyBrightness;
uniform float uStarDensity;
uniform vec3  uGalaxyNormal;
uniform vec3  uGalaxyCenter;

uniform float uRingBoost;
uniform float uMaxStepsF;
uniform float uStepScale;
uniform float uSubSamplesF;
uniform int   uDebug;

varying vec2 vUv;

#define RS       1.0
#define B_CRIT   2.598076211353316
#define MAX_STEPS 640
#define MAX_SAMPLES 4
#define PI 3.141592653589793
#define GOLDEN 0.61803398875

// ---------------------------------------------------------------------------
// Procedural helpers
// ---------------------------------------------------------------------------
float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  p = fract(p * vec2(0.1031, 0.1030));
  p += dot(p, p.yx + 33.33);
  return fract((p.xx + p.yy) * p.xy);
}

vec3 hash33(vec3 p3) {
  p3 = fract(p3 * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yxz + 33.33);
  return fract((p3.xxy + p3.yzz) * p3.zyx);
}

float vnoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  float a = hash12(i);
  float b = hash12(i + vec2(1.0, 0.0));
  float c = hash12(i + vec2(0.0, 1.0));
  float d = hash12(i + vec2(1.0, 1.0));
  return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
}

float fbm(vec2 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amp * vnoise(p);
    p = p * 2.03 + vec2(11.37, 7.19);
    amp *= 0.5;
  }
  return value;
}

// Tanner Helland / Neil Bartlett polynomial fit, then linearized.
vec3 blackbody(float kelvin) {
  float t = clamp(kelvin, 800.0, 40000.0) / 100.0;
  vec3 c;
  if (t <= 66.0) {
    c.r = 1.0;
  } else {
    c.r = 1.29293618606 * pow(t - 60.0, -0.1332047592);
  }
  if (t <= 66.0) {
    c.g = 0.39008157876 * log(t) - 0.63184184161;
  } else {
    c.g = 1.1298908609 * pow(t - 60.0, -0.0755148492);
  }
  if (t >= 66.0) {
    c.b = 1.0;
  } else if (t <= 19.0) {
    c.b = 0.0;
  } else {
    c.b = 0.54320678911 * log(t - 10.0) - 1.1962540895;
  }
  c = clamp(c, 0.0, 1.0);
  return c * c; // approximate sRGB -> linear
}

vec3 palette(float t) {
  t = clamp(t, 0.0, 1.0);
  return clamp(vec3(
    1.25 * t - 0.35,
    1.0 - 1.4 * abs(t - 0.45),
    1.25 - 1.25 * t
  ), 0.0, 1.0);
}

vec3 accel(vec3 p, float L2) {
  float r2 = dot(p, p);
  float r = sqrt(r2);
  float k = -1.5 * L2 / (r2 * r2 * r);
  return p * k;
}

// ---------------------------------------------------------------------------
// Background: procedural star field + milky-way-like galaxy, both lensed by
// the geodesic integration (the direction passed in is the asymptotic ray).
// ---------------------------------------------------------------------------
vec3 background(vec3 d) {
  vec3 col = vec3(0.0006, 0.0009, 0.0016);

  // Cube-cell star field: search the 8 surrounding cells of a direction grid.
  float grid = uStarDensity;
  vec3 gp = d * grid;
  vec3 cell = floor(gp);
  vec3 starSum = vec3(0.0);

  for (int i = 0; i < 8; i++) {
    vec3 off = vec3(
      mod(float(i), 2.0),
      mod(floor(float(i) * 0.5), 2.0),
      mod(floor(float(i) * 0.25), 2.0)
    );
    vec3 c = cell + off;
    vec3 rnd = hash33(c);
    vec3 center = c + 0.5 + (rnd - 0.5) * 0.78;
    vec3 sdir = normalize(center);
    float ang2 = clamp(1.0 - dot(d, sdir), 0.0, 1.0);
    float sigma = mix(1.1e-7, 5.5e-6, pow(rnd.x, 7.0));
    float lum = pow(rnd.y, 12.0) * (0.25 + 0.75 * pow(rnd.z, 3.0));
    lum *= exp(-ang2 / max(sigma, 1.0e-9));
    lum *= uStarBrightness * 30.0;
    if (lum > 0.004) {
      vec3 starCol = blackbody(mix(2900.0, 12000.0, pow(rnd.z, 4.0)));
      float tw = 0.72 + 0.28 * sin(uTime * (2.0 + rnd.z * 3.0) + rnd.x * 90.0);
      starSum += starCol * lum * tw;
    }
  }
  col += starSum;

  // Procedural galaxy: a tilted dusty band with a bright core.
  vec3 gn = normalize(uGalaxyNormal);
  vec3 gc = normalize(uGalaxyCenter);
  vec3 ge1 = normalize(cross(gn, abs(gn.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0)));
  vec3 ge2 = cross(gn, ge1);
  vec2 guv = vec2(dot(d, ge1), dot(d, ge2));
  float g1 = fbm(guv * 5.0 + vec2(uTime * 0.002, -uTime * 0.0013));
  float g2 = fbm(guv * 11.0 + vec2(17.3, -4.1) + vec2(uTime * 0.004, 0.0));
  float lat = dot(d, gn);
  float band = exp(-lat * lat * 9.0) + 0.10 * exp(-lat * lat * 90.0);
  float dust = smoothstep(0.35, 0.85, g2);
  float core = pow(max(dot(d, gc), 0.0), 14.0);
  float coreN = fbm(guv * 3.0 + vec2(31.7, 8.3));
  vec3 galCol = mix(vec3(1.00, 0.82, 0.60), vec3(0.62, 0.75, 1.00), clamp(g1 * 1.2, 0.0, 1.0));
  galCol = mix(galCol, vec3(1.0, 0.93, 0.78), clamp(coreN, 0.0, 1.0) * 0.35);
  float gal = band * (0.22 + 0.85 * g1) * (1.0 - 0.60 * dust) * (1.0 + core * 5.0);
  col += galCol * gal * uGalaxyBrightness * 0.65;

  return col;
}

// ---------------------------------------------------------------------------
// Thin turbulent accretion disk (Keplerian, Doppler + gravitational shift).
// ---------------------------------------------------------------------------
vec3 sampleDisk(vec3 hit, vec3 vel, float r, out float gOut, out float alphaOut) {
  float phi = atan(hit.z, hit.x);
  // Angular velocity vector is -y for a disk orbiting from +x towards +z.
  float om = -sqrt(0.5 / (r * r * r));
  float uT = inversesqrt(max(1.0 - 1.5 / r, 0.001));
  float b = dot(cross(hit, vel), vec3(0.0, 1.0, 0.0));
  float g = 1.0 / max(uT * (1.0 - b * om), 0.02);
  g = clamp(g, 0.03, 6.0);
  gOut = g;

  float spin = uTime * uDiskSpeed * sqrt(0.5 / (r * r * r));
  float ang = phi - spin;
  float freq = 2.0 + uDiskTurbulence * 2.4;
  float radFreq = 2.2 + uDiskTurbulence * 1.8;
  vec2 flow = uTime * uDiskSpeed * vec2(0.13, -0.055);
  vec2 duv = vec2(ang * freq, log(max(r, 0.01)) * radFreq) + flow;
  float n1 = fbm(duv);
  float n2 = fbm(duv * 1.71 + vec2(13.71, 5.17));

  float radial = smoothstep(uDiskInner, uDiskInner + 0.55, r);
  radial *= 1.0 - smoothstep(uDiskOuter * 0.82, uDiskOuter, r);
  float density = radial * (0.42 + 0.58 * n1);

  float tempRatio = pow(uDiskInner / r, 0.75);
  float T = uDiskTempK * tempRatio * (0.88 + 0.24 * n2);

  float h = uDiskThickness * r * (0.55 + 0.55 * n1);
  float cosInc = abs(dot(normalize(vel), vec3(0.0, 1.0, 0.0)));
  float column = 1.7724538509 * h / max(cosInc, 0.05);
  float tau = uDiskOpacity * density * column;
  alphaOut = 1.0 - exp(-tau);

  float lum = pow(tempRatio, 4.0) * uDiskBrightness;
  lum *= pow(g, 3.0);
  lum *= (0.55 + 0.90 * n1) * (0.70 + 0.55 * n2);
  vec3 col = blackbody(T * g) * lum;

  // Hot inner rim.
  float rim = exp(-pow(max(r - uDiskInner, 0.0) / (uDiskInner * 0.28), 2.0));
  col += blackbody(T * g * 1.35) * lum * rim * 1.1;

  return col;
}

// ---------------------------------------------------------------------------
// Integrate a Schwarzschild null geodesic.  Disk crossings are accumulated in
// order along the affine parameter so secondary / tertiary lensed images stack.
// ---------------------------------------------------------------------------
void traceRay(vec3 ro, vec3 rd,
              out vec3 diskOut, out vec3 bgOut, out vec3 col,
              out float stepsOut, out float countOut,
              out float gOut, out float minROut, out float bOut, out float nearOut) {
  float r0 = length(ro);
  float initSpeed = inversesqrt(max(1.0 - 1.0 / r0, 0.01));
  vec3 pos = ro;
  vec3 vel = rd * initSpeed;

  vec3 h0 = cross(pos, vel);
  float L2 = dot(h0, h0);
  float bVal = sqrt(L2);
  float nearCrit = exp(-pow((bVal - B_CRIT) / (B_CRIT * 0.035), 2.0));

  vec3 diskRad = vec3(0.0);
  vec3 bgRad = vec3(0.0);
  float trans = 1.0;
  float count = 0.0;
  float gAcc = 1.0;
  float minR = r0;
  float steps = 0.0;

  const float rEscape = 64.0;

  for (int i = 0; i < MAX_STEPS; i++) {
    if (float(i) >= uMaxStepsF) {
      steps = float(i);
      break;
    }

    float r = length(pos);
    if (r < 1.02) {
      steps = float(i);
      break; // captured by the event horizon
    }
    if (r > rEscape) {
      bgRad = background(normalize(vel));
      diskOut = diskRad;
      bgOut = bgRad;
      col = diskRad + bgRad * trans;
      stepsOut = float(i);
      countOut = count;
      gOut = gAcc;
      minROut = minR;
      bOut = bVal;
      nearOut = nearCrit;
      return;
    }

    float dt = clamp(uStepScale * r, 0.025, 1.0);

    // RK4 for the conservative central-force form of the null geodesic.
    vec3 k1p = vel;
    vec3 k1v = accel(pos, L2);
    vec3 p2 = pos + 0.5 * dt * k1p;
    vec3 v2 = vel + 0.5 * dt * k1v;
    vec3 k2p = v2;
    vec3 k2v = accel(p2, L2);
    vec3 p3 = pos + 0.5 * dt * k2p;
    vec3 v3 = vel + 0.5 * dt * k2v;
    vec3 k3p = v3;
    vec3 k3v = accel(p3, L2);
    vec3 p4 = pos + dt * k3p;
    vec3 v4 = vel + dt * k3v;
    vec3 k4p = v4;
    vec3 k4v = accel(p4, L2);

    vec3 newPos = pos + dt * (k1p + 2.0 * k2p + 2.0 * k3p + k4p) / 6.0;
    vec3 newVel = vel + dt * (k1v + 2.0 * k2v + 2.0 * k3v + k4v) / 6.0;

    // Thin-disk crossing between the previous and the new position.
    float y0 = pos.y;
    float y1 = newPos.y;
    if (y0 * y1 < 0.0) {
      float tHit = y0 / (y0 - y1);
      vec3 hit = mix(pos, newPos, tHit);
      vec3 velHit = mix(vel, newVel, tHit);
      float rHit = length(hit.xz);
      if (rHit > uDiskInner && rHit < uDiskOuter) {
        float gDisk;
        float alphaDisk;
        vec3 diskCol = sampleDisk(hit, velHit, rHit, gDisk, alphaDisk);
        // Legitimate geodesic-winding boost: only rays that repeatedly cross
        // the equatorial plane near the critical impact parameter get it.
        float ringBoost = 1.0 + uRingBoost * nearCrit * min(count + 1.0, 4.0) * 0.4;
        diskRad += diskCol * trans * ringBoost;
        trans *= max(1.0 - alphaDisk, 0.0);
        count += 1.0;
        gAcc = gDisk;
      }
    }

    pos = newPos;
    vel = newVel;
    minR = min(minR, length(pos));
  }

  // Step budget exhausted: only the accumulated disk light survives. Rays that
  // are still wound around the photon sphere naturally form the critical curve.
  diskOut = diskRad;
  bgOut = bgRad;
  col = diskRad;
  stepsOut = uMaxStepsF;
  countOut = count;
  gOut = gAcc;
  minROut = minR;
  bOut = bVal;
  nearOut = nearCrit;
}

void main() {
  vec3 total = vec3(0.0);
  float samples = max(uSubSamplesF, 1.0);

  for (int s = 0; s < MAX_SAMPLES; s++) {
    if (float(s) >= samples) break;

    vec2 jitter;
    if (samples <= 1.0) {
      jitter = vec2(0.0);
    } else {
      jitter = (hash22(vec2(float(s + 1) + float(uFrame) * 13.0, float(s) * 7.31)) - 0.5) / uResolution;
    }
    vec2 frag = gl_FragCoord.xy + jitter;
    vec2 ndc = (frag / uResolution) * 2.0 - 1.0;
    vec3 rd = normalize(uCamFwd
      + ndc.x * uTanFov * uAspect * uCamRight
      + ndc.y * uTanFov * uCamUp);

    vec3 col;
    vec3 diskOnly;
    vec3 bgOnly;
    float stepsN;
    float countN;
    float gN;
    float minRN;
    float bN;
    float nearN;
    traceRay(uCamPos, rd, diskOnly, bgOnly, col, stepsN, countN, gN, minRN, bN, nearN);

    if (uDebug == 2) {
      col = diskOnly;
    } else if (uDebug == 3) {
      col = palette(clamp(bN / B_CRIT, 0.0, 1.6) * 0.625);
    } else if (uDebug == 4) {
      col = vec3(nearN * 1.6 + min(countN, 5.0) * 0.06);
    } else if (uDebug == 5) {
      col = palette(min(countN, 6.0) / 6.0);
    } else if (uDebug == 6) {
      col = gN < 1.0
        ? mix(vec3(1.0, 0.04, 0.015), vec3(1.0), clamp(gN, 0.0, 1.0))
        : mix(vec3(1.0), vec3(0.03, 0.28, 1.0), clamp((gN - 1.0) * 0.45, 0.0, 1.0));
    } else if (uDebug == 7) {
      col = bgOnly;
    } else if (uDebug == 9) {
      col = palette(stepsN / max(uMaxStepsF, 1.0));
    }
    total += col;
  }

  vec3 outCol = total / samples;
  gl_FragColor = vec4(outCol, 1.0);
}
`;

export const BRIGHT_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uThreshold;
uniform float uKnee;
void main() {
  vec3 c = texture2D(uTex, vUv).rgb;
  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
  float w = smoothstep(uThreshold, uThreshold + uKnee, l);
  gl_FragColor = vec4(c * w, 1.0);
}
`;

export const DOWNSAMPLE_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
void main() {
  vec2 uv = vUv;
  vec3 sum = texture2D(uTex, uv + vec2( 0.5,  0.5) * uTexel).rgb;
  sum += texture2D(uTex, uv + vec2(-0.5,  0.5) * uTexel).rgb;
  sum += texture2D(uTex, uv + vec2( 0.5, -0.5) * uTexel).rgb;
  sum += texture2D(uTex, uv + vec2(-0.5, -0.5) * uTexel).rgb;
  gl_FragColor = vec4(sum * 0.25, 1.0);
}
`;

export const BLUR_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform vec2 uTexel;
uniform float uOffset;
void main() {
  vec2 off = uTexel * uOffset;
  vec3 c = texture2D(uTex, vUv).rgb;
  c += texture2D(uTex, vUv + vec2( off.x,  off.y)).rgb;
  c += texture2D(uTex, vUv + vec2(-off.x,  off.y)).rgb;
  c += texture2D(uTex, vUv + vec2( off.x, -off.y)).rgb;
  c += texture2D(uTex, vUv + vec2(-off.x, -off.y)).rgb;
  gl_FragColor = vec4(c * 0.2, 1.0);
}
`;

export const FINAL_FRAG = /* glsl */`
precision highp float;
varying vec2 vUv;
uniform sampler2D uScene;
uniform sampler2D uBloom;
uniform vec2  uResolution;
uniform float uTime;
uniform float uExposure;
uniform float uBloomStrength;
uniform float uAberration;
uniform float uVignette;
uniform float uGrain;
uniform float uSaturation;
uniform int   uDebug;
uniform int   uFrame;

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

float luma(vec3 c) { return dot(c, vec3(0.2126, 0.7152, 0.0722)); }

vec3 aces(vec3 x) {
  return clamp((x * (2.51 * x + 0.03)) / (x * (2.43 * x + 0.59) + 0.14), 0.0, 1.0);
}

vec3 saturate3(vec3 c, float s) {
  float l = luma(c);
  return mix(vec3(l), c, s);
}

vec3 srgbEncode(vec3 c) {
  vec3 lo = c * 12.92;
  vec3 hi = 1.055 * pow(max(c, 0.0), vec3(1.0 / 2.4)) - 0.055;
  return mix(lo, hi, step(vec3(0.0031308), c));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 uv = frag / uResolution;
  vec3 col;

  bool diagnostic = (uDebug == 3 || uDebug == 4 || uDebug == 5 || uDebug == 6 || uDebug == 9);

  if (uDebug == 8) {
    col = texture2D(uBloom, uv).rgb;
    col = aces(col * uExposure);
  } else if (diagnostic) {
    col = texture2D(uScene, uv).rgb;
  } else if (uDebug == 1 || uDebug == 2 || uDebug == 7) {
    col = texture2D(uScene, uv).rgb;
    col = aces(col * uExposure);
  } else {
    // Slight radial chromatic dispersion (full render only).
    vec2 dir = uv - 0.5;
    float rr = dot(dir, dir);
    vec2 off = dir * uAberration * (0.0012 + rr * 0.005);
    vec3 scene;
    scene.r = texture2D(uScene, clamp(uv + off, 0.002, 0.998)).r;
    scene.g = texture2D(uScene, uv).g;
    scene.b = texture2D(uScene, clamp(uv - off, 0.002, 0.998)).b;
    vec3 bloom = texture2D(uBloom, uv).rgb;

    col = (scene + bloom * uBloomStrength) * uExposure;
    col = aces(col);
    col = saturate3(col, uSaturation);

    // Vignette.
    float vig = smoothstep(1.28, 0.32, length(uv - 0.5));
    col *= mix(1.0, vig, clamp(uVignette, 0.0, 1.0));

    // Film grain (suppressed inside the shadow so the hole stays deep black).
    float grainHash = hash12(frag + vec2(uTime * 61.0, uTime * 37.0) + float(uFrame) * 0.17);
    float grain = (grainHash - 0.5) * uGrain * 0.14;
    col += grain * smoothstep(0.002, 0.07, luma(col));
  }

  gl_FragColor = vec4(srgbEncode(col), 1.0);
}
`;
