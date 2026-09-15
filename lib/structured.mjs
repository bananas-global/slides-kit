const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function number(value, fallback) {
  const n = value ?? fallback;
  if (!Number.isFinite(n)) throw new Error('Diagram coordinates must be finite numbers.');
  return n;
}
/** Render explicit, brand-independent geometry. Coordinates use a 1800 × 600 stage. */
export function renderDiagram(spec, id) {
  if (!spec || !Array.isArray(spec.nodes) || !spec.nodes.length) throw new Error('diagramSpec.nodes must contain at least one node.');
  const height = number(spec.height, 600);
  const ids = new Set();
  const nodes = spec.nodes.map(node => {
    if (!node.id || ids.has(node.id)) throw new Error('Diagram node IDs must be unique.');
    ids.add(node.id);
    const x=number(node.x),y=number(node.y),w=number(node.w,400),h=number(node.h,140);
    if (x<0 || y<0 || w<=0 || h<=0 || x+w>1800 || y+h>height) throw new Error(`Diagram node ${node.id} is outside the stage.`);
    const tone = ['default','accent','signal','outline'].includes(node.tone) ? node.tone : 'default';
    const title = Array.isArray(node.title) ? node.title : [node.title];
    const body = Array.isArray(node.body) ? node.body : node.body ? [node.body] : [];
    const lines = title.map((line,i)=>`<tspan x="${x+24}" dy="${i ? 35 : 0}">${esc(line)}</tspan>`).join('');
    const bodyY=y+43+title.length*35+8;
    return `<g class="diagram-node node-${tone}"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="18"/><text class="diagram-title" x="${x+24}" y="${y+43}">${lines}</text><text class="diagram-body" x="${x+24}" y="${bodyY}">${body.map((line,i)=>`<tspan x="${x+24}" dy="${i ? 31 : 0}">${esc(line)}</tspan>`).join('')}</text></g>`;
  }).join('');
  const edges=(spec.edges || []).map(edge=>{
    if (!Array.isArray(edge.points) || edge.points.length<2) throw new Error('An edge needs at least two points.');
    const points=edge.points.map(point=>point.map(v=>number(v)).join(',')).join(' ');
    return `<polyline class="diagram-edge" points="${points}" ${edge.arrow === false ? "" : `marker-end="url(#arrow-${id})"`}/>${edge.label ? `<text class="diagram-edge-label" x="${number(edge.labelX)}" y="${number(edge.labelY)}">${esc(edge.label)}</text>`:''}`;
  }).join('');
  return `<svg class="diagram-svg" viewBox="0 0 1800 ${height}" role="img" aria-label="${esc(spec.label || 'Diagram')}"><defs><marker id="arrow-${id}" viewBox="0 0 24 24" refX="21" refY="12" markerWidth="24" markerHeight="24" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M5 3 L14 12 L5 21" fill="none" stroke="var(--signal)" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/></marker></defs>${edges}${nodes}</svg>`;
}
export function renderTable(spec) {
  if (!spec || !Array.isArray(spec.headers) || !spec.headers.length || !Array.isArray(spec.rows)) throw new Error('tableSpec needs headers and rows.');
  return `<table class="data-table"><thead><tr>${spec.headers.map(h=>`<th scope="col">${esc(h)}</th>`).join('')}</tr></thead><tbody>${spec.rows.map(row=>{
    if (!Array.isArray(row) || row.length!==spec.headers.length) throw new Error('Table row length must match its headers.');
    return `<tr>${row.map((cell,i)=>`<${i ? 'td' : 'th scope="row"'}>${esc(cell)}</${i ? 'td' : 'th'}>`).join('')}</tr>`;
  }).join('')}</tbody></table>`;
}
