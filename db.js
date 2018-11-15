const spicedPg = require("spiced-pg");
const bcrypt = require("./bcrypt");

const db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:postgres@localhost:5432/petition"
);

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
        SELECT u.id as id, u.pass, u.first, u.last, sig.id as sig_id, sig.user_id, up.user_id as up_id
        FROM users AS u
        LEFT JOIN signatures AS sig
        ON u.id = sig.user_id
        LEFT JOIN user_profiles AS up
        ON u.id = up.user_id
        WHERE email = $1`,
        [email]
    );
};

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

//delete Sig
exports.deleteSig = function(id) {
    return db.query(
        `
        DELETE
        FROM signatures
        WHERE user_id = $1`,
        [id]
    );
};

///showing you your own signature after signing///
exports.getSignature = function getSignature(id) {
    return db.query(
        `
        SELECT sig, users.first
        FROM signatures
        LEFT JOIN users
        ON signatures.user_id = users.id
        WHERE user_id = $1`,
        [id]
    );
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

exports.signersByCity = function signersByCity(city) {
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

/////populate the edit form with the existing data from the db////
exports.fillTheForm = function fillTheForm(id) {
    return db.query(
        `SELECT users.first, users.last, users.email, users.pass, up.age, up.city, up.url
        FROM users
        LEFT JOIN user_profiles AS up
        ON users.id = up.user_id
        WHERE users.id = $1`,
        [id]
    );
};

// prettier-ignore
///update the data, this one is 100% update  because this data already exists /////
exports.updateUserTableWithPassword = function updateUserTableWithPassword(
    first,
    last,
    email,
    pass,
    id
) {
    return db.query(
        `UPDATE users
        SET first=$1, last=$2, email=$3, pass=$4
        WHERE id = $5
        RETURNING id`, [first, last, email, pass, id]
    );
};

//now without password
exports.updateUserTableNoPassword = function updateUserTableNoPassword(
    first,
    last,
    email,
    id
) {
    return db.query(
        `UPDATE users
        SET first=$1, last=$2, email=$3
        WHERE id = $4
        RETURNING id`,
        [first, last, email, id]
    );
};

//insert/update the user_profile table////
exports.updateUserProfileTable = function updateUserProfileTable(
    age,
    city,
    url,
    user_id
) {
    return db.query(
        `
        INSERT into user_profiles (age, city, url, user_id)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (user_id)
        DO UPDATE SET age = $1, city = $2, url = $3
        RETURNING id`,
        [age, city, url, user_id]
    );
};

//queries to delete whole profile
exports.deleteInfoFromUserTable = function deleteInfoFromUserTable(id) {
    return db.query(
        `
        DELETE FROM users
        WHERE id = $1`,
        [id]
    );
};

exports.deleteInfoFromUserProfileTable = function deleteInfoFromUserProfileTable(
    id
) {
    return db.query(
        `
        DELETE FROM user_profiles
        WHERE user_id = $1`,
        [id]
    );
};

exports.deleteInfoFromSignatureTable = function deleteInfoFromSignatureTable(
    id
) {
    return db.query(
        `
        DELETE FROM signatures
        WHERE user_id = $1`,
        [id]
    );
};

/////////////hashing passwords////////////////////////
exports.hashPassword = function hashPassword(textPass) {
    return bcrypt.hash(textPass);
};

exports.comparePassword = function comparePassword(textPass, hash) {
    return bcrypt.compare(textPass, hash); //returns a boolean
};
