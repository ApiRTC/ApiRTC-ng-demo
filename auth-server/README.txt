
Project created with :

npm init
npm install --save express 
npm install --save jsonwebtoken
npm install --save cors

Run :

node server.js

Test : 

curl -XPOST -d '{"username": "myUserAgentId", "password":"12345"}' -H 'content-type: application/json' localhost:3000/loginJWToken

curl -XPOST -d '{"username": "myUserAgentId", "password":"12345"}' -H 'content-type: application/json' localhost:3000/loginToken


