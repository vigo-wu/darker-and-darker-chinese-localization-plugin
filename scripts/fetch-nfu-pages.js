const fs = require("fs");
const path = require("path");

const pages = {
  weapons: "https://dnd.nfuwow.com/Item/weapons.html",
  armor: "https://dnd.nfuwow.com/item/armor.html",
  utility: "https://dnd.nfuwow.com/item/utility.html",
  accessories: "https://dnd.nfuwow.com/item/accessories.html",
  others: "https://dnd.nfuwow.com/item/others.html",
};

async function main() {
  for (const [key, url] of Object.entries(pages)) {
    const res = await fetch(url);
    const text = await res.text();
    const out = path.join(__dirname, "..", `temp-${key}.html`);
    fs.writeFileSync(out, text);
    console.log(key, text.length, out);
  }
}

main();
