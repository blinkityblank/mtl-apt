let markers = [];
let mobile = window.matchMedia("(max-width: 799px)").matches;

//SVG for the heart icon
const heart = `<svg version="1.1"
class="heart"
width="40" height="37">
<g>
	<path d="M12.2,3C7.1,3,3,7.1,3,12.1C3,22.3,13.4,24.9,20.5,35C27.2,25,38,21.9,38,12.1c0-5-4.1-9.1-9.2-9.1
        c-3.7,0-6.9,2.1-8.3,5.2C19,5.1,15.9,3,12.2,3z"/>
</g>
</svg>`

//SVG for the crossed out heart icon
const crossedHeart = `
<svg version="1.1"
class="crossedHeart" 
width="40" height="37">
<style type="text/css">
	.st0{fill:#666666;stroke:#666666;stroke-width:3;}
	.st1{fill:none;stroke:#ffffff;stroke-width:2;}
</style>
<g>
	<path class="st0" d="M12,3c-5.1,0-9.2,4.1-9.2,9.1c0,10.2,10.4,12.8,17.5,22.9C27,25,37.8,21.9,37.8,12.1c0-5-4.1-9.1-9.2-9.1
		c-3.7,0-6.9,2.1-8.3,5.2C18.8,5.1,15.7,3,12,3z"/>
</g>
<line class="st1" x1="13.6" y1="23.9" x2="27.3" y2="10.2"/>
<line class="st1" x1="27.3" y1="23.9" x2="13.6" y2="10.2"/>
</svg>`

//Google Maps function to initialize the map
function initMap() {
    let contentString;
    const montrealPos = {
        lat: 45.5017,
        lng: -73.5673
    }

    //Elements to style the map
    const styledMapType = new google.maps.StyledMapType(

        [{
                "elementType": "geometry",
                "stylers": [{
                    "color": "#f5f5f5"
                }]
            },
            {
                "elementType": "labels.icon",
                "stylers": [{
                    "saturation": -100
                }]
            },
            {
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#616161"
                }]
            },
            {
                "elementType": "labels.text.stroke",
                "stylers": [{
                    "color": "#f5f5f5"
                }]
            },
            {
                "featureType": "administrative.land_parcel",
                "elementType": "labels.text.fill",
                "stylers": [{
                    "visibility": "off"
                }]
            },
            {
                "featureType": "poi",
                "stylers": [{
                    "visibility": "off"
                }]
            },
            {
                "featureType": "road",
                "elementType": "geometry",
                "stylers": [{
                    "color": "#ffffff"
                }]
            },
            {
                "featureType": "road.arterial",
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#757575"
                }]
            },
            {
                "featureType": "road.highway",
                "elementType": "geometry",
                "stylers": [{
                    "color": "#dadada"
                }]
            },
            {
                "featureType": "road.highway",
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#616161"
                }]
            },
            {
                "featureType": "road.local",
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#9e9e9e"
                }]
            },
            {
                "featureType": "transit.line",
                "elementType": "geometry",
                "stylers": [{
                    "color": "#e5e5e5"
                }]
            },
            {
                "featureType": "transit.station",
                "elementType": "all",
            },
            {
                "featureType": "water",
                "elementType": "geometry",
                "stylers": [{
                    "color": "#c9c9c9"
                }]
            },
            {
                "featureType": "water",
                "elementType": "labels.text.fill",
                "stylers": [{
                    "color": "#9e9e9e"
                }]
            }
        ], {
            name: 'Styled Map'
        });
    map = new google.maps.Map(document.getElementById('map'), {
        zoom: 13,
        center: montrealPos,
        mapTypeControlOptions: {
            mapTypeIds: ['roadmap', 'satellite', 'hybrid', 'terrain',
                'styled_map'
            ]
        }
    });

    map.mapTypes.set('styled_map', styledMapType);
    map.setMapTypeId('styled_map');

    getData(map);
    getLastUpdatedDate();
    if (mobile) {
        document.getElementById("menu-icon").style.display = "inline";
        document.getElementById("closeUserArea").style.display = "inline";
    }
};

