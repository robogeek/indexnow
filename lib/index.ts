
import axios from 'axios';
import { default as SitemapXMLParser } from 'sitemap-xml-parser';
import { parse, toSeconds } from "iso8601-duration";

/**
 * Use Axios to post a URL list via IndexNow to the given search engine.
 * 
 * @param u URL for the Search Engine IndexNow endpoint
 * @param key The authentication key to use for IndexNow
 * @param engine The domain name for the search engine
 * @param host The domain name for your website
 * @param urlList The list of URLs to post to IndexNow
 */
export async function postIndexNowURLlist(
    u: URL, key: string,
    engine: string, host: string,
    urlList: Array<string>
): Promise<void> {
    
    try {
        const response = await axios({
            method: 'post',
            url: u.toString(),
            headers: {
                'Content-Type': 'application/json; charset=utf-8'
            },
            data: {
                host: host,
                key: key,
                urlList: urlList
            }
        });
        console.log(`Submitted ${urlList.length} URL's to ${engine} status ${response.status}`);
    } catch (err) {
        console.error(err);
    }
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
    lastmod: Array<string>,

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

    const sitemapXMLParser = new SitemapXMLParser(u, {
        delay: 3000,
        limit: 5
    });

    // console.log(`fetching`);

    const items = await sitemapXMLParser.fetch();

    if (maxAge) {
        const now = new Date();

        const maxSecs = toSeconds(parse(maxAge));
        // console.log(`maxAge ${maxAge} maxSecs ${maxSecs}`);

        return items.filter(item => {
            const lastmod = new Date(item.lastmod);
            const age = now.getTime() - lastmod.getTime();
            return (age / 1000) < maxSecs;
        });
    } else {
        return items;
    }
    
} 