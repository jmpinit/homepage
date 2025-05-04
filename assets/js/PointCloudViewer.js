/**
 * Usage:
 *   <script src="PointCloudViewer.js"></script>
 *   <canvas id="pcv" style="width:100%;height:60vh"></canvas>
 *   <script>
 *     const viewer = new PointCloudViewer(document.getElementById('pcv'), {
 *       minZoom: 1,
 *       maxZoom: 50,
 *       pointSize: 2
 *     });
 *     fetch('scene.pcb').then(r => r.arrayBuffer()).then(buf => viewer.loadPointCloud(buf));
 *   </script>
 * --------------------------------------------------------------
 * Binary point‑cloud format (.pcb)
 *   uint32 magic  = 0x50435642  // "PCVB"
 *   uint8  version = 1
 *   uint8  flags   // bit0: hasColor
 *   float32 camFocalLength // camera focal length in mm
 *   float32 camAperture // camera aperture in mm
 *   float32[3] camTarget
 *   float32 azimuth // camera azimuth in degrees
 *   float32 elevation // camera elevation in degrees
 *   float32 radius // camera distance
 *   uint32 pointCount
 *   float32[6] bbox  // minX,minY,minZ,maxX,maxY,maxZ
 *   repeat pointCount times:
 *     float32 x,y,z
 *     [uint8 r,g,b]  // if hasColor
 */
