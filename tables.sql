DROP TABLE IF EXISTS signatures;
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
     first VARCHAR(255) NOT NULL,
     last  VARCHAR(255) NOT NULL,
     sig TEXT NOT NULL,
     user_id INTEGER NOT NULL REFERENCES users(id)
);
