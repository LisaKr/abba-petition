const express = require("express");
const app = express();
const hb = require("express-handlebars");
app.engine("handlebars", hb({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
const ca = require("chalk-animation");
const csurf = require("csurf");
const cookieSession = require("cookie-session");

app.use(
    require("body-parser").urlencoded({
        extended: false
    })
);

app.disable("x-powered-by");

const db = require("./db.js");

app.use(
    cookieSession({
        secret: `I'm always angry.`,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

app.use(csurf());

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

app.use(express.static("./public"));

app.get("/", function(req, res) {
    if (!req.session.signed) {
        res.render("petition");
    } else {
        res.redirect("/thanks");
    }
});

app.post("/", function(req, res) {
    db.addSig(req.body.first, req.body.last, req.body.sig)
        .then(function(results) {
            req.session.signed = "true";
            req.session.id = results.rows[0].id;
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
    if (req.session.signed && req.session.id) {
        Promise.all([db.showSigners(), db.getSignature(req.session.id)]).then(
            function([resultSigners, resultSig]) {
                res.render("thanks", {
                    length: resultSigners.rows.length,
                    url: resultSig.rows[0].sig
                });
            }
        );
    } else {
        res.redirect("/");
    }
});

app.get("/signers", function(req, res) {
    if (req.session.signed) {
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