//Adding event listeners to the markers
function addListenersMarkers(map) {
    map.addListener("click", () => {
        markers.forEach(mark => mark.infoWindow.close());
        if (mobile) {
            closeUserArea()
        }
    })
    //If you click on any marker
    markers.forEach((marker, i) => {
        marker.addListener("click", () => {
            //Closes any other infoWindow that's open
            markers.forEach(mark => mark.infoWindow.close());
            //Opens the infoWindow linked to the marker
            marker.infoWindow.open(map, marker);
            //Lazy load for the info windows
            let contentNodes = document.getElementsByClassName("content-side");
            for (let j = 0; j < contentNodes.length; j++) {
                let childNodes = document.getElementsByClassName("content-side")[j].childNodes;
                for (let i = 0; i < childNodes.length; i++) {
                    if (childNodes[i].tagName === "A" || childNodes[i].tagName === "a") {
                        for (let k = 0; k < childNodes[i].childNodes.length; k++) {
                            if (childNodes[i].childNodes[k].tagName === "IMG" || childNodes[i].childNodes[k].tagName === "img") {
                                childNodes[i].childNodes[k].setAttribute("src", childNodes[i].childNodes[k].getAttribute(
                                    "data-src"))
                            }
                        }
                    }
                }
            }
            //If a user is logged in, mark the ad as having been visited
            if (firebase.currentUser) {
                database.ref('users/' + firebase.currentUser.uid + "/visited").push({
                    "id": marker.id,
                    "dateVisited": new Date().getTime()
                });
                markVisited([marker]);
            }
            if (mobile) {
                closeUserArea()
            }
        })
        //Hide the landing page overlay once all of that is done.
        if (i >= markers.length - 1) {
            document.getElementById("overlay").style.display = "none";
        }
    });
}

//Function to get the data. If the data is more than 10mins old, poll the database, 
//otherwise, get it from the localStorage(if already there)
function getData(map) {
    if (!window.localStorage.getItem("kijijiMapDataDate") || new Date().getTime() - window.localStorage.getItem(
            "kijijiMapDataDate") > 600000) {
        database.ref("apt").once('value').then(function (snapshot) {
            let data = [];
            const dataObj = snapshot.val();
            for (ad in dataObj) {
                data.push(dataObj[ad]);
            }
            window.localStorage.setItem("kijijiMapData", JSON.stringify(dataObj));
            window.localStorage.setItem("kijijiMapDataDate", new Date().getTime());
            addMarkers(data, map);
        });

    } else {
        const dataObj = JSON.parse(window.localStorage.getItem("kijijiMapData"));
        let data = [];
        for (ad in dataObj) {
            data.push(dataObj[ad]);
        }
        addMarkers(data, map);
    }
}
//Add the markers and the infoWindows to the map.
function addMarkers(data, map) {
    data.reduce((prev, ad, i) => {
        // if the ad is outside the predefined area, don't add it.
        // if (ad.longitude > -73.5202339 ||
        //     ad.longitude < -73.6772573 ||
        //     ad.latitude < 45.3964454 ||
        //     ad.latitude > 45.5735141) {
        //     return false;
        // }
        const date = new Date(ad.datePosted)
        let image;
        const templateString =
            ` <div class="content-side" idAd="${ad.id}">
                <a class="saveListing" style="display:none;" href="javascript:saveAd(${ad.id})">${heart}</a>
                <h3><a href="${ad.link}" target="_blank">${ad.title}</a></h3>
                <h4>${ad.mapAddress}</h3>
                <p>Date posted:  ${new Date().getDate() !== date.getDate() ? date.toDateString() : "Today,"} ${date.toLocaleTimeString()}</p>
                <h3>${ad.price > 0 ? ad.price/100 : "Sur Demande"}$ </h3>
                <a href="${ad.link}" target="_blank">${ad.thumbnail?'<img data-src="' + ad.thumbnail + '" style="min-height:200px;max-height:200px";"display:none;"></img>':'View on Kijiji'}</a>
            </div>
                `;
        //If the ad doesn't have a title, forget about it
        if (!ad.title) {
            return false;
        }
        image = {
            size: new google.maps.Size(24, 40),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(12, 40),
            scaledSize: new google.maps.Size(24, 40)
        }
        //If the ad is at the same place as the previous ad, add the ad to the same marker
        if (ad.longitude === prev.longitude && ad.latitude === prev.latitude && i > 1) {
            contentString += '<br/>***********************************<br/>'
            contentString += templateString;
            markers[markers.length - 1].infoWindow.setContent(contentString);
        } else {
            //If the location isn't an exact address, use a blue marker instead of a red one.
            if (isNaN(ad.mapAddress[0])) {
                image.url = './markers/area.png'
            } else {
                image.url = './markers/marker.png'
            }
            contentString = templateString

            //Add marker to the global array of markers
            markers.push(new google.maps.Marker({
                position: {
                    lat: ad.latitude,
                    lng: ad.longitude
                },
                mapAddress: ad.mapAddress,
                id: ad.id,
                map: map,
                icon: image,
                infoWindow: new google.maps.InfoWindow({
                    content: contentString,
                    maxWidth: 400
                })
            }));
        }
        return ad
    })
    addListenersMarkers(map);
}

