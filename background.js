(() => {
  const canvas = document.getElementById('ambient-background');
  if (!canvas || getComputedStyle(canvas).display === 'none') return;

  const gl = canvas.getContext('webgl', {
    alpha: false,
    antialias: false,
    powerPreference: 'low-power',
  });
  if (!gl) return;

  const vertexSource = `
    attribute vec2 position;
    varying vec2 vUv;
    void main() {
      vUv = position * 0.5 + 0.5;
      gl_Position = vec4(position, 0.0, 1.0);
    }
  `;

  const fragmentSource = `
    precision highp float;
    varying vec2 vUv;
    uniform vec2 u_resolution;
    uniform float u_time;
    uniform vec3 u_colors[4];
    uniform vec3 u_bg;

    vec3 permute(vec3 x) { return mod(((x * 34.0) + 1.0) * x, 289.0); }
    float snoise(vec2 v) {
      const vec4 C = vec4(0.211324865405187, 0.366025403784439,
        -0.577350269189626, 0.024390243902439);
      vec2 i = floor(v + dot(v, C.yy));
      vec2 x0 = v - i + dot(i, C.xx);
      vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
      vec4 x12 = x0.xyxy + C.xxzz;
      x12.xy -= i1;
      i = mod(i, 289.0);
      vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
        + i.x + vec3(0.0, i1.x, 1.0));
      vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy),
        dot(x12.zw, x12.zw)), 0.0);
      m *= m;
      m *= m;
      vec3 x = 2.0 * fract(p * C.www) - 1.0;
      vec3 h = abs(x) - 0.5;
      vec3 ox = floor(x + 0.5);
      vec3 a0 = x - ox;
      m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
      vec3 g;
      g.x = a0.x * x0.x + h.x * x0.y;
      g.yz = a0.yz * x12.xz + h.yz * x12.yw;
      return 130.0 * dot(m, g);
    }

    void main() {
      float ratio = u_resolution.x / u_resolution.y;
      vec2 p = vUv - 0.5;
      p.x *= ratio;
      float t = u_time * 0.1;
      float n1 = snoise(p * 0.4 + vec2(t * 0.2, -t * 0.3));
      float n2 = snoise(p * 0.55 + vec2(-t * 0.15, t * 0.25) + n1 * 0.25);
      float n3 = snoise(p * 0.75 + vec2(t * 0.1, -t * 0.2) + n2 * 0.2);
      vec3 col = u_bg;
      float dist = length(p) * 1.5;
      float vignette = 1.0 - smoothstep(0.3, 1.2, dist);
      col = mix(col, u_colors[0], smoothstep(-0.2, 0.5, n1) * 0.56);
      col = mix(col, u_colors[1], smoothstep(-0.1, 0.6, n2) * 0.54);
      col = mix(col, u_colors[2], smoothstep(-0.3, 0.4, n3) * 0.4);
      col = mix(col, u_colors[3], smoothstep(0.0, 0.7, n1 * n2) * 0.2);
      float glow = (1.0 - smoothstep(0.0, 0.8, dist)) * 0.16;
      col += u_colors[1] * glow;
      col = mix(col * 0.82, col, vignette);
      gl_FragColor = vec4(col, 1.0);
    }
  `;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      gl.deleteShader(shader);
      return null;
    }
    return shader;
  };

  const vertexShader = compile(gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = compile(gl.FRAGMENT_SHADER, fragmentSource);
  if (!vertexShader || !fragmentShader) return;

  const program = gl.createProgram();
  if (!program) return;
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
  gl.useProgram(program);

  const buffer = gl.createBuffer();
  if (!buffer) return;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1, 1, -1, -1, 1, 1, 1,
  ]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

  const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');
  const timeLocation = gl.getUniformLocation(program, 'u_time');
  const colorsLocation = gl.getUniformLocation(program, 'u_colors[0]');
  const backgroundLocation = gl.getUniformLocation(program, 'u_bg');
  const toRgb = (hex) => [
    parseInt(hex.slice(1, 3), 16) / 255,
    parseInt(hex.slice(3, 5), 16) / 255,
    parseInt(hex.slice(5, 7), 16) / 255,
  ];
  const colors = ['#D7FFE0', '#8FDEA3', '#55B875', '#F8FFF9']
    .flatMap(toRgb);
  const background = toRgb('#E3F2E7');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let frameId = 0;
  let lastDraw = 0;

  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const width = Math.round(window.innerWidth * dpr);
    const height = Math.round(window.innerHeight * dpr);
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
    }
  };

  const draw = (time = 0) => {
    resize();
    gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    gl.uniform1f(timeLocation, time * 0.001 * 0.32);
    gl.uniform3fv(colorsLocation, colors);
    gl.uniform3f(backgroundLocation, ...background);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  };

  const render = (time) => {
    if (document.hidden) {
      frameId = 0;
      return;
    }
    if (time - lastDraw >= 33 || !lastDraw) {
      draw(time);
      lastDraw = time;
    }
    frameId = reducedMotion.matches ? 0 : requestAnimationFrame(render);
  };

  const start = () => {
    if (!frameId) frameId = requestAnimationFrame(render);
  };

  resize();
  draw(0);
  if (!reducedMotion.matches) start();
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(frameId);
      frameId = 0;
    } else if (!reducedMotion.matches) {
      start();
    }
  });
  reducedMotion.addEventListener?.('change', () => {
    cancelAnimationFrame(frameId);
    frameId = 0;
    if (reducedMotion.matches) draw(0);
    else start();
  });
  window.addEventListener('resize', resize, { passive: true });
})();
