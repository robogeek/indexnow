
import axios from 'axios';

export async function postIndexNowURLlist(
    u: URL, key: string,
    engine: string, host: string,
    urlList: Array<string>
) {
    
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

export function indexNowURL(engine: string): URL {

    const u = new URL(`https://ENGINE/indexnow`);
    u.host = engine;
    return u;
}
