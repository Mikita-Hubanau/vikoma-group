// ─────────────────────────────────────────────────────────────
//  ГЕНЕРАТОР КОНТУРОВ СТРАН ДЛЯ ПЕРВОГО ЭКРАНА
//
//  Запускается вручную:  npm run build:map
//
//  Берёт настоящие границы стран (открытые данные Natural Earth),
//  пересчитывает их в плоскую картинку нужного размера и сохраняет
//  результат в src/data/map.json.
//
//  На самом сайте этот скрипт не работает и в сборку не попадает —
//  там уже лежит готовая картинка.
// ─────────────────────────────────────────────────────────────

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { feature } from 'topojson-client';
import { geoConicConformal, geoPath } from 'd3-geo';

// ── Настройки картинки ───────────────────────────────────────
const WIDTH = 480;
const HEIGHT = 340;
const PADDING = 26;

// Какие страны показываем и как называется каждая в данных.
// id используется в текстах сайта, чтобы подписать страну на своём языке.
// label — куда сдвинуть подпись от центра страны и как её выровнять,
// чтобы текст не налезал на соседей.
const COUNTRIES = [
  {
    id: 'italy',
    sourceName: 'Italy',
    label: { dx: 14, dy: 4, anchor: 'start' },
  },
  {
    id: 'belarus',
    sourceName: 'Belarus',
    label: { dx: -14, dy: 4, anchor: 'end' },
  },
  {
    id: 'russia',
    sourceName: 'Russia',
    label: { dx: 14, dy: 4, anchor: 'start' },
  },
];

// Между какими странами рисуем связи.
const LINKS = [
  { from: 'italy', to: 'belarus', bend: 0.22 },
  { from: 'italy', to: 'russia', bend: 0.3 },
];

// Видимый кусок земного шара. Россия огромная — показываем её
// европейскую часть, дальше она уходит за край картинки.
//
// Кадр задан набором точек по границе, а не прямоугольником:
// у прямоугольника на шаре важно направление обхода, и при обратном
// он означает «весь мир, кроме этого куска». У точек такой ловушки нет.
const FRAME_LON = [4, 48];
const FRAME_LAT = [35, 61];

const FRAME = {
  type: 'MultiPoint',
  coordinates: (() => {
    const pts = [];
    for (let lon = FRAME_LON[0]; lon <= FRAME_LON[1]; lon += 5) {
      pts.push([lon, FRAME_LAT[0]], [lon, FRAME_LAT[1]]);
    }
    for (let lat = FRAME_LAT[0]; lat <= FRAME_LAT[1]; lat += 5) {
      pts.push([FRAME_LON[0], lat], [FRAME_LON[1], lat]);
    }
    return pts;
  })(),
};

// Насколько огрублять контур. Больше — легче файл, но грубее берег.
const COORD_STEP = 1; // округление координат, пиксели
const MIN_ISLAND_AREA = 8; // острова мельче — выбрасываем, пиксели²

// ── Пересчёт координат ───────────────────────────────────────
const topo = JSON.parse(
  readFileSync(new URL('../node_modules/world-atlas/countries-50m.json', import.meta.url)),
);
const all = feature(topo, topo.objects.countries).features;

const projection = geoConicConformal()
  .parallels([40, 58])
  .rotate([-33, 0])
  .fitExtent(
    [
      [PADDING, PADDING],
      [WIDTH - PADDING, HEIGHT - PADDING],
    ],
    FRAME,
  );

// Обрезаем всё, что вышло за рамку, — Россия упирается в край.
// Режем с запасом наружу: место среза — это прямая линия, и если резать
// ровно по краю картинки, эта линия была бы видна как лишняя рамка.
// Лишнее уберёт сам SVG, уже без обводки.
const OVERSCAN = 30;
projection.clipExtent([
  [-OVERSCAN, -OVERSCAN],
  [WIDTH + OVERSCAN, HEIGHT + OVERSCAN],
]);

const path = geoPath(projection);

