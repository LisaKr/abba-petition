const express = require("express");
const app = express();
const hb = require("express-handlebars");
const ca = require("chalk-animation");
const csurf = require("csurf");
const cookieSession = require("cookie-session");
const db = require("./db.js");

// const redis = require("./redis.js");

app.engine("handlebars", hb({ defaultLayout: "main" }));
app.set("view engine", "handlebars");

app.use(
    require("body-parser").urlencoded({
        extended: false
    })
);

//session secret is a key used for signing and/or encrypting cookies set by the application to maintain session state
app.use(
    cookieSession({
        secret:
            process.env.COOKIE_SECRET || require("./secrets.json").cookieSecret,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

//protecting from cross-site requests
app.use(csurf());

app.use(function(req, res, next) {
    res.locals.csrfToken = req.csrfToken();
    next();
});

//////serving all the static files
app.use(express.static("./public"));

app.disable("x-powered-by");

////////////RENDERS MAIN PAGE IF YOU'RE NOT LOGGED IN, RENDERS ADDITIONAL MESSAGE IF YOU DELETED YOUR PROFILE/////
app.get("/", needNoUserID, (req, res) => {
    res.render("home", {
        deleted: req.query.deleted_all
    });
});

///////////////////////////////REGISTRATION/////////////////////////
app.get("/registration", needNoUserID, function(req, res) {
    res.render("registration");
});

//hashing the provided password, inserting provided data into database (table: users), setting individual cookies
//for the session and redirecting the user to the onboarding page. if password isn't provided or any other error occurs,
//same page is rendered with an error message.
//password has to be provided because otherwise only salt will be hashed and added to database
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
            password_error: "true"
        });
    }
});

///////////////ADDING ADDITIONAL INFORMATION///////////
app.get("/onboarding", needUserID, (req, res) => {
    //if this form has already been filled out the user is not allowed to visit the page. this cookie is set in this post route.
    if (!req.session.addedInfo) {
        res.render("onboarding");
    } else {
        res.redirect("/");
    }
});

///in case the user left all the fields empty they will be redirected to the petition. if at least one of the fields
///was filled out the data will be inserted into user_profiles, the respective cookie will be set and then user is redirected
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

/////////////////////LOGIN//////////////////

app.get("/login", needNoUserID, function(req, res) {
    res.render("login");
});

//prettier-ignore

///Users data is retrieved from all three tables by the provided email adress. The provided password is then hashed and
//compared to the hash in the database. In case it is a match respective individual cookies for this session will be set
//and it is checked whether this user has already filled out the additional onboarding information. If yes, a respective
//cookie will be set. Then it's checled whether this user already has an entry in the signature table. The user is redirected
//based on this information.
//If the password doesn't match an error is thrown and the page is rendered with an error message.
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
        then(function(){
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

////////////SIGNATURE PAGE///////////
app.get("/petition", needUserID, needNoSig, function(req, res) {
    res.render("petition", {
        deleted: req.query.deleted
    });
});

//The stringified value of the canvas signature is added to the hidden input field with the name "sig". The value is then
//added to the signatures tables along with the respective user_id. A respective cookie is set and the user is redirected.
//If there is a problem, same page is rendered with an error message.
app.post("/petition", function(req, res) {
    db.addSig(req.body.sig, req.session.userID)
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

///////////////////////THANK YOU PAGE///////////////////////////////
//To render this page we need results of two queries: to get how many people signed the petition and to retrieve the
//signature string to pass to the url of the image tag which we show on our page and to get the name of the current signer.
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

//////////////////////////GETTING ALL SIGNERS/////////////////////////////////
//getting all the rows from the signature table and rendering the template based on that.
app.get("/signers", needUserID, needSig, function(req, res) {
    db.showSigners()
        .then(function(result) {
            //checking whether provided urls start with http or https and add the prefix if they don't
            result.rows.forEach(obj => {
                //to see what the url was before
                console.log("TEST", obj.url);
                if (obj.url) {
                    if (
                        obj.url.indexOf("http://") == -1 ||
                        obj.url.indexOf("https://") == -1
                    ) {
                        obj.url = "http://" + obj.url;
                        //to see what the url was after my loop
                        console.log("RESULT", obj.url);
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

////////////////SHOWING SIGNERS OF SPECIFIC CITY///////////////
//getting city to pass to the db query from the url query
app.get("/signers/:city", function(req, res) {
    db.signersByCity(req.params.city)
        .then(function(result) {
            //checking whether provided urls start with http or https and add the prefix if they don't
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

//////////////EDIT PROFILE/////////////////
//filling the fields with preexisting data to this user
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

//depending on whether the user updates password or not we are using different queries to the users table (this information is already there)
//additionally we upsert the user_profile table (this information might or might not alrady be there)
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

////////////DELETING THE SIGNATURE///////////////
//The row with the respective user_id is deleted from the signatures table. The respective cookie is deleted and
//the user is redirected to the signature page with an according message.
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

//////////DELETING PROFILE///////////////////
//deleting data from all tables in a proper order, deleting cookies and redirecting to the main page with an appropriate
//message
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

///////////////////////RANDOM ABBA FACT//////////////////////
app.get("/surprise", (req, res) => {
    //generating a random number for the random abba fact
    let number = getRandomInt(7);
    if (number == 1) {
        res.render("surprise", {
            video: true
        });
    } else if (number == 2) {
        res.render("surprise", {
            video2: true
        });
    } else if (number == 3) {
        res.render("surprise", {
            video3: true
        });
    } else if (number == 4) {
        res.render("surprise", {
            fact1: true
        });
    } else if (number == 5) {
        res.render("surprise", {
            fact2: true
        });
    } else if (number == 6) {
        res.render("surprise", {
            fact3: true
        });
    } else if (number == 7) {
        res.render("surprise", {
            fact4: true
        });
    }
});

//////////////LOG OUT////////////////
app.get("/logout", function(req, res) {
    req.session = null;
    res.redirect("/");
});

///////////STARTING THE SERVER/////////////
app.listen(process.env.PORT || 8080, () =>
    ca.rainbow("Big Brother is listening!")
);

//////GENERATE A RANDOM NUMBER FOR THE PAGE WITH ABBA FACTS//////
function getRandomInt(max) {
    return Math.floor(Math.random() * Math.floor(max));
}

////////////////CUSTOM MIDDLEWARE TO FASCILITATE SYNTAX/////////////
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
