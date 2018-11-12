const express = require("express");
const app = express();
const hb = require("express-handlebars");
app.engine("handlebars", hb({ defaultLayout: "main" }));
app.set("view engine", "handlebars");
const ca = require("chalk-animation");
const csurf = require("csurf");
const cookieSession = require("cookie-session");
const db = require("./db.js");

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

app.get("/", (req, res) => {
    if (!req.session.userID) {
        res.render("main");
    } else {
        res.redirect("/petition");
    }
});

///registration
app.get("/registration", function(req, res) {
    //if the user is not already registered/logged in, this unique cookie is set at the moment of log in/registration
    //if the cookie is not set you have access to the login and registration page
    if (!req.session.userID) {
        res.render("registration");
        //if the user already signed up/logged in we redirect to petition which in turn will check whether they have
        //already signed or not
    } else {
        res.redirect("/petition");
    }
});

//what do we do with the registration data?
app.post("/registration", function(req, res) {
    //we hash the provided password and then we insert a user into the db
    //req.body.pass comes from the registration form input fields to which we gave a name
    //if there is no password, it will go to catch
    //QUESTION: how come hashPassword is a promise if we didnt promosify it and didnt create a promise object?
    //if it's automatically a promise without us specifying it, why do we still need to return the
    //value when defining the function in the first place? isn't it resolving with the value?

    //if there was a password it was take the result of hash password function (hashed password) and runs
    //a function on it where it returns the result of the createUser function (which inserts user into
    //the user database and returns some data for us to set the unique cookies to remember the user). we have to
    //return the values to use in the function declaration and here again
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
        //then they are redirected to the signature page
        .then(function() {
            res.redirect("/onboarding"); //this was "/petition"
        })
        //or render the page but passing it an error which the template will interpret
        .catch(function(err) {
            console.log("ERROR IN REGISTRATION: ", err);
            res.render("registration", {
                error: err
            });
        });
});

////additional information////
app.get("/onboarding", (req, res) => {
    if (req.session.userID && !req.session.addedInfo) {
        //add a cookie for having filled these out so that if they are filled out you are redirected
        res.render("onboarding");
    } else {
        //if they are not signed it redirect them to the main page
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
                res.redirect("/petition");
            });
    }
});

///////////////login////////////

app.get("/login", function(req, res) {
    //if the user is not already registered/logged in, this unique cookie is set at the moment of log in/registration
    //if the cookie is not set you have access to the login and registration page
    if (!req.session.userID) {
        res.render("login");
    } else {
        //petition will check whether the user signed or not
        res.redirect("/petition");
    }
});

//what do we do with the data when we log in?

//prettier-ignore
app.post("/login", function(req, res) {
    //first we take the email value from the form tag and then select their whole data from the database
    db
        .getUser(req.body.email)
        .then(function(results) {
            //after we have gotten the users data from the database we utilise the compare password function
            //and returning its result (password matched or not). if not we throw an error to make them go to
            //catch
            return db.comparePassword(req.body.pass, results.rows[0].pass)
            //here we have to chain another promise right on the result of this function because
            //we need to have access to both data from the database and the result of the password
            //comparison. otherwise we would only have the access to the boolean result
            //if password is correct we set the cookies to remember the logged in user (for this we need data
            //from database).
                .then(function(match) {
                    if (match==true) {
                        req.session.userID = results.rows[0].id;
                        req.session.first = results.rows[0].first;
                        req.session.last = results.rows[0].last;
                        req.session.sigID = results.rows[0].sig_id;
                        //as it is the prmose whose result will go into the next promise we return here
                        //the result of a query which looks whether there is a signature for this user
                        //it will be either data or empty
                        //we have to return it here and check on it later because its a promise so that we
                        //cannot take its results right away in an if loop (its still gonna be pending)
                        // return db.checkForSig(req.session.userID);
                    } else {
                        throw new Error;
                    }
                });
        }).
        //now we have the resolved result of checkForSig so that we can check what it was and act accordingly
        then(function(){
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
app.get("/petition", function(req, res) {
    if (!req.session.signed) {
        res.render("petition");
    } else {
        res.redirect("/thanks");
    }
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
app.get("/thanks", function(req, res) {
    if (req.session.signed && req.session.userID) {
        Promise.all([
            db.showSigners(),
            db.getSignature(req.session.userID)
        ]).then(function([resultSigners, resultSig]) {
            res.render("thanks", {
                length: resultSigners.rows.length,
                url: resultSig.rows[0].sig,
                name: resultSigners.rows[0].first
            });
        });
    } else {
        res.redirect("/");
    }
});

app.get("/signers", function(req, res) {
    if (req.session.signed && req.session.userID) {
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
    } else {
        res.redirect("/");
    }
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

//logout

app.get("/logout", function(req, res) {
    req.session = null;
    res.redirect("/");
});

app.listen(8080, () => ca.rainbow("Big Brother is listening!"));

//new route for onboarding
//get: just shows the form
//post: only add if its filled out, redirect to petition
//showing signers: show data from both tables if applicable
//urls: needs to be https or https in the beginning. if it doesnt, adding http
//city should be a link too --> if you click on it, you go to page which only shows signers from this city /signers/:city
//quera where city == $1 and $1 as the city
//two new pages: profile form and signers by city, we can use the exact same template
//where lower(city) = lower($1)
//one fucntion, if it geta oseed the icty it gets a where and if ti doesnt it gets a where
//signature id is null then they didnt sign
//when they login a query by email data from users and signatures, if no data in signatures, they didnt sign, if there is
//then add a cookie to the session indicating the signature
