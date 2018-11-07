const spicedPg = require("spiced-pg");

const db = spicedPg("postgres:postgres:postgres@localhost:5432/hello");

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
