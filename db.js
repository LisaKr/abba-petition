const spicedPg = require("spiced-pg");
const bcrypt = require("./bcrypt");

const db = spicedPg("postgres:postgres:postgres@localhost:5432/petition");

exports.addSig = function(first, last, sig, user_id) {
    return db.query(
        `INSERT INTO signatures (first, last, sig, user_id)
         VALUES ($1, $2, $3, $4)
         RETURNING id`,
        [first || null, last || null, sig || null, user_id || null]
    );
};

exports.showSigners = function() {
    return db.query(
        `SELECT first, last
         FROM signatures`
    );
};

exports.getSignature = function getSignature(id) {
    return db.query(`SELECT sig FROM signatures WHERE user_id = $1`, [id]);
};

exports.createUser = function createUser(first, last, email, pass) {
    return db.query(
        `INSERT INTO users (first, last, email, pass)
        VALUES ($1, $2, $3, $4)
        RETURNING id, first, last`,
        [first || null, last || null, email || null, pass || null]
    );
};

// prettier-ignore
exports.getUser = function getUser(email) {
    return db.query(
        `SELECT *
         FROM users
         WHERE email = $1`,
        [email]
    );
};

exports.checkForSig = function checkForSig(id) {
    return db.query(`SELECT * FROM signatures WHERE user_id = $1`, [id]);
};

/////////////hashing passwords////////////////////////
exports.hashPassword = function hashPassword(textPass) {
    return bcrypt.hash(textPass);
};

exports.comparePassword = function comparePassword(textPass, hash) {
    return bcrypt.compare(textPass, hash); //returns a boolean
};
