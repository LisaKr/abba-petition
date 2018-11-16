$(document).ready(function() {
    var nav = $(".nav");
    var dropdown = $(".dropdown");
    var button = $(".closing");
    var notification = $(".notification");

    nav.on("click", function(e) {
        console.log("yo");
        e.stopPropagation(); //because propagated click on the parent document will close the menu and we dont want it
        dropdown.removeClass("invisible");
        dropdown.addClass("visible"); //change left
    });

    //prevent closing event if you click in the menu itself
    dropdown.on("click", function(e) {
        e.stopPropagation();
    });

    //hide menu if you click anywhere else in the document
    $(document).on("click", function() {
        dropdown.removeClass("visible");
        dropdown.addClass("invisible"); //hide
    });

    //adding hiding property to the X despite it being in the menu.
    button.on("click", function() {
        dropdown.removeClass("visible");
        dropdown.addClass("invisible"); //hide
    });

    //adding a notification after the user deleted their profile, on document load
    setTimeout(function() {
        notification.removeClass("hidden");
        notification.addClass("shown");
    }, 500);
});
