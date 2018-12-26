A petition aimed to reunite ABBA
================== 
Website
--------
[https://reuniteabba.herokuapp.com/](https://reuniteabba.herokuapp.com/)

Tech stack
--------
- jQuery
- Node.js
- Express.js
- PostgreSQL
- Handlebars.js templating engine

Overview
--------
First, the user can register or log in. The password of new users is **hashed and salted** before it is saved in the database.

<p align="center">
  <img src="petition_showcase1.gif"/>
</p>

Afterwards, the user is prompted to fill in additional information about themselves. After doing so they are also prompted to sign the petition. The signature is turned into a URL, which is in turn stored in the database, together with the rest of the user's profile information.
<p align="center">
  <img src="petition_showcase2.gif"/>
</p>

Upon signing, users can edit their profile, delete their signature, view fellow signers and filter signers by city. Moreover, a page providing the user with random ABBA facts and videos is included as well.
<p align="center">
  <img src="petition_showcase3.png";"/>
</p>

Future Features
--------
- Responsive design
- Display "your profile has been successfully updated" message
- include a toggleable iframe Spotify player where user can listen to ABBA music to make signing the petition more appetizing
