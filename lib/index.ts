
import { promises as fsp } from 'fs';
import * as fs from 'fs';
import got, { Response, GotOptions } from 'got';
import Sitemapper from 'sitemapper';
// import { default as SitemapXMLParser } from 'sitemap-xml-parser';
import { parse, toSeconds } from "iso8601-duration";
import { default as FeedMe } from 'feedme';

/**
 * Use Axios to post a URL list via IndexNow to the given search engine.
 * 
 * @param key The authentication key to use for IndexNow
 * @param engine The domain name for the search engine
 * @param host The domain name for your website
 * @param urlList The list of URLs to post to IndexNow
 */
export async function postURLlist(
    engine: string, host: string,
    key: string,  urlList: Array<string>
): Promise<void> {
    
    const u = indexNowURL(engine);

    try {

        // POST /indexnow HTTP/1.1
        // Content-Type: application/json; charset=utf-8
        // Host: <searchengine>
        // {
        //     "host": "www.example.com",
        //     "key": "aaa6c957e47d498589ee7a33281997cb",
        //     "keyLocation": "https://www.example.com/myIndexNowKey63638.txt",
        //     "urlList": [
        //         "https://www.example.com/url1",
        //         "https://www.example.com/folder/url2",
        //         "https://www.example.com/url3"
        //     ]
        // }

        const response: Response<any> = await got.post(u.toString(), {
            // headers: {
            //     'Content-Type': 'application/json; charset=utf-8'
            // },
            json: {
                host: host,
                key: key,
                urlList: urlList
            }
        } as GotOptions<any>);
        console.log(`Submitted ${urlList.length} URL's to ${engine} status ${response.statusCode}`);
    } catch (err) {
        console.error(err);
    }
}

/**
 * Submit a single URL to an IndexNow service.  If this executes with
 * no error it was successful.  Otherwise a suitable error is thrown.
 * 
 * @param engine The domain name of the search engine
 * @param url The URL to submit
 * @param key The IndexNow key to use
 */
export async function submitSingleURL(
    engine: string, url: string, key: string
): Promise<void> {

    // https://<searchengine>/indexnow?url=url-changed&key=your-key

    const u = indexNowURL(engine);

    u.searchParams.append('url', url);
    u.searchParams.append('key', key);

    console.log(`Submitting ${u.toString()}`);

    const response = await got.get(u.toString());

    console.log(`Submitted to ${engine} ${url} status ${response.statusCode}`);
}

/**
 * Generate a URL obect for the IndexNow service on the given 
 * search engine. 
 * @param engine The domain name for the search engine
 * @returns 
 */
export function indexNowURL(engine: string): URL {

    const u = new URL(`https://ENGINE/indexnow`);
    u.host = engine;
    return u;
}

/**
 * Describes Sitemap entries 
 */
export type SitemapEntry = {
    /**
     * URL(s) for an item in the Sitemap
     */
    loc: Array<string>,

    /**
     * Last modification date(s)
     */
    lastmod?: Array<string>,

    /**
     * How often to expect this item to change
     */
    changefreq?: Array<string>,

    /**
     * Prioritization
     */
    priority?: Array<string>,
    image?: Array<string>
};

/**
 * Fetches all items from a sitemap, accodomating sitemaps that have
 * sub-sitemaps.  The return value is an array of {SitemapEntry}.
 * 
 * @param u The URL for the sitemap
 * @param maxAge Optional, an ISO8601 descriptor a maximum age, so we
 *    can select recently created items.  e.g. P10D means 10 days
 * @returns 
 */
export async function fetchURLsFromSitemap(
    u: string, maxAge?: string
) : Promise<Array<SitemapEntry>>
{

    if (!u) throw new Error(`No URL given ${u}`);

    // console.log(`fetchURLsFromSitemap ${u} ${maxAge}`);

    const sitemapXMLParser = new Sitemapper({
        url: u,
        timeout: 15000, // 15 seconds
        fields: {
            loc: true,
            lastmod: true,
            changefreq: true,
            priority: true,
        }
      });
    // const sitemapXMLParser = new SitemapXMLParser(u, {
    //     delay: 3000,
    //     limit: 5
    // });

    // console.log(`fetching`);

    const items = await sitemapXMLParser.fetch();
    const ret = new Array<SitemapEntry>();
    for (const item of items.sites) {
        if (typeof item === 'string') {
            ret.push({ loc: [ item ] });
        } else if (typeof item === 'object') {
            const anyitem: any = <any>item;
            if (typeof anyitem.loc === 'string') {
                anyitem.loc = [ anyitem.loc ];
            }
            ret.push(anyitem);
        }
    }
    return ret;
    // return items;

    // if (maxAge) {
    //     const now = new Date();

    //     const maxSecs = toSeconds(parse(maxAge));
    //     // console.log(`maxAge ${maxAge} maxSecs ${maxSecs}`);

    //     return items.sites;
    //     // .filter(item => {
    //     //     const lastmod = new Date(item.lastmod);
    //     //     const age = now.getTime() - lastmod.getTime();
    //     //     return (age / 1000) < maxSecs;
    //     // });
    // } else {
    //     return items.sites;
    // }
    
}

/**
 * Retrieve URLs from the RSS or Atom file, returning as
 * an array.
 * 
 * @param feedURL  The URL for the RSS or Atom feed
 * @param maxAge An ISO8601 duration string as discussed above
 * @returns 
 */
export async function fetchURLsFromRSSAtom(
    feedURL: string, maxAge: string
): Promise<Array<string>> {

    const uFeed = new URL(feedURL);

    let feed;
    try {
        // Support reading the RSS file either from a file or 
        // over the Internet
        let rssStream;
        if (uFeed.protocol === 'file:') {
            rssStream = fs.createReadStream(uFeed.pathname, 'utf-8');
        } else {
            const resFeed = await got.stream(feedURL);
            rssStream = resFeed;
        }

        feed = await new Promise((resolve, reject) => {
            try {
                let parser = new FeedMe(true);
                parser.on('finish', () => {
                    resolve(parser.done());
                });
                rssStream.pipe(parser);
            } catch (err) { reject(err); }
        });
    } catch(err) {
        throw new Error(`Fetching feed ${feedURL} failed because ${err.message}`);
    }

    const urlList = [];
    for (const item of feed.items) {
        if (maxAge) {
            const now = new Date();
            const maxSecs = toSeconds(parse(maxAge));
            const pubdate = new Date(item.pubdate);
            const age = now.getTime() - pubdate.getTime();
            if ((age / 1000) > maxSecs) continue;
        }
        urlList.push(item.link);
    }

    return urlList;
}