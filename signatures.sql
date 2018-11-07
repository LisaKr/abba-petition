DROP TABLE IF EXISTS signatures;

 CREATE TABLE signatures(
     id SERIAL PRIMARY KEY,
     first VARCHAR(255) NOT NULL,
     last  VARCHAR(255) NOT NULL,
     sig TEXT NOT NULL
);
