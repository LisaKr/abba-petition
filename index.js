const express = require("express");
const app = express();
const hb = require("express-handlebars");
app.engine("handlebars", hb({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
const ca = require("chalk-animation");
const cookieParser = require("cookie-parser");

app.use(
    require("body-parser").urlencoded({
        extended: false
    })
);

app.use(cookieParser());

app.disable("x-powered-by");

const db = require("./db.js");

app.use(express.static("./public"));

app.get("/", function(req, res) {
    if (!req.cookies.signed) {
        res.render("petition");
    } else {
        res.redirect("/thanks");
    }
});

app.post("/", function(req, res) {
    db.addSig(req.body.first, req.body.last, req.body.sig)
        .then(function() {
            res.cookie("signed", "true");
            res.redirect("/thanks");
        })
        .catch(function(err) {
            console.log("ERROR in main ", err);
            res.render("petition", {
                error: err
            });
        });
});

app.get("/thanks", function(req, res) {
    if (req.cookies.signed) {
        db.showSigners().then(function(result) {
            res.render("thanks", {
                length: result.rows.length
            });
        });
    } else {
        res.redirect("/");
    }
});

app.get("/signers", function(req, res) {
    if (req.cookies.signed) {
        db.showSigners()
            .then(function(result) {
                console.log(result.rows);
                res.render("signers", {
                    results: result.rows
                });
            })
            .catch(function(err) {
                console.log("error in signers ", err);
            });
    } else {
        res.redirect("/");
    }
});

app.listen(8080, () => ca.rainbow("Big Brother is listening!"));
