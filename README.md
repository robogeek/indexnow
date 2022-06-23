# IndexNow-Submit -- CLI tool to help with submitting content URLs to search engines

This tool simplifies notifying search engines of changes on our website by using the IndexNow protocol.  The promise is that by telling search engines that a specific pages or pages have changed, they can crawl just those pages and quickly update their indexes.

In the mists of time, back in the 1990s, we informed search engines about website content using the Ping API.  This meant making a simple HTTP call to a well known URL, giving the URL of our site, which supposedly caused the search engine to crawl our site.  But, spammers did as spammers do, and they abused that service.  The result was the Sitemap protocol, an XML file we make available on our website describing the important URLs on the website.  Search engines consult the Sitemap file, using it to know which pages to crawl.  Today there is a new service, that's kind of a throwback to the old Ping API, called IndexNOW.  It lets us notify the search engines of changed URLs, but with an addition of an authentication scheme to make it harder to abuse.

The idea is that by notifying search engines of URLs of pages that have been added, modified, or deleted, the search engine can immediately reflect the change in search results.  That could be useful, yes?  This does not mean we should stop generating Sitemap files, because the search engines will still use those files as a backup source of pages to crawl.

The purpose of `indexnow-submit` is to bundle some functionality related to using IndexNOW.  It has been put to use on some websites controlled by the author, which should give you some comfort that you might find the bundled functions useful for you.  Anyone with other ideas are free to submit those ideas as a pull request.

## Installing `indexnow-submit`

Because it is a Node.js application, you must first have Node.js installed.  It was tested against Node.js 17.x and I haven't determined whether it runs on earlier releases.

```
$ npm install indexnow-submit
```

Use this if you wish to install this tool as part of a project directory.

Another option is to run the command without explicit installation like so:

```
$ npx indexnow-submit --help
```

The `npx` tool comes bundled with the Node.js platform.

```
Usage: indexnow-submit [options] [command]

CLI to help with IndexNOW

Options:
  -V, --version                         output the version number
  -h, --help                            display help for command

Commands:
  sitemap-fetch [options] <url>         Fetch the URLs in a sitemap
  submit-single [options] <url>         Submit a single URL to a search engine
  submit-urls [options] <urlFile>       Submit many URLs to a search engine
  submit-from-feed [options] <feedURL>  Parse an RSS or ATOM feed, submitting some URLs to search engine
  help [command]                        display help for command
```

You'll see this output after running with `--help`.

## Fetching an existing Sitemap using `indexnow-submit`

One possible use case is to submit all existing pages using IndexNOW, to make sure that the search engine knows about your pages.

```
$ npx indexnow-submit sitemap-fetch https://SITE-URL/sitemap.xml \
            --output urlList.txt \
            --max-age P10D
```

The `--output` option is required.  The output format is simple text of the URLs in the Sitemap file, one URL per line.  If the Sitemap has sub-Sitemaps, all those well be read, and the resulting URL list will be every URL in every sub-Sitemap.

The `max-age` option is optional.  It is an ISO8601 duration specifier describing the maximum age for sitemap entries to include.  The specifier shown here says to include entries less than 10 days old.

