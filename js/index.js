$(function() {

    // Initialize Firebase configuration
    var config = {
        apiKey: "AIzaSyAsFK9oDTtsCdqrHAfQKs8_TmNtBOoIkBY",
        authDomain: "emma-ea74d.firebaseapp.com",
        databaseURL: "https://emma-ea74d.firebaseio.com",
        storageBucket: "emma-ea74d.appspot.com",
        messagingSenderId: "95300595436"
    };
      
    firebase.initializeApp(config);

    var editorId = Url.queryString("id") || "_";

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

        editor = ace.edit("editor");
        editor.setTheme(getTheme());
        editor.$blockScrolling = Infinity;

        var queueRef = currentEditorValue.child("queue");
        
        var applyingDeltas = false;

        editor.on("change", function(e) {
                    

            if (applyingDeltas) {
                return;
            }


            currentEditorValue.update({
                content: editor.getValue()
            });

            queueRef.child(Date.now().toString() + ":" + Math.random().toString().slice(2)).set({
                event: e,
                by: uid
            }).catch(function(e) {
                console.error(e);
            });
        });


        var doc = editor.getSession().getDocument();

        queueRef.on("child_added", function (ref) {

            var timestamp = ref.key.split(":")[0];

            if (openPageTimestamp > timestamp) {
                return;
            }

            var value = ref.val();

            if (value.by === uid) { return; }

            applyingDeltas = true;

            doc.applyDeltas([value.event]);
                applyingDeltas = false;
        });

        var val = contentRef.val();

        if (val === null) {

            val = "/* Welcome to Rocketium! */";

            editorValues.child(editorId).set({
                lang: "javascript",
                queue: {},
                content: val
            });
        }

        applyingDeltas = true;

        editor.setValue(val, -1);

        applyingDeltas = false;

        editor.focus();
    });
});