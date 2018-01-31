// Mathieu Blanchette
// http://mathieublanchette.com


//Price range for query
const MIN_PRICE = 600;
const MAX_PRICE = 1200;

const admin = require("firebase-admin");
const cheerio = require("cheerio");
const http = require('follow-redirects').http;

//DATABASE

const serviceAccount = require(__dirname + "/keys/montreal-kijiji-firebase-adminsdk-uhkus-ae4f62bd72.json");
const uidOverride = require(__dirname + "/keys/uidOverride.json");


//credentials for the Firebase db
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://montreal-kijiji.firebaseio.com",
    databaseAuthVariableOverride: uidOverride
});

const db = admin.database();
const ref = db.ref("apt");

let delay;



//Go get a kijiji webpage 
function getPage(i) {
    const options = {
        host: 'www.kijiji.ca',
        port: 80,
        path: '/b-appartement-condo/ville-de-montreal/page-',
        path2: `/c37l1700281?ad=offering&price=${MIN_PRICE}__${MAX_PRICE}`
    }
    //check if the argument is a number(page with 25 ads) or an actual url(every specific ad)
    if (typeof i === "number") {
        options.path = options.path + i.toString() + options.path2;
    } else {
        options.path = i;
    }

    // return new pending promise
    return new Promise((resolve, reject) => {
        //sets a timeout otherwise too many requests at once
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
                // on every content chunk add it to the body string
                response.on('data', (chunk) => {
                    body += chunk;
                });
                // we are done, resolve promise with html body
                response.on('end', () => {
                    resolve(body)
                });
            });
            // handle connection errors of the request
            request.on('error', (err) => reject(err))
        }, delay += 100)

    })
};

//get the url for each ad on a 25 ad page
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


//get the data from each ad html body
//use reduce so that if the data is not valid, it just goes to the next ad and not crash
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



//*************************************************************************************** */
//DATABASE FUNCTIONS


//Sends the data collected to the database
function writeToDB(dataAds, pageNum, endDate) {

    //gets the most recent ad added to the, 
    //so that the main function can be called until it reaches that date is reached
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
            //Adds every new ads to the Database
            Promise.all(ads.map(ad => {
                return new Promise((resolve, reject) => {
                    ref.push(ad, () => {
                        resolve(ad)
                    });
                })
            })).then(ad => {

                //if the date of the most recent ad hasn't been reached yet,
                //it restarts the whole process with the next webpage  

                pageNum++;
                console.log(new Date(endDate) + " < " + new Date(ads[ads.length - 1].datePosted))
                if (endDate < ads[ads.length - 1].datePosted) {
                    main(pageNum, endDate);
                }

                //Prints out the number of ads in the database
                ref.once("value", function (snap) {
                    console.log(snap.numChildren());
                })
            })
        })

}

//Checks that there are no new listings already in the database 
function checkForDoubles(ads) {
    return Promise.all(ads.map(ad => {
        return new Promise((resolve, reject) => {
            ref.orderByChild("id").equalTo(ad.id).once("value", function (snap) {
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
//removes ads that are 3 days old
function removeThreeDaysOld() {
    let currentTime = new Date().getTime();
    ref.orderByChild("datePosted").endAt(currentTime - 259200000).once("value", function (snap) {
        snap.forEach(function (child) {
            ref.child(child.key).remove();
        })
    })
}

function lastUpdated() {
    let currentDate = new Date().getTime();
    db.ref('lastUpdated/').set({
        "latest": currentDate
    });
}

//*************************************************************************************** */


//First function to be called.
//Asks for the main page, then asks for each ad page, then calls the function that write to the database
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
    removeThreeDaysOld();
    lastUpdated();
}


// Calls the main function every 10 minutes
setInterval(() => main(1, 0), 600000);