(function (global) {
  'use strict';

  // -------------------------------------------------------------------------
  // utils
  // -------------------------------------------------------------------------
  const DEG2RAD = Math.PI / 180;

  function _sphericalToCartesian(r, thetaDeg, phiDeg, origin = [0, 0, 0]) {
    const t = thetaDeg * DEG2RAD;
    const p = phiDeg * DEG2RAD;
    const cosP = Math.cos(p);
    const x = r * cosP * Math.cos(t) + origin[0];
    const y = r * Math.sin(p) + origin[1];
    const z = r * cosP * Math.sin(t) + origin[2];
    return [x, y, z];
  }

  function _vec3_sub(a, b) {
    return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
  }

  function _vec3_norm(v) {
    const len = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / len, v[1] / len, v[2] / len];
  }

  function _vec3_cross(a, b) {
    return [
      a[1] * b[2] - a[2] * b[1],
      a[2] * b[0] - a[0] * b[2],
      a[0] * b[1] - a[1] * b[0]
    ];
  }

  function _mat4_mul(a, b) {
    const o = new Float32Array(16);
    for (let i = 0; i < 4; i++) {
      const ai0 = a[i];
      const ai1 = a[i + 4];
      const ai2 = a[i + 8];
      const ai3 = a[i + 12];
      o[i]      = ai0 * b[0] + ai1 * b[1] + ai2 * b[2] + ai3 * b[3];
      o[i + 4]  = ai0 * b[4] + ai1 * b[5] + ai2 * b[6] + ai3 * b[7];
      o[i + 8]  = ai0 * b[8] + ai1 * b[9] + ai2 * b[10] + ai3 * b[11];
      o[i + 12] = ai0 * b[12] + ai1 * b[13] + ai2 * b[14] + ai3 * b[15];
    }
    return o;
  }

  function _mat4_perspective(fovyRad, aspect, near, far) {
    const f = 1 / Math.tan(fovyRad / 2);
    const nf = 1 / (near - far);
    const out = new Float32Array(16);
    out[0] = f / aspect;
    out[5] = f;
    out[10] = (far + near) * nf;
    out[11] = -1;
    out[14] = 2 * far * near * nf;
    return out;
  }

  function _mat4_lookAt(eye, center, up) {
    const z = _vec3_norm(_vec3_sub(eye, center));
    const x = _vec3_norm(_vec3_cross(up, z));
    const y = _vec3_cross(z, x);
    const out = new Float32Array(16);
    out[0] = x[0]; out[4] = x[1]; out[8]  = x[2]; out[12] = - (x[0] * eye[0] + x[1] * eye[1] + x[2] * eye[2]);
    out[1] = y[0]; out[5] = y[1]; out[9]  = y[2]; out[13] = - (y[0] * eye[0] + y[1] * eye[1] + y[2] * eye[2]);
    out[2] = z[0]; out[6] = z[1]; out[10] = z[2]; out[14] = - (z[0] * eye[0] + z[1] * eye[1] + z[2] * eye[2]);
    out[3] = 0;   out[7] = 0;    out[11] = 0;     out[15] = 1;
    return out;
  }

  function _confineToBBox(t, bbox) {
    t[0] = Math.min(bbox.max[0], Math.max(bbox.min[0], t[0]));
    t[1] = Math.min(bbox.max[1], Math.max(bbox.min[1], t[1]));
    t[2] = Math.min(bbox.max[2], Math.max(bbox.min[2], t[2]));
  }

  function _compileShader(gl, type, src) {
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(s));
    }
    return s;
  }

  function _linkProgram(gl, vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, vs);
    gl.attachShader(p, fs);
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(p));
    }
    return p;
  }

  function _parsePCB(buffer) {
    const dv = new DataView(buffer);
    let o = 0;
    const magic = dv.getUint32(o, true); o += 4;
    if (magic !== 0x50435642) throw new Error('Bad magic');
    const version = dv.getUint8(o); o += 1;
    if (version !== 1) throw new Error('Unsupported version');
    const flags = dv.getUint8(o); o += 1;
    const hasColor = (flags & 1) !== 0;
    const camFocalLength = dv.getFloat32(o, true); o += 4;
    const camAperture = dv.getFloat32(o, true); o += 4;
    const camTarget = [
      dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)
    ];
    o += 12;
    const azimuth = dv.getFloat32(o, true); o += 4;
    const elevation = dv.getFloat32(o, true); o += 4;
    const radius = dv.getFloat32(o, true); o += 4;
    const pointCount = dv.getUint32(o, true); o += 4;
    const bbox = {
      min: [dv.getFloat32(o, true), dv.getFloat32(o + 4, true), dv.getFloat32(o + 8, true)],
      max: [dv.getFloat32(o + 12, true), dv.getFloat32(o + 16, true), dv.getFloat32(o + 20, true)]
    };
    o += 24;

    const positions = new Float32Array(pointCount * 3);
    const colors = hasColor ? new Uint8Array(pointCount * 3) : null;

    for (let i = 0; i < pointCount; i++) {
      positions[i * 3]     = dv.getFloat32(o, true); o += 4;
      positions[i * 3 + 1] = dv.getFloat32(o, true); o += 4;
      positions[i * 3 + 2] = dv.getFloat32(o, true); o += 4;
      if (hasColor) {
        colors[i * 3]     = dv.getUint8(o); o += 1;
        colors[i * 3 + 1] = dv.getUint8(o); o += 1;
        colors[i * 3 + 2] = dv.getUint8(o); o += 1;
      }
    }

    return {positions, colors, pointCount, bbox, camFocalLength, camAperture, camTarget, azimuth, elevation, radius};
  }

  // -------------------------------------------------------------------------
  // PointCloudViewer class
  // -------------------------------------------------------------------------
  class PointCloudViewer {
    /**
     * @param {HTMLCanvasElement} canvas
     * @param {object} opts
     */
    constructor(canvas, opts = {}) {
      if (!(canvas instanceof HTMLCanvasElement)) throw new Error('Canvas expected');
      this.canvas = canvas;
      this.gl = canvas.getContext('webgl', {antialias: true}) || canvas.getContext('experimental-webgl');
      if (!this.gl) throw new Error('WebGL not supported');

      this.opts = Object.assign({
        minZoom: 0.1,
        maxZoom: 100,
        pointSize: 1,
        backgroundColor: [0, 0, 0, 1]
      }, opts);

      this._initState();
      this._initGL();
      this._initEvents();
      this._resize();
      this._renderOnce();
    }

    // public ---------------------------------------------------------------
    loadPointCloud(buf) {
      const {positions, colors, pointCount, bbox, camFocalLength, camAperture, camTarget, azimuth, elevation, radius} = _parsePCB(buf);
      this.pointCount = pointCount;
      this.bbox = bbox;
      this.focalLength = camFocalLength;
      this.aperture = camAperture;
      this.target = camTarget;
      this.theta = azimuth;
      this.phi = elevation;
      this.radius = radius;

      const {gl} = this;
      this.posBuf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
      gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

      if (colors) {
        this.colBuf = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuf);
        gl.bufferData(gl.ARRAY_BUFFER, colors, gl.STATIC_DRAW);
        this.hasColor = true;
      } else {
        this.hasColor = false;
      }

      this._requestRender();
    }

    // private --------------------------------------------------------------
    _initState() {
      this.focalLength = 50;
      this.aperture = 41.4214
      this.theta = 45;  // azimuth deg
      this.phi = 45;    // elevation deg
      this.radius = 10; // camera distance
      this.target = [0, 0, 0];
      this.isDragging = false;
      this.dragMode = 'orbit';
      this.lastX = 0;
      this.lastY = 0;
      this.pinchStartDist = 0;
      this.needsRender = false;
    }

    _initGL() {
      const gl = this.gl;
      const vsSrc = `attribute vec3 aPosition;\nattribute vec3 aColor;\nuniform mat4 uMVP;\nuniform float uSize;\nvarying vec3 vColor;\nvoid main(){\n  gl_Position = uMVP*vec4(aPosition,1.0);\n  gl_PointSize = uSize;\n  vColor = aColor;\n}`;
      const fsSrc = `precision mediump float;\nvarying vec3 vColor;\nvoid main(){\n  gl_FragColor = vec4(vColor,1.0);\n}`;
      const vs = _compileShader(gl, gl.VERTEX_SHADER, vsSrc);
      const fs = _compileShader(gl, gl.FRAGMENT_SHADER, fsSrc);
      this.prog = _linkProgram(gl, vs, fs);
      gl.useProgram(this.prog);

      this.aPosition = gl.getAttribLocation(this.prog, 'aPosition');
      this.aColor = gl.getAttribLocation(this.prog, 'aColor');
      this.uMVP = gl.getUniformLocation(this.prog, 'uMVP');
      this.uSize = gl.getUniformLocation(this.prog, 'uSize');
      gl.enable(gl.DEPTH_TEST);
    }

    _initEvents() {
      const cvs = this.canvas;

      let touchOnlyInteraction = false;

      // pointer events ----------------------------------------------------
      cvs.addEventListener('pointerdown', e => {
        if (touchOnlyInteraction) return;

        e.preventDefault();
        cvs.setPointerCapture && cvs.setPointerCapture(e.pointerId);
        this.isDragging = true;
        this.dragMode = (e.button === 2 || e.pointerType === 'touch' && this._activeTouchCount() === 2) ? 'pan' : 'orbit';
        this.lastX = e.clientX;
        this.lastY = e.clientY;
      });

      cvs.addEventListener('pointermove', e => {
        if (touchOnlyInteraction) return;

        if (!this.isDragging) return;
        const dx = e.clientX - this.lastX;
        const dy = e.clientY - this.lastY;
        this.lastX = e.clientX;
        this.lastY = e.clientY;

        if (this.dragMode === 'orbit') {
          this.theta += dx * 0.5;
          this.phi -= dy * 0.5;
          this.phi = Math.max(-89, Math.min(89, this.phi));
        } else {
          const scale = this.radius * 0.002;
          const right = _sphericalToCartesian(1, this.theta + 90, 0, [0, 0, 0]);
          const up = _sphericalToCartesian(1, this.theta, this.phi + 90, [0, 0, 0]);
          this.target[0] -= (right[0] * dx + up[0] * dy) * scale;
          this.target[1] -= (right[1] * dx + up[1] * dy) * scale;
          this.target[2] -= (right[2] * dx + up[2] * dy) * scale;
          _confineToBBox(this.target, this.bbox);
        }
        this._requestRender();
      });

      window.addEventListener('pointerup', () => {
        this.isDragging = false;
      });

      cvs.addEventListener('wheel', e => {
        e.preventDefault();
        const delta = Math.sign(e.deltaY) * 0.1 * this.radius;
        this._zoomBy(delta);
      }, {passive: false});

      cvs.addEventListener('contextmenu', e => e.preventDefault());

      // touch pinch -------------------------------------------------------
      cvs.addEventListener('touchstart', e => {
        if (e.touches.length === 2) {
          this.pinchStartDist = _touchDist(e.touches[0], e.touches[1]);
          touchOnlyInteraction = true;
        } else {
          touchOnlyInteraction = false;
        }
      }, {passive: false});

      cvs.addEventListener('touchmove', e => {
        if (e.touches.length === 2) {
          e.preventDefault();
          const dist = _touchDist(e.touches[0], e.touches[1]);
          if (this.pinchStartDist) {
            const delta = (this.pinchStartDist - dist) * 0.02;
            this._zoomBy(delta);
          }
          touchOnlyInteraction = true;
        } else {
          touchOnlyInteraction = false;
        }
      }, {passive: false});

      cvs.addEventListener('touchend', () => {
        this.pinchStartDist = 0;
        touchOnlyInteraction = false;
      });

      // resize ------------------------------------------------------------
      const ro = new ResizeObserver(() => this._resize());
      ro.observe(cvs);
    }

    _activeTouchCount() {
      return (navigator.maxTouchPoints || 0) > 0 ? this.canvas.getPointerCapture ? 0 : 0 : 0; // fallback; not used for now
    }

    _touchUpList = [];

    _zoomBy(delta) {
      this.radius = Math.min(this.opts.maxZoom, Math.max(this.opts.minZoom, this.radius + delta));
      this._requestRender();
    }

    _resize() {
      const dpr = window.devicePixelRatio || 1;
      const displayW = Math.floor(this.canvas.clientWidth * dpr);
      const displayH = Math.floor(this.canvas.clientHeight * dpr);
      if (displayW !== this.canvas.width || displayH !== this.canvas.height) {
        this.canvas.width = displayW;
        this.canvas.height = displayH;
        this.gl.viewport(0, 0, displayW, displayH);
        this._requestRender();
      }
    }

    _requestRender() {
      if (!this.needsRender) {
        this.needsRender = true;
        requestAnimationFrame(() => {
          this.needsRender = false;
          this._renderOnce();
        });
      }
    }

    _renderOnce() {
      const gl = this.gl;
      gl.clearColor(...this.opts.backgroundColor);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
      if (!this.posBuf) return;

      const aspect = this.canvas.width / this.canvas.height;

      const fov = 2 * Math.atan((this.aperture / 2) / this.focalLength);
      const proj = _mat4_perspective(fov, aspect, 0.1, 10000);
      const eye = _sphericalToCartesian(this.radius, this.theta, this.phi, this.target);
      const view = _mat4_lookAt(eye, this.target, [0, 1, 0]);
      const mvp = _mat4_mul(proj, view);

      gl.useProgram(this.prog);
      gl.uniformMatrix4fv(this.uMVP, false, mvp);
      gl.uniform1f(this.uSize, this.opts.pointSize * (window.devicePixelRatio || 1));

      // positions
      gl.bindBuffer(gl.ARRAY_BUFFER, this.posBuf);
      gl.enableVertexAttribArray(this.aPosition);
      gl.vertexAttribPointer(this.aPosition, 3, gl.FLOAT, false, 0, 0);

      // colors
      if (this.hasColor) {
        gl.bindBuffer(gl.ARRAY_BUFFER, this.colBuf);
        gl.enableVertexAttribArray(this.aColor);
        gl.vertexAttribPointer(this.aColor, 3, gl.UNSIGNED_BYTE, true, 0, 0);
      } else {
        gl.disableVertexAttribArray(this.aColor);
        gl.vertexAttrib3f(this.aColor, 1, 1, 1);
      }

      gl.drawArrays(gl.POINTS, 0, this.pointCount);
    }
  }

  function _touchDist(a, b) {
    const dx = a.clientX - b.clientX;
    const dy = a.clientY - b.clientY;
    return Math.hypot(dx, dy);
  }

  // expose ---------------------------------------------------------------
  global.PointCloudViewer = PointCloudViewer;

})(typeof window !== 'undefined' ? window : this);

