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

 let currentUser;

 function removeVisitedThreeDaysOld() {
     let currentTime = new Date().getTime();
     let refUserVisited = database.ref('users/' + currentUser.uid + "/visited");
     refUserVisited
         .orderByChild("dateVisited").endAt(currentTime - 259200000).on("value", function (snap) {
             snap.forEach(function (child) {
                 refUserVisited.child(child.key).remove();
             })
         })
 }

 firebase.auth().onAuthStateChanged(function (user) {
     let signButton = document.getElementById("sign");
     if (user) {
         document.getElementById("viewSaved").style.display = "inline";
         signButton.setAttribute("href", "javascript:signOut()");
         signButton.textContent = "Sign Out";
         document.getElementById("name").innerHTML = `Hi ${user.displayName.match(/(\S+)/)[0]}`;
         currentUser = user;
         database.ref('users/' + currentUser.uid + "/visited").once('value')
             .then(function (snapshot) {
                 let visitedObj = snapshot.val();
                 let visited = [];
                 for (ad in visitedObj) {
                     visited.push(visitedObj[ad]["id"]);
                 }
                 markVisited(markers, visited);
             })
         removeVisitedThreeDaysOld();
         database.ref('users/' + currentUser.uid + "/saved").once('value').then(function (snapshot) {
             let savedObj = snapshot.val();
             let saved = [];
             for (ad in savedObj) {
                 saved.push(savedObj[ad]["id"]);
             }
             currentUser.savedAds = saved;
         })

     } else {
         document.getElementById("viewSaved").style.display = "none";
         signButton.setAttribute("href", "javascript:signIn()");
         signButton.textContent = "Sign in with Google";
         document.getElementById("name").innerHTML = `Not signed in`;
         currentUser = null;
     }
 });


 function signOut() {
     firebase.auth().signOut().then(function () {
         document.getElementById("viewSaved").style.display = "none";
         document.getElementById("name").innerHTML = `Not signed in`;
         initMap();
     }).catch(function (error) {
         // An error happened.
     });
 }

 function signIn() {
     firebase.auth().signInWithPopup(provider).then(function (result) {
         // This gives you a Google Access Token. You can use it to access the Google API.
         var token = result.credential.accessToken;
         // The signed-in user info.
         var user = result.user;
         document.getElementById("viewSaved").style.display = "inline";
         document.getElementById("name").innerHTML =
             `Hi ${user.displayName.match(/(\S+)/)[0]}`;

         // ...
     }).catch(function (error) {
         console.log(error);
         // Handle Errors here.
         var errorCode = error.code;
         var errorMessage = error.message;
         // The email of the user's account used.
         var email = error.email;
         // The firebase.auth.AuthCredential type that was used.
         var credential = error.credential;
         // ...
     });
 }