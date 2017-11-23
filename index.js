const MIN_PRICE = 600;
const MAX_PRICE = 1200;

const admin = require("firebase-admin");
const cheerio = require("cheerio");
const http = require('follow-redirects').http;

let delay;


function getPage(i) {
    const options = {
        host: 'www.kijiji.ca',
        port: 80,
        path: '/b-appartement-condo/ville-de-montreal/page-',
        path2: `/c37l1700281?ad=offering&price=${MIN_PRICE}__${MAX_PRICE}`
    }


    // return new pending promise
    if (typeof i === "number") {
        options.path = options.path + i.toString() + options.path2;
    } else {
        options.path = i;
    }
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            const request = http.get(options, (response) => {
                console.log(options.path);
                // handle http errors
                if (response.statusCode < 200 || response.statusCode > 299) {
                    reject(new Error('Failed to load page, status code: ' + response.statusCode));
                }
                response.on("error", (err) => reject(err))
                // temporary data holder
                let body = "";
                // on every content chunk, push it to the data array
                response.on('data', (chunk) => {
                    body += chunk;
                });
                // we are done, resolve promise with those joined chunk
                response.on('end', () => {
                    resolve(body)
                });
            });
            // handle connection errors of the request
            request.on('error', (err) => reject(err))
        }, delay += 100)

    })
};


function getLinkAds(body) {
    const links = [];
    const $ = cheerio.load(body);
    $("div.top-feature").each(function (i, elem) {
        if (!links.includes($(this).attr('data-ad-id'))) {
            links.push($(this).attr('data-vip-url'));
        }
    });
    $("div.regular-ad").each(function (i, elem) {
        links.push($(this).attr('data-vip-url'));
    });
    return links;
}


function getDataFromAd(prev, body) {
    let $ = cheerio.load(body);
    let script = $("div[id=FesLoader]").children().html();
    let data, ad;
    try {
        data = JSON.parse(script.substring(script.indexOf("{"), script.lastIndexOf("}") + 1));
        data = data.config.VIP;
        ad = {
            "description": data.description,
            "datePosted": data.sortingDate,
            "mapAddress": data.adLocation.mapAddress,
            "latitude": data.adLocation.latitude,
            "longitude": data.adLocation.longitude,
            "id": data.adId,
            "link": data.seoUrl,
            "price": data.price.amount,
            "title": data.title,
            "thumbnail": data.media[0] ? data.media[0].href : null
        };
        return prev.concat(ad);
    } catch (error) {
        return prev;
    }
}

function main(pageNum, endDate) {
    delay = 0;
    console.log(new Date(endDate));
    getPage(pageNum)
        .then(onePage => {
            let links = getLinkAds(onePage);
            Promise.all(links.map(getPage))
                .then(bodies => {
                    let adsArray = bodies.reduce(getDataFromAd, []);
                    writeToDB(adsArray, pageNum, endDate);
                }, e => console.log(e))
        })
}


//DATABASE

const serviceAccount = require(__dirname + "/keys/montreal-kijiji-firebase-adminsdk-uhkus-ae4f62bd72.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://montreal-kijiji.firebaseio.com",
    databaseAuthVariableOverride: {
        uid: "node-app-admin"
    }
});

const db = admin.database();
const ref = db.ref("apt");



function writeToDB(dataAds, pageNum, endDate) {
    if (!endDate) {
        ref.orderByChild("datePosted").limitToLast(1).once("value").then(snap => {
            snap.forEach(function (child) {
                endDate = child.val()["datePosted"];
                console.log(endDate);
            })
        })
    }

    checkForDoubles(dataAds)
        .then(ads => {
            Promise.all(ads.map(ad => {
                return new Promise((resolve, reject) => {
                    ref.push(ad, () => {
                        resolve(ad)
                    });
                })
            })).then(ad => {

                pageNum++;

                console.log(new Date(endDate) + " < " + new Date(ads[ads.length - 1].datePosted))

                if (endDate < ads[ads.length - 1].datePosted) {
                    main(pageNum, endDate);
                }


                ref.once("value", function (snap) {
                    console.log(snap.numChildren());
                })
            })
        })

}


function checkForDoubles(ads) {
    return Promise.all(ads.map(ad => {
        return new Promise((resolve, reject) => {
            ref.orderByChild("datePosted").equalTo(ad.datePosted).once("value", function (snap) {
                if (snap.exists()) {
                    snap.forEach(function (child) {
                        ref.child(child.key).remove(() => resolve(ad));
                    })
                } else {
                    resolve(ad);
                }
            })
        })
    }))
}

function removeWeekOld() {
    let currentTime = new Date().getTime();
    ref.orderByChild("datePosted").endAt(currentTime - 259200000).on("value", function (snap) {
        snap.forEach(function (child) {
            ref.child(child.key).remove();
        })
    })
}


setInterval(() => main(1, 0), 600000);
removeWeekOld();