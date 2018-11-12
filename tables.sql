DROP TABLE IF EXISTS signatures;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;



--after registration
 CREATE TABLE users(
     id SERIAL PRIMARY KEY,
     first VARCHAR(255) NOT NULL,
     last  VARCHAR(255) NOT NULL,
     email  VARCHAR(255) NOT NULL UNIQUE,
     pass  VARCHAR(255) NOT NULL
);

--after signature
CREATE TABLE signatures(
     id SERIAL PRIMARY KEY,
     sig TEXT NOT NULL,
     user_id INTEGER NOT NULL REFERENCES users(id)
);

--after giving us additional info
CREATE TABLE user_profiles(
    id SERIAL PRIMARY KEY,
    age  INT,
    city VARCHAR(255),
    url TEXT,
    user_id INTEGER NOT NULL UNIQUE REFERENCES users(id) --this we have in the session. only do query on the insert if at least one field is filled out
);
