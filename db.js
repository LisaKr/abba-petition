const spicedPg = require("spiced-pg");

const db = spicedPg("postgres:postgres:postgres@localhost:5432/petition");

exports.addSig = function(first, last, sig) {
    return db.query(
        `INSERT INTO signatures (first, last, sig)
         VALUES ($1, $2, $3)
         RETURNING id`,
        [first || null, last || null, sig || null]
    );
};

exports.showSigners = function() {
    return db.query(
        `SELECT first, last
         FROM signatures`
    );
};

exports.getSignature = function getSignature(id) {
    return db.query(`SELECT sig FROM signatures WHERE id = $1`, [id]);
};
