const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');

puppeteer.use(StealthPlugin());

const TRANSFORMATIONS = {
    toUpperCase: (data) => data.toUpperCase(),
    parseInt: (data) => parseInt(data, 10),
    parseSlash: (data) => {
        const [first] = String(data).split('/');
        return parseInt(first.replace(',', ''), 10);
    }
};

function adjustNegativeIndexXPath(xpath) {
    return xpath.replace(/(\w+)\[(-\d+)\]/g, (match, element, index) => {
        return `${element}[last()${parseInt(index) + 1}]`;
    });
}

async function scrape(config) {
    const { urlTemplate, vars, xpaths } = config;

    if (!urlTemplate || !vars || !xpaths) {
        throw new Error('Invalid configuration. Must include urlTemplate, vars, and xpaths.');
    }

    const browser = await puppeteer.launch({ 
        headless: true, 
        args: ['--no-sandbox', '--disable-setuid-sandbox'] 
    });
    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36');

    const results = [];

    for (const variableSet of vars) {
        let url = urlTemplate;
        variableSet.forEach((value, index) => {
            url = url.replace(new RegExp(`\\{${index + 1}\\}`, 'g'), value);
        });

        try {
            await page.goto(url, { waitUntil: 'networkidle2', timeout: 60000 });

            const adjustedXpaths = xpaths.map(xpath => ({
                ...xpath,
                xpath: adjustNegativeIndexXPath(xpath.xpath),
                subXpaths: xpath.subXpaths ? xpath.subXpaths.map(subXpath => ({
                    ...subXpath,
                    xpath: adjustNegativeIndexXPath(subXpath.xpath)
                })) : undefined
            }));

            const pageData = await page.evaluate((xpaths, TRANSFORMATIONS) => {
                function applyTransformations(data, transformations) {
                    if (!transformations || transformations.length === 0) return data;
                    return transformations.reduce((acc, transformName) => {
                        return TRANSFORMATIONS[transformName] ? TRANSFORMATIONS[transformName](acc) : acc;
                    }, data);
                }

                function extractData(element, format, subXpaths, transformations) {
                    let data;
                    if (format === 'text') {
                        data = element.innerText.trim();
                        return applyTransformations(data, transformations);
                    } else if (format === 'list') {
                        return Array.from(element.children).map(child => {
                            const subResult = {};
                            subXpaths.forEach(({ id, xpath, format: subFormat, transformations: subTransformations }) => {
                                const subElement = document.evaluate(xpath, child, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
                                if (subElement) {
                                    subResult[id] = extractData(subElement, subFormat || 'text', [], subTransformations);
                                }
                            });
                            return subResult;
                        });
                    } else {
                        data = element.outerHTML;
                        return applyTransformations(data, transformations);
                    }
                }

                const result = {};
                xpaths.forEach(({ id, xpath, format, subXpaths, transformations }) => {
                    const elements = document.evaluate(xpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
                    let data = [];
                    for (let i = 0; i < elements.snapshotLength; i++) {
                        data.push(extractData(elements.snapshotItem(i), format, subXpaths || [], transformations));
                    }
                    result[id] = data.length === 1 ? data[0] : data;
                });
                return result;
            }, adjustedXpaths, TRANSFORMATIONS);

            results.push({
                id: variableSet.length === 1 ? variableSet[0] : variableSet,
                data: pageData
            });
        } catch (error) {
            console.error(`Error scraping ${url}:`, error);
            results.push({
                id: variableSet.length === 1 ? variableSet[0] : variableSet,
                error: error.message
            });
        }
    }

    await browser.close();
    return results;
}

const getProfile = async (uid) => {
    const PROFILE_CONFIG = {
        "urlTemplate": "https://leetcode.com/u/{1}",
        "vars":[[`${uid}`]],
        "xpaths": [
          {
            "id": "name",
            "xpath": "/html/body/div[1]/div[1]/div[4]/div/div[1]/div/div[1]/div[1]/div[2]/div[1]/div",
            "format": "text"
          },
          {
            "id": "rank",
            "xpath": "/html/body/div[1]/div[1]/div[4]/div/div[2]/div[1]/div[1]/div/div[1]/div/div[-2]/div[2]", 
            "format": "text",
            "transformations": ["parseSlash"]
          },
          {
            "id": "rating",
            "xpath": "/html/body/div[1]/div[1]/div[4]/div/div[2]/div[1]/div[1]/div/div[1]/div/div[1]/div[2]",
            "format": "text"
          },
          {
            "id": "maxRating",
            "xpath": "//g[contains(@class, 'highcharts-annotation-labels')]//text[@data-z-index='1']",
            "format": "text"
          },
          {
            "id": "top",
            "xpath": "/html/body/div[1]/div[1]/div[4]/div/div[2]/div[1]/div[3]/div/div[1]/div[1]/div[2]",
            "format": "text"
          },
          {
            "id": "problems",
            "xpath": "/html/body/div[1]/div[1]/div[4]/div/div[2]/div[3]/div[1]/div/div/div[2]",
            "format": "list",
            "subXpaths": [
              {
                "id": "label",
                "format": "text",
                "xpath": "./div[1]"
              },
              {
                "id": "value",
                "format": "text",
                "xpath": "./div[2]",
                "transformations": ["parseSlash"]
              }
            ]
          }
        ]
    }
    const res = await scrape(PROFILE_CONFIG)
    console.log("res:", JSON.stringify(res))
    return res
}

async function main() {
    console.log(await getProfile('leftshifted'))
}

if (require.main === module) {
    main();
}

module.exports = {
    getProfile
};