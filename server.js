
const debug = require("debug")("emulator");
const express = require("express");
const uuid = require('uuid/v4');


//
// Setting up common services 
//
const app = express();

// Inject EventBus
const EventEmitter = require('events').EventEmitter;
const bus = new EventEmitter();

// Inject Controller
const Controller = require("./controller");
const controller = new Controller(bus);

// Inject Datastore
const datastore = require("./storage/memory");
app.locals.datastore = datastore;
// [TODO] replace with new MemoryDatastore(bus)
datastore.bus = bus;

app.set("x-powered-by", false); // to mimic Cisco Spark headers
app.set("etag", false); // to mimic Cisco Spark headers
// Middleware to mimic Cisco Spark HTTP headers
app.use(function (req, res, next) {
    res.setHeader("Cache-Control", "no-cache"); // to mimic Cisco Spark headers

    // New Trackingid
    res.locals.trackingId = "EM_" + uuid();
    res.setHeader("Trackingid", res.locals.trackingId);

    next();
});

// Middleware to enforce authentication
const authentication = require("./auth");
app.use(authentication.middleware);

// Load initial list of accounts
const accounts = Object.keys(authentication.tokens).map(function (item, index) {
    return authentication.tokens[item];
});
datastore.people.init(accounts);


//
// Loading services
//
const peopleAPI = require("./resources/people");
app.use("/people", peopleAPI);
const roomsAPI = require("./resources/rooms");
app.use("/rooms", roomsAPI);
const membershipsAPI = require("./resources/memberships");
app.use("/memberships", membershipsAPI);
const messagesAPI = require("./resources/messages");
app.use("/messages", messagesAPI);
const webhooksAPI = require("./resources/webhooks");
app.use("/webhooks", webhooksAPI);

// Healthcheck
app.locals.started = new Date(Date.now()).toISOString();
app.get("/", function(req, res) {
    res.status(200).send({
        "service" : "Mini-Spark",
        "version" : "v0.1.0",
        "up-since" : app.locals.started,
        "creator" : "ObjectIsAdvantag <stsfartz@cisco.com>",
        "github": "https://github.com/ObjectIsAdvantag/mini-spark",
        "tokens" : "/tokens",
        "resources": [
            "/people", "/rooms", "/memberships", "/messages", "/webhooks"
        ]
    });
});
app.get("/tokens", function(req, res) {
    res.status(200).send(authentication.tokens);
});


//
// Starting server
//
const port = process.env.PORT || 3210;
app.listen(port, function () {
    debug(`Emulator started on port: ${port}`);
    console.log(`Emulator started on port: ${port}`);
});
