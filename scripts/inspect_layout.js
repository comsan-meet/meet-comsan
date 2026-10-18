const fs = require('fs');
const html = fs.readFileSync('C:\\Users\\NBODT\\.gemini\\antigravity\\brain\\1e54c1a0-bef1-4f1f-a50d-a29817ec25b1\\choice_dashboard.html', 'utf8');

// Find layout containers: div with flex or min-h-screen
const bodyInner = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';
console.log('Body start:', bodyInner.slice(0, 1000));
