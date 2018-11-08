$(document).ready(function() {
    var c = $("#signature");
    var context = c[0].getContext("2d");
    var hidden = $('input[name="sig"]');

    //when the user mouse downs on the canvas field we need to draw a line following his cursor
    //on mouse down we start listening
    c.on("mousedown", function(e) {
        var x = e.offsetX;
        var y = e.offsetY;
        context.strokeStyle = "black";
        context.lineWidth = 2;
        context.moveTo(y, x);
        context.beginPath();
        $(this).mousemove(function(e) {
            x = e.offsetX;
            y = e.offsetY;
            context.lineTo(x, y);
            context.stroke();
        });
    }).mouseup(function() {
        $(this).unbind("mousemove");
        var secret = c[0].toDataURL();
        hidden.val(secret);
        console.log(secret);
    });
});
