const spicedPg = require("spiced-pg");
const bcrypt = require("./bcrypt");

const db = spicedPg("postgres:postgres:postgres@localhost:5432/petition");

/////Creating a user after the registration and getting the user when they log in/////////

exports.createUser = function createUser(first, last, email, pass) {
    return db.query(
        `INSERT INTO users (first, last, email, pass)
        VALUES ($1, $2, $3, $4)
        RETURNING id, first, last`,
        [first || null, last || null, email || null, pass || null]
    );
};

exports.addInfo = function addInfo(age, city, url, user_id) {
    return db.query(
        `INSERT INTO user_profiles (age, city, url, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id`,
        [age, city, url, user_id]
    );
};

// prettier-ignore
module.exports.getUser = function getUser(email) {
    return db.query(
        `
        SELECT u.id as id, u.pass, u.first, u.last, sig.id as sig_id, sig.user_id
        FROM users AS u
        LEFT JOIN signatures AS sig
        ON sig.user_id = u.id
        WHERE email = $1`,
        [email]
    );
};

//adding additional info
// exports.addInfo

/////checking if there is a row in the signatures table with the id of the user who is being logged in (user who just registered
//cannot possibly have a signature yet)

// exports.checkForSig = function checkForSig(id) {
//     return db.query(`SELECT * FROM signatures WHERE user_id = $1`, [id]);
// };

///adding a signature string after the user signs/////////
//right now we are adding first and last even tho its redundant with the users table. we'll fix it on monday.
exports.addSig = function(sig, user_id) {
    return db.query(
        `INSERT INTO signatures (sig, user_id)
         VALUES ($1, $2)
         RETURNING id`,
        [sig || null, user_id || null]
    );
};

///showing you your own signature after signing///
exports.getSignature = function getSignature(id) {
    return db.query(`SELECT sig FROM signatures WHERE user_id = $1`, [id]);
};

///showing all users from the signatures table/////
exports.showSigners = function() {
    return db.query(
        `SELECT users.first, users.last, up.age, up.city, up.url
         FROM signatures AS sig
         LEFT JOIN user_profiles AS up
         ON sig.user_id = up.user_id
         LEFT JOIN users
         ON sig.user_id = users.id
         `
    );
};

///get signers by city

module.exports.signersByCity = function signersByCity(city) {
    return db.query(
        //we only show the ones who signed at all and get the corresponding information from user_profiles
        `SELECT users.first, users.last, up.age, up.city, up.url
        FROM signatures AS sig
        LEFT JOIN user_profiles AS up
        ON sig.user_id = up.user_id
        LEFT JOIN users
        ON sig.user_id = users.id
        WHERE LOWER(city) = LOWER($1)
        `,
        [city]
    );
};

/////////////hashing passwords////////////////////////
exports.hashPassword = function hashPassword(textPass) {
    return bcrypt.hash(textPass);
};

exports.comparePassword = function comparePassword(textPass, hash) {
    return bcrypt.compare(textPass, hash); //returns a boolean
};