const countries = COUNTRIES.map(({ id, sourceName, label }) => {
  const f = all.find((x) => x.properties?.name === sourceName);
  if (!f) throw new Error(`Не найдена страна «${sourceName}» в данных`);

  const raw = path(f);
  if (!raw) throw new Error(`Страна «${sourceName}» не попала в кадр`);

  const d = simplify(raw);

  const [cx, cy] = path.centroid(f);
  const [[x0, y0], [x1, y1]] = path.bounds(f);

  return {
    id,
    d,
    rawSize: raw.length,
    centroid: [round(cx), round(cy)],
    label: {
      x: round(cx + label.dx),
      y: round(cy + label.dy),
      anchor: label.anchor,
    },
    bounds: [round(x0), round(y0), round(x1), round(y1)],
    points: (d.match(/[ML]/g) || []).length,
  };
});

/**
 * Облегчает контур: округляет координаты, выбрасывает повторяющиеся
 * подряд точки и совсем мелкие острова.
 * geoPath выдаёт только команды M, L и Z — разбирать просто.
 */
function simplify(d) {
  const shapes = d.split('Z').filter((s) => s.trim());
  const kept = [];

  for (const shape of shapes) {
    const points = [];
    for (const m of shape.matchAll(/([ML])(-?[\d.]+),(-?[\d.]+)/g)) {
      const x = snap(Number(m[2]));
      const y = snap(Number(m[3]));
      const last = points[points.length - 1];
      if (!last || last[0] !== x || last[1] !== y) points.push([x, y]);
    }

    if (points.length < 3) continue;
    if (area(points) < MIN_ISLAND_AREA) continue;

    kept.push(
      'M' + points.map(([x, y]) => `${x},${y}`).join('L') + 'Z',
    );
  }

  return kept.join('');
}

function snap(n) {
  return Math.round(n / COORD_STEP) * COORD_STEP;
}

/** Площадь многоугольника — чтобы отличить остров от крапинки. */
function area(points) {
  let sum = 0;
  for (let i = 0; i < points.length; i++) {
    const [x1, y1] = points[i];
    const [x2, y2] = points[(i + 1) % points.length];
    sum += x1 * y2 - x2 * y1;
  }
  return Math.abs(sum) / 2;
}

// ── Дуги между странами ──────────────────────────────────────
const byId = Object.fromEntries(countries.map((c) => [c.id, c]));

const links = LINKS.map(({ from, to, bend }) => {
  const [x1, y1] = byId[from].centroid;
  const [x2, y2] = byId[to].centroid;

  // контрольная точка — сбоку от середины отрезка, чтобы линия выгнулась
  const mx = (x1 + x2) / 2;
  const my = (y1 + y2) / 2;
  const dx = x2 - x1;
  const dy = y2 - y1;
  const cx = mx + dy * bend;
  const cy = my - dx * bend;

  return {
    id: `${from}-${to}`,
    from,
    to,
    d: `M${round(x1)},${round(y1)} Q${round(cx)},${round(cy)} ${round(x2)},${round(y2)}`,
  };
});

// ── Сохраняем ────────────────────────────────────────────────
mkdirSync(new URL('../src/data/', import.meta.url), { recursive: true });

const out = {
  _comment:
    'Файл создаётся автоматически: npm run build:map. Вручную не править — изменения затрёт.',
  viewBox: `0 0 ${WIDTH} ${HEIGHT}`,
  width: WIDTH,
  height: HEIGHT,
  countries: countries.map(({ id, d, centroid, label, bounds }) => ({
    id,
    d,
    centroid,
    label,
    bounds,
  })),
  links,
};

writeFileSync(
  new URL('../src/data/map.json', import.meta.url),
  JSON.stringify(out, null, 2) + '\n',
);

// ── Отчёт ────────────────────────────────────────────────────
console.log(`Картинка ${WIDTH}×${HEIGHT}\n`);
for (const c of countries) {
  const [x0, y0, x1, y1] = c.bounds;
  console.log(
    `${c.id.padEnd(9)} размер ${String(Math.round(x1 - x0)).padStart(3)}×${String(
      Math.round(y1 - y0),
    ).padStart(3)}  центр ${String(c.centroid[0]).padStart(5)},${String(
      c.centroid[1],
    ).padStart(5)}  точек ${String(c.points).padStart(4)}  вес ${(
      c.d.length / 1024
    ).toFixed(1)} КБ (было ${(c.rawSize / 1024).toFixed(1)})`,
  );
}
console.log('\nсохранено в src/data/map.json');

function round(n) {
  return Math.round(n * 10) / 10;
}
