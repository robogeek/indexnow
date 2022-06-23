import * as IndexNow from 'indexnow-submit';

console.log(process.argv)

console.log(await IndexNow.fetchURLsFromSitemap(
    process.argv[2], process.argv[3]
));
