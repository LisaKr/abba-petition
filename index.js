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

app.get("/", (req, res) => {
    res.redirect("/registration");
});

///registration
app.get("/registration", function(req, res) {
    //if the user is not already registered
    if (!req.session.userID) {
        res.render("registration");
    } else {
        res.redirect("/petition");
    }
});

app.post("/registration", function(req, res) {
    //we hash the provided password and then we insert a user into the db
    db.hashPassword(req.body.pass)
        .then(function(hash) {
            return db.createUser(
                req.body.first,
                req.body.last,
                req.body.email,
                hash
            );
        })
        .then(function(result) {
            req.session.userID = result.rows[0].id;
            req.session.first = result.rows[0].first;
            req.session.last = result.rows[0].last;
        })
        .then(function() {
            res.redirect("/petition");
        })
        .catch(function(err) {
            console.log(err);
            res.render("registration", {
                error: err
            });
        });
});

//login////////////

app.get("/login", function(req, res) {
    if (!req.session.userID) {
        res.render("login");
    } else {
        res.redirect("/petition");
    }
});

//prettier-ignore
app.post("/login", function(req, res) {
    db
        .getUser(req.body.email)
        .then(function(results) {
            console.log(req.body.pass);
            return db.comparePassword(req.body.pass, results.rows[0].pass)
                .then(function(match) {
                    if (match==true) {
                        console.log("success");
                        req.session.userID = results.rows[0].id;
                        req.session.first = results.rows[0].first;
                        req.session.last = results.rows[0].last;
                        return db.checkForSig(req.session.userID);
                    } else {
                        throw new Error;
                    }
                });
        }).
        //after checking if password and error match, if they dont match it goes to catch and if they match it goes there
        //
        then(function(data){
            //if there is a signature
            if (data.rows.length > 0) {
                req.session.signed = "true";
                res.redirect("/thanks");
            } else {
                res.redirect("/petition");
            }
        }).
        catch(function(err) {
            console.log(err);
            res.render("login", {

                error: err
            });
        });
});

////////////showing page with the signature
app.get("/petition", function(req, res) {
    if (!req.session.signed) {
        res.render("petition");
    } else {
        res.redirect("/thanks");
    }
});

app.post("/petition", function(req, res) {
    db.addSig(
        req.session.first,
        req.session.last,
        req.body.sig,
        req.session.userID
    )
        .then(function() {
            req.session.signed = "true";
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
    if (req.session.signed && req.session.userID) {
        Promise.all([
            db.showSigners(),
            db.getSignature(req.session.userID)
        ]).then(function([resultSigners, resultSig]) {
            res.render("thanks", {
                length: resultSigners.rows.length,
                url: resultSig.rows[0].sig
            });
        });
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

//logout

app.get("/logout", function(req, res) {
    req.session = null;
    res.redirect("/login");
});

app.listen(8080, () => ca.rainbow("Big Brother is listening!"));