The ISO8601 duration is a standard way of specifying time periods.  From the documentation of [iso8601-duration](https://www.npmjs.com/package/iso8601-duration) we get this summary of the format:

```
PnYnMnWnDTnHnMnS - P<date>T<time>.
(P) Years, Months, Weeks, Days (T) Hours, Minutes, Seconds.
Example: P1Y1M1DT1H1M1.1S = One year, one month, one day, one hour, one minute, one second, and 100 milliseconds
```


## A note about authenticating with IndexNOW

The IndexNOW protocol relies on a simple-to-implement authentication scheme which does not require any pre-registration with the search engine.  The authentication key must have these attributes:

* A minimum of 8 and a maximum of 128 hexadecimal characters
* Contain only the following characters: lowercase characters (a-z), uppercase characters (A-Z), numbers (0-9), and dashes (-)

For example, a suitable key can be generated this way:

```
$ uuid
ca60c1dc-f034-11ec-8f94-d7fa725bb712
```

Literally, that's all which is required to generate the authentication key.

The `indexnow-submit` package includes a shell script, `genkey.sh`, that runs this command to generate a key file suitable for use with IndexNow.

By default the key file is named `KEY.txt`, and the contents are the KEY.

The next step is to install that key file in a location where the search engine can retrieve the key.  The default is:  `http://YOUR-SITE-URL/KEY.txt`.  That is, in the root directory of your website, create a file named by the authentication key, with `.txt` as the file extension.  The content is simply the authentication key.

The protocol allows for using a different file name, if desired.

For Wordpress there are a couple IndexNow plugins.  I did not install the Microsoft IndexNow plugin, but installed another whose name is simply _IndexNow_.  For that plugin, you simply paste your desired authentication key into the plugin and it takes care of generating the file.

## Submitting a single URL using `indexnow-submit`

If you have a single URL to submit using IndexNow, try this:

```
$ npx indexnow-submit submit-single URL \
        --engine SEARCH-ENGINE-DOMAIN \
        --key-file FILE-NAME-FOR-KEY.txt \
        --key KEY
```

The _URL_ is the URL you wish to submit to the search engine.  The _SEARCH-ENGINE-DOMAIN_ is simply the domain name of the search engine, like _bing.com_.

The authentication key is as discussed in the previous section.  Use either the `--key-file` or `-key` option, depending on your preference.  The first has you put the key into a file, and you specify the file name.  The second has you put the key on the command line.

## Submitting multiple URLs using `indexnow-submit`

If you have multiple URLs to submit using IndexNow, try this:

```
$ npx indexnow-submit submit-urls URL-FILE \
        --host YOUR-DOMAIN-NAME \
        --engine SEARCH-ENGINE-DOMAIN \
        --key-file FILE-NAME-FOR-KEY.txt \
        --key KEY
```

Instead of a single URL, we have a file name for a file containing URLs.  The file format is simple text, with one URL per line, using newline-separated lines.  CRLF-separated lines might fail, and was not tested.

For the `--host` option give the domain name for your site.

The remaining options are as described previously.

## Submitting multiple URLs from an RSS or ATOM feed using `indexnow-submit`

Another use case is to submit URLs that appear in an RSS/Atom feed.  Presumably these will automatically be recent postings, making them of interest to the search engine.  Try this:

```
$ npx indexnow-submit submit-from-feed RSS-OR-ATOM-URL \
        --host YOUR-DOMAIN-NAME \
        --engine SEARCH-ENGINE-DOMAIN \
        --key-file FILE-NAME-FOR-KEY.txt \
        --key KEY \
        --max-age P10D
```

The parameter _RSS-OR-ATOM-URL_ is the URL for your feed.  For example on a Wordpress site it will probably be `https://YOUR-DOMAIN-NAME/feed/`.

The _RSS-OR-ATOM-URL_ can be a `file://` URL.  This can be a useful way of bypassing a caching layer, in some cases.

The other options are as described earlier for other commands.

## API

The package also supports a callable API that the commands are based on.

USAGE: 

```js
import * as IndexNow from 'indexnow-submit';
```

Functions are as follows.

**postIndexNowURLlist** -- Handles the POST operation to submit a list of URLs to an IndexNow server.

```js
async function postIndexNowURLlist(
    u: URL, key: string,
    engine: string, host: string,
    urlList: Array<string>
): Promise<void>
```

The parameter `u` is the string representation of the IndexNow endpoint at a specific search engine.  

The `key` parameter is your chosen authentication key.  

The `engine` parameter is the domain name of the search engine.

The `host` parameter is the domain name of your website.

The `urlList` parameter is an array of URLs to post.

So long as this executes without error, it will have succeeded.

**indexNowURL** -- Generates a URL object for the IndexNow endpoint matching the domain name.

```js
function indexNowURL(engine: string): URL
```

The `engine` parameter is the domain name of the search engine.

The return value is a URL object for `https://ENGINE/indexnow`

**fetchURLsFromSitemap** -- Retrieve an array of URL descriptors from the named sitemap.

```js
async function fetchURLsFromSitemap(
    u: string, maxAge?: string
) : Promise<Array<SitemapEntry>>
```

The `u` parameter is the string representation of the URL for a Sitemap.  This URL must be for a web address, e.g. with the `http` or `https` protocol.  It was tested to not work with a `file` URL.

The `maxAge` parameter is optional, and is an ISO8601 time duration.  The purpose is the same as discussed above.

The return value is an array of descriptors that are based on Sitemap entries.  The type is described as follows:

```js
type SitemapEntry = {
    loc: Array<string>,
    lastmod: Array<string>,
    changefreq?: Array<string>,
    priority?: Array<string>,
    image?: Array<string>
};
```

