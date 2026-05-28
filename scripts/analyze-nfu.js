const fs = require("fs");
const path = require("path");

const t = fs.readFileSync(path.join(__dirname, "..", "temp-others.html"), "utf8");
const cnEn =
  /([\u4e00-\u9fff][\u4e00-\u9fffA-Za-z0-9·\s\/、，。：；！？（）\-]{0,40}?)\s*（([A-Za-z][^）]{1,80})）/g;
const enOnly =
  /([A-Za-z][A-Za-z0-9'\s]{2,60}?)\s*（([A-Za-z][^）]{1,80})）/g;

let cn = 0;
let en = 0;
let m;
while ((m = cnEn.exec(t))) cn++;
while ((m = enOnly.exec(t))) {
  if (m[1].trim() === m[2].trim()) en++;
}

console.log("cn-en pairs", cn, "en-en pairs", en);
