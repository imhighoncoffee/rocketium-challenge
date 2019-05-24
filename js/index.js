$(function() {

    // Initialize Firebase configuration
    var config = {
        apiKey: "AIzaSyAsFK9oDTtsCdqrHAfQKs8_TmNtBOoIkBY",
        authDomain: "emma-ea74d.firebaseapp.com",
        databaseURL: "https://emma-ea74d.firebaseio.com",
        storageBucket: "emma-ea74d.appspot.com",
        messagingSenderId: "95300595436"
    };
    const firebaseConfig = {
        apiKey: "AIzaSyAuAONbz-JcaQ3f9k2uRuhk6iIv2Igy16M",
        authDomain: "rocketium-challenge.firebaseapp.com",
        databaseURL: "https://rocketium-challenge.firebaseio.com",
        //projectId: "rocketium-challenge",
        storageBucket: "rocketium-challenge.appspot.com",
        messagingSenderId: "49050577731"
        //appId: "1:49050577731:web:989143f9dbfecb19"
      };
      
    firebase.initializeApp(config);

    //var editorId = Url.queryString("id") || "_";
    var editorId = "jehad+article";

    var LS_THEME_KEY = "editor-theme";
    function getTheme() {
        return localStorage.getItem(LS_THEME_KEY) || "ace/theme/monokai";
    }

    var uid = Math.random().toString();
    var editor = null;

    var db = firebase.database();

    var editorValues = db.ref("editor_values");
    
    var currentEditorValue = editorValues.child(editorId);
    console.log(editorValues);
    var openPageTimestamp = Date.now();

    currentEditorValue.child("content").once("value", function (contentRef) {

        $("#editor").fadeIn();

        // Initialize the ACE editor
        editor = ace.edit("editor");
        editor.setTheme(getTheme());
        editor.$blockScrolling = Infinity;

        // Get the queue reference
        var queueRef = currentEditorValue.child("queue");
        
        // This boolean is going to be true only when the value is being set programmatically
        // We don't want to end with an infinite cycle, since ACE editor triggers the
        // `change` event on programmatic changes (which, in fact, is a good thing)
        var applyingDeltas = false;

        // When we change something in the editor, update the value in Firebase
        editor.on("change", function(e) {
                    
            // In case the change is emitted by us, don't do anything
            // (see below, this boolean becomes `true` when we receive data from Firebase)
            if (applyingDeltas) {
                return;
            }

            // Set the content in the editor object
            // This is being used for new users, not for already-joined users.
            currentEditorValue.update({
                content: editor.getValue()
            });

            // Generate an id for the event in this format:
            //  <timestamp>:<random>
            // We use a random thingy just in case somebody is saving something EXACTLY
            // in the same moment
            queueRef.child(Date.now().toString() + ":" + Math.random().toString().slice(2)).set({
                event: e,
                by: uid
            }).catch(function(e) {
                console.error(e);
            });
        });

        // Get the editor document object 
        var doc = editor.getSession().getDocument();

        // Listen for updates in the queue
        queueRef.on("child_added", function (ref) {
        
            // Get the timestamp
            var timestamp = ref.key.split(":")[0];
        
            // Do not apply changes from the past
            if (openPageTimestamp > timestamp) {
                return;
            }
        
            // Get the snapshot value
            var value = ref.val();
            
            // In case it's me who changed the value, I am
            // not interested to see twice what I'm writing.
            // So, if the update is made by me, it doesn't
            // make sense to apply the update
            if (value.by === uid) { return; }
        
            // We're going to apply the changes by somebody else in our editor
            //  1. We turn applyingDeltas on
            applyingDeltas = true;
            //  2. Update the editor value with the event data
            doc.applyDeltas([value.event]);
            //  3. Turn off the applyingDeltas
            applyingDeltas = false;
        });

        // Get the current content
        var val = contentRef.val();
        
        // If the editor doesn't exist already....
        if (val === null) {
            // ...we will initialize a new one. 
            // ...with this content:
            val = "/* Welcome to Rocketium! */";

            // Here's where we set the initial content of the editor
            editorValues.child(editorId).set({
                lang: "javascript",
                queue: {},
                content: val
            });
        }

        // We're going to update the content, so let's turn on applyingDeltas 
        applyingDeltas = true;
        
        // ...then set the value
        // -1 will move the cursor at the begining of the editor, preventing
        // selecting all the code in the editor (which is happening by default)
        editor.setValue(val, -1);
        
        // ...then set applyingDeltas to false
        applyingDeltas = false;
        
        // And finally, focus the editor!
        editor.focus();
    });
});