const fs = require('fs');
const path = require('path');

const input = process.argv[2] || path.join(process.env.TEMP, 'main.js');
const content = fs.readFileSync(input, 'utf8');

const uiPatterns = [
  /"([A-Z][^"]{4,120})"/g,
  /'([A-Z][^']{4,120})'/g,
];

const strings = new Set();

for (const pattern of uiPatterns) {
  for (const match of content.matchAll(pattern)) {
    const text = match[1];
    if (
      /[A-Za-z]{2,}/.test(text) &&
      !/^https?:/.test(text) &&
      !text.startsWith('/') &&
      !text.includes('\\') &&
      !text.includes('function') &&
      !text.includes('return ') &&
      !text.includes('className') &&
      !text.includes('undefined') &&
      !text.includes('null') &&
      !/^[A-Z_]+$/.test(text) &&
      !/^[a-z]+([A-Z][a-z]+)+$/.test(text) &&
      !text.includes('rgba(') &&
      !text.includes('translate') &&
      !text.includes('leaflet') &&
      !text.includes('React') &&
      !text.includes('Promise') &&
      !text.includes('Array') &&
      !text.includes('Object') &&
      !text.includes('Error') &&
      text.split(' ').length <= 12
    ) {
      strings.add(text);
    }
  }
}

const sorted = [...strings].sort((a, b) => a.localeCompare(b));
console.log(sorted.join('\n'));
console.error(`Total UI-like strings: ${sorted.length}`);