//Set the ads already visited by the user with a purple marker 
function markVisited(allMarkers, visited) {
    if (visited) {
        allMarkers = allMarkers.filter(marker => firebase.currentUser.visited.includes(marker.id))
    }
    allMarkers.forEach(marker => {
        marker.setIcon({
            size: new google.maps.Size(24, 40),
            origin: new google.maps.Point(0, 0),
            anchor: new google.maps.Point(12, 40),
            scaledSize: new google.maps.Size(24, 40),
            url: './markers/visited.png',
            zIndex: 1000
        })
    })
    let saveListing = document.getElementsByClassName('saveListing');
    for (let i = 0; i < saveListing.length; i++) {
        saveListing[i].style.display = "inline";
    }
}

//Add a saved listing to the database
function saveAd(id) {
    if (firebase.currentUser && !firebase.currentUser.savedAds.includes(id)) {
        firebase.currentUser.savedAds.push(id);
        addHeartSaved(id);
        database.ref("apt").orderByChild("id").equalTo(id).once("value")
            .then(snap => {
                snap.forEach(function (child) {
                    database.ref('users/' + firebase.currentUser.uid + "/saved").push(
                        child.val()
                    );
                })
            })
    }
    viewSaved();
}

//View the user's saved listings in the sidebar
function viewSaved() {
    if (mobile) {
        closeUserArea()
    }
    database.ref('users/' + firebase.currentUser.uid + "/saved").once("value")
        .then(snap => {
            let ads = [];
            snap.forEach(function (child) {
                ads.push(child.val());
            })
            const sidebar = document.getElementById("sidebar");
            if (ads.length < 1) {
                sidebar.innerHTML = `<h2 style="padding:5vw;"> You do not have any saved listings </h2>`;
            } else {
                sidebar.innerHTML = "";
                sidebar.innerHTML = ads.reduce((prev, ad) => {
                    const date = new Date(ad.datePosted)

                    return `<div class="content-side" idAd="${ad.id}">
                    <h3><a href="${ad.link}" target="_blank">${ad.title}</a></h3>
                    <a href="javascript:removeSaved(${ad.id})">${crossedHeart}</a>
                            <h4>${ad.mapAddress}</h3>
                            <p>Date posted:  ${new Date().getDate() !== date.getDate() ? date.toDateString() : "Today,"} ${date.toLocaleTimeString()}</p>
                            <h3>${ad.price > 0 ? ad.price/100 : "Sur Demande"}$ </h3>
                            <a href="${ad.link}" target="_blank">${ad.thumbnail?'<img data-src="' + ad.thumbnail + '" style="min-height:200px;max-height:200px";"display:none;"></img>':'View on Kijiji'}</a>
                            </div>
                        *********************************************************************************
                        ${prev}`
                }, '');
                //Lazy load for the sidebar images
                const contentNodes = document.getElementsByClassName("content-side");
                for (let j = 0; j < contentNodes.length; j++) {
                    let childNodes = document.getElementsByClassName("content-side")[j].childNodes;
                    for (let i = 0; i < childNodes.length; i++) {
                        if (childNodes[i].tagName === "A" || childNodes[i].tagName === "a") {
                            for (let k = 0; k < childNodes[i].childNodes.length; k++) {
                                if (childNodes[i].childNodes[k].tagName === "IMG" || childNodes[i].childNodes[k].tagName === "img") {
                                    childNodes[i].childNodes[k].setAttribute("src", childNodes[i].childNodes[k].getAttribute(
                                        "data-src"))
                                }
                            }
                        }
                    }
                }
            }
            //Show the sidebar, according to the screen size
            if (mobile) {
                document.getElementById('sidebar-container').style.left = "5vw";
                document.getElementById('closeSidebar').style.left = "95vw";

            } else {
                document.getElementById('sidebar-container').style.left = "0vw";
                document.getElementById('closeSidebar').style.left = "25vw";
                document.getElementById('map').style.width = "75vw";
                document.getElementById('map').style.left = "25vw";
            }
        })
}

