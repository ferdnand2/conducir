// Sección de consultas: catálogo de señales y temas de teoría/normativa
import { CATALOG, CATEGORIES } from './catalogo.js';

const TOPICS = [
  {
    title: '🔄 Rotondas: cómo circular (con ejemplos)',
    html: `
      <p><b>Regla de oro:</b> quien circula <b>dentro</b> de la rotonda tiene prioridad. Al llegar, cede el paso
      (casi siempre hay señal R-1) y entra cuando no obligues a nadie a frenar. Dentro se circula en sentido
      <b>antihorario</b>, y la señal de salir es siempre el <b>intermitente derecho</b>.</p>
      <h4>Ejemplo 1 — Primera salida (girar a la derecha)</h4>
      <ul>
        <li>Aproxímate por el <b>carril derecho</b> con el <b>intermitente derecho</b> ya puesto.</li>
        <li>Entra, mantente en el carril exterior y sal sin cambiar de carril.</li>
      </ul>
      <h4>Ejemplo 2 — Seguir de frente (segunda salida)</h4>
      <ul>
        <li>Entra por el carril derecho <b>sin intermitente</b> (no vas a girar inmediatamente).</li>
        <li>Al rebasar la salida ANTERIOR a la tuya, pon el <b>intermitente derecho</b> y sal.</li>
      </ul>
      <h4>Ejemplo 3 — Girar a la izquierda o cambiar de sentido</h4>
      <ul>
        <li>En rotondas de varios carriles puedes entrar por el <b>carril interior</b> (señalizando a la izquierda al aproximarte, si procede).</li>
        <li>Rodea la isleta; antes de tu salida, comprueba el carril exterior, señaliza a la derecha e incorpórate para salir. <b>Nunca salgas directamente desde el carril interior</b> cortando al exterior.</li>
      </ul>
      <p><b>Error típico de examen:</b> entrar sin ceder (deficiente o eliminatoria si obligas a frenar) y salir sin intermitente (falta).</p>`,
  },
  {
    title: '🛣️ Nomenclatura de las vías españolas',
    html: `
      <ul>
        <li><b>AP-#</b> — <b>Autopista de peaje</b> (AP-7, AP-68). Calzadas separadas, sin cruces a nivel; pago o tramos liberados.</li>
        <li><b>A-#</b> — <b>Autopista libre o autovía</b> (A-2, A-49). Mismas características, gratuita. Límite genérico 120 km/h.</li>
        <li><b>N-# / N-###</b> — <b>Carretera nacional</b> (N-340, N-II). Red del Estado, generalmente convencional: 90 km/h genérico.</li>
        <li><b>Letras autonómicas/provinciales</b> — carreteras de comunidades y diputaciones: <b>M-</b> (Madrid), <b>CV-</b> (Comunitat Valenciana), <b>GR-</b> (Granada), <b>C-</b> (Cataluña histórica), <b>EX-</b> (Extremadura)… El color del cajetín indica la red (naranja/verde/amarillo según titularidad).</li>
        <li><b>Travesía</b> — tramo de carretera que atraviesa un poblado: rigen las normas urbanas (50 km/h salvo otra señal).</li>
        <li><b>Vía urbana</b> — calles dentro de poblado. <b>Vía interurbana</b> — fuera de poblado.</li>
      </ul>
      <p>Los <b>puntos kilométricos</b> crecen desde el origen de la vía; en las radiales nacionales, desde Madrid (Puerta del Sol, km 0).</p>`,
  },
  {
    title: '👮 Autoridades y agentes de tráfico',
    html: `
      <ul>
        <li><b>DGT (Dirección General de Tráfico)</b> — organismo autónomo del Ministerio del Interior. Gestiona permisos de conducir, matriculaciones, el registro de vehículos, campañas, radares fijos y la regulación general. No "patrulla": administra y sanciona.</li>
        <li><b>Agrupación de Tráfico de la Guardia Civil</b> — vigilancia, regulación y auxilio en <b>vías interurbanas</b>. Sus agentes pueden pararte, denunciar y hacer pruebas de alcohol y drogas.</li>
        <li><b>Policía Local / Municipal</b> — regulación y denuncia dentro del <b>casco urbano</b>, incluidas las travesías.</li>
        <li><b>Policías autonómicas</b> — asumen tráfico en sus territorios: <b>Ertzaintza</b> (País Vasco), <b>Mossos d'Esquadra</b> (Cataluña), <b>Policía Foral</b> (Navarra).</li>
        <li><b>Otros agentes</b> — personal de obras, patrullas escolares y personal auxiliar habilitado pueden regular el tráfico puntualmente con señales manuales o banderas.</li>
      </ul>
      <h4>Señales de los agentes</h4>
      <p>Prevalecen sobre TODO lo demás: brazo en alto = detención para todos; brazo extendido horizontal = detención de quienes vienen de frente; luz roja o amarilla agitada de noche = alto.</p>`,
  },
  {
    title: '📋 Orden de prioridad entre señales',
    html: `
      <p>Cuando varias señales se contradicen, el orden de prevalencia es:</p>
      <ul>
        <li><b>1.</b> Señales y órdenes de los <b>agentes</b> de circulación.</li>
        <li><b>2.</b> Señalización <b>circunstancial</b> (obras, balizamiento) y de emergencia.</li>
        <li><b>3.</b> <b>Semáforos</b>.</li>
        <li><b>4.</b> Señales <b>verticales</b> (STOP, ceda, límites…).</li>
        <li><b>5.</b> <b>Marcas viales</b> (líneas, flechas pintadas).</li>
      </ul>
      <p>Ejemplo: si un agente te da paso con el semáforo en rojo, <b>obedeces al agente</b>.</p>`,
  },
  {
    title: '⚡ Límites genéricos de velocidad (turismos)',
    html: `
      <ul>
        <li><b>Autopistas y autovías:</b> 120 km/h.</li>
        <li><b>Carreteras convencionales:</b> 90 km/h.</li>
        <li><b>Vías urbanas:</b> 50 km/h en calles de 2+ carriles por sentido, <b>30 km/h</b> en calles de un carril por sentido (la mayoría), 20 km/h en calles de plataforma única.</li>
        <li>El mínimo genérico es la <b>mitad</b> del límite máximo de la vía (salvo justificación).</li>
      </ul>`,
  },
  {
    title: '🎓 Cómo se califica el examen práctico (DGT)',
    html: `
      <p>El examinador anota tres tipos de faltas:</p>
      <ul>
        <li><b>Leves</b> — pequeños errores (calar el motor una vez, titubeos, no ajustar bien la velocidad al tráfico…). Se permiten hasta <b>9</b>.</li>
        <li><b>Deficientes</b> — errores importantes que afectan a la seguridad (no detenerse del todo en un STOP, exceso claro de velocidad, invadir otro carril…). La <b>2ª</b> suspende.</li>
        <li><b>Eliminatorias</b> — un solo error grave suspende: saltarse un STOP o semáforo, obligar a frenar a otro (no ceder), colisión, subirse a la acera, poner en riesgo a alguien.</li>
      </ul>
      <p><b>Resultado APTO:</b> 0 eliminatorias, máximo 1 deficiente y máximo 9 leves. Duración mínima de la prueba: 25 minutos de conducción efectiva.</p>`,
  },
];

