#!/usr/bin/env node

import { Command } from 'commander';
import axios from 'axios';
import { default as FeedMe } from 'feedme';
import { promises as fsp } from 'fs';
import * as fs from 'fs';
import { fetchURLsFromSitemap } from './index.js';
import { default as SitemapXMLParser } from 'sitemap-xml-parser';
import { parse, toSeconds } from "iso8601-duration";


import { postIndexNowURLlist, indexNowURL } from './index.js';

const program = new Command();


program
  .name('indexnow-submit')
  .description('CLI to help with IndexNOW')
  .version('0.1.0');

program.command('sitemap-fetch')
    .description('Fetch the URLs in a sitemap')
    .argument('<url>', 'Sitemap URL to fetch')
    .requiredOption('-o, --output <fileName>', 'File name for output')
    .option('-m, --max-age <maxAgeDuration>', 'ISO8601 Duration string describing oldest sitemap entry to fetch')
    .action(async (url, options, command) => {

        if (!url) throw new Error(`No URL given ${url}`);
        if (!options.output) throw new Error(`No output file given`);

        // console.log(`${command.name()} ${url} ${options.maxAge}`);

        // I tried replacing the following with this line.
        // For some reason the SitemapXMLParser call fails
        // 
        const items = await fetchURLsFromSitemap(url, options.maxAge);

        let txt = '';
        for (const item of items) {
            txt += item.loc[0] + '\n';
        }
        // console.log(`topost`, txt);

        await fsp.writeFile(options.output, txt, 'utf-8');
    });

program.command('submit-single')
    .description('Submit a single URL to a search engine')
    .argument('<url>', 'The article URL to submit')
    .requiredOption('-e, --engine <searchEngine>', 'Search engine domain name')
    .option('-f, --key-file <fileName>', 'Name of file containing key')
    .option('-k, --key <key>', 'IndexNOW key')
    .action(async (url, options, command) => {

        console.log(`${command.name()} ${url}`, options);

        if (options.fileName && options.key) {
            throw new Error(`Only one of --key-file or --key can be specified`);
        }
        if (!options.keyFile && !options.key) {
            throw new Error(`Either --key-file or --key is required`);
        }

        // https://<searchengine>/indexnow?url=url-changed&key=your-key

        const u = indexNowURL(options.engine);
        u.searchParams.append('url', url);
        if (options.keyFile) {
            const key = await fsp.readFile(options.keyFile, 'utf-8');
            u.searchParams.append('key', key);
        } else if (options.key) {
            u.searchParams.append('key', options.key);
        } else {
            throw new Error(`No key supplied`);
        }

        console.log(`Submitting ${u.toString()}`);

        const response = await axios.get(u.toString());
        console.log(`Submitted to ${options.engine} ${url} status ${response.status}`);
    });

program.command('submit-urls')
    .description('Submit many URLs to a search engine')
    .argument('<urlFile>', 'File containing list of URLs, one per line')
    .requiredOption('-e, --engine <searchEngine>', 'Search engine domain name')
    .requiredOption('-h, --host <hostName>', 'Your website domain name')
    .option('-f, --key-file <fileName>', 'Name of file containing key')
    .option('-k, --key <key>', 'IndexNOW key')
    .action(async (urlFile, options, command) => {

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

        // console.log(`${command.name()} ${urlFile}`, options);

        if (options.fileName && options.key) {
            throw new Error(`Only one of --key-file or --key can be specified`);
        }
        if (!options.keyFile && !options.key) {
            throw new Error(`Either --key-file or --key is required`);
        }

        const u = indexNowURL(options.engine);

        const key = await keyFromOptions(options);

        const urls = await fsp.readFile(urlFile, 'utf-8');
        const urlList = urls.split('\n').filter(U => {
            // I observed a zero-length string at the end 
            // of the array.  This skips such strings.
            return U.length > 0
        });
        // console.log(`urlList`, urlList);

        // No need to post anything
        if (urlList.length <= 0) return;

        await postIndexNowURLlist(u, key, 
            options.engine, options.host, urlList);
    });

program.command('submit-from-feed')
    .description('Parse an RSS or ATOM feed, submitting some URLs to search engine')
    .argument('<feedURL>', 'The URL for an RSS or Atom feed')
    .requiredOption('-e, --engine <searchEngine>', 'Search engine domain name')
    .requiredOption('-h, --host <hostName>', 'Your website domain name')
    .option('-f, --key-file <fileName>', 'Name of file containing key')
    .option('-k, --key <key>', 'IndexNOW key')
    .option('-m, --max-age <maxAgeDuration>', 'ISO8601 Duration string describing oldest sitemap entry to fetch')
    .action(async (feedURL, options, command) => {

        // console.log(`${command.name()} ${feedURL}`, options);

        if (options.fileName && options.key) {
            throw new Error(`Only one of --key-file or --key can be specified`);
        }
        if (!options.keyFile && !options.key) {
            throw new Error(`Either --key-file or --key is required`);
        }

        const u = indexNowURL(options.engine);

        const key = await keyFromOptions(options);

        const uFeed = new URL(feedURL);

        let feed;
        try {
            // Support reading the RSS file either from a file or 
            // over the Internet
            let rssStream;
            if (uFeed.protocol === 'file:') {
                rssStream = fs.createReadStream(uFeed.pathname, 'utf-8');
            } else {
                const resFeed = await axios({
                    method: 'get',
                    url: feedURL,
                    responseType: 'stream'
                });
                rssStream = resFeed.data;
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
            if (options.maxAge) {
                const now = new Date();
                const maxSecs = toSeconds(parse(options.maxAge));
                const pubdate = new Date(item.pubdate);
                const age = now.getTime() - pubdate.getTime();
                if ((age / 1000) > maxSecs) continue;
            }
            urlList.push(item.link);
        }

        // console.log(urlList);

        // No need to post anything
        if (urlList.length <= 0) {
            console.log('No URLs to post, nothing to do')
            return;
        } else {
            console.log(`Submitting these URLs to ${options.engine}`, urlList);
        }

        await postIndexNowURLlist(u, key, 
            options.engine, options.host, urlList);
    });

// Generate key into directory

program.parse(process.argv);


async function keyFromOptions(options) {

    let key;
    if (options.keyFile) {
        key = await fsp.readFile(options.keyFile, 'utf-8');
    } else if (options.key) {
        key = options.key;
    } else {
        throw new Error(`No key supplied`);
    }

    // Using genkey.sh there are newlines at the end
    // of the file.  Newlines cause failure.
    return key.replace(/\n+$/, '');
}
