const express = require("express");
const app = express();
const hb = require("express-handlebars");
app.engine("handlebars", hb({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
const ca = require("chalk-animation");
const csurf = require("csurf");
const cookieSession = require("cookie-session");
const db = require("./db.js");
// const redis = require("./redis.js");

app.use(
    require("body-parser").urlencoded({
        extended: false
    })
);

app.disable("x-powered-by");

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

//////RENDERS MAIN PAGE IF YOU'RE NOT LOGGED IN, RENDERS ADDITIONAL INFO IF YOU DELETED YOUR PROFILE//////
app.get("/", needNoUserID, (req, res) => {
    res.render("home", {
        deleted: req.query.deleted_all
    });
});

app.get("/registration", needNoUserID, function(req, res) {
    res.render("registration");
});

//what do we do with the registration data?
app.post("/registration", function(req, res) {
    if (req.body.pass) {
        db.hashPassword(req.body.pass)
            .then(function(hash) {
                return db.createUser(
                    req.body.first,
                    req.body.last,
                    req.body.email,
                    hash
                );
            })
            //then we take the returned data from the database and
            //set the cookies to know that this user is registered and his session is running.
            //every user gets a unique id
            //when users log in they will get the same cookies identifying them because it comes from a database, from their row
            //results.rows is the array containing the actual rows of the database that satisfy our query.
            //every row is an object. even if there is only one row returned we still have to access it by
            //result.rows[0] because we need to access the json like object
            //results on its own also contains tons of other data
            .then(function(result) {
                req.session.userID = result.rows[0].id;
                req.session.first = result.rows[0].first;
                req.session.last = result.rows[0].last;
            })
            .then(function() {
                res.redirect("/onboarding");
            })
            .catch(function(err) {
                console.log("ERROR IN REGISTRATION: ", err);
                res.render("registration", {
                    error: err
                });
            });
    } else {
        res.render("registration", {
            error: "true"
        });
    }
});

////additional information////
app.get("/onboarding", needUserID, (req, res) => {
    if (!req.session.addedInfo) {
        //add a cookie for having filled these out so that if they are filled out you are redirected
        res.render("onboarding");
    } else {
        res.redirect("/");
    }
});

app.post("/onboarding", (req, res) => {
    if (!req.body.age && !req.body.city && !req.body.url) {
        res.redirect("/petition");
    } else {
        return db
            .addInfo(
                req.body.age,
                req.body.city,
                req.body.url,
                req.session.userID
            )
            .then(function() {
                req.session.addedInfo = "true";
                res.redirect("/petition");
            });
    }
});

///////////////login////////////

app.get("/login", needNoUserID, function(req, res) {
    res.render("login");
});

//what do we do with the data when we log in?

//prettier-ignore
app.post("/login", function(req, res) {
    db
        .getUser(req.body.email)
        .then(function(results) {
            return db.comparePassword(req.body.pass, results.rows[0].pass)
                .then(function(match) {
                    if (match==true) {
                        req.session.userID = results.rows[0].id;
                        req.session.first = results.rows[0].first;
                        req.session.last = results.rows[0].last;
                        req.session.sigID = results.rows[0].sig_id;
                        //here we check whether data from user_profiles was returned by that user_id from getUser and if yes,
                        //we set the onboarding cookie to true
                        if (results.rows[0].up_id) {
                            req.session.addedInfo = "true";
                        }
                    } else {
                        throw new Error;
                    }
                });
        }).
        //now we have the resolved result of checkForSig so that we can check what it was and act accordingly
        then(function(){
            //check whether the user already has filled out the onboarding to prevent them from going to this page in that case

            //if there is a signature
            if (req.session.sigID) {
                req.session.signed = "true";
                res.redirect("/thanks");
            } else {
                res.redirect("/petition");
            }
        }).
        catch(function(err) {
            console.log("ERROR IN LOGIN", err);
            res.render("login", {
                error: err
            });
        });
});

////////////showing the petition page with the signature///////////
app.get("/petition", needUserID, needNoSig, function(req, res) {
    res.render("petition", {
        deleted: req.query.deleted
    });
});

//what do we do with the siganture on the petition page?

app.post("/petition", function(req, res) {
    //here the only new data we need is the canvas data to url value which we assigned to be the value of the hidden input form
    //the rest we are getting from the cookies for now
    db.addSig(req.body.sig, req.session.userID)
        //then we are adding a cookie signifying that the user has signed it and it is saved with his information so we know it next time
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

//here we check whether the user signed and is logged in
// then we want to a promise all because we need two promises to resolve before we can render the page
//we need get signers to get the lebgth of the array and get signature to present it
app.get("/thanks", needUserID, needSig, function(req, res) {
    Promise.all([db.showSigners(), db.getSignature(req.session.userID)])
        .then(function([resultSigners, resultSig]) {
            res.render("thanks", {
                length: resultSigners.rows.length,
                url: resultSig.rows[0].sig,
                name: resultSig.rows[0].first
            });
        })
        .catch(function(err) {
            console.log("ERROR IN THANKs", err);
        });
});

//deleting signatures
app.post("/signature/delete", (req, res) => {
    db.deleteSig(req.session.userID)
        .then(function() {
            req.session.signed = null;
            res.redirect("/petition?deleted=true");
        })
        .catch(function(err) {
            console.log(err);
        });
});

app.get("/signers", needUserID, needSig, function(req, res) {
    db.showSigners()
        .then(function(result) {
            //loop here to check whether urls are ok
            result.rows.forEach(obj => {
                if (obj.url) {
                    if (
                        obj.url.indexOf("http://") == -1 ||
                        obj.url.indexOf("https://" == -1)
                    ) {
                        obj.url = "http://" + obj.url;
                    }
                }
            });

            res.render("signers", {
                results: result.rows
            });
        })
        .catch(function(err) {
            console.log("error in signers ", err);
        });
});

app.get("/signers/:city", function(req, res) {
    db.signersByCity(req.params.city)
        .then(function(result) {
            //loop here to check whether urls are ok
            result.rows.forEach(obj => {
                if (
                    obj.url.indexOf("http://") == -1 ||
                    obj.url.indexOf("https://" == -1)
                ) {
                    obj.url = "http://" + obj.url;
                }
            });
            res.render("signersByCity", {
                results: result.rows,
                city: req.params.city
            });
        })
        .catch(function(err) {
            console.log("error in signers ", err);
        });
});

////edit profile
app.get("/edit", needUserID, (req, res) => {
    db.fillTheForm(req.session.userID)
        .then(function(result) {
            res.render("editprofile", {
                results: result.rows[0]
            });
        })
        .catch(function(err) {
            console.log("ERROR IN EDIT ", err);
        });
});

app.post("/edit", (req, res) => {
    //if the user typed anything in the password field we need to hash it and update 4 fields
    if (req.body.pass) {
        db.hashPassword(req.body.pass).then(function(hash) {
            Promise.all([
                db.updateUserTableWithPassword(
                    req.body.first,
                    req.body.last,
                    req.body.email,
                    hash,
                    req.session.userID
                ),
                db.updateUserProfileTable(
                    req.body.age,
                    req.body.city,
                    req.body.url,
                    req.session.userID
                )
            ])
                .then(function() {
                    //after both tables were updated
                    res.redirect("/petition");
                })
                .catch(function(err) {
                    console.log("ERROR IN UPDATING", err);
                });
        });
    } else {
        //update the thing without the password
        Promise.all([
            db.updateUserTableNoPassword(
                req.body.first,
                req.body.last,
                req.body.email,
                req.session.userID
            ),
            db.updateUserProfileTable(
                req.body.age,
                req.body.city,
                req.body.url,
                req.session.userID
            )
        ])
            .then(function() {
                res.redirect("/petition");
            })
            .catch(function(err) {
                console.log("ERROR IN UPDATING", err);
            });
    }
});

//deleting profile
app.post("/delete", (req, res) => {
    db.deleteInfoFromSignatureTable(req.session.userID)
        .then(function() {
            db.deleteInfoFromUserProfileTable(req.session.userID);
        })
        .then(function() {
            db.deleteInfoFromUserTable(req.session.userID);
        })
        .then(function() {
            req.session = null;
            res.redirect("/?deleted_all=true");
        })
        .catch(function(err) {
            console.log("ERROR IN DELETING", err);
        });
});

//logout

app.get("/logout", function(req, res) {
    req.session = null;
    res.redirect("/");
});

app.listen(process.env.PORT || 8080, () =>
    ca.rainbow("Big Brother is listening!")
);

////////////////custom middleware to faciliate some of the syntax///
function needNoUserID(req, res, next) {
    if (req.session.userID) {
        res.redirect("/petition");
    } else {
        next();
    }
}

function needUserID(req, res, next) {
    if (!req.session.userID) {
        res.redirect("/");
    } else {
        next();
    }
}

function needSig(req, res, next) {
    if (!req.session.signed) {
        res.redirect("/petition");
    } else {
        next();
    }
}

function needNoSig(req, res, next) {
    if (req.session.signed) {
        res.redirect("/thanks");
    } else {
        next();
    }
}
