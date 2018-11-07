//database stuff, needs to be segregated from everything else
//just one place where I require spicedpg

const spicedPg = require("spiced-pg");

const db = spicedPg("postgres:postgres:postgres@localhost:5432/hello"); //the url to the database and the way to show postgres that we are some user
//cities is just a databse we're using. collection of tables whic relate to each other
//database I created yesterday

exports.createCity = (city, country, population) => {
    db.query(
        `INSERT INTO cities (city,country,population)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [city, country, population] //treat it strictly as data
    )
        .then(function(results) {
            console.log(results.rows); //its a JS object now so we can pass it to handlebars and loop through it
        })
        .catch(function(err) {
            //this should be done at the server, latest possible moment
            console.log(err);
        });
};
