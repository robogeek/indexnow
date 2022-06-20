# IndexNow-Submit -- CLI tool to help with submitting content URLs to search engines

In the mists of time, back in the 1990s, we informed search engines about website content using the Ping API.  This meant making a simple HTTP call to a well known URL, giving the URL of our site, which supposedly caused the search engine to crawl our site.  But, spammers did as spammers do, and they abused that service.  The result was the Sitemap protocol, an XML file we make available on our website describing the important URLs on the website.  Today there is a new service, that's kind of a throwback to the old Ping API, called IndexNOW.  It lets us notify the search engines of changed URLs, but with an addition of an authentication scheme to make it harder to abuse.

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
            --output urlList.txt
```

The `--output` option is required.  The output format is JSON format for an array of strings of the URLs in the Sitemap file.  If the Sitemap has sub-Sitemaps, all those well be read, and the resulting URL list will be every URL in every sub-Sitemap.

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

The next step is to install the key in a location where the search engine can retrieve the key.  The default is:  `http://YOUR-SITE-URL/KEY.txt`.  That is, in the root directory of your website, create a file named by the authentication key, with `.txt` as the file extension.  The content is simply the authentication key.

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
        --key KEY
```

The parameter _RSS-OR-ATOM-URL_ is the URL for your feed.  For example on a Wordpress site it will probably be `https://YOUR-DOMAIN-NAME/feed/`.

