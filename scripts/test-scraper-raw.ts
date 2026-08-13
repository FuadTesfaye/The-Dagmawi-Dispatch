import * as cheerio from "cheerio";

async function run() {
  const channel = "sifendev";
  const url = `https://t.me/s/${channel}`;

  const response = await fetch(url, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    }
  });

  const html = await response.text();
  const $ = cheerio.load(html);
  
  const messageBlocks = $(".tgme_widget_message");
  console.log("Found message blocks:", messageBlocks.length);

  messageBlocks.each((i, el) => {
    const $el = $(el);
    const dataPost = $el.attr("data-post");
    console.log("data-post:", dataPost);
  });
}

run();
