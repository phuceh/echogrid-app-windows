const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'dist', 'index.html');
let html = fs.readFileSync(indexPath, 'utf8');

html = html.replace(/src="\//g, 'src="./');
html = html.replace(/href="\//g, 'href="./');

html = html.replace(
  /<meta name="viewport"[^>]*>/,
  '<meta name="viewport" content="width=430">'
);

fs.writeFileSync(indexPath, html);
console.log('Paths fixed and viewport set.');