export function initStudy() {
  const $ = (id) => document.getElementById(id);

  // catálogo completo de señales, agrupado por categorías y con buscador
  const grid = $('signPanel');
  const sections = [];
  for (const cat of CATEGORIES) {
    const header = document.createElement('div');
    header.className = 'catHeader';
    header.innerHTML = `<h3>${cat.label}</h3><p>${cat.note}</p>`;
    grid.appendChild(header);

    const cards = [];
    for (const s of CATALOG.filter((x) => x.cat === cat.id)) {
      const card = document.createElement('div');
      card.className = 'signCard';
      const canvas = s.draw();
      const info = document.createElement('div');
      info.innerHTML =
        `<div class="code">${s.code}</div><div class="name">${s.name}</div>` +
        `<div class="desc">${s.desc}</div>`;
      card.appendChild(canvas);
      card.appendChild(info);
      card.dataset.search = `${s.code} ${s.name} ${s.desc}`.toLowerCase();
      grid.appendChild(card);
      cards.push(card);
    }
    sections.push({ header, cards });
  }

  const counter = $('signCount');
  const applyFilter = (q) => {
    q = q.trim().toLowerCase();
    let total = 0;
    for (const { header, cards } of sections) {
      let visible = 0;
      for (const card of cards) {
        const hit = !q || card.dataset.search.includes(q);
        card.classList.toggle('hidden', !hit);
        if (hit) visible++;
      }
      header.classList.toggle('hidden', visible === 0);
      total += visible;
    }
    counter.textContent = q ? `${total} señal${total === 1 ? '' : 'es'}` : `${CATALOG.length} señales`;
  };
  $('signSearch').addEventListener('input', (e) => applyFilter(e.target.value));
  applyFilter('');

  // temas de teoría
  const topics = $('theoryPanel');
  for (const t of TOPICS) {
    const d = document.createElement('details');
    d.innerHTML = `<summary>${t.title}</summary><div class="body">${t.html}</div>`;
    topics.appendChild(d);
  }

  const show = (signs) => {
    $('signPanel').classList.toggle('hidden', !signs);
    $('searchRow').classList.toggle('hidden', !signs);
    $('theoryPanel').classList.toggle('hidden', signs);
    $('tabSigns').classList.toggle('sel', signs);
    $('tabTheory').classList.toggle('sel', !signs);
  };
  $('tabSigns').addEventListener('click', () => show(true));
  $('tabTheory').addEventListener('click', () => show(false));
  $('studyBtn').addEventListener('click', () => $('study').classList.remove('hidden'));
  $('closeStudy').addEventListener('click', () => $('study').classList.add('hidden'));
}
