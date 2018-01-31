 // Initialize Firebase
 const config = {
     apiKey: "AIzaSyB_QdnfKB8GuVyVEsksKCot66bMD8hWNlQ",
     authDomain: "montreal-kijiji.firebaseapp.com",
     databaseURL: "https://montreal-kijiji.firebaseio.com",
     projectId: "montreal-kijiji",
     storageBucket: "",
     messagingSenderId: "38299452300"
 };

 firebase.initializeApp(config);


 const database = firebase.database();
 const provider = new firebase.auth.GoogleAuthProvider();

 //When a user is logged in, remove visited index from database if it is more than 3 days old
 function removeVisitedThreeDaysOld() {
     const currentTime = new Date().getTime();
     const refUserVisited = database.ref('users/' + firebase.currentUser.uid + "/visited");
     refUserVisited
         .orderByChild("dateVisited").endAt(currentTime - 259200000).once("value", function (snap) {
             snap.forEach(function (child) {
                 refUserVisited.child(child.key).remove();
             })
         })
 }

 //Get the timestamp of the last time an ad was added to the database
 function getLastUpdatedDate() {
     database.ref('lastUpdated/').once("value", function (snap) {
         const date = new Date(snap.val().latest);
         document.getElementById("lastUpdateDate").innerText = date.toDateString() + " " + date.toLocaleTimeString();
     })
 }


 //function triggered everytime a user signs in OR out
 firebase.auth().onAuthStateChanged(function (user) {
     const signButton = document.getElementById("sign");
     if (user) {
         //Chenge what is displayed in the menu based on if a user is logged in
         document.getElementById("viewSaved").style.display = "inline";
         signButton.setAttribute("href", "javascript:signOut()");
         signButton.textContent = "Sign Out";
         document.getElementById("name").innerHTML = `Hi ${user.displayName.match(/(\S+)/)[0]}`;
         firebase.currentUser = user;
         //Get the visited indexes for the current user
         database.ref('users/' + firebase.currentUser.uid + "/visited").once('value')
             .then(function (snapshot) {
                 let visitedObj = snapshot.val();
                 firebase.currentUser.visited = [];
                 for (ad in visitedObj) {
                     firebase.currentUser.visited.push(visitedObj[ad]["id"]);
                 }
                 markVisited(markers, firebase.currentUser.visited);
             })
         removeVisitedThreeDaysOld();
         //Get the saved ads from the database for a given user
         database.ref('users/' + firebase.currentUser.uid + "/saved").once('value').then(function (snapshot) {
             const savedObj = snapshot.val();
             let saved = [];
             for (ad in savedObj) {
                 saved.push(savedObj[ad]["id"]);
             }
             firebase.currentUser.savedAds = saved;
         })

     } else {
         //Chenge what is displayed in the menu based on if a user is not logged in
         document.getElementById("viewSaved").style.display = "none";
         signButton.setAttribute("href", "javascript:signIn()");
         signButton.textContent = "Sign in with Google";
         document.getElementById("name").innerHTML = `Not signed in`;
         firebase.currentUser = null;
     }
 });

 //Function triggered when a user clicks on the sign out link
 function signOut() {
     firebase.auth().signOut().then(function () {
         document.getElementById("viewSaved").style.display = "none";
         document.getElementById("name").innerHTML = `Not signed in`;
         initMap();
     }).catch(function (error) {
         console.log(error);
         // An error happened.
     });
 }

 //Function triggered when a user clicks on the sign in link
 function signIn() {
     firebase.auth().signInWithPopup(provider).then(function (result) {
         // This gives you a Google Access Token. You can use it to access the Google API.
         const token = result.credential.accessToken;
         // The signed-in user info.
         const user = result.user;
         document.getElementById("viewSaved").style.display = "inline";
         document.getElementById("name").innerHTML =
             `Hi ${user.displayName.match(/(\S+)/)[0]}`;

         // ...
     }).catch(function (error) {
         console.log(error);
     });
 }