import { Command } from 'commander';
import Sitemapper from 'sitemapper_mos';
import axios from 'axios';
import { promises as fsp } from 'fs';

const program = new Command();


program
  .name('indexnow')
  .description('CLI to help with IndexNOW')
  .version('0.1.0');

program.command('sitemap-fetch')
    .description('Fetch the URLs in a sitemap')
    .argument('<url>', 'Sitemap URL to fetch')
    .requiredOption('-o, --output <fileName>', 'File name for output')
    .action(async (url, options, command) => {

        if (!url) throw new Error(`No URL given ${url}`);
        if (!options.output) throw new Error(`No output file given`);

        const SITE = new Sitemapper({
            url: url, timeout: 5000
        });
        
        const { sites } = await SITE.fetch();
        await fsp.writeFile(options.output, JSON.stringify(sites), 'utf-8');
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

        const u = new URL(`https://${options.engine}`);
        u.pathname = '/indexnow';
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

        console.log(`${command.name()} ${urlFile}`, options);

        if (options.fileName && options.key) {
            throw new Error(`Only one of --key-file or --key can be specified`);
        }
        if (!options.keyFile && !options.key) {
            throw new Error(`Either --key-file or --key is required`);
        }

        const u = new URL(`https://${options.engine}`);
        u.pathname = '/indexnow';

        let key;
        if (options.keyFile) {
            key = await fsp.readFile(options.keyFile, 'utf-8');
        } else if (options.key) {
            key = options.key;
        } else {
            throw new Error(`No key supplied`);
        }

        const urls = await fsp.readFile(urlFile, 'utf-8');
        const urlList = urls.split('\n').filter(U => {
            return U.length > 0
        });
        console.log(`urlList`, urlList);

        try {
            const response = await axios({
                method: 'post',
                url: u.toString(),
                headers: {
                    'Content-Type': 'application/json; charset=utf-8'
                },
                data: {
                    host: options.host,
                    key: key,
                    urlList: urlList
                }
            });
            console.log(`Submitted ${urlList.length} URL's to ${options.engine} status ${response.status}`);
        } catch (err) {
            console.error(err);
        }
    });

// Generate key into directory
// Read RSS extract URLs to file

program.parse(process.argv);

