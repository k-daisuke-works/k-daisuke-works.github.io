const cheerio = require('cheerio');
const fs = require('fs');
const html = fs.readFileSync('debug.html', 'utf8');
const $ = cheerio.load(html);

console.log("finding message-content");
$('message-content').each((i, el) => {
    console.log(`message-content ${i}: ` + $(el).text().substring(0, 50));
});

console.log("finding model-response");
$('[data-test-id="model-response"]').each((i, el) => {
    console.log(`model-response ${i}: ` + $(el).text().substring(0, 50));
});

console.log("finding class model-response");
$('.model-response').each((i, el) => {
    console.log(`class model-response ${i}: ` + $(el).text().substring(0, 50));
});

console.log("finding all text starting with 【事例");
$('*').each((i, el) => {
    const text = $(el).text();
    if (text.includes('アルコール依存症の疑いと')) {
        console.log(`Found string in a <${el.tagName}>. Class: ${$(el).attr('class')}`);
    }
});
