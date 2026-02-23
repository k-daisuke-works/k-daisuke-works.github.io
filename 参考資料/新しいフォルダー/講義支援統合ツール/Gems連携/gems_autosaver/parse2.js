const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('debug.html', 'utf8');
const $ = cheerio.load(html);
console.log('Total characters in HTML: ' + html.length);
console.log('Finding anything containing "チャット" or some large text block:');
$('div').each((i, el) => {
    const text = $(el).text();
    if (text.length > 500) {
        // console.log(`Large block found. Class: ${$(el).attr('class')}. Start: ${text.substring(0, 30)}`);
    }
});

// Let's just dump the element that has the largest text length
let maxLen = 0;
let maxEl = null;
$('*').each((i, el) => {
    if ($(el).children().length === 0) { // leaf node
        if ($(el).text().length > maxLen) {
            maxLen = $(el).text().length;
            maxEl = el;
        }
    }
});
if (maxEl) {
    console.log('Largest leaf text: ' + $(maxEl).text().substring(0, 50));
    console.log('Parent classes:');
    let parent = $(maxEl).parent();
    while (parent.length > 0 && parent[0].tagName !== 'body') {
        console.log('  ' + parent[0].tagName + ' . ' + parent.attr('class'));
        parent = parent.parent();
    }
}
