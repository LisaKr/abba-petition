const spicedPg = require("spiced-pg");
const bcrypt = require("./bcrypt");

const db = spicedPg(
    process.env.DATABASE_URL ||
        "postgres:postgres:postgres@localhost:5432/petition"
);

////////////////CREATING A USER AFTER THE REGISTRATION///////////////

exports.createUser = function createUser(first, last, email, pass) {
    return db.query(
        `INSERT INTO users (first, last, email, pass)
        VALUES ($1, $2, $3, $4)
        RETURNING id, first, last`,
        [first || null, last || null, email || null, pass || null]
    );
};

/////////////////ADD ADDITIONAL INFORMATION TO USER_PROFILES TABLE/////////////
exports.addInfo = function addInfo(age, city, url, user_id) {
    return db.query(
        `INSERT INTO user_profiles (age, city, url, user_id)
        VALUES ($1, $2, $3, $4)
        RETURNING id`,
        [age, city, url, user_id]
    );
};

// prettier-ignore
///////////////////GETTING THE USER'S DATA WHEN THEY LOG IN///////////
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

//////////////////////ADDING A SIGNATURE STRING TO THE SIGNATURE TABLE AFTER THE USER SIGNS THE PETITION/////////////
exports.addSig = function(sig, user_id) {
    return db.query(
        `INSERT INTO signatures (sig, user_id)
         VALUES ($1, $2)
         RETURNING id`,
        [sig || null, user_id || null]
    );
};

/////////////////SHOWING SIGNATURE AFTER SIGNING//////////
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

///////////////////SHOWING ALL THE SIGNERS////////////////
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

/////////SHOWING SIGNERS OF SPECIFIC CITY/////////////////////

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

//////////////////////////ADDITIONAL FEATURES///////////////////////////////////

//////////////DELETING SIGNATURE FROM SIGNATURE TABLE///////////////
exports.deleteSig = function(id) {
    return db.query(
        `
        DELETE
        FROM signatures
        WHERE user_id = $1`,
        [id]
    );
};

/////POPULATE THE EDIT FORM WITH THE EXISTING USER DATA FROM THE DB////
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
///////////UPDATE THE DATA IN THE USER_TABLE AFTER EDITING THE PROFILE (WITH PASSWORD)///////
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

///////////UPDATE THE DATA IN THE USER_TABLE AFTER EDITING THE PROFILE (WITHOUT PASSWORD)///////
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

///////////UPSERT DATA IN THE USER_PROFILES TABLE AFTER EIDITING PROFILE/////////////////
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

//////////////////DELETING WHOLE PROFILE////////////////////////////
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

/////////////////////HASHING PASSWORDS////////////////////////
exports.hashPassword = function hashPassword(textPass) {
    return bcrypt.hash(textPass);
};

exports.comparePassword = function comparePassword(textPass, hash) {
    return bcrypt.compare(textPass, hash); //returns a boolean
};
