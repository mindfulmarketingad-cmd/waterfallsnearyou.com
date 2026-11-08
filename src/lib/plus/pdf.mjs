function esc(s) {
  return String(s).replace(/[^\x20-\x7e]/g, ' ').replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function wrap(text, width) {
  const words = String(text || '').replace(/\s+/g, ' ').trim().split(' ');
  const lines = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length > width && line) {
      lines.push(line);
      line = word;
    } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

export function textPdf(title, blocks) {
  const pages = [];
  let commands = [];
  let y = 740;
  const newPage = () => {
    if (commands.length) pages.push(commands.join('\n'));
    commands = ['BT', '/F1 16 Tf', '54 740 Td', `(${esc(title)}) Tj`, '/F1 11 Tf'];
    y = 710;
  };
  const line = (text, size = 11, gap = 16) => {
    if (y < 54) newPage();
    commands.push(`${size === 11 ? '' : `/F1 ${size} Tf `}0 -${gap} Td (${esc(text)}) Tj`);
    if (size !== 11) commands.push('/F1 11 Tf');
    y -= gap;
  };
  newPage();
  for (const block of blocks) {
    const size = block.heading ? 13 : 11;
    const gap = block.heading ? 20 : 14;
    for (const row of wrap(block.text, block.heading ? 70 : 90)) line(row, size, gap);
    if (!block.heading) line('', 11, 6);
  }
  if (commands.length) pages.push(commands.join('\n'));

  const objects = [];
  const add = (body) => {
    objects.push(body);
    return objects.length;
  };
  const font = add('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const pageIds = [];
  const contentIds = [];
  for (const stream of pages) {
    const content = `q\n${stream}\nET\nQ`;
    contentIds.push(add(`<< /Length ${content.length} >>\nstream\n${content}\nendstream`));
  }
  const pagesId = objects.length + 1 + pages.length;
  for (let i = 0; i < pages.length; i++) {
    pageIds.push(add(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 612 792] /Contents ${contentIds[i]} 0 R /Resources << /Font << /F1 ${font} 0 R >> >> >>`));
  }
  const kids = pageIds.map((id) => `${id} 0 R`).join(' ');
  add(`<< /Type /Pages /Count ${pageIds.length} /Kids [${kids}] >>`);
  const catalog = add(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((body, i) => {
    offsets.push(pdf.length);
    pdf += `${i + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalog} 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, 'binary');
}

export function packetBlocks({ title, places, notes = [] }) {
  const blocks = [{ heading: true, text: title }];
  for (const note of notes) blocks.push({ text: note });
  for (const place of places) {
    blocks.push({ heading: true, text: place.name });
    if (place.where) blocks.push({ text: place.where });
    if (place.coords) blocks.push({ text: `Coordinates: ${place.coords}` });
    if (place.map) blocks.push({ text: `Map: ${place.map}` });
    for (const row of place.notes || []) blocks.push({ text: row });
    if (place.nearby?.length) {
      blocks.push({ text: `Nearby: ${place.nearby.map((n) => `${n.name} (${n.miles} mi ${n.direction || ''})`).join('; ')}` });
    }
  }
  blocks.push({ text: 'Conditions, access, and fees change. Confirm with the land manager before you go. This packet uses notes already published on Waterfalls Near You and does not add facts that are not on the site.' });
  return blocks;
}
