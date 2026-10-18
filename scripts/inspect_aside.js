const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1\\choice_dashboard.html', 'utf8');

const asideMatch = html.match(/<aside[\s\S]*?<\/aside>/i);
if (asideMatch) {
  console.log('=== ASIDE FULL ===');
  console.log(asideMatch[0]);
}

const mainMatch = html.match(/<main[\s\S]*?>/i);
if (mainMatch) {
  console.log('=== MAIN TAG ===');
  console.log(mainMatch[0]);
  const mainIndex = html.indexOf(mainMatch[0]);
  console.log(html.slice(mainIndex, mainIndex + 800));
}
