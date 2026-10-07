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

html = html.replace(
  '</head>',
  `<style>
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #000;
    }
    #root {
      width: 430px;
      height: 932px;
      transform-origin: top left;
      transform: scale(var(--scale, 1));
    }
  </style>
  <script>
    function setScale() {
      const scaleX = window.innerWidth / 430;
      const scaleY = window.innerHeight / 932;
      const scale = Math.min(scaleX, scaleY);
      document.documentElement.style.setProperty('--scale', scale);
    }
    window.addEventListener('load', setScale);
    window.addEventListener('resize', setScale);
  </script>
  </head>`
);

fs.writeFileSync(indexPath, html);
console.log('Done.');