//Close sidebar
function closeSaved() {
    if (mobile) {
        document.getElementById('sidebar-container').style.left = "-100vw";
        document.getElementById('closeSidebar').style.left = "0vw";
    } else {
        document.getElementById('sidebar-container').style.left = "-25vw";
        document.getElementById('closeSidebar').style.left = "0vw";
    }

    document.getElementById('map').style.width = "100vw";
    document.getElementById('map').style.left = "0";
}


function closeColorLegend() {
    document.getElementById("colorLegend").style.display = "none"
}

function viewColorLegend() {
    document.getElementById("colorLegend").style.display = "inline"
}


//Remove a saved listing from the sidebar and from the database
function removeSaved(id) {
    if (firebase.currentUser) {
        const ref = database.ref('users/' + firebase.currentUser.uid + "/saved");
        ref.orderByChild("id").equalTo(id).once("value")
            .then(snap => {
                snap.forEach(function (child) {
                    ref.child(child.key).remove();
                })
            })
        firebase.currentUser.savedAds = firebase.currentUser.savedAds.filter(ad => ad.toString() !== id.toString());
    }
    viewSaved();
    removeHeartSaved(id)
}

//If a user is logged in, add hearts to the infoWindows
function addHeartSaved(id) {
    const contentNodes = document.getElementsByClassName("content-side");

    for (let i = 0; i < contentNodes.length; i++) {
        if (contentNodes[i].getAttribute("idAd") === id.toString()) {
            contentNodes[i].firstElementChild.firstElementChild.style.stroke = "#ca0000"
            contentNodes[i].firstElementChild.firstElementChild.style.fill = "#ca0000"
        }
    }
}

//If a user logs out, remove hearts to the infoWindows
function removeHeartSaved(id) {
    const contentNodes = document.getElementsByClassName("content-side");
    for (let i = 0; i < contentNodes.length; i++) {
        if (contentNodes[i].getAttribute("idAd") === id.toString() && contentNodes[i].firstElementChild.className === "saveListing") {
            contentNodes[i].firstElementChild.firstElementChild.style.stroke = "#000000"
            contentNodes[i].firstElementChild.firstElementChild.style.fill = "none"
        }
    }
}

function showMenu() {
    document.getElementById("userArea").style.right = "0px";
}

function closeUserArea() {
    document.getElementById("userArea").style.right = "-210px";
}

//Event listener on resizing the window to change the mobile variable
window.addEventListener("resize", () => {
    mobile = window.matchMedia("(max-width: 799px)").matches
    if (mobile) {
        document.getElementById("menu-icon").style.display = "inline";
        document.getElementById("closeUserArea").style.display = "inline";
    }
})