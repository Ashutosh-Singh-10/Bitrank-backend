const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const fs = require('fs');
const path = require('path');

puppeteer.use(StealthPlugin());

function adjustNegativeIndexXPath(xpath) {
    // This regex matches div elements with a negative index
    const regex = /(div)\[(-\d+)\]/g;
    return xpath.replace(regex, (match, p1, p2) => {
        const index = parseInt(p2, 10);
        return `${p1}[last()${index + 1}]`;
    });
}

async function scrape(config, transformations) {
    const { urlTemplate, vars, xpaths } = config;

    if (!urlTemplate || !vars) {
        throw new Error('Configuration must contain "urlTemplate" and "vars" fields.');
    }

    if (!xpaths) {
        throw new Error('Configuration must contain "xpaths" field.');
    }

    const generateUrls = (urlTemplate, vars) => {
        return vars.map(variableSet => {
            let url = urlTemplate;
            variableSet.forEach((value, index) => {
                url = url.replace(new RegExp(`\\{${index + 1}\\}`, 'g'), value);
            });
            return { url, vars: variableSet };
        });
    };

    const applyTransformations = (data, transformations) => {
        return transformations.reduce((acc, transform) => {
            if (transformations[transform]) {
                return transformations[transform](acc);
            }
            return acc;
        }, data);
    };

    const urlsWithVars = generateUrls(urlTemplate, vars);

    const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
    const page = await browser.newPage();

    // Set a user agent to simulate a real browser
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    const results = [];

    for (const { url, vars } of urlsWithVars) {
        await page.goto(url, { waitUntil: 'networkidle2', timeout: 0 });

        const adjustedXpaths = xpaths.map(xpathObj => ({
            ...xpathObj,
            xpath: adjustNegativeIndexXPath(xpathObj.xpath)
        }));

        const data = await page.evaluate((adjustedXpaths) => {
            const extractData = (element, format, subXpaths) => {
                if (format === 'text') {
                    return element.innerText;
                } else if (format === 'list') {
                    return Array.from(element.children).map(child => {
                        const subResult = {};
                        subXpaths.forEach(({ id, xpath }) => {
                            const subElement = document.evaluate(xpath, child, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                            if (subElement) {
                                subResult[id] = subElement.innerText;
                            }
                        });
                        return subResult;
                    });
                } else {
                    return element.outerHTML; // default format
                }
            };

            const result = {};
            adjustedXpaths.forEach(({ id, xpath, format, subXpaths }) => {
                const elements = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                const extractedData = [];
                for (let i = 0; i < elements.snapshotLength; i++) {
                    extractedData.push(extractData(elements.snapshotItem(i), format, subXpaths || []));
                }
                result[id] = (format === 'list') ? extractedData : (extractedData.length > 0 ? extractedData[0] : null);
            });

            return result;
        }, adjustedXpaths);

        const transformedData = {};
        for (const key in data) {
            if (data.hasOwnProperty(key)) {
                const transformations = adjustedXpaths.find(xpath => xpath.id === key).transformations || [];
                transformedData[key] = applyTransformations(data[key], transformations);
            }
        }

        // Determine the appropriate format for 'id'
        const id = vars.length === 1 ? vars[0] : vars;
        results.push({ id, data: transformedData });
    }

    await browser.close();
    return results;
}

async function main() {
    const configPath = "scrapeConfig.json";
    if (!configPath) {
        console.error('Please provide a path to the configuration file.');
        process.exit(1);
    }

    const config = JSON.parse(fs.readFileSync(path.resolve(configPath), 'utf-8'));

    // Define your transformation functions here
    const transformations = {
        toUpperCase: (data) => data.toUpperCase(),
        parseInt: (data) => parseInt(data, 10),
        parseSlash: (data)=> {
            const [first, second] = data.split('/');
            return parseInt(first)
        }
    };

    try {
        const data = await scrape(config, transformations);
        console.log(JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error scraping the pages:', error);
    }
}

if (require.main === module) {
    main();
}

module.exports = scrape;
