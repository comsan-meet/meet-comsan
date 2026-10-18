const fs = require('fs');
const content = fs.readFileSync('C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1\\choice_dashboard.html', 'utf8');

const regex = /<a[^>]*href=["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi;
let match;
const links = [];
while ((match = regex.exec(content)) !== null) {
  links.push({ href: match[1], text: match[2].replace(/<[^>]+>/g, '').trim() });
}
console.log('Total links found:', links.length);
links.forEach(l => console.log(l.href, '->', l.text));
