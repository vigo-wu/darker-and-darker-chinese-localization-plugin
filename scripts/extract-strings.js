const fs = require('fs');
const path = require('path');

const input = process.argv[2] || path.join(process.env.TEMP, 'main.js');
const content = fs.readFileSync(input, 'utf8');
const matches = [...content.matchAll(/"([A-Za-z][^"]{2,100})"/g)].map((m) => m[1]);

const strings = [...new Set(matches)].filter(
  (text) =>
    /[A-Za-z]{3,}/.test(text) &&
    !/^https?:/.test(text) &&
    !text.startsWith('/') &&
    !text.includes('\\') &&
    !text.includes('function') &&
    !/^[a-z]+$/.test(text)
);

console.log(strings.slice(0, 300).join('\n'));
console.error(`Total: ${strings.length}`);
