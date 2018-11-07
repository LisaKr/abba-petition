const spicedPg = require("spiced-pg");

const db = spicedPg("postgres:postgres:postgres@localhost:5432/petition");

exports.addSig = function(first, last, sig) {
    return db.query(
        `INSERT INTO signatures (first, last, sig)
         VALUES ($1, $2, $3)`,
        [first || null, last || null, sig || null]
    );
};

exports.showSigners = function() {
    return db.query(
        `SELECT first, last
         FROM signatures`
    );
};
