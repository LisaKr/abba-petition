const bcrypt = require("bcryptjs");
const { promisify } = require("util");

const genSalt = promisify(bcrypt.genSalt); //generates random salt string
const hash = promisify(bcrypt.hash); //takes plain text and salt and creates a hash out of it
const compare = promisify(bcrypt.compare);

exports.hash = function(password) {
    //because we dont wanna call genSalt by itself, so we are combining them
    return genSalt().then(salt => {
        return hash(password, salt);
    });
};

exports.compare = compare;
