export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  // Fungsi utilitas untuk menghitung nilai di t
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;

  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;

  // Dapatkan posisi x atau y berdasarkan t
  const sampleCurveX = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sampleCurveY = (t: number) => ((ay * t + by) * t + cy) * t;
  const sampleCurveDerivativeX = (t: number) => (3 * ax * t + 2 * bx) * t + cx;

  // Inversi: cari t yang menghasilkan x tertentu
  const solveCurveX = (x: number, epsilon = 1e-6) => {
    let t0, t1, t2, x2, d2;
    t2 = x; // tebakan awal

    for (let i = 0; i < 8; i++) {
      x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < epsilon) return t2;
      d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < epsilon) break;
      t2 = t2 - x2 / d2;
    }

    // fallback binary search
    t0 = 0;
    t1 = 1;
    t2 = x;
    while (t0 < t1) {
      x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < epsilon) return t2;
      if (x > x2) t0 = t2;
      else t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }

    return t2;
  };

  // hasil akhir: fungsi easing(t)
  return (t: number) => sampleCurveY(solveCurveX(t));
}

const Easings = {
  linear: cubicBezier(0, 0, 1, 1),
  ease: cubicBezier(0.25, 0.1, 0.25, 1),
  easeIn: cubicBezier(0.42, 0, 1, 1),
  easeOut: cubicBezier(0, 0, 0.58, 1),
  easeInOut: cubicBezier(0.42, 0, 0.58, 1),
};
