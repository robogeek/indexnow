
import Sitemapper from 'sitemapper_mos';


(async () => {

    const LTP = new Sitemapper({
        url: 'https://longtailpipe.com/sitemap.xml',
        timeout: 5000
    });
    
    const { url, sites } = await LTP.fetch();
    console.log(`${url}`, sites);

})()
.catch(error => console.error(error));